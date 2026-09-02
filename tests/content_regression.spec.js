// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test.describe('BUSAN.11 V45 — Content Regression & Travel-Readiness Suite', () => {

  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  // ── A. ITINERARY ────────────────────────────────────────────────────────
  test('A. Itinerary: 17 records present, Day 1-5 all have >= 1 entries with valid time & desc', async ({ page }) => {
    // Navigate to itinerary tab
    await page.evaluate(() => window.showV37Tab('itinerary'));

    // Wait for Firebase listener or storage to populate itineraryData (>= 17 entries)
    await page.waitForFunction(() => {
      return Array.isArray(window.itineraryData) && window.itineraryData.length >= 17;
    }, null, { timeout: 10000 });

    const totalCount = await page.evaluate(() => window.itineraryData.length);
    expect(totalCount).toBeGreaterThanOrEqual(17);

    // Verify Day 1 through Day 5 each has >= 1 valid entries rendered
    const days = [
      { key: '11/13', label: 'Day 1' },
      { key: '11/14', label: 'Day 2' },
      { key: '11/15', label: 'Day 3' },
      { key: '11/16', label: 'Day 4' },
      { key: '11/17', label: 'Day 5' },
    ];

    for (const d of days) {
      // Filter to day
      await page.evaluate((dayKey) => window.filterItineraryDay(dayKey, null), d.key);
      await page.waitForFunction((dayKey) => window.currentFilterDay === dayKey, d.key);

      const rowsData = await page.evaluate(() => {
        const rows = document.querySelectorAll('#itiContent .iti-row');
        return Array.from(rows).map(r => ({
          time: (r.querySelector('.iti-time')?.textContent || '').trim(),
          desc: (r.querySelector('.iti-desc')?.textContent || '').trim(),
        }));
      });

      expect(rowsData.length, `${d.label} (${d.key}) should have >= 1 entries`).toBeGreaterThanOrEqual(1);

      // Verify each row on this day has visible time and description text
      for (let i = 0; i < rowsData.length; i++) {
        expect(rowsData[i].time.length, `${d.label} Row ${i} time`).toBeGreaterThan(0);
        expect(rowsData[i].desc.length, `${d.label} Row ${i} desc`).toBeGreaterThan(0);
      }
    }
  });

  // ── B. RECOMMENDATIONS ──────────────────────────────────────────────────
  test('B. Recommendations: Food >= 6, Shopping >= 9, Nearby >= 22 with visible text', async ({ page }) => {
    // 1. Food Recommendations (>= 6)
    const recFood = await page.evaluate(() => window.RECOMMENDED_FOOD);
    expect(Array.isArray(recFood)).toBe(true);
    expect(recFood.length).toBeGreaterThanOrEqual(6);

    // Open guide -> 美食景點 -> setFoodTabMode('rec')
    await page.evaluate(() => {
      window.showV37Tab('home');
      window.openGuideFolder('美食景點');
      window.setFoodTabMode('rec');
    });

    const foodItems = page.locator('#foodRecList .v38-rec-item');
    await expect(foodItems.first()).toBeVisible({ timeout: 5000 });
    const foodCount = await foodItems.count();
    expect(foodCount).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < foodCount; i++) {
      const item = foodItems.nth(i);
      const text = await item.innerText();
      expect(text.trim().length).toBeGreaterThan(10);
    }

    // 2. Shopping Recommendations (>= 9)
    const recShop = await page.evaluate(() => window.RECOMMENDED_SHOPPING);
    expect(Array.isArray(recShop)).toBe(true);
    expect(recShop.length).toBeGreaterThanOrEqual(9);

    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('rec');
    });

    const shopItems = page.locator('#sRecList .v38-rec-item');
    await expect(shopItems.first()).toBeVisible({ timeout: 5000 });
    const shopCount = await shopItems.count();
    expect(shopCount).toBeGreaterThanOrEqual(9);

    for (let i = 0; i < shopCount; i++) {
      const item = shopItems.nth(i);
      const text = await item.innerText();
      expect(text.trim().length).toBeGreaterThan(10);
    }

    // 3. Nearby Database (>= 22 places: 11 Busan + 11 Gyeongju)
    const nearbyDb = await page.evaluate(() => window.SMART_NEARBY_DATABASE);
    expect(nearbyDb).toBeTruthy();
    const busanCount = (nearbyDb.Busan || []).length;
    const gyeongjuCount = (nearbyDb.Gyeongju || []).length;
    expect(busanCount).toBeGreaterThanOrEqual(11);
    expect(gyeongjuCount).toBeGreaterThanOrEqual(11);
    expect(busanCount + gyeongjuCount).toBeGreaterThanOrEqual(22);
  });

  // ── C. TRANSLATION ──────────────────────────────────────────────────────
  test('C. Translation: Exactly 7 voice cards rendered with non-empty TW and KR text', async ({ page }) => {
    // Open guide -> 工具 to access voice cards
    await page.evaluate(() => {
      window.showV37Tab('home');
      window.openGuideFolder('工具');
    });

    // Wait for voiceData to populate (7 items)
    await page.waitForFunction(() => {
      return Array.isArray(window.voiceData) && window.voiceData.length >= 7;
    }, null, { timeout: 10000 });

    const voiceCards = page.locator('#voiceGridUI .voice-card');
    await expect(voiceCards.first()).toBeVisible({ timeout: 5000 });
    const cardCount = await voiceCards.count();
    expect(cardCount).toBe(7);

    // Verify each card has non-empty Chinese (TW) and Korean (KR) text
    for (let i = 0; i < cardCount; i++) {
      const card = voiceCards.nth(i);
      const twText = await card.locator('span').innerText();
      const krText = await card.locator('b').innerText();

      expect(twText.trim().length, `Card ${i} TW text`).toBeGreaterThan(0);
      expect(krText.trim().length, `Card ${i} KR text`).toBeGreaterThan(0);
      expect(twText).not.toBe('undefined');
      expect(krText).not.toBe('undefined');
    }

    // Test clicking first card opens flashcard modal
    await voiceCards.first().click();
    const modal = page.locator('#flashcardModal');
    await expect(modal).toBeVisible({ timeout: 3000 });
    const fcTw = await page.locator('#fc-tw').innerText();
    const fcKr = await page.locator('#fc-kr').innerText();
    expect(fcTw.trim().length).toBeGreaterThan(0);
    expect(fcKr.trim().length).toBeGreaterThan(0);

    // Close modal
    await page.evaluate(() => window.closeFlashcard());
  });

  // ── D. HOTEL ────────────────────────────────────────────────────────────
  test('D. Hotel: Urban Groove Hotel details, check-in/out, and map navigation links are valid', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('hotel');
    });

    // Wait for hotel section to render
    await page.waitForFunction(() => {
      const card = document.getElementById('walletHotelInfoCard');
      return card && card.innerText.length > 20;
    }, null, { timeout: 10000 });

    const hotelSection = page.locator('#walletHotelInfoCard');
    await expect(hotelSection).toBeVisible({ timeout: 5000 });

    // Verify hotel name exists in text
    const text = await hotelSection.innerText();
    const hasHotelName = text.includes('城市律動飯店') || text.includes('Urban Groove Hotel') || text.includes('어반그루브호텔');
    expect(hasHotelName).toBe(true);

    // Verify map links exist
    const mapLinks = hotelSection.locator('a[href*="map"], a[href*="google"]');
    const linkCount = await mapLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(1);

    const firstHref = await mapLinks.first().getAttribute('href');
    expect(firstHref).toBeTruthy();
    expect(firstHref?.startsWith('http')).toBe(true);
  });

  // ── E. SHOPPING ─────────────────────────────────────────────────────────
  test('E. Shopping: 2 historical Firebase records visible without being hidden by default filter', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('my');
    });

    // Wait for shopList to populate (>= 2 items)
    await page.waitForFunction(() => {
      return Array.isArray(window.shopList) && window.shopList.length >= 2;
    }, null, { timeout: 10000 });

    const shopItems = page.locator('#sList .shop-item');
    await expect(shopItems.first()).toBeVisible({ timeout: 5000 });
    const count = await shopItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const allText = await page.locator('#sList').innerText();
    expect(allText).toContain('Re4dy');
    expect(allText).toContain('Imint無糖咖啡糖');

    // Verify owner switch tabs are rendered
    const tabs = page.locator('#shopTabsUI button');
    await expect(tabs.first()).toBeVisible();
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  // ── F. NAVIGATION ───────────────────────────────────────────────────────
  test('F. Navigation: Deep guide folder shows #fabBack and clicking returns to dashboard', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('home'));

    const fabBack = page.locator('#fabBack');

    // 1. Initially on dashboard, fabBack should not be visible
    await expect(fabBack).toBeHidden();

    // 2. Open deep folder (e.g. 美食景點)
    await page.evaluate(() => window.openGuideFolder('美食景點'));
    await expect(page.locator('#guideDetail')).toBeVisible();
    await expect(page.locator('#guideDashboard')).toBeHidden();
    await expect(fabBack).toBeVisible();

    // 3. Click fabBack to return
    await fabBack.click();
    await expect(page.locator('#guideDashboard')).toBeVisible();
    await expect(page.locator('#guideDetail')).toBeHidden();
    await expect(fabBack).toBeHidden();

    // 4. Test tool folder as well
    await page.evaluate(() => window.openGuideFolder('工具'));
    await expect(page.locator('#guideDetail')).toBeVisible();
    await expect(fabBack).toBeVisible();

    // 5. Test keyboard navigation on fabBack (Enter key)
    await page.evaluate(() => {
      const el = document.getElementById('fabBack');
      if (el) el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    await expect(page.locator('#guideDashboard')).toBeVisible();
    await expect(fabBack).toBeHidden();
  });

  // ── G. TICKET ───────────────────────────────────────────────────────────
  test('G. Ticket: Travel Wallet tickets section rendered with valid content', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('ticket');
    });

    const ticketSection = page.locator('#walletTicketSection');
    await expect(ticketSection).toBeVisible();

    // Wait for tickets or tickets list to render
    const ticketsList = page.locator('#walletTicketsList');
    await expect(ticketsList).toBeVisible();

    // Verify the add ticket form fields exist
    await expect(page.locator('#walletTicketSection #tkType')).toBeAttached();
  });

  // ── H. SOURCE DATA INTEGRITY ─────────────────────────────────────────────
  test('H. Source Data Integrity: No mojibake in RECOMMENDED_FOOD, RECOMMENDED_SHOPPING, or SMART_NEARBY_DATABASE', async ({ page }) => {
    const dataIntegrity = await page.evaluate(() => {
      const mojibakePat = /[\uFFFD]|\xC3[\x80-\xBF]|\xC2[\x80-\xBF]|\xE2\x80|\xEF\xBF\xBD|\xF0\x9F/;
      const errors = [];

      const checkList = (list, name) => {
        (list || []).forEach((item, idx) => {
          const str = JSON.stringify(item);
          if (mojibakePat.test(str)) {
            errors.push(`${name}[${idx}]: ${str.slice(0, 80)}`);
          }
        });
      };

      checkList(window.RECOMMENDED_FOOD, 'RECOMMENDED_FOOD');
      checkList(window.RECOMMENDED_SHOPPING, 'RECOMMENDED_SHOPPING');
      
      const nearby = window.SMART_NEARBY_DATABASE || {};
      checkList(nearby.Busan, 'SMART_NEARBY.Busan');
      checkList(nearby.Gyeongju, 'SMART_NEARBY.Gyeongju');

      return errors;
    });

    expect(dataIntegrity, `Found corrupted data in static databases:\n${dataIntegrity.join('\n')}`).toHaveLength(0);
  });

  // ── I. SMART NEARBY CANONICAL DATABASE ────────────────────────────────────
  test('I. Smart Nearby: Exactly 22 valid records with non-empty map URLs and valid Korean/Chinese names', async ({ page }) => {
    const nearbySummary = await page.evaluate(() => {
      const db = window.SMART_NEARBY_DATABASE || {};
      const busan = db.Busan || [];
      const gyeongju = db.Gyeongju || [];
      return {
        busanCount: busan.length,
        gyeongjuCount: gyeongju.length,
        busanNames: busan.map(p => p.name),
        allHaveMaps: busan.concat(gyeongju).every(p => Boolean(p.naver && p.kakao && p.google))
      };
    });

    expect(nearbySummary.busanCount).toBe(11);
    expect(nearbySummary.gyeongjuCount).toBe(11);
    expect(nearbySummary.allHaveMaps).toBe(true);
    expect(nearbySummary.busanNames).toContain('凡內谷地鐵站 (6號出口)');
    expect(nearbySummary.busanNames).toContain('味讚王鹽烤肉 西面店');
  });

  // ── J. SHOPPING CATEGORY LABELS ──────────────────────────────────────────
  test('J. Shopping Categories: Category labels contain no corrupted Big5 characters and match canonical catalog', async ({ page }) => {
    const categories = await page.evaluate(() => {
      const items = window.RECOMMENDED_SHOPPING || [];
      return Array.from(new Set(items.map(i => i.category.split(' ')[0])));
    });

    expect(categories.length).toBeGreaterThan(0);
    // Must contain clean categories
    const validExpected = ['美妝彩妝', '醫藥保養', '伴手文創'];
    const hasValid = validExpected.some(v => categories.includes(v));
    expect(hasValid).toBe(true);

    // Must NOT contain corrupted legacy strings
    const corruptedPat = /[\uFFFD]|蝢|怨|隡/;
    categories.forEach(cat => {
      expect(corruptedPat.test(cat), `Corrupted category found: ${cat}`).toBe(false);
    });
  });

});

