import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

// BUSAN.11 integration acceptance: budgets, restaurants, photos, S25 layout, PWA.
// Synthetic data + CI-only fake Firebase only. External hosts are blocked.
const PIN = '482648264826';

// Real JPEG rendered by Chromium canvas (synthetic pixels), filled in beforeEach.
let TINY_JPEG = Buffer.alloc(0);

function ascii(s) { return Buffer.concat([Buffer.from(s, 'ascii'), Buffer.from([0])]); }
function rationals(vals) {
  const b = Buffer.alloc(vals.length * 8);
  vals.forEach(([n, d], i) => { b.writeUInt32LE(n, i * 8); b.writeUInt32LE(d, i * 8 + 4); });
  return b;
}
function entry(tag, type, count, valueOrOffset) {
  const b = Buffer.alloc(12);
  b.writeUInt16LE(tag, 0); b.writeUInt16LE(type, 2); b.writeUInt32LE(count, 4);
  if (Buffer.isBuffer(valueOrOffset)) valueOrOffset.copy(b, 8); else b.writeUInt32LE(valueOrOffset, 8);
  return b;
}
/** Builds a JPEG with real EXIF DateTimeOriginal and GPS (little-endian TIFF). */
function jpegWithExif({ dateTime, lat, lon }) {
  const header = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0]);
  const exifIfdOffset = 38, dateOffset = 56, gpsOffset = 76, latOffset = 130, lonOffset = 154;
  const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const ifd0 = Buffer.concat([u16(2), entry(0x8769, 4, 1, exifIfdOffset), entry(0x8825, 4, 1, gpsOffset), u32(0)]);
  const exifIfd = Buffer.concat([u16(1), entry(0x9003, 2, 20, dateOffset), u32(0)]);
  const dateData = ascii(dateTime);
  const dms = v => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.floor((a - d) * 60); const s = Math.round(((a - d) * 60 - m) * 60 * 100); return [[d, 1], [m, 1], [s, 100]]; };
  const gpsIfd = Buffer.concat([u16(4),
    entry(1, 2, 2, Buffer.from(lat >= 0 ? 'N\0' : 'S\0', 'ascii')), entry(2, 5, 3, latOffset),
    entry(3, 2, 2, Buffer.from(lon >= 0 ? 'E\0' : 'W\0', 'ascii')), entry(4, 5, 3, lonOffset), u32(0)]);
  const tiff = Buffer.concat([header, ifd0, exifIfd, dateData, gpsIfd, rationals(dms(lat)), rationals(dms(lon))]);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(body.length + 2);
  return Buffer.concat([TINY_JPEG.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, body, TINY_JPEG.subarray(2)]);
}

test.beforeEach(async ({ page }) => {
  // Hard guarantee: nothing leaves localhost during these tests.
  await page.route(url => !/^(http:\/\/localhost|data:|blob:)/.test(url.href), route => route.abort());
  await bootApp(page);
  TINY_JPEG = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#c96'; x.fillRect(0, 0, 8, 8); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; }), 'base64');
  expect(await page.evaluate(() => Boolean(window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly))).toBe(true);
});

async function pct(page) { return (await page.locator('#budgetPct').innerText()).trim(); }

test.describe('A. Budget editing + ledger isolation', () => {
  test('shared / user1 / user2 budgets edit independently, spend unchanged, persisted', async ({ page }) => {
    await page.evaluate(() => showV37Tab('split'));
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(window.DB_BILLS).set({
        x1: { name: '晚餐', amt: '2000', currency: 'TWD', payer: 'user1', type: '公費', day: '11/13' },
        x2: { name: '計程車', amt: '800', currency: 'TWD', payer: 'user2', type: '公費', day: '11/13' }
      });
    });
    await expect(page.locator('#budgetPct')).toHaveText('5.6%'); // 2800 / 50000
    await expect(page.locator('#ownerBudgetEdit')).toBeVisible();
    await page.locator('#ownerBudgetEdit').click();
    await page.locator('#ownerBudgetAmount').fill('70000');
    await page.getByRole('button', { name: '儲存預算' }).click();
    await expect(page.locator('#budgetPct')).toHaveText('4.0%'); // 2800 / 70000
    await expect(page.locator('#budgetText')).toContainText('$2,800');
    await expect(page.locator('#settlement')).toContainText('$600'); // 50/50 unchanged

    // invalid values are rejected and leave previous value intact
    await page.locator('#ownerBudgetEdit').click();
    await page.locator('#ownerBudgetAmount').fill('-5');
    await page.getByRole('button', { name: '儲存預算' }).click();
    await expect(page.locator('#ownerBudgetError')).not.toBeEmpty();
    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.locator('#budgetPct')).toHaveText('4.0%');

    // private scopes are independent of shared
    const limits = await page.evaluate(() => {
      const calc = (owner, tab) => BudgetEngine.calculateBudget(window.sharedBills, [{ name: 'p', amt: 1000, currency: 'TWD', payer: owner, type: '私帳' }], 0.025, '11/13', window.u1, window.u2, owner, tab);
      return { u1: calc('user1', '私帳').budgetLimit, u2: calc('user2', '私帳').budgetLimit, shared: calc('user1', '公費').budgetLimit };
    });
    expect(limits).toEqual({ u1: 20000, u2: 20000, shared: 70000 });

    // survives reload (per-device localStorage)
    await page.reload();
    await bootApp(page);
    await page.evaluate(() => showV37Tab('split'));
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(window.DB_BILLS).set({
        x1: { name: '晚餐', amt: '2000', currency: 'TWD', payer: 'user1', type: '公費', day: '11/13' },
        x2: { name: '計程車', amt: '800', currency: 'TWD', payer: 'user2', type: '公費', day: '11/13' }
      });
    });
    await expect(page.locator('#budgetPct')).toHaveText('4.0%');
  });

  test('private expense: bar + category update, PIN reload keeps it, private budget editable, shared untouched', async ({ page }) => {
    await page.evaluate(() => showV37Tab('split'));
    await page.locator('#tabPrivate').click();
    await page.locator('#pinInput').fill(PIN);
    await page.locator('#pinConfirmInput').fill(PIN);
    await page.locator('#pinSubmitBtn').click();
    await page.locator('#billName').fill('衣服購物');
    await page.locator('#billAmt').fill('640');
    await page.locator('#billCurrency').selectOption('TWD');
    await page.evaluate(() => addBill());
    await expect(page.locator('#budgetPct')).toHaveText('3.2%');
    await page.locator('#ownerBudgetEdit').click();
    await expect(page.locator('#ownerBudgetEditorLabel')).toContainText('溫');
    await page.locator('#ownerBudgetAmount').fill('6400');
    await page.getByRole('button', { name: '儲存預算' }).click();
    await expect(page.locator('#budgetPct')).toHaveText('10.0%');
    await expect(page.locator('#v37SplitChartContainer')).toContainText('$640');
    await page.locator('#tabShared').click();
    await expect(page.locator('#budgetPct')).toHaveText('0.0%');
    await expect(page.locator('#v37SplitChartContainer')).not.toContainText('購物');
    // ciphertext only at rest; no plaintext PIN / name / amount
    const vault = await page.evaluate(() => localStorage.getItem('busan_v45_private_vault_user1'));
    for (const clear of [PIN, '衣服購物', '"amt":640']) expect(vault).not.toContain(clear);
  });
});

test.describe('B. Restaurant offline outbox', () => {
  test('failed Firebase write is kept locally, survives reload, syncs once with stable id', async ({ page }) => {
    await page.evaluate(() => {
      const fail = async () => ({ success: false, error: 'PERMISSION_DENIED (synthetic)' });
      NetworkEngine.firebasePush = fail; NetworkEngine.firebaseWrite = fail; NetworkEngine.firebaseUpdate = fail;
    });
    await page.evaluate(() => { showV37Tab('home'); openGuideFolder('美食景點'); });
    await page.locator('#guideSubTabs').getByText('必吃美食').click();
    await page.locator('#btnFoodAdd').click();
    await page.locator('#gdTitle').fill('合成測試餐廳');
    await page.locator('#gdDesc').fill('備註 合成');
    await page.locator('#gdLink').fill('https://naver.me/synthetic1');
    await page.locator('#saveGuideBtn').click();
    await expect(page.locator('#guidePendingSyncBar')).toContainText(/僅|待同步|此裝置/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('busan_v46_guide_pending_v1') || '[]').length)).toBeGreaterThanOrEqual(1);

    await page.reload();
    await bootApp(page);
    const afterReload = await page.evaluate(() => ({
      queued: StorageEngine.get('busan_v46_guide_pending_v1', []).data,
      visible: (window.guideData || []).some(x => x.title === '合成測試餐廳')
    }));
    expect(afterReload.queued).toHaveLength(1);
    const key = afterReload.queued[0].key;
    expect(afterReload.queued[0].payload.link).toBe('https://naver.me/synthetic1');

    await page.evaluate(() => retryPendingGuideSync());
    await page.evaluate(() => retryPendingGuideSync());
    const server = await page.evaluate(async () => (await NetworkEngine._db.ref(DB_GUIDE).once('value')).val());
    const matches = Object.entries(server || {}).filter(([, v]) => v.title === '合成測試餐廳');
    expect(matches).toHaveLength(1);
    expect(matches[0][0]).toBe(key);
    expect(await page.evaluate(() => StorageEngine.get('busan_v46_guide_pending_v1', []).data)).toHaveLength(0);
  });

  test('edit goes through the same stable id and does not duplicate', async ({ page }) => {
    await page.evaluate(() => { showV37Tab('home'); openGuideFolder('美食景點'); });
    await page.locator('#guideSubTabs').getByText('必吃美食').click();
    await page.locator('#btnFoodAdd').click();
    await page.locator('#gdTitle').fill('可修改餐廳');
    await page.locator('#saveGuideBtn').click();
    await expect.poll(() => page.evaluate(async () => Object.keys((await NetworkEngine._db.ref(DB_GUIDE).once('value')).val() || {}).length)).toBe(1);
    const key = await page.evaluate(async () => Object.keys((await NetworkEngine._db.ref(DB_GUIDE).once('value')).val())[0]);
    await page.evaluate(k => editGuide(k), key);
    await expect(page.locator('#gdTitle')).toBeVisible();
    await page.locator('#gdTitle').fill('可修改餐廳 v2');
    await page.locator('#saveGuideBtn').click();
    await expect.poll(() => page.evaluate(async () => Object.values((await NetworkEngine._db.ref(DB_GUIDE).once('value')).val() || {}).map(v => v.title))).toEqual(['可修改餐廳 v2']);
  });
});

test.describe('C. Photos: EXIF + local-first', () => {
  test('EXIF date/time/GPS parsed, no-GPS fallback, bad file kept, reload, retry without duplicates', async ({ page }) => {
    const gps = jpegWithExif({ dateTime: '2026:11:08 13:14:20', lat: 35.153333, lon: 129.118333 });
    const plain = TINY_JPEG;
    const corrupt = Buffer.from('not really a jpeg');
    await page.evaluate(() => { NetworkEngine.uploadImage = async () => ({ success: false, error: 'imgbb down (synthetic)' }); });
    await page.locator('#photoImgUpload').setInputFiles([
      { name: 'gps.jpg', mimeType: 'image/jpeg', buffer: gps },
      { name: 'plain.jpg', mimeType: 'image/jpeg', buffer: plain },
      { name: 'corrupt.jpg', mimeType: 'image/jpeg', buffer: corrupt }
    ]);
    await expect.poll(() => page.evaluate(async () => (await PhotoLocalSafety.getPending()).length)).toBe(3);
    const meta = await page.evaluate(async () => (await PhotoLocalSafety.getPending()).map(r => ({ f: r.filename, ...r.metadata })));
    const g = meta.find(m => m.f === 'gps.jpg');
    expect(g.capturedAt).toBe('2026-11-08T13:14:20');
    expect(g.locationStatus).toBe('gps');
    expect(g.latitude).toBeCloseTo(35.153333, 3);
    expect(g.longitude).toBeCloseTo(129.118333, 3);
    const p = meta.find(m => m.f === 'plain.jpg');
    expect(p.capturedAt).toBeNull();
    expect(p.locationStatus).toBe('missing');

    await page.evaluate(() => showV37Tab('photo'));
    await expect(page.locator('#albumContainer')).toContainText('2026-11-08 13:14');
    await expect(page.locator('#albumContainer')).toContainText('35.15333, 129.11833');
    await expect(page.locator('#albumContainer')).toContainText('無定位');
    await expect(page.locator('#albumContainer')).toContainText('僅此裝置');
    await expect(page.locator('#photoRetrySync')).toBeVisible();

    await page.reload();
    await bootApp(page);
    await expect.poll(() => page.evaluate(async () => (await PhotoLocalSafety.getPending()).length)).toBe(3);

    await page.evaluate(() => {
      NetworkEngine.uploadImage = async () => ({ success: true, data: { url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' } });
    });
    await page.evaluate(() => retryPendingPhotos());
    await page.evaluate(() => retryPendingPhotos());
    const remote = await page.evaluate(async () => Object.values((await NetworkEngine._db.ref(DB_PHOTOS).once('value')).val() || {}));
    // corrupt file cannot be re-encoded -> stays local, never lost
    const left = await page.evaluate(async () => (await PhotoLocalSafety.getPending()).map(r => r.filename));
    expect(remote.length + left.length).toBe(3);
    expect(left).toEqual(['corrupt.jpg']);
    const gRemote = remote.find(r => r.capturedAt === '2026-11-08T13:14:20');
    expect(gRemote.location.latitude).toBeCloseTo(35.153333, 3);
    expect(remote.filter(r => r.location === null).length).toBe(1);
  });
});

for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 780 }]) {
  test.describe(`D. Galaxy S25 viewport ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: true, hasTouch: true, colorScheme: 'dark' });
    test('cream home, no black background, no horizontal overflow, nav visible', async ({ page }, info) => {
      const lum = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      for (const tab of ['home', 'itinerary', 'split', 'wallet', 'more']) {
        await page.evaluate(t => showV37Tab(t), tab);
        const r = await page.evaluate(() => ({
          bodyBg: getComputedStyle(document.body).backgroundColor,
          appBg: getComputedStyle(document.getElementById('mainApp')).backgroundColor,
          sw: document.documentElement.scrollWidth, iw: window.innerWidth
        }));
        expect(lum(r.bodyBg), `${tab} body ${r.bodyBg}`).toBeGreaterThan(190);
        expect(r.sw, `${tab} overflow`).toBeLessThanOrEqual(r.iw);
      }
      await page.evaluate(() => showV37Tab('home'));
      await page.screenshot({ path: `test-results/s25-home-${vp.width}.png` });
      await expect(page.locator('#tab-home')).toBeVisible();
      await expect(page.locator('#tab-bill')).toBeVisible();
      await page.evaluate(() => showV37Tab('split'));
      await page.locator('#ownerBudgetEdit').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/s25-budget-${vp.width}.png` });
    });
  });
}

test('E. PWA: new modules are precached and app boots offline', async ({ page, context }) => {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(k => k.includes('budget-photo-restaurant-v3')))).toBe(true);
  for (const f of ['restaurant-save-guard.js', 'photo-local-safe.js', 'owner-budget-settings.js']) {
    expect(await page.evaluate(async n => Boolean(await caches.match('./' + n)), f), f).toBe(true);
  }
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#mainApp', { state: 'visible', timeout: 15000 });
  expect(await page.evaluate(() => typeof window.retryPendingPhotos + typeof window.retryPendingGuideSync + typeof BudgetEngine.calculateBudget)).toBe('functionfunctionfunction');
  await context.setOffline(false);
});
