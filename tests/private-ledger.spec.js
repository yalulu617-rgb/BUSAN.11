import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

async function engineFixture(page, legacy = []) {
  await page.route('https://ledger.test/**', route => route.fulfill({ contentType: 'text/html', body: '<main>ledger</main>' }));
  await page.goto('https://ledger.test/');
  expect(await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasCryptoSubtle: typeof window.crypto?.subtle?.importKey === 'function'
  }))).toEqual({ isSecureContext: true, hasCryptoSubtle: true });
  await page.addScriptTag({ content: source('ute/ute_storage.js') });
  await page.evaluate(rows => StorageEngine.set('busan_v36_p_bills', rows), legacy);
  await page.addScriptTag({ content: source('ute/ute_private_ledger.js') });
}

test('Revision 6: profiles migrate into separate encrypted PIN vaults and remain isolated', async ({ page }) => {
  const legacy = [
    { id: 'u1-old', name: 'U1 legacy secret', amt: 111, currency: 'TWD', payer: 'user1', type: '私帳', notes: 'u1 note' },
    { id: 'u2-old', name: 'U2 legacy secret', amt: 222, currency: 'KRW', payer: 'user2', type: '私帳', receipt: 'u2 receipt' },
    { id: 'unknown', name: 'Unassigned secret', amt: 333, type: '私帳' }
  ];
  await engineFixture(page, legacy);

  const user1 = await page.evaluate(async () => {
    const bills = await PrivateLedgerEngine.setup('user1', '482648264826', '482648264826');
    const vault = localStorage.getItem('busan_v45_private_vault_user1');
    return {
      bills,
      vault,
      metadata: JSON.parse(vault),
      legacy: StorageEngine.get('busan_v36_p_bills', []).data,
      privateBills: window.privateBills
    };
  });
  expect(user1.bills.map(bill => bill.id)).toEqual(['u1-old']);
  expect(user1.privateBills).toEqual(user1.bills);
  expect(user1.metadata).toMatchObject({
    version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256' },
    cipher: { name: 'AES-GCM', length: 256 }
  });
  for (const cleartext of ['482648264826', 'U1 legacy secret', 'u1 note', '"name"', '"amt"', '"notes"']) {
    expect(user1.vault).not.toContain(cleartext);
  }
  expect(user1.legacy.map(bill => bill.id)).toEqual(['u2-old', 'unknown']);

  const isolation = await page.evaluate(async () => {
    PrivateLedgerEngine.lock();
    let wrongPinRejected = false;
    try { await PrivateLedgerEngine.unlock('user1', '0000'); } catch (_) { wrongPinRejected = true; }
    const afterWrong = {
      wrongPinRejected,
      bills: window.privateBills,
      unlocked: PrivateLedgerEngine.getUnlockedProfile()
    };
    await PrivateLedgerEngine.unlock('user1', '482648264826');
    const user1Only = {
      user1: PrivateLedgerEngine.isUnlocked('user1'),
      user2: PrivateLedgerEngine.isUnlocked('user2'),
      names: PrivateLedgerEngine.getBills('user1').map(bill => bill.name)
    };
    PrivateLedgerEngine.lock();
    await PrivateLedgerEngine.setup('user2', '735173517351', '735173517351');
    return {
      afterWrong,
      user1Only,
      user2Names: PrivateLedgerEngine.getBills('user2').map(bill => bill.name),
      legacy: StorageEngine.get('busan_v36_p_bills', []).data,
      user2Vault: localStorage.getItem('busan_v45_private_vault_user2')
    };
  });
  expect(isolation.afterWrong).toEqual({ wrongPinRejected: true, bills: [], unlocked: null });
  expect(isolation.user1Only).toEqual({ user1: true, user2: false, names: ['U1 legacy secret'] });
  expect(isolation.user2Names).toEqual(['U2 legacy secret']);
  expect(isolation.legacy.map(bill => bill.id)).toEqual(['unknown']);
  expect(isolation.user2Vault).not.toContain('735173517351');
  expect(isolation.user2Vault).not.toContain('U2 legacy secret');
});

test('Revision 6: encrypted CRUD persists safely and a fresh page starts locked', async ({ page }) => {
  await engineFixture(page);
  expect(await page.evaluate(async () => {
    try { await PrivateLedgerEngine.add('user1', { id: 'must-not-save' }); return false; } catch (_) { return true; }
  })).toBe(true);
  const saved = await page.evaluate(async () => {
    await PrivateLedgerEngine.setup('user1', '864286428642', '864286428642');
    await PrivateLedgerEngine.add('user1', {
      id: 'private-new', name: 'Hidden purchase', amt: 9876, currency: 'KRW', method: '信用卡',
      receipt: 'https://private.invalid/receipt', day: '11/14', notes: 'do not leak'
    });
    return {
      bills: PrivateLedgerEngine.getBills('user1'),
      vault: localStorage.getItem('busan_v45_private_vault_user1'),
      legacy: StorageEngine.get('busan_v36_p_bills', []).data,
      persistent: JSON.stringify({
        local: Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))]),
        session: Array.from({ length: sessionStorage.length }, (_, i) => [sessionStorage.key(i), sessionStorage.getItem(sessionStorage.key(i))])
      })
    };
  });
  expect(saved.bills).toHaveLength(1);
  expect(saved.bills[0]).toMatchObject({ id: 'private-new', payer: 'user1', type: '私帳' });
  expect(saved.legacy).toEqual([]);
  expect(saved.persistent).not.toContain('864286428642');
  for (const cleartext of ['Hidden purchase', '信用卡', 'private.invalid', 'do not leak', '"name"', '"amt"', '"receipt"']) {
    expect(saved.vault).not.toContain(cleartext);
  }

  await page.reload();
  await page.addScriptTag({ content: source('ute/ute_storage.js') });
  await page.addScriptTag({ content: source('ute/ute_private_ledger.js') });
  expect(await page.evaluate(() => ({ bills: window.privateBills, profile: PrivateLedgerEngine.getUnlockedProfile() })))
    .toEqual({ bills: [], profile: null });

  const afterDelete = await page.evaluate(async () => {
    await PrivateLedgerEngine.unlock('user1', '864286428642');
    await PrivateLedgerEngine.remove('user1', 'private-new');
    const vault = localStorage.getItem('busan_v45_private_vault_user1');
    PrivateLedgerEngine.lock();
    return { vault, bills: window.privateBills };
  });
  expect(afterDelete.bills).toEqual([]);
  expect(afterDelete.vault).not.toContain('Hidden purchase');
  expect(await page.evaluate(async () => {
    await PrivateLedgerEngine.unlock('user1', '864286428642');
    return PrivateLedgerEngine.getBills('user1');
  })).toEqual([]);
});

test('Revision 6: failed migration leaves every legacy row untouched and the ledger locked', async ({ page }) => {
  const legacy = [
    { id: 'keep-u1', name: 'Must survive', payer: 'user1', type: '私帳' },
    { id: 'keep-u2', name: 'Other owner', payer: 'user2', type: '私帳' },
    { id: 'keep-none', name: 'No owner', type: '私帳' }
  ];
  await engineFixture(page, legacy);
  const result = await page.evaluate(async original => {
    const realSet = StorageEngine.set.bind(StorageEngine);
    StorageEngine.set = (key, value) => key === 'busan_v36_p_bills'
      ? { success: false, data: null, error: 'injected persistence failure' }
      : realSet(key, value);
    let rejected = false;
    try { await PrivateLedgerEngine.setup('user1', '2468', '2468'); } catch (_) { rejected = true; }
    StorageEngine.set = realSet;
    return {
      rejected,
      legacy: StorageEngine.get('busan_v36_p_bills', []).data,
      vault: StorageEngine.get('busan_v45_private_vault_user1', null).data,
      bills: window.privateBills,
      unlocked: PrivateLedgerEngine.getUnlockedProfile(),
      original
    };
  }, legacy);
  expect(result.rejected).toBe(true);
  expect(result.legacy).toEqual(result.original);
  expect(result.vault).toBeNull();
  expect(result.bills).toEqual([]);
  expect(result.unlocked).toBeNull();
});

test('Revision 6: profile switching relocks UI and wrong PIN exposes no private data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('busan_v36_owner', JSON.stringify('user1'));
    localStorage.setItem('busan_v36_p_bills', JSON.stringify([]));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => enterApp());
  await expect(page.locator('#mainApp')).toBeVisible();
  await page.locator('#tab-bill').click();
  await expect(page.locator('#split')).toBeVisible();

  await page.locator('#tabPrivate').click();
  await expect(page.locator('#pinTitle')).toContainText('設定個人私帳 PIN');
  await page.locator('#pinInput').fill('482648264826');
  await page.locator('#pinConfirmInput').fill('482648264826');
  await page.locator('#pinSubmitBtn').click();
  await expect(page.locator('#pinModal')).not.toBeVisible();
  await expect(page.locator('#tabPrivate')).toHaveClass(/active/);

  await page.evaluate(async () => {
    document.getElementById('billName').value = 'Profile-switch secret';
    document.getElementById('billAmt').value = '640';
    document.getElementById('billCurrency').value = 'TWD';
    document.getElementById('billType').value = '私帳';
    await addBill();
  });
  await expect(page.locator('#pbList')).toContainText('Profile-switch secret');

  await page.locator('#deviceOwner').selectOption('user2');
  expect(await page.evaluate(() => ({
    tab: window.currentBillTab,
    bills: window.privateBills,
    user1: PrivateLedgerEngine.isUnlocked('user1'),
    user2: PrivateLedgerEngine.isUnlocked('user2'),
    privateTotal: BudgetEngine.calculateBudget([], window.privateBills, 0.025, '11/13', window.u1, window.u2, window.deviceOwner, '私帳').totalPrivateTWD,
    lockedPrivateCategories: BudgetEngine.calculateBudget(
      [{ name: 'Visible public', amt: 100, currency: 'TWD', payer: 'user1', type: '公費', day: '11/13' }],
      window.privateBills, 0.025, '11/13', window.u1, window.u2, window.deviceOwner, '私帳'
    ).categories.reduce((sum, item) => sum + item.value, 0),
    publicTotal: BudgetEngine.calculateBudget(
      [{ name: 'Visible public', amt: 100, currency: 'TWD', payer: 'user1', type: '公費', day: '11/13' }],
      window.privateBills, 0.025, '11/13', window.u1, window.u2, window.deviceOwner, '公費'
    ).totalSharedTWD
  }))).toEqual({ tab: '公費', bills: [], user1: false, user2: false, privateTotal: 0, lockedPrivateCategories: 0, publicTotal: 100 });
  await expect(page.locator('#pbList')).not.toContainText('Profile-switch secret');
  await expect(page.locator('#privateBillsSum')).toHaveText('$0 TWD');

  await page.locator('#tabPrivate').click();
  await page.locator('#pinInput').fill('735173517351');
  await page.locator('#pinConfirmInput').fill('735173517351');
  await page.locator('#pinSubmitBtn').click();
  await expect(page.locator('#pinModal')).not.toBeVisible();
  await page.locator('#deviceOwner').selectOption('user1');
  await page.locator('#tabPrivate').click();
  await expect(page.locator('#pinTitle')).toContainText('👩 溫');
  await page.locator('#pinInput').fill('0000');
  await page.locator('#pinSubmitBtn').click();
  await expect(page.locator('#pinMsg')).toContainText('無法解鎖');
  expect(await page.evaluate(() => ({ tab: window.currentBillTab, bills: window.privateBills,
    privateTotal: BudgetEngine.calculateBudget([], window.privateBills, 0.025, '11/13', window.u1, window.u2, window.deviceOwner, '私帳').totalPrivateTWD,
    privateCategories: BudgetEngine.calculateBudget([], window.privateBills, 0.025, '11/13', window.u1, window.u2, window.deviceOwner, '私帳')
      .categories.reduce((sum, item) => sum + item.value, 0) })))
    .toEqual({ tab: '公費', bills: [], privateTotal: 0, privateCategories: 0 });
  await expect(page.locator('#pbList')).not.toContainText('Profile-switch secret');
});
