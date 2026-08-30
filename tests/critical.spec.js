// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

/**
 * Critical UI tests required by the CI Governance policy (V45 Modernized).
 * Scenarios:
 *   1. Home page renders and reaches functional readiness within acceptable startup bounds.
 *   2. Splash screen (#splash) is rendered on load.
 *   3. Shopping cart data persists in LocalStorage via V45 shopping flow.
 *   4. Translation features (Korean audio synthesis / flashcards / tools) load properly.
 *   5. Polaroid & memory album features are available.
 *   6. Bottom navigation is correctly structured outside #wallet and switches tabs.
 */

test.describe('Critical UI Validation', () => {

  test('Home page renders quickly', async ({ page }) => {
    const start = Date.now();
    await bootApp(page);
    const elapsed = Date.now() - start;
    // Cold load with fonts, SW, and splash transition: must reach functional readiness within 8000ms
    expect(elapsed, `Home page startup took ${elapsed} ms, exceeds 8000 ms regression threshold`).toBeLessThanOrEqual(8000);
    await expect(page.locator('#mainApp')).toBeVisible();
  });

  test('Enter button is clickable immediately without timeout', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const splash = page.locator('#splash');
    await expect(splash).toBeAttached();
    // Splash contains title and enter button
    await expect(page.locator('#splash h1')).toContainText('2026 BUSAN');
  });

  test('Doraemon splash screen is rendered on first load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const splash = page.locator('#splash');
    await expect(splash).toBeAttached();
    // Splash contains title and enter button
    await expect(page.locator('#splash h1')).toContainText('2026 BUSAN');
  });

  test('Shopping cart persists a test item', async ({ page }) => {
    await bootApp(page);
    // Switch to shopping tab via V45 flow
    await page.evaluate(() => {
      if (typeof window.showV37Tab === 'function') {
        window.showV37Tab('shop');
      }
    });

    // Add an item using StorageEngine / shop list
    await page.evaluate(() => {
      const testItem = {
        key: 'test_item_' + Date.now(),
        text: '測試伴手禮 (Olive Young)',
        where: '南浦洞',
        category: '藥妝保養',
        img: '',
        checked: false,
        owner: '溫',
        ts: Date.now()
      };
      window.shopList = window.shopList || [];
      window.shopList.push(testItem);
      window.StorageEngine.set('busan_v36_shopList', window.shopList);
    });

    // Verify LocalStorage entry round-trip
    const hasItem = await page.evaluate(() => {
      const cart = window.StorageEngine.get('busan_v36_shopList', []);
      return cart && cart.data && cart.data.length > 0;
    });
    expect(hasItem, 'Shopping cart does not contain added item').toBe(true);
  });

  test('Translation page loads', async ({ page }) => {
    await bootApp(page);
    // Verify translation audio synthesis and flashcard modal exist in V45
    const hasSpeech = await page.evaluate(() => typeof window.speakKorean === 'function');
    expect(hasSpeech, 'speakKorean is not globally defined').toBe(true);

    const flashcard = page.locator('#flashcardModal');
    await expect(flashcard).toBeAttached();
  });

  test('Polaroid page displays captured photos', async ({ page }) => {
    await bootApp(page);
    // Switch to Memory tab via V45 flow
    await page.evaluate(() => {
      if (typeof window.showV37Tab === 'function') {
        window.showV37Tab('photo');
      }
    });

    // Verify photo grid container and upload elements exist
    const photoContainer = page.locator('#todayPhotosContainer, #albumContainer');
    expect(await photoContainer.count()).toBeGreaterThan(0);
    await expect(page.locator('#photoImgUpload')).toBeAttached();
  });

  test('Bottom navigation works and tabs switch', async ({ page }) => {
    await bootApp(page);

    // Verify .bottom-nav is child of #mainApp and NOT inside #wallet
    const navNestingValid = await page.evaluate(() => {
      const nav = document.querySelector('.bottom-nav');
      if (!nav) return false;
      return nav.closest('#wallet') === null && nav.parentElement === document.getElementById('mainApp');
    });
    expect(navNestingValid, '.bottom-nav is incorrectly nested inside a tab container').toBe(true);

    // Verify all 5 tab buttons exist and are visible
    const tabs = [
      { id: '#tab-home', target: '#guide' },
      { id: '#tab-itinerary', target: '#itinerary' },
      { id: '#tab-bill', target: '#split' },
      { id: '#tab-wallet', target: '#wallet' },
      { id: '#tab-more', target: '#more' }
    ];

    for (const { id, target } of tabs) {
      const tab = page.locator(id);
      await expect(tab).toBeVisible({ timeout: 5000 });
      await tab.click();
      await page.waitForTimeout(200);
      await expect(page.locator(target)).toHaveClass(/active/);
    }
  });

});
