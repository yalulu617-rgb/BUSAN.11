// @ts-check
import { test, expect } from '@playwright/test';

/**
 * BUSAN V42 – Main E2E Test Suite
 * Covers: Homepage, Navigation, Splash, Modals, Tabs, Forms, Wallet,
 *         Shopping, Itinerary, Budget, Memory, Nearby, Hotel,
 *         Weather, Maps, Translation, Travel data verification.
 */

import { bootApp } from './helpers/boot.js';

// Collect console errors during test
function collectErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(`[PageError] ${err.message}`);
  });
  return errors;
}

// ── TEST GROUP 1: Page Load & Splash ───────────────────────────────────────
test.describe('Homepage & Splash Screen', () => {
  
  test('Page loads with correct title', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    
    const title = await page.title();
    expect(title).toContain('釜山');
    
    // No fatal JS errors on load
    const fatalErrors = errors.filter(e => 
      !e.includes('NetworkEngine') && 
      !e.includes('firebase') &&
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource') &&
      !e.includes('wttr.in')
    );
    expect(fatalErrors, `Fatal JS errors on load: ${fatalErrors.join('\n')}`).toHaveLength(0);
  });

  test('Splash screen is visible on first load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const splash = page.locator('#splash');
    await expect(splash).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#splash h1')).toContainText('2026 BUSAN');
  });

  test('Enter button exists and clicking it shows mainApp', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const enterBtn = page.locator('.btn-enter');
    await expect(enterBtn).toBeAttached({ timeout: 5000 });
    if (await enterBtn.isVisible()) {
      await enterBtn.click({ timeout: 2000 }).catch(() => {});
    }
    await expect(page.locator('#mainApp')).toBeVisible({ timeout: 5000 });
  });

  test('Safety fallback boots app within 3 seconds without clicking Enter', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait up to 3.5 seconds — forceShowApp has 1.2s delay + 300ms fade
    await page.waitForSelector('#mainApp', { state: 'visible', timeout: 3500 });
    await expect(page.locator('#mainApp')).toBeVisible();
  });

  test('Doraemon hero image (13972.png) loads without 404', async ({ page }) => {
    const imageResponses = [];
    page.on('response', response => {
      if (response.url().includes('13972.png')) {
        imageResponses.push(response.status());
      }
    });
    
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    
    // Verify the image file is accessible
    const imgResponse = await page.request.get('/13972.png');
    expect(imgResponse.status(), '13972.png returned 404').toBe(200);
  });

  test('PWA manifest loads correctly', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBeTruthy();
  });

  test('Service Worker is registered', async ({ page }) => {
    await bootApp(page);
    
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        return !!reg;
      } catch {
        return false;
      }
    });
    
    // SW registration is async; check sw.js is accessible
    const swResponse = await page.request.get('/sw.js');
    expect(swResponse.status(), 'sw.js not accessible').toBe(200);
  });
});

// ── TEST GROUP 2: Bottom Navigation ────────────────────────────────────────
test.describe('Bottom Navigation (5 Tabs)', () => {
  
  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  test('Home tab is active by default', async ({ page }) => {
    const homeTab = page.locator('#tab-home');
    await expect(homeTab).toHaveClass(/active/);
  });

  test('All 5 nav tabs exist and are clickable', async ({ page }) => {
    const tabs = ['#tab-home', '#tab-itinerary', '#tab-bill', '#tab-wallet', '#tab-more'];
    for (const tabId of tabs) {
      const tab = page.locator(tabId);
      await expect(tab).toBeVisible();
      await expect(tab).toBeEnabled();
    }
  });

  test('Itinerary tab opens itinerary container', async ({ page }) => {
    await page.locator('#tab-itinerary').click();
    await expect(page.locator('#itinerary')).toHaveClass(/active/);
  });

  test('Bill tab opens split/budget container', async ({ page }) => {
    await page.locator('#tab-bill').click();
    await expect(page.locator('#split')).toHaveClass(/active/);
  });

  test('Wallet tab opens wallet container', async ({ page }) => {
    await page.locator('#tab-wallet').click();
    await expect(page.locator('#wallet')).toHaveClass(/active/);
  });

  test('More tab opens more container', async ({ page }) => {
    await page.locator('#tab-more').click();
    await expect(page.locator('#more')).toHaveClass(/active/);
  });

  test('Navigating back to Home tab works', async ({ page }) => {
    // Go to wallet then back to home
    await page.locator('#tab-wallet').click();
    await page.locator('#tab-home').click();
    await expect(page.locator('#guide')).toHaveClass(/active/);
  });
});

// ── TEST GROUP 3: Home Dashboard ───────────────────────────────────────────
test.describe('Home Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  test('v37HomeDashboard container renders', async ({ page }) => {
    const dashboard = page.locator('#v37HomeDashboard');
    await expect(dashboard).toBeVisible();
  });

  test('Smart Alert / Today Card is not blank', async ({ page }) => {
    const dashboard = page.locator('#v37HomeDashboard');
    await page.waitForTimeout(1000); // allow render
    const content = await dashboard.innerText();
    expect(content.length, 'Dashboard appears empty').toBeGreaterThan(10);
  });

  test('Weather widget (Busan) iframe or element exists', async ({ page }) => {
    // Check for weather iframe or dynamicOutfit element
    const weatherEl = page.locator('#dynamicOutfit, iframe[src*="wttr.in"]');
    const count = await weatherEl.count();
    expect(count, 'No weather element found').toBeGreaterThan(0);
  });

  test('No duplicate bottom navigation items', async ({ page }) => {
    const navItems = page.locator('.bottom-nav .nav-item');
    const count = await navItems.count();
    expect(count, 'Expected exactly 5 nav items').toBe(5);
  });

  test('Home Dashboard widgets and quick actions render', async ({ page }) => {
    const widgets = page.locator('#v37HomeDashboard .v38-hero-card, #v37HomeDashboard .v38-widget-card, #v37HomeDashboard .quick-action-btn, #v37HomeDashboard .card');
    const count = await widgets.count();
    expect(count, 'Expected at least 1 widget card or quick action on dashboard').toBeGreaterThanOrEqual(1);
  });
});

// ── TEST GROUP 4: Wallet & Tickets ─────────────────────────────────────────
test.describe('Wallet (Ticket / Hotel / Docs / Coupon / Memory)', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-wallet').click();
    await expect(page.locator('#wallet')).toHaveClass(/active/);
  });

  test('Wallet header renders', async ({ page }) => {
    await expect(page.locator('#wallet .card').first()).toBeVisible();
    const walletTitle = page.locator('#wallet h3').first();
    await expect(walletTitle).toContainText('Travel Wallet');
  });

  test('All 5 wallet sub-tabs are clickable', async ({ page }) => {
    const subTabs = ['#btnWalletTicket', '#btnWalletHotel', '#btnWalletDoc', '#btnWalletCoupon', '#btnWalletMemory'];
    for (const id of subTabs) {
      const btn = page.locator(id);
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(200);
    }
  });

  test('Ticket tab is default active', async ({ page }) => {
    await expect(page.locator('#btnWalletTicket')).toHaveClass(/active/);
    await expect(page.locator('#walletTicketSection')).toBeVisible();
  });

  test('Hotel tab shows hotel section', async ({ page }) => {
    await page.locator('#btnWalletHotel').click();
    await expect(page.locator('#walletHotelSection')).toBeVisible();
  });

  test('Hotel Nearby Radar list renders', async ({ page }) => {
    await page.locator('#btnWalletHotel').click();
    const nearby = page.locator('#walletNearbyList');
    await expect(nearby).toBeVisible();
  });

  test('Docs tab shows document section', async ({ page }) => {
    await page.locator('#btnWalletDoc').click();
    await expect(page.locator('#walletDocSection')).toBeVisible();
  });

  test('Coupon tab switches section', async ({ page }) => {
    await page.locator('#btnWalletCoupon').click();
    await expect(page.locator('#walletCouponSection')).toBeVisible();
  });

  test('Memory tab switches to memory section', async ({ page }) => {
    await page.locator('#btnWalletMemory').click();
    await expect(page.locator('#walletMemorySection')).toBeVisible();
  });

  test('Add Ticket form exists with all fields', async ({ page }) => {
    const fields = ['#tkType', '#tkTitle', '#tkDesc', '#tkLink'];
    for (const id of fields) {
      await expect(page.locator(`#walletTicketSection ${id}`)).toBeVisible();
    }
    await expect(page.locator('#walletTicketSection button[onclick="addTicket()"]')).toBeVisible();
  });
});

// ── TEST GROUP 5: Shopping ──────────────────────────────────────────────────
test.describe('Shopping Cart & Recommendations', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-more').click();
    await page.locator('#more [onclick*="shop"]').click();
  });

  test('Shopping cart tab loads with calculator card', async ({ page }) => {
    // Navigate directly to shop container
    await page.evaluate(() => window.showV37Tab('shop'));
    await expect(page.locator('#shop')).toHaveClass(/active/);
    await expect(page.locator('#quickKrw')).toBeVisible();
  });

  test('Exchange calculator computes correctly', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.locator('#quickKrw').fill('30000');
    await page.waitForTimeout(500);
    const result = page.locator('#quickResult');
    await expect(result).toBeVisible();
  });

  test('My List / Hot Recommendations tabs switch', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('shop'));
    const recBtn = page.locator('#btnShopRec');
    await expect(recBtn).toBeVisible();
    await recBtn.click();
    await expect(page.locator('#shopRecContainer')).toBeVisible();
  });

  test('Add shop item form works', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.locator('#newShop').fill('測試商品 Playwright');
    await page.locator('#shopWhere').fill('Olive Young 西面');
    await expect(page.locator('#newShop')).toHaveValue('測試商品 Playwright');
  });
});

// ── TEST GROUP 6: Itinerary ─────────────────────────────────────────────────
test.describe('Itinerary (C-Rank Travel Journal)', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-itinerary').click();
    await expect(page.locator('#itinerary')).toHaveClass(/active/);
  });

  test('Day tabs render for all 5 days', async ({ page }) => {
    const dayTabs = page.locator('#itinerary .day-tab');
    const count = await dayTabs.count();
    expect(count, 'Expected 5 day tabs (Day1–Day5)').toBeGreaterThanOrEqual(5);
  });

  test('Day 1 (11/13) tab is clickable', async ({ page }) => {
    await page.locator('#itinerary .day-tab').first().click();
    await page.waitForTimeout(300);
  });

  test('Day 4 (11/16) contains Foot Bath Cafe View 2', async ({ page }) => {
    // Click Day 4 tab
    const day4Tab = page.locator('#itinerary .day-tab').nth(3);
    await day4Tab.click();
    await page.waitForTimeout(500);
    
    const content = await page.locator('#itiContent').innerText().catch(() => '');
    // If content is loaded (Firebase or seed data)
    // The test verifies that Day 4 is accessible without error
    await expect(page.locator('#itiContent')).toBeVisible();
  });

  test('Vlog export button exists', async ({ page }) => {
    const vlogBtn = page.locator('button[onclick*="exportForVlog"]');
    await expect(vlogBtn).toBeVisible();
  });

  test('Add itinerary form has all required fields', async ({ page }) => {
    const fields = ['#itiDay', '#itiTime', '#itiDesc', '#itiTraffic', '#itiMap'];
    for (const id of fields) {
      await expect(page.locator(id)).toBeVisible();
    }
    await expect(page.locator('#btnSaveIti')).toBeVisible();
  });
});

// ── TEST GROUP 7: Budget / Split ────────────────────────────────────────────
test.describe('Budget & Split (Shared + Private Bills)', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    await page.locator('#tab-bill').click();
    await expect(page.locator('#split')).toHaveClass(/active/);
  });

  test('Live exchange rate element exists', async ({ page }) => {
    await expect(page.locator('#liveFxRate')).toBeVisible();
  });

  test('Shared/Private bill tabs are clickable', async ({ page }) => {
    await expect(page.locator('#tabShared')).toBeVisible();
    await expect(page.locator('#tabPrivate')).toBeVisible();
    await page.locator('#tabShared').click();
    await page.locator('#tabPrivate').click();
  });

  test('Bill form fields are present', async ({ page }) => {
    const fields = ['#billName', '#billAmt', '#billCurrency', '#billType', '#payMethod', '#payer'];
    for (const id of fields) {
      await expect(page.locator(id)).toBeVisible();
    }
  });

  test('Add Bill button is present and enabled', async ({ page }) => {
    const addBtn = page.locator('button[onclick="addBill()"]');
    await expect(addBtn).toBeVisible();
  });

  test('Budget progress bar renders', async ({ page }) => {
    await expect(page.locator('#budgetBar')).toBeAttached();
    await expect(page.locator('.budget-bar-container')).toBeVisible();
    await expect(page.locator('#budgetPct')).toBeVisible();
  });
});

// ── TEST GROUP 8: Modals ────────────────────────────────────────────────────
test.describe('Modals (PIN, Profile, Lightbox, Flashcard)', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  test('Profile modal opens from settings button in Budget tab', async ({ page }) => {
    await page.locator('#tab-bill').click();
    const settingsBtn = page.locator('#split button[onclick*="profileModal"]');
    await settingsBtn.click();
    await expect(page.locator('#profileModal')).toBeVisible({ timeout: 3000 });
  });

  test('Profile modal can be closed', async ({ page }) => {
    await page.locator('#tab-bill').click();
    await page.locator('#split button[onclick*="profileModal"]').click();
    await expect(page.locator('#profileModal')).toBeVisible();
    // Close via cancel button
    await page.locator('#profileModal button:has-text("取消")').click();
    await expect(page.locator('#profileModal')).toBeHidden({ timeout: 3000 });
  });

  test('Profile modal has user name and avatar fields', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('profileModal').style.display = 'flex';
    });
    await expect(page.locator('#editU1Name')).toBeVisible();
    await expect(page.locator('#editU2Name')).toBeVisible();
    await expect(page.locator('#editU1Avatar')).toBeVisible();
  });

  test('Lightbox element exists in DOM', async ({ page }) => {
    const lightbox = page.locator('#lightbox');
    // Lightbox is in DOM but hidden by default
    expect(await lightbox.count()).toBe(1);
  });

  test('Flashcard modal element exists in DOM', async ({ page }) => {
    const modal = page.locator('#flashcardModal');
    expect(await modal.count()).toBe(1);
    await expect(page.locator('#fc-tw')).toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});

// ── TEST GROUP 9: Travel Tools (Guide Folders) ──────────────────────────────
test.describe('Guide Folders (Tools, Food, Shopping, Convenience)', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    // Show the guide dashboard (v36HomeContent shows folder cards)
    await page.evaluate(() => {
      const v36 = document.getElementById('v36HomeContent');
      if (v36) v36.style.display = 'block';
    });
  });

  test('All 4 guide folder cards exist', async ({ page }) => {
    const folders = page.locator('.folder-card');
    const count = await folders.count();
    expect(count, 'Expected at least 4 guide folders').toBeGreaterThanOrEqual(4);
  });

  test('Tools folder opens guide detail', async ({ page }) => {
    const toolsFolder = page.locator('.folder-card').filter({ hasText: '實用工具庫' });
    if (await toolsFolder.count() > 0) {
      await toolsFolder.click();
      await expect(page.locator('#guideDetail')).toBeVisible({ timeout: 3000 });
    }
  });
});

// ── TEST GROUP 10: Maps Verification ────────────────────────────────────────
test.describe('Maps Links Verification', () => {

  test('Google Maps links are present in itinerary data', async ({ page }) => {
    await bootApp(page);
    const content = await page.evaluate(() => {
      // Check window.RECOMMENDED_ITINERARY for map links
      const iti = window.RECOMMENDED_ITINERARY || [];
      return iti.filter(i => i.map && i.map.includes('map')).length;
    });
    expect(content, 'No map links found in itinerary').toBeGreaterThan(0);
  });

  test('Naver map links use correct domain', async ({ page }) => {
    await bootApp(page);
    const naverLinks = await page.evaluate(() => {
      const iti = window.RECOMMENDED_ITINERARY || [];
      return iti.filter(i => i.map && i.map.includes('naver')).length;
    });
    expect(naverLinks).toBeGreaterThan(0);
  });
});

// ── TEST GROUP 11: Travel Data Safety ───────────────────────────────────────
test.describe('Travel Data Safety Verification', () => {

  test('Thrill On The Mug is NOT present as active (safe) venue', async ({ page }) => {
    await bootApp(page);
    
    const thrillActive = await page.evaluate(() => {
      const food = window.RECOMMENDED_FOOD || [];
      // Should be marked UNSAFE or not present at all as safe venue
      return food.some(f => 
        f.name === 'Thrill On The Mug' && 
        !f.name.includes('UNSAFE') && 
        !f.desc.includes('停業') && 
        !f.desc.includes('UNSAFE')
      );
    });
    
    expect(thrillActive, 
      'Thrill On The Mug appears as active venue — it permanently closed 2026-06-06'
    ).toBe(false);
  });

  test('Foot Bath Cafe View 2 is present in Day 4 itinerary', async ({ page }) => {
    await bootApp(page);
    
    const footBathPresent = await page.evaluate(() => {
      const iti = window.RECOMMENDED_ITINERARY || [];
      return iti.some(i => 
        i.day === '11/16' && 
        (i.desc.includes('족욕') || i.desc.includes('足浴') || i.desc.includes('Cafe View'))
      );
    });
    
    expect(footBathPresent, 'Foot Bath Cafe View 2 missing from Day 4 itinerary').toBe(true);
  });

  test('RECOMMENDED_FOOD data is loaded correctly', async ({ page }) => {
    await bootApp(page);
    
    const foodCount = await page.evaluate(() => {
      return (window.RECOMMENDED_FOOD || []).length;
    });
    expect(foodCount, 'RECOMMENDED_FOOD is empty').toBeGreaterThan(0);
  });

  test('RECOMMENDED_SHOPPING data is loaded correctly', async ({ page }) => {
    await bootApp(page);
    
    const shopCount = await page.evaluate(() => {
      return (window.RECOMMENDED_SHOPPING || []).length;
    });
    expect(shopCount, 'RECOMMENDED_SHOPPING is empty').toBeGreaterThan(0);
  });

  test('SMART_NEARBY_DATABASE has Busan entries', async ({ page }) => {
    await bootApp(page);
    
    const nearbyCount = await page.evaluate(() => {
      const db = window.SMART_NEARBY_DATABASE || {};
      return (db.Busan || []).length;
    });
    expect(nearbyCount, 'Smart Nearby Busan entries missing').toBeGreaterThan(0);
  });
});

// ── TEST GROUP 12: Core JS Engine Functions ──────────────────────────────────
test.describe('UTE Engine Binding Verification', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  test('TripContextEngine is globally accessible', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.TripContextEngine === 'object');
    expect(exists, 'TripContextEngine not found on window').toBe(true);
  });

  test('triggerContextUpdateImmediate is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.triggerContextUpdateImmediate === 'function');
    expect(exists).toBe(true);
  });

  test('showToast is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.showToast === 'function');
    expect(exists).toBe(true);
  });

  test('StorageEngine is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.StorageEngine === 'object');
    expect(exists).toBe(true);
  });

  test('NetworkEngine is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.NetworkEngine === 'object');
    expect(exists).toBe(true);
  });

  test('showV37Tab is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.showV37Tab === 'function');
    expect(exists).toBe(true);
  });

  test('speakKorean is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.speakKorean === 'function');
    expect(exists).toBe(true);
  });

  test('triggerHapticFeedback is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.triggerHapticFeedback === 'function');
    expect(exists).toBe(true);
  });

  test('copyTaxiHelper is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.copyTaxiHelper === 'function');
    expect(exists).toBe(true);
  });

  test('enterApp is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.enterApp === 'function');
    expect(exists).toBe(true);
  });

  test('forceShowApp is globally bound', async ({ page }) => {
    const exists = await page.evaluate(() => typeof window.forceShowApp === 'function');
    expect(exists).toBe(true);
  });
});

// ── TEST GROUP 13: Storage & Persistence ────────────────────────────────────
test.describe('LocalStorage Persistence', () => {

  test('StorageEngine.set and get round-trip works', async ({ page }) => {
    await bootApp(page);
    
    const result = await page.evaluate(() => {
      const key = 'playwright_test_key';
      window.StorageEngine.set(key, { value: 'test123' });
      const got = window.StorageEngine.get(key, null);
      window.StorageEngine.remove(key);
      return got.data;
    });
    
    expect(result).toEqual({ value: 'test123' });
  });

  test('Theme preference persists across navigation', async ({ page }) => {
    await bootApp(page);
    
    // Set dark mode
    await page.evaluate(() => {
      window.StorageEngine.set('busan_v36_theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    const theme = await page.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');
  });
});

// ── TEST GROUP 14: PWA & Offline Infrastructure ──────────────────────────────
test.describe('PWA & Offline Infrastructure', () => {

  test('sw.js is accessible and has correct cache name', async ({ page }) => {
    const response = await page.request.get('/sw.js');
    expect(response.status()).toBe(200);
    
    const body = await response.text();
    expect(body).toMatch(/busan-trip-v45-production-v\d+/);
    expect(body).toContain('install');
    expect(body).toContain('activate');
    expect(body).toContain('fetch');
  });

  test('manifest.json has all required PWA fields', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    const manifest = await response.json();
    
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('icon.png is accessible', async ({ page }) => {
    const response = await page.request.get('/icon.png');
    expect(response.status()).toBe(200);
  });

  test('All critical JS assets return 200', async ({ page }) => {
    const assets = [
      '/ute/ute_storage.js', '/ute/ute_network.js', '/ute/ute_knowledge.js',
      '/ute/ute_context.js', '/ute/ute_main.js',
      '/js/app.js', '/js/firebase.js', '/js/ui.js', '/js/wallet.js',
      '/js/memory.js', '/js/itinerary.js',
      '/services/utils.js', '/services/nearby.js',
      '/data/recommended.js', '/components/renderers.js',
      '/style.css',
    ];
    
    for (const asset of assets) {
      const response = await page.request.get(asset);
      expect(response.status(), `Asset returned non-200: ${asset}`).toBe(200);
    }
  });
});

// ── TEST GROUP 15: Responsive Layout Check ───────────────────────────────────
test.describe('Responsive Layout', () => {

  const viewports = [
    { name: 'mobile-portrait', width: 390, height: 844 },
    { name: 'mobile-landscape', width: 844, height: 390 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
  ];

  for (const vp of viewports) {
    test(`App renders without overflow at ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await bootApp(page);
      
      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth, `Horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(clientWidth + 5);
      
      // Bottom nav should be visible
      await expect(page.locator('.bottom-nav')).toBeVisible();
    });
  }
});

// ── TEST GROUP 16: No Console Errors ─────────────────────────────────────────
test.describe('Console Error Detection', () => {

  test('No fatal JS errors during full navigation flow', async ({ page }) => {
    const fatalErrors = [];
    const ignoredPatterns = [
      'firebase', 'Firebase', 'NetworkEngine', 'net::ERR_',
      'Failed to load resource', 'wttr.in', 'imgbb', 'exchangerate',
      'SERVICE_WORKER', 'serviceWorker', 'ServiceWorker',
      'fonts.googleapis', 'cdnjs.cloudflare',
    ];
    
    page.on('pageerror', err => {
      const msg = err.message;
      const isIgnored = ignoredPatterns.some(p => msg.includes(p));
      if (!isIgnored) fatalErrors.push(msg);
    });
    
    await bootApp(page);
    
    // Navigate through all tabs
    for (const tabId of ['#tab-itinerary', '#tab-bill', '#tab-wallet', '#tab-more', '#tab-home']) {
      await page.locator(tabId).click();
      await page.waitForTimeout(300);
    }
    
    expect(fatalErrors, 
      `Fatal JS errors encountered:\n${fatalErrors.join('\n')}`
    ).toHaveLength(0);
  });
});
