import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

// All writes in this spec target the disposable CI-only Firebase facade.
// Never use user records, and never execute this test against production.
test.beforeEach(async ({ page }) => {
  await bootApp(page);
  expect(await page.evaluate(() =>
    Boolean(window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly)
  )).toBe(true);
  await page.evaluate(() => showV37Tab('split'));
});

test('OWNER private entry updates 0% and empty category chart while preserving 50/50 separation', async ({ page }) => {
  await page.locator('#tabPrivate').click();
  await page.locator('#pinInput').fill('482648264826');
  await page.locator('#pinConfirmInput').fill('482648264826');
  await page.locator('#pinSubmitBtn').click();
  await expect(page.locator('#tabPrivate')).toHaveClass(/active/);
  await expect(page.locator('#billType')).toHaveValue('私帳');
  await page.locator('#billName').fill('衣服購物');
  await page.locator('#billAmt').fill('640');
  await page.locator('#billCurrency').selectOption('TWD');
  await page.evaluate(() => addBill());
  await expect(page.locator('#pbList')).toContainText('衣服購物');
  await expect(page.locator('#budgetPct')).toHaveText('3.2%');
  await expect(page.locator('#budgetText')).toContainText('$640');
  await expect(page.locator('#budgetScopeLabel')).toHaveText('個人私帳預算水位');
  await expect(page.locator('#v37SplitChartContainer')).toContainText('購物');
  await expect(page.locator('#v37SplitChartContainer')).toContainText('$640');
  await expect(page.locator('#billList')).toBeHidden();
  await expect(page.locator('#settlement')).toBeHidden();
  await page.locator('#tabShared').click();
  await expect(page.locator('#billType')).toHaveValue('公費');
  await expect(page.locator('#budgetPct')).toHaveText('0.0%');
  await expect(page.locator('#budgetText')).toContainText('已花費 $0');
  await expect(page.locator('#v37SplitChartContainer')).not.toContainText('購物');
  await expect(page.locator('#pbList')).toBeHidden();
  await expect(page.locator('#pbList')).not.toContainText('衣服購物');
  await expect(page.locator('#settlement')).not.toContainText('衣服購物');
});

test('OWNER shared TWD string amounts, category and 50/50 settlement exclude private expenses', async ({ page }) => {
  await page.evaluate(async () => {
    await window.NetworkEngine._db.ref(window.DB_BILLS).set({
      x1: {name:'午餐',amt:'2000',currency:'TWD',payer:'user1',type:'公費',day:'11/13'},
      x2: {name:'車票',amt:'800',currency:'TWD',payer:'user2',type:'公費',day:'11/13'},
      accidentalPrivate: {name:'不應計算私帳',amt:'777',currency:'TWD',payer:'user1',type:'私帳',day:'11/13'}
    });
  });
  await expect(page.locator('#budgetPct')).toHaveText('5.6%');
  await expect(page.locator('#budgetText')).toContainText('$2,800');
  await expect(page.locator('#v37SplitChartContainer')).toContainText('餐飲');
  await expect(page.locator('#v37SplitChartContainer')).toContainText('交通');
  await expect(page.locator('#settlement')).toContainText('$600');
  expect(await page.evaluate(() => {
    const b = BudgetEngine.calculateBudget(window.sharedBills, [
      {name:'個人衣服',amt:1000,currency:'TWD',payer:'user1',type:'私帳'}
    ],0.025,'11/13',window.u1,window.u2,'user1','公費');
    return {shared:b.totalSharedTWD,net:b.u1Balance,categories:b.categories.reduce((a,c)=>a+c.value,0)};
  })).toEqual({shared:2800,net:600,categories:2800});
  await expect(page.locator('#settlement')).not.toContainText('不應計算私帳');
});

test('OWNER manually selecting private expense type requires PIN and aligns the ledger', async ({ page }) => {
  await page.locator('#billType').selectOption('私帳');
  await expect(page.locator('#pinModal')).toBeVisible();
  await page.locator('#pinModal button').first().click();
  await expect(page.locator('#billType')).toHaveValue('公費');
  await expect(page.locator('#tabShared')).toHaveClass(/active/);
});
