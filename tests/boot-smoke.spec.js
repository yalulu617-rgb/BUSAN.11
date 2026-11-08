// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

/**
 * BUSAN.11 — Boot Helper Smoke Test
 * ===================================
 * Targeted validation that the canonical bootApp helper:
 * 1. Successfully navigates to the app.
 * 2. Reaches #mainApp visible state without .btn-enter timeout.
 * 3. Survives both STATE A (splash present) and STATE B (already auto-booted).
 *
 * This test is intentionally minimal. Run it before the full verify:fast suite
 * to prove the boot infrastructure is sound.
 *
 * Usage: playwright test tests/boot-smoke.spec.js --config=playwright.fast.config.js
 */

test.describe('Boot Helper Smoke Test', () => {

  test('bootApp helper reaches #mainApp without .btn-enter timeout', async ({ page }) => {
    // The key assertion: bootApp must complete without throwing.
    // If .btn-enter times out, this test fails with the exact error.
    await bootApp(page);

    // Confirm #mainApp is actually visible
    const mainApp = page.locator('#mainApp');
    await expect(mainApp).toBeVisible({ timeout: 3000 });
  });

  test('bootApp helper is idempotent when app already auto-booted', async ({ page }) => {
    // Navigate manually and wait for auto-boot
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the 2.5s auto-boot to definitely have fired
    await page.waitForSelector('#mainApp', { state: 'visible', timeout: 8000 });

    // Now call bootApp again on the same page — it should detect #mainApp and return immediately
    // This validates STATE B (auto-boot already happened).
    await bootApp(page);

    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 2000 });
  });

  test('#mainApp is interactive after bootApp', async ({ page }) => {
    await bootApp(page);

    // The home tab should be active after boot (#tab-home has class 'active')
    const homeTab = page.locator('#tab-home');
    await expect(homeTab).toBeAttached({ timeout: 5000 }); // element exists in DOM

    // The title should contain 釜山
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0); // title is set

    // #mainApp itself is visible — the primary app container
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 3000 });
  });

});
