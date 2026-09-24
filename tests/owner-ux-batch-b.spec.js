// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test.describe('BUSAN.11 V45 — Batch B Owner Editable Experience', () => {
  test.beforeEach(async ({ page }) => {
    await bootApp(page);
  });

  test('canonical recommendations remain immutable while owner food/shop overlays are editable', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.ownerCustomizations = { food: {}, shop: {} };
      StorageEngine.set('busan_v45_owner_customizations', window.ownerCustomizations);
      const writes = [];
      NetworkEngine.firebaseWrite = async (path, data) => { writes.push({ path, data }); return { success: true }; };

      const canonicalFood = window.RECOMMENDED_FOOD[0];
      const canonicalShop = window.RECOMMENDED_SHOPPING[0];
      const foodBefore = JSON.stringify(canonicalFood);
      const shopBefore = JSON.stringify(canonicalShop);

      openOwnerCustomize('food', canonicalFood.id);
      document.getElementById('ownerCustomName').value = '我的美食名稱';
      document.getElementById('ownerCustomDesc').value = '我的美食筆記';
      document.getElementById('tempOwnerCustomImg').value = 'https://i.example.com/food.jpg';
      await saveOwnerCustomizationFromModal();

      openOwnerCustomize('shop', canonicalShop.id);
      document.getElementById('ownerCustomName').value = '我的商品名稱';
      document.getElementById('ownerCustomDesc').value = '我的購物筆記';
      await saveOwnerCustomizationFromModal();

      return {
        foodUnchanged: JSON.stringify(window.RECOMMENDED_FOOD[0]) === foodBefore,
        shopUnchanged: JSON.stringify(window.RECOMMENDED_SHOPPING[0]) === shopBefore,
        foodView: getOwnerCustomizedItem('food', canonicalFood),
        shopView: getOwnerCustomizedItem('shop', canonicalShop),
        writes
      };
    });

    expect(result.foodUnchanged).toBe(true);
    expect(result.shopUnchanged).toBe(true);
    expect(result.foodView.name).toBe('我的美食名稱');
    expect(result.foodView.image.full).toContain('food.jpg');
    expect(result.shopView.name).toBe('我的商品名稱');
    expect(result.writes).toHaveLength(2);
    expect(result.writes[0].path).toContain('busan_v45_owner_custom/food/');
    expect(result.writes[1].path).toContain('busan_v45_owner_custom/shop/');
  });

  test('owner guide and manual shopping rows support edit/save without touching canonical datasets', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const updates = [];
      NetworkEngine.firebaseUpdate = async (path, data) => { updates.push({ path, data }); return { success: true }; };
      window.currentGuideTab = '打卡景點';
      window.guideData = [{ key: 'guide-b', type: '打卡景點', title: '舊景點', desc: '舊說明', link: '', img: 'https://i.example.com/old.jpg' }];
      renderGuideContent();
      editGuide('guide-b');
      document.getElementById('gdTitle').value = '新景點';
      document.getElementById('gdDesc').value = '新說明';
      document.getElementById('tempGuideImg').value = 'https://i.example.com/new.jpg';
      await addGuideItem();

      window.currentShopOwner = 'user1';
      window.shopList = [{ key: 'shop-b', text: '舊商品', where: 'A', category: '其他', checked: false, owner: 'user1' }];
      renderShop();
      editShop('shop-b');
      document.getElementById('newShop').value = '新商品';
      document.getElementById('shopWhere').value = 'B';
      await addShopItem();

      return { updates, canonicalFoodCount: window.RECOMMENDED_FOOD.length, canonicalShopCount: window.RECOMMENDED_SHOPPING.length };
    });

    expect(result.updates.map(x => x.path)).toContain('busan_v36_guide/guide-b');
    expect(result.updates.map(x => x.path)).toContain('busan_v36_shop/shop-b');
    expect(result.updates.find(x => x.path.includes('guide-b')).data.img).toContain('new.jpg');
    expect(result.canonicalFoodCount).toBeGreaterThanOrEqual(6);
    expect(result.canonicalShopCount).toBeGreaterThanOrEqual(9);
  });

  test('coupon workspace supports CRUD fields, image, and truthful Code 128 rendering', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('coupon');
      window.couponData = [{
        key: 'coupon-b', title: '測試會員卡', desc: '真實測試資料', code: 'ABC123456',
        expiry: '2026-11-30', image: 'https://i.example.com/coupon.jpg', link: ''
      }];
      window.renderCoupons();
    });

    await expect(page.locator('#couponList .coupon-card')).toHaveCount(1);
    await expect(page.locator('#couponList .coupon-barcode')).toHaveCount(1);
    await expect(page.locator('#couponList .coupon-image')).toHaveCount(1);

    const result = await page.evaluate(async () => {
      const updates = [];
      NetworkEngine.firebaseUpdate = async (path, data) => { updates.push({ path, data }); return { success: true }; };
      editCoupon('coupon-b');
      document.getElementById('couponTitle').value = '更新會員卡';
      document.getElementById('couponCode').value = 'XYZ987';
      await saveCoupon();
      return updates;
    });
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('busan_v45_coupons/coupon-b');
    expect(result[0].data.code).toBe('XYZ987');
  });

  test('translation keeps canonical phrases while allowing owner edit and TTS/Papago access', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.showV37Tab('more');
      const updates = [];
      NetworkEngine.firebaseUpdate = async (path, data) => { updates.push({ path, data }); return { success: true }; };
      window.voiceCustomData = [];
      window.voiceData = mergeVoiceWorkspace([]);
      renderVoiceList();
      const canonicalBefore = JSON.stringify(window.CANONICAL_VOICE_FALLBACK);
      editVoice('voice_1');
      document.getElementById('newCardTw').value = '我的中文';
      document.getElementById('newCardKr').value = '나의 한국어';
      await addVoiceCard();
      return {
        canonicalCount: window.CANONICAL_VOICE_FALLBACK.length,
        canonicalUnchanged: JSON.stringify(window.CANONICAL_VOICE_FALLBACK) === canonicalBefore,
        updates,
        hasTts: typeof window.speakKorean === 'function',
        hasPapago: typeof window.openPapago === 'function'
      };
    });

    expect(result.canonicalCount).toBe(7);
    expect(result.canonicalUnchanged).toBe(true);
    expect(result.updates[0].path).toBe('busan_v36_voice/voice_1');
    expect(result.hasTts).toBe(true);
    expect(result.hasPapago).toBe(true);
    await expect(page.locator('#voiceGridUI .voice-action[aria-label="播放韓語發音"]').first()).toBeVisible();
    await expect(page.locator('#more button', { hasText: 'Papago' })).toBeVisible();
  });

  test('home removes duplicate quick-entry layer while keeping primary Home IA and bottom navigation', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('home'));
    await expect(page.locator('.v38-quick-actions')).toHaveCount(0);
    await expect(page.locator('#v37HomeDashboard')).not.toContainText('快速入口');
    await expect(page.locator('.v45-home-nine-grid')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('convenience hub keeps six same-page headers with one inline accordion open', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('convenience');
    });
    await expect(page.locator('[data-convenience-topic]')).toHaveCount(6);
    await expect(page.locator('.convenience-accordion-header')).toHaveCount(6);
    for (const id of ['discount', 'compare', 'radar', 'microwave', 'combos', 'loot']) {
      await expect(page.locator(`[data-convenience-topic="${id}"] .convenience-accordion-header`)).toBeVisible();
    }
    await expect(page.locator('.convenience-accordion-header[aria-expanded="true"]')).toHaveCount(1);
    await expect(page.locator('[data-convenience-topic="discount"] .convenience-accordion-header')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('[data-convenience-topic="radar"] .convenience-accordion-header').click();
    await expect(page.locator('[data-convenience-topic="radar"] .convenience-accordion-header')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-convenience-topic="discount"] .convenience-accordion-header')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#conv-inline-radar')).toBeVisible();
    await expect(page.locator('#conv-inline-discount')).toBeHidden();
    await expect(page.locator('.supermarket-direct-card')).toContainText('E-Mart Munhyeon');
    await expect(page.locator('.supermarket-direct-card')).toContainText('10:00–23:00');
    await expect(page.locator('.supermarket-direct-card')).toContainText('GS25 서면유성점');
    await expect(page.locator('.supermarket-direct-card')).toContainText('세븐일레븐 부산서면다인점');
    const supermarketMapActions = page.locator('.supermarket-direct-card a');
    await expect(supermarketMapActions).toHaveCount(1);
    await expect(supermarketMapActions).toContainText('NAVER');
    await expect(supermarketMapActions).toHaveAttribute('href', 'https://naver.me/FLybIrq7');
    await expect(page.locator('.supermarket-direct-card')).not.toContainText(/Google|Kakao/);
    await expect(page.locator('.supermarket-direct-card .naver-verification-pending')).toHaveCount(2);
    const portal = await page.evaluate(() => window.currentConveniencePortal);
    expect(portal).toBeNull();
  });

  test('Open-Meteo weather panel normalizes both cities and keeps distant trip dates honest', async ({ page }) => {
    const normalized = await page.evaluate(() => {
      const sample = {
        current: { time: '2026-09-24T12:00', temperature_2m: 18, apparent_temperature: 16, relative_humidity_2m: 72, precipitation: 0.2, weather_code: 61, wind_speed_10m: 22 },
        hourly: { time: ['2026-09-24T12:00'], precipitation_probability: [45] },
        daily: { time: ['2026-09-24'], weather_code: [61], temperature_2m_max: [20], temperature_2m_min: [14], precipitation_probability_max: [55], sunrise: ['2026-09-24T06:10'], sunset: ['2026-09-24T18:20'] }
      };
      const busan = WeatherEngine._normalize('Busan', sample);
      const gyeongju = WeatherEngine._normalize('Gyeongju', { ...sample, current: { ...sample.current, temperature_2m: 17, apparent_temperature: 15 } });
      WeatherEngine.cache = { Busan: busan, Gyeongju: gyeongju };
      window.homeWeatherDetailExpanded = true;
      renderV37HomeDashboard();
      return { busan, advice: WeatherEngine.getOutfitAdvice(busan), forecast: WeatherEngine.getTripForecastStatus(new Date('2026-09-24T00:00:00+09:00')) };
    });

    expect(normalized.busan.source).toBe('Open-Meteo');
    expect(normalized.busan.apparentTemp).toBe(16);
    expect(normalized.busan.rainChance).toBe(45);
    expect(normalized.busan.windSpeed).toBe(22);
    expect(normalized.busan.humidity).toBe(72);
    expect(normalized.advice).toContain('折疊傘／防潑水鞋');
    expect(normalized.advice).toContain('優先防風外層');
    expect(normalized.forecast.available).toBe(false);
    await expect(page.locator('[data-weather-city="Busan"]')).toContainText('體感 16°C');
    await expect(page.locator('[data-weather-city="Gyeongju"]')).toContainText('體感 15°C');
    await expect(page.locator('#homeWeatherDetailPanel')).toContainText('降雨 45%');
    await expect(page.locator('#homeWeatherDetailPanel')).toContainText('風速 22 km/h');
    await expect(page.locator('#homeWeatherDetailPanel')).toContainText('濕度 72%');
    await expect(page.locator('#homeWeatherDetailPanel')).toContainText('最後更新');
    await expect(page.locator('#homeWeatherDetailPanel')).toContainText('11/13–11/17 旅行日期預報將於出發前 7–10 天顯示');
    await expect(page.locator('#refreshWeatherNowBtn')).toBeVisible();
  });

  test('Packing List ships a complete local-only default template while owner-added rows keep CRUD sync', async ({ page }) => {
    await page.evaluate(() => {
      StorageEngine.set('busan_v45_default_packing_state', {});
      StorageEngine.set('busan_v36_prepData', []);
      window.prepData = [];
      window.showV37Tab('wallet');
      window.switchWalletTab('doc');
      window.renderPrepList();
    });

    const defaultCount = await page.evaluate(() => window.DEFAULT_PACKING_TEMPLATE.length);
    expect(defaultCount).toBeGreaterThanOrEqual(30);
    await expect(page.locator('#prepListUI .prep-category-group')).toHaveCount(7);
    await expect(page.locator('#prepListUI_trip .prep-category-group')).toHaveCount(7);
    await expect(page.locator('#prepProgressUI')).toContainText(`完成 0 / ${defaultCount}`);

    const result = await page.evaluate(async () => {
      const updates = [];
      const pushes = [];
      NetworkEngine.firebaseUpdate = async (path, data) => { updates.push({ path, data }); return { success: true }; };
      NetworkEngine.firebasePush = async (path, data) => { pushes.push({ path, data }); return { success: true }; };

      const defaultKey = window.DEFAULT_PACKING_TEMPLATE[0].key;
      await window.togglePrep(defaultKey, false);
      window.editPrep(defaultKey);
      document.getElementById('prepText').value = '護照正本（已確認）';
      await window.savePrepItem();
      const writesAfterDefaultActions = updates.length + pushes.length;

      document.getElementById('prepEditKey').value = '';
      document.getElementById('prepText').value = '自訂雨傘提醒';
      document.getElementById('prepCategory').value = '旅行用品';
      document.getElementById('prepLink').value = '';
      await window.savePrepItem();

      const defaultState = StorageEngine.get('busan_v45_default_packing_state', {}).data || {};
      return { writesAfterDefaultActions, defaultState, updates, pushes };
    });

    expect(result.writesAfterDefaultActions).toBe(0);
    expect(result.defaultState['default-doc-passport'].done).toBe(true);
    expect(result.defaultState['default-doc-passport'].text).toContain('已確認');
    expect(result.pushes).toHaveLength(1);
    expect(result.pushes[0].path).toBe('busan_v36_prep');
    expect(result.pushes[0].data.kind).toBe('packing');
    expect(result.pushes[0].data.category).toBe('旅行用品');
  });
});
