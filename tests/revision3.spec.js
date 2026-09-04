import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the real functions without starting a browser or contacting Firebase.
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function loadFunction(context, path, name, indent = '') {
  const code = source(path).match(new RegExp(`window\\.${name} = [\\s\\S]*?^${indent}};`, 'm'));
  if (!code) throw new Error(`Missing function: ${name}`);
  vm.runInContext(code[0], context);
}
function sandbox(values = {}) {
  const context = vm.createContext(values);
  context.window = context;
  return context;
}

test('Revision 3: private rows and totals follow payer while shared accounting stays unchanged', () => {
  const sharedBills = [
    { key: 's1', name: 'Shared meal', amt: 100, currency: 'TWD', payer: 'user1', type: '公費', day: '11/13' },
    { key: 's2', name: 'Shared taxi', amt: 300, currency: 'TWD', payer: 'user2', type: '公費', day: '11/13' }
  ];
  const privateBills = [
    { id: 'p1', name: 'Private one', amt: 100, currency: 'KRW', payer: 'user1', type: '私帳', day: '11/13' },
    { id: 'p2', name: 'Private two', amt: 90, currency: 'TWD', payer: 'user2', owner: 'user1', type: '私帳', day: '11/13' },
    { id: 'p3', name: 'Unassigned private', amt: 1000, currency: 'TWD', owner: 'user1', type: '私帳', day: '11/13' }
  ];
  const original = JSON.stringify({ sharedBills, privateBills });
  const elements = Object.fromEntries(['billList', 'pbList', 'sharedBillsSum', 'privateBillsSum'].map(id => [id, {}]));
  const ctx = sandbox({ sharedBills, privateBills, liveKrwToTwd: 0.025,
    document: { getElementById: id => elements[id] }, safePrice: amt => String(amt) });
  vm.runInContext(source('ute/ute_budget.js'), ctx);
  loadFunction(ctx, 'components/renderers.js', 'renderBills');
  loadFunction(ctx, 'components/renderers.js', 'renderPrivateBill');
  let sharedHtml;
  for (const [owner, amount, visible, hidden] of [
    ['user1', 2.5, 'Private one', 'Private two'],
    ['user2', 90, 'Private two', 'Private one'],
    ['user1', 2.5, 'Private one', 'Private two'],
    ['user3', 0, '尚無個人私帳記帳紀錄', 'Private one']
  ]) {
    ctx.deviceOwner = owner;
    const budget = ctx.BudgetEngine.calculateBudget(sharedBills, privateBills, 0.025, '11/13', {}, {}, owner, '私帳');
    ctx.getTripContext = () => ({ budget });
    ctx.renderBills();
    expect(elements.pbList.innerHTML).toContain(visible);
    expect(elements.pbList.innerHTML).not.toContain(hidden);
    expect(elements.pbList.innerHTML).not.toContain('Unassigned private');
    expect(budget.totalPrivateTWD).toBe(amount);
    expect(budget.dailySpend).toBe(400 + amount);
    expect(budget.categories.reduce((sum, category) => sum + category.value, 0)).toBe(amount);
    expect(elements.privateBillsSum.innerText).toBe(`$${Math.round(amount)} TWD`);
    expect(budget.totalSharedTWD).toBe(400);
    expect(budget.u1Balance).toBe(-100);
    const publicBudget = ctx.BudgetEngine.calculateBudget(sharedBills, privateBills, 0.025, '11/13', {}, {}, owner, '公費');
    expect(publicBudget.categories.reduce((sum, category) => sum + category.value, 0)).toBe(400);
    expect(publicBudget.budgetText).toBe('已花費 $400 / 設定預算 $50,000');
    sharedHtml ??= elements.billList.innerHTML;
    expect(elements.billList.innerHTML).toBe(sharedHtml);
  }
  expect(JSON.stringify({ sharedBills, privateBills })).toBe(original);
});

test('Revision 3: encrypted private writes use the current owner even with a stale payer selection', async () => {
  const existing = { id: 'old', name: 'Existing record', payer: 'user2', amt: 15 };
  const stored = [existing];
  const writes = [];
  const fields = Object.fromEntries(Object.entries({ billName: 'New bill', billAmt: '50', billCurrency: 'TWD',
    billType: '私帳', payer: 'user2', payMethod: '現金', tempReceipt: '' }).map(([id, value]) => [id, { value }]));
  const ctx = sandbox({ document: { getElementById: id => fields[id] },
    crypto: { getRandomValues: values => { values[0] = 7; return values; } },
    PrivateLedgerEngine: {
      add: async (owner, bill) => stored.push({ ...bill, payer: owner }),
      getBills: owner => stored.filter(bill => bill.payer === owner)
    },
    ensurePrivateLedgerUnlocked: async () => true,
    refreshAccountingNow() {},
    NetworkEngine: { firebasePush: async (path, bill) => writes.push({ path, bill }) },
    DB_BILLS: 'bills', getV37SelectedDate: () => '11/13', showToast() {}, triggerContextUpdate() {} });
  loadFunction(ctx, 'js/app.js', 'addBill', '    ');
  for (const owner of ['user1', 'user2']) {
    ctx.deviceOwner = owner;
    fields.payer.value = owner === 'user1' ? 'user2' : 'user1';
    fields.billName.value = 'New private';
    fields.billAmt.value = '50';
    await ctx.addBill();
    expect(stored.at(-1).payer).toBe(owner);
  }
  expect(stored[0]).toEqual(existing);
  expect(stored).toHaveLength(3);
  expect(writes).toHaveLength(0);
  ctx.deviceOwner = 'user1';
  fields.billType.value = '公費';
  fields.payer.value = 'user2';
  fields.billName.value = 'Shared purchase';
  fields.billAmt.value = '80';
  await ctx.addBill();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ path: 'bills', bill: { payer: 'user2', type: '公費', amt: 80 } });
  expect(stored).toHaveLength(3);
});

test('Revision 3: built-in stores appear once with clean display names', () => {
  const ctx = sandbox();
  vm.runInContext(source('data/travel-content.js'), ctx);
  vm.runInContext(source('data/recommended.js'), ctx);
  const items = ctx.RECOMMENDED_SHOPPING;
  for (const name of ['SCENTICA 香水店', 'OLIVE YOUNG 南浦洞店']) {
    const matches = items.filter(item => item.name === name);
    expect(matches).toHaveLength(1);
    expect(matches[0].desc).not.toContain('\uFFFD');
  }
  expect(new Set(items.map(item => item.id)).size).toBe(items.length);
  expect(ctx.SMART_NEARBY_DATABASE.Busan.filter(item => item.name === 'Olive Young 西面中央店')).toHaveLength(1);
});
