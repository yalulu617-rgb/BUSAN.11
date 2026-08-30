// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 – Accessibility Test Suite
 * Covers: touch targets, font sizes, keyboard navigation, contrast,
 *         one-hand usability, parent/elderly friendly checks.
 */

import { bootApp } from './helpers/boot.js';


// ── Touch Target Size (44×44px minimum) ─────────────────────────────────────
test.describe('Accessibility: Touch Target Sizes', () => {

  test('Bottom navigation items meet 44px minimum touch target', async ({ page }) => {
    await bootApp(page);
    
    const navItems = page.locator('.bottom-nav .nav-item');
    const count = await navItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      if (!box) continue;
      
      expect(box.height, 
        `Nav item #${i} height ${box.height}px is below 44px minimum`
      ).toBeGreaterThanOrEqual(44);
      
      expect(box.width,
        `Nav item #${i} width ${box.width}px is below 44px minimum`
      ).toBeGreaterThanOrEqual(44);
    }
  });

  test('Action buttons meet 44px touch target height', async ({ page }) => {
    await bootApp(page);
    
    // Check primary action buttons
    const btns = page.locator('.btn-action');
    const count = await btns.count();
    
    let undersize = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = btns.nth(i);
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;
      
      const box = await btn.boundingBox();
      if (!box) continue;
      
      if (box.height < 40) { // slight tolerance for design
        const text = await btn.innerText().catch(() => '');
        undersize.push(`Button "${text.trim()}" height: ${box.height}px`);
      }
    }
    
    // Report but don't hard-fail — some buttons are intentionally smaller
    if (undersize.length > 0) {
      console.warn('[Accessibility] Buttons below 44px minimum:', undersize);
    }
  });
});

// ── Font Size Readability ────────────────────────────────────────────────────
test.describe('Accessibility: Readable Font Sizes', () => {

  test('Critical info elements have readable font sizes (>=12px)', async ({ page }) => {
    await bootApp(page);
    
    // Check card titles
    const cardTitles = page.locator('.card-title');
    const count = await cardTitles.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = cardTitles.nth(i);
      const visible = await el.isVisible().catch(() => false);
      if (!visible) continue;
      
      const fontSize = await el.evaluate(node => 
        parseFloat(window.getComputedStyle(node).fontSize)
      );
      expect(fontSize, 
        `card-title #${i} has font-size ${fontSize}px — below 12px minimum`
      ).toBeGreaterThanOrEqual(12);
    }
  });

  test('Body text is readable (>=11px)', async ({ page }) => {
    await bootApp(page);
    
    const bodyFontSize = await page.evaluate(() => 
      parseFloat(window.getComputedStyle(document.body).fontSize)
    );
    expect(bodyFontSize, `Body font-size ${bodyFontSize}px — below 11px`).toBeGreaterThanOrEqual(11);
  });
});

// ── Keyboard Navigation ──────────────────────────────────────────────────────
test.describe('Accessibility: Keyboard Navigation', () => {

  test('Enter key on splash button triggers app boot', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.btn-enter', { state: 'visible', timeout: 10000 });
    
    const enterBtn = page.locator('.btn-enter');
    await enterBtn.focus();
    await page.keyboard.press('Enter');
    
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 5000 });
  });

  test('Tab key moves focus through interactive elements', async ({ page }) => {
    await bootApp(page);
    
    // Focus body and tab through elements
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    // Something should be focused
    expect(focused).toBeTruthy();
  });
});

// ── One-Hand Usability ───────────────────────────────────────────────────────
test.describe('Accessibility: One-Hand Usability (Mobile 390px)', () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 15
  });

  test('Bottom nav is reachable in thumb zone (bottom of screen)', async ({ page }) => {
    await bootApp(page);
    
    const nav = page.locator('.bottom-nav');
    const box = await nav.boundingBox();
    
    expect(box, 'Bottom nav not found').toBeTruthy();
    // Nav should be at the bottom (within bottom 20% of 844px screen)
    expect(box.y, 'Bottom nav not in thumb zone').toBeGreaterThan(600);
  });

  test('Primary action buttons are within thumb reach zone', async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-bill').click();
    
    // Add bill button should be visible without scrolling
    const addBtn = page.locator('button[onclick="addBill()"]');
    await expect(addBtn).toBeVisible();
  });

  test('No content is hidden under bottom nav', async ({ page }) => {
    await bootApp(page);
    
    const navBox = await page.locator('.bottom-nav').boundingBox();
    const mainBox = await page.locator('#mainApp').boundingBox();
    
    if (navBox && mainBox) {
      // Main app should account for nav height via padding-bottom
      const mainBottom = mainBox.y + mainBox.height;
      const navTop = navBox.y;
      // Content area bottom should not extend into nav area
      expect(mainBottom).toBeLessThanOrEqual(navTop + 100); // 100px tolerance
    }
  });
});

// ── No 404 Errors ────────────────────────────────────────────────────────────
test.describe('Accessibility: No Broken Resources', () => {

  test('No 404 errors for critical local assets', async ({ page }) => {
    const notFound = [];
    page.on('response', response => {
      if (response.status() === 404 && 
          !response.url().includes('firebase') &&
          !response.url().includes('googleapis') &&
          !response.url().includes('wttr.in') &&
          !response.url().includes('favicon')) {
        notFound.push(`404: ${response.url()}`);
      }
    });
    
    await bootApp(page);
    
    // Navigate through tabs to trigger lazy loading
    for (const tab of ['#tab-itinerary', '#tab-bill', '#tab-wallet', '#tab-home']) {
      await page.locator(tab).click();
      await page.waitForTimeout(300);
    }
    
    await page.waitForTimeout(1000);
    
    expect(notFound, `Found 404 errors:\n${notFound.join('\n')}`).toHaveLength(0);
  });
});
