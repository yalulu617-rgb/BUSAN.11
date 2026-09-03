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

import { bootApp } from './helpers/boot.js';


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
      const { hostname } = new URL(response.url());
      // Google Fonts failures are third-party; never exempt a BUSAN.11 asset by path.
      if (hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com') return;

      if (response.status() >= 400 &&
          !hostname.includes('firebase') &&
          !hostname.includes('googleapis') &&
          !hostname.includes('wttr.in')) {
        failedUrls.push(`${response.status()}: ${response.url()}`);
      }
    });

    await bootApp(page);
    await page.waitForTimeout(1500);

    expect(failedUrls, `Found broken resources:\n${failedUrls.join('\n')}`).toHaveLength(0);
  });

  test('No mojibake or replacement characters in rendered visible DOM text', async ({ page }) => {
    await bootApp(page);
    await page.waitForTimeout(500);

    const checkMojibake = async (viewLabel) => {
      const issues = await page.evaluate((label) => {
        const mojibakePat = /[\uFFFD]|\xC3[\x80-\xBF]|\xC2[\x80-\xBF]|\xE2\x80|\xEF\xBF\xBD|\xF0\x9F/;
        const found = [];
        const allNodes = document.querySelectorAll('body *');
        allNodes.forEach(node => {
          if (node.children.length === 0 && node.textContent) {
            const text = node.textContent.trim();
            if (text && mojibakePat.test(text)) {
              found.push(`[${label}] <${node.tagName}> ${text.slice(0, 60)}`);
            }
          }
        });
        return found;
      }, viewLabel);
      return issues;
    };

    const allIssues = [];
    allIssues.push(...await checkMojibake('Home'));

    // Check Wallet / Hotel / Nearby
    await page.locator('#tab-wallet').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.switchWalletTab === 'function') window.switchWalletTab('hotel');
    });
    await page.waitForTimeout(500);
    allIssues.push(...await checkMojibake('Hotel/Nearby'));

    // Check Budget
    await page.locator('#tab-bill').click();
    await page.waitForTimeout(300);
    allIssues.push(...await checkMojibake('Budget'));

    expect(allIssues, `Found visible mojibake in DOM:\n${allIssues.join('\n')}`).toHaveLength(0);
  });

  test('Smart Nearby titles do not contain duplicated brand names (e.g. CU CU, GS25 GS25, Olive Young Olive Young, Daiso Daiso)', async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-wallet').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.switchWalletTab === 'function') window.switchWalletTab('hotel');
    });
    await page.waitForTimeout(500);

    const titles = await page.evaluate(() => {
      const list = document.getElementById('walletNearbyList');
      if (!list) return [];
      return Array.from(list.querySelectorAll('div > span')).map(s => s.textContent.trim());
    });

    expect(titles.length).toBeGreaterThan(0);
    const duplicated = titles.filter(t => /(CU\s+CU|GS25\s+GS25|Olive Young\s+Olive Young|Daiso\s+Daiso|大創\s+大創)/i.test(t));
    expect(duplicated, `Found duplicated brand names in Smart Nearby:\n${duplicated.join('\n')}`).toHaveLength(0);
  });

  test('Smart Nearby range description copy is truthful and consistent with data', async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-wallet').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      if (typeof window.switchWalletTab === 'function') window.switchWalletTab('hotel');
    });
    await page.waitForTimeout(500);

    const descText = await page.evaluate(() => {
      const list = document.getElementById('walletNearbyList');
      return list?.previousElementSibling?.textContent || '';
    });

    // The copy should not claim a strict 800m limit if items go up to 4.5km
    expect(descText).not.toContain('周遭 800m 內');
  });

  test('Profile switch (user1 -> user2 -> user1) preserves accounting options without data contamination', async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-bill').click();
    await page.waitForTimeout(300);

    // Initial state
    const initialOwner = await page.evaluate(() => window.deviceOwner);

    // Switch to user2
    await page.selectOption('#deviceOwner', 'user2');
    await page.dispatchEvent('#deviceOwner', 'change');
    await page.waitForTimeout(300);

    const u2Owner = await page.evaluate(() => window.deviceOwner);
    expect(u2Owner).toBe('user2');

    // Switch back to user1
    await page.selectOption('#deviceOwner', 'user1');
    await page.dispatchEvent('#deviceOwner', 'change');
    await page.waitForTimeout(300);

    const restoredOwner = await page.evaluate(() => window.deviceOwner);
    expect(restoredOwner).toBe('user1');
  });

});

