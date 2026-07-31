// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 - Autonomous UX Verification Test Suite
 * Detects:
 * - Duplicate buttons, navigation items, cards, shortcuts
 * - Blank pages or broken panels
 * - 404 resources or broken assets
 * - Information overload on homepage (5-second rule)
 */

async function bootApp(page) {
  await page.goto('/');
  await page.waitForSelector('#splash, #mainApp', { timeout: 15000 });
  const splash = page.locator('#splash');
  if (await splash.isVisible().catch(() => false)) {
    const enterBtn = page.locator('.btn-enter');
    if (await enterBtn.isVisible()) await enterBtn.click();
  }
  await page.waitForSelector('#mainApp', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('UX Verification & Sanity Audit', () => {

  test('Homepage 5-Second Rule: Understandable and not overloaded', async ({ page }) => {
    const start = Date.now();
    await bootApp(page);
    const elapsed = Date.now() - start;

    expect(elapsed, 'Homepage load took longer than 5 seconds').toBeLessThanOrEqual(5000);

    // Hero card or today card must be clearly visible
    const heroCard = page.locator('#hero-card, .hero-card, .today-card').first();
    await expect(heroCard).toBeVisible();

    // Check visible text count on hero section to prevent overload
    const heroText = await heroCard.innerText();
    expect(heroText.length, 'Hero section text overload').toBeLessThan(1000);
  });

  test('No duplicate navigation buttons in bottom nav', async ({ page }) => {
    await bootApp(page);
    const navButtons = page.locator('.bottom-nav button, .bottom-nav .nav-item');
    const count = await navButtons.count();

    const ids = [];
    for (let i = 0; i < count; i++) {
      const id = await navButtons.nth(i).getAttribute('id');
      if (id) {
        expect(ids.includes(id), `Duplicate navigation ID found: ${id}`).toBe(false);
        ids.push(id);
      }
    }
  });

  test('No duplicate DOM IDs in critical application containers', async ({ page }) => {
    await bootApp(page);
    const duplicateIds = await page.evaluate(() => {
      const allElements = document.querySelectorAll('[id]');
      const ids = new Set();
      const duplicates = [];
      allElements.forEach(el => {
        if (ids.has(el.id)) {
          duplicates.push(el.id);
        } else {
          ids.add(el.id);
        }
      });
      return duplicates;
    });

    expect(duplicateIds, `Found duplicate DOM IDs: ${duplicateIds.join(', ')}`).toHaveLength(0);
  });

  test('No blank panels when navigating tabs', async ({ page }) => {
    await bootApp(page);
    const tabs = ['#tab-home', '#tab-itinerary', '#tab-bill', '#tab-wallet'];

    for (const tabSelector of tabs) {
      const tabBtn = page.locator(tabSelector);
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(300);

        // Active panel should contain visible content
        const activePanel = page.locator('.tab-panel.active, section.active, .page-panel:not([style*="display: none"])').first();
        if (await activePanel.count() > 0) {
          const text = await activePanel.innerText();
          expect(text.trim().length, `Tab ${tabSelector} rendered a blank panel`).toBeGreaterThan(10);
        }
      }
    }
  });

  test('No 404 or broken images/resources', async ({ page }) => {
    const failedUrls = [];
    page.on('response', response => {
      if (response.status() >= 400 &&
          !response.url().includes('firebase') &&
          !response.url().includes('googleapis') &&
          !response.url().includes('wttr.in')) {
        failedUrls.push(`${response.status()}: ${response.url()}`);
      }
    });

    await bootApp(page);
    await page.waitForTimeout(1500);

    expect(failedUrls, `Found broken resources:\n${failedUrls.join('\n')}`).toHaveLength(0);
  });
});
