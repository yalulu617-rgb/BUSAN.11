// @ts-check
import { test, expect } from '@playwright/test';
/**
 * Critical UI tests required by the CI Governance policy.
 * Scenarios:
 *   1. Home page loads within 3 seconds.
 *   2. Doraemon splash image (#splash-img) becomes visible.
 *   3. Shopping cart data exists in localStorage after adding an item.
 *   4. Translation page (#tab-translate) renders correctly.
 *   5. Polaroid page (#tab-polaroid) displays captured photos.
 *   6. Bottom navigation is reachable and functional.
 */

async function boot(page) {
  await page.goto('/');
  // Ensure app booted
  await page.waitForSelector('#mainApp', { state: 'visible', timeout: 12000 });
}

test.describe('Critical UI Validation', () => {
  test('Home page renders quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('#mainApp', { state: 'visible', timeout: 8000 });
    const elapsed = Date.now() - start;
    expect(elapsed, `Home page took ${elapsed} ms, exceeds 3000 ms`).toBeLessThanOrEqual(3000);
  });

  test('Doraemon splash image is visible', async ({ page }) => {
    await boot(page);
    const img = page.locator('#splash-img');
    await expect(img).toBeVisible({ timeout: 5000 });
  });

  test('Shopping cart persists a test item', async ({ page }) => {
    await boot(page);
    // Open shop tab and add first item (assumes .shop-item button exists)
    await page.locator('#tab-shop').click();
    const addBtn = page.locator('.shop-item button').first();
    await addBtn.click();
    // Verify LocalStorage entry
    const hasItem = await page.evaluate(() => {
      const cart = window.StorageEngine.get('busan_v36_cart', []);
      return cart && cart.data && cart.data.length > 0;
    });
    expect(hasItem, 'Cart does not contain added item').toBe(true);
  });

  test('Translation page loads', async ({ page }) => {
    await boot(page);
    await page.locator('#tab-translate').click();
    await expect(page.locator('.translation-panel')).toBeVisible({ timeout: 6000 });
  });

  test('Polaroid page displays captured photos', async ({ page }) => {
    await boot(page);
    await page.locator('#tab-polaroid').click();
    // Simulate capture if needed – assume a button .capture-btn
    const captureBtn = page.locator('.capture-btn').first();
    if (await captureBtn.isVisible()) {
      await captureBtn.click();
    }
    await expect(page.locator('.polaroid-photo')).toBeVisible({ timeout: 6000 });
  });

  test('Bottom navigation works and tabs switch', async ({ page }) => {
    await boot(page);
    const navItems = page.locator('.bottom-nav .nav-item');
    const count = await navItems.count();
    for (let i = 0; i < count; i++) {
      const tab = navItems.nth(i);
      await tab.click();
      // Verify a content area becomes visible after each click
      const panel = page.locator(`#panel-${i}`);
      await expect(panel).toBeVisible({ timeout: 4000 });
    }
  });
});
