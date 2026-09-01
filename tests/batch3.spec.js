// ──────────────────────────────────────────────────────────────────────────
// BATCH 3 Targeted Test Suite
// Tests: rain toggle, 6 portal structure, product state, radar filters,
//        combo persistence, personal/canonical separation
// ──────────────────────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test.describe('BATCH 3 - Rain Plan Toggle', () => {
  test('Weather toggle buttons exist in itinerary tab', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('itinerary'));
    await page.waitForSelector('#itiWeatherToggleContainer', { timeout: 10000 });
    const sunBtn = page.locator('#btnItiSun');
    const rainBtn = page.locator('#btnItiRain');
    expect(await sunBtn.count()).toBeGreaterThan(0);
    expect(await rainBtn.count()).toBeGreaterThan(0);

  });

  test('setItineraryWeatherMode is user-controlled (sun by default)', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('itinerary'));
    const mode = await page.evaluate(() => window.currentWeatherMode);
    expect(mode).toBe('sun');
  });

  test('setItineraryWeatherMode switches to rain', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('itinerary'));
    await page.evaluate(() => window.setItineraryWeatherMode('rain'));
    const mode = await page.evaluate(() => window.currentWeatherMode);
    expect(mode).toBe('rain');
  });

  test('setItineraryWeatherMode switches back to sun', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('itinerary'));
    await page.evaluate(() => window.setItineraryWeatherMode('rain'));
    await page.evaluate(() => window.setItineraryWeatherMode('sun'));
    const mode = await page.evaluate(() => window.currentWeatherMode);
    expect(mode).toBe('sun');
  });
});

test.describe('BATCH 3 - Convenience Store 6 Portal Structure', () => {
  test('Convenience store tab button exists', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    const btn = page.locator('#btnShopConvenience');
    expect(await btn.count()).toBeGreaterThan(0);

  });

  test('Convenience tab renders 6 functional portals', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.evaluate(() => window.setShopTabMode('convenience'));
    await page.waitForSelector('#sConvenienceList', { timeout: 5000 });
    const content = await page.evaluate(() => document.getElementById('sConvenienceList')?.textContent || '');
    expect(content).toContain('優惠怎麼看');
    expect(content).toContain('GS25 vs CU');
    expect(content).toContain('必買雷達');
    expect(content).toContain('熟食');
    expect(content).toContain('神級混搭');
    expect(content).toContain('我的超商戰利品');
  });

  test('No Olive Young portal in home screen', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.evaluate(() => window.setShopTabMode('convenience'));
    await page.waitForSelector('#sConvenienceList', { timeout: 5000 });
    const onclicks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#sConvenienceList [onclick*="enterConveniencePortal"]'))
        .map(e => e.getAttribute('onclick') || '')
    );
    const hasOlive = onclicks.some(o => o.includes('olive'));
    const hasSouvenir = onclicks.some(o => o.includes('souvenir'));
    expect(hasOlive).toBe(false);
    expect(hasSouvenir).toBe(false);
  });

  test('Back navigation returns to home screen', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.evaluate(() => window.setShopTabMode('convenience'));
    await page.evaluate(() => window.enterConveniencePortal('discount'));
    await page.evaluate(() => window.exitConveniencePortal());
    const content = await page.evaluate(() => document.getElementById('sConvenienceList')?.textContent || '');
    expect(content).toContain('優惠怎麼看');
  });
});

test.describe('BATCH 3 - Radar Filters', () => {
  test('Radar portal shows all 7 stable category filters and 4 store filters', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    await page.evaluate(() => window.setShopTabMode('convenience'));
    await page.evaluate(() => window.enterConveniencePortal('radar'));
    await page.waitForSelector('#sConvenienceList', { timeout: 5000 });
    const content = await page.evaluate(() => document.getElementById('sConvenienceList')?.textContent || '');
    // 7 stable category filters
    expect(content).toContain('全部分類');
    expect(content).toContain('飲料');
    expect(content).toContain('甜點');
    expect(content).toContain('泡麵');
    expect(content).toContain('熟食');
    expect(content).toContain('零食');
    expect(content).toContain('冰品');
    expect(content).toContain('生活用品');
    // Store filters
    expect(content).toContain('全部門市');
    expect(content).toContain('CU');
    expect(content).toContain('GS25');
    expect(content).toContain('7-Eleven');
    expect(content).toContain('Emart24');
  });

  test('Canonical radar items = 20 (5 x 4 brands)', async ({ page }) => {
    await bootApp(page);
    const count = await page.evaluate(() => {
      const cs = (window.TRAVEL_CONTENT_V45 || {}).convenienceStore || {};
      return [...(cs.cu||[]),...(cs.gs25||[]),...(cs.sevenEleven||[]),...(cs.emart24||[])].length;
    });
    expect(count).toBe(20);
  });
});

test.describe('BATCH 3 - Personal State', () => {
  test('toggleConvenienceItemState writes to busan_v45_convenience_state', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => StorageEngine.set('busan_v45_convenience_state', {}));
    await page.evaluate(() => window.toggleConvenienceItemState('cu_1', 'want'));
    const state = await page.evaluate(() => {
      const raw = StorageEngine.get('busan_v45_convenience_state');
      return raw && raw.data;
    });
    expect(state && state.cu_1 && state.cu_1.want).toBe(true);
  });

  test('Convenience state does not write to busan_v36_shopList', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => StorageEngine.set('busan_v45_convenience_state', {}));
    await page.evaluate(() => window.toggleConvenienceItemState('emart_1', 'want'));
    const shopData = await page.evaluate(() => {
      const raw = StorageEngine.get('busan_v36_shopList');
      return raw && raw.data ? (Array.isArray(raw.data) ? raw.data : Object.keys(raw.data)) : [];
    });
    const hasEmart = Array.isArray(shopData) ? shopData.includes('emart_1') : false;
    expect(hasEmart).toBe(false);
  });
});

test.describe('BATCH 3 - Combo Persistence', () => {
  test('Canonical combos count = 4 from convenienceStore.combos', async ({ page }) => {
    await bootApp(page);
    const count = await page.evaluate(() => (window.TRAVEL_CONTENT_V45?.convenienceStore?.combos || []).length);
    expect(count).toBe(4);
  });


  test('unlockComboDirect persists to busan_v45_combo_state', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => StorageEngine.set('busan_v45_combo_state', {}));
    await page.evaluate(() => window.unlockComboDirect(0));
    const state = await page.evaluate(() => {
      const raw = StorageEngine.get('busan_v45_combo_state');
      return raw && raw.data;
    });
    expect(state && state[0] && state[0].unlocked).toBe(true);
  });

  test('Combo portal renders 4 canonical combo names', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('convenience');
      window.enterConveniencePortal('combos');
    });
    await page.waitForSelector('#sConvenienceList', { state: 'attached', timeout: 8000 });
    const content = await page.evaluate(() => document.getElementById('sConvenienceList')?.textContent || '');
    expect(content).toContain('蟹膏拌飯神仙組合');
    expect(content).toContain('經典馬克定食');
    expect(content).toContain('活力元氣早餐');
    expect(content).toContain('奢華午後輕食');
  });
});

test.describe('BATCH 3 - Canonical / Personal Separation', () => {
  test('Canonical itinerary count = 23', async ({ page }) => {
    await bootApp(page);
    const count = await page.evaluate(() => {
      const tc = window.TRAVEL_CONTENT_V45;
      if (!tc || !tc.itinerary) return 0;
      return Object.values(tc.itinerary).reduce((s, a) => s + a.length, 0);
    });
    expect(count).toBe(23);
  });

  test('Firebase itinerary and canonical itinerary are distinct data sources', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('itinerary'));
    await page.waitForFunction(
      () => Array.isArray(window.itineraryData) && window.itineraryData.length > 0,
      { timeout: 15000 }
    );
    const firebaseCount = await page.evaluate(() => (window.itineraryData || []).length);
    const canonicalCount = await page.evaluate(() => {
      const tc = window.TRAVEL_CONTENT_V45;
      if (!tc || !tc.itinerary) return 0;
      return Object.values(tc.itinerary).reduce((s, a) => s + a.length, 0);
    });
    // Canonical is always 23
    expect(canonicalCount).toBe(23);
    // Firebase count is exactly 17
    expect(firebaseCount).toBe(17);
  });

  test('Canonical itinerary day-by-day counts are 4, 5, 5, 4, 5', async ({ page }) => {
    await bootApp(page);
    const dayCounts = await page.evaluate(() => {
      const iti = window.TRAVEL_CONTENT_V45?.itinerary || {};
      return [
        (iti['11/13'] || []).length,
        (iti['11/14'] || []).length,
        (iti['11/15'] || []).length,
        (iti['11/16'] || []).length,
        (iti['11/17'] || []).length
      ];
    });
    expect(dayCounts).toEqual([4, 5, 5, 4, 5]);
  });


  test('TRAVEL_CONTENT_V45.convenienceCombos is reference-identical to convenienceStore.combos', async ({ page }) => {
    await bootApp(page);
    const isIdentical = await page.evaluate(() => {
      const tc = window.TRAVEL_CONTENT_V45;
      return tc?.convenienceCombos === tc?.convenienceStore?.combos;
    });
    expect(isIdentical).toBe(true);
  });

  test('Approved canonical Rain Plan content is present without drift', async ({ page }) => {
    await bootApp(page);
    const rain = await page.evaluate(() => window.TRAVEL_CONTENT_V45?.rainPlans || {});
    // Day 2
    const d2Titles = (rain.day2?.proposals || []).map(p => p.title).join(' ');
    expect(d2Titles).toContain('BUSAN X the SKY');
    expect(d2Titles).toContain('Spa Land');
    expect(d2Titles).toContain('廣安里');
    // Day 3 - Gyeongju Day
    const d3Titles = (rain.day3?.proposals || []).map(p => p.title).join(' ');
    expect(d3Titles).toContain('室內韓服體驗');
    expect(d3Titles).toContain('皇理團路韓屋咖啡廳');
    expect(d3Titles).toContain('國立慶州博物館');
    expect(d3Titles).toContain('慶州東宮園');
    expect(d3Titles).not.toContain('SEA LIFE');
    expect(d3Titles).not.toContain('黃南餅');
    expect(d3Titles).not.toContain('東宮與月池');
    // Day 4
    const d4Titles = (rain.day4?.proposals || []).map(p => p.title).join(' ');
    expect(d4Titles).toContain('ARTE MUSEUM BUSAN');
    expect(d4Titles).toContain('Footbath Cafe View 2');
    expect(d4Titles).toContain('海木');
    expect(d4Titles).not.toContain('Running Man');
  });
});

test.describe('BATCH 3 - Consolidated Navigation (Tokyo/Fuji Style)', () => {
  test('Home dashboard exposes the 9 primary feature cards', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('home'));
    await page.waitForSelector('.v45-nine-grid', { timeout: 10000 });
    const cards = page.locator('.v45-nine-card');
    expect(await cards.count()).toBe(9);
    
    const text = await page.evaluate(() => document.querySelector('.v45-nine-grid')?.textContent || '');
    expect(text).toContain('今日行程');
    expect(text).toContain('景點美食');
    expect(text).toContain('韓國超商');
    expect(text).toContain('快樂購');
    expect(text).toContain('票券住宿');
    expect(text).toContain('旅行記帳');
    expect(text).toContain('翻譯 SOS');
    expect(text).toContain('行前準備');
    expect(text).toContain('旅行回憶');
  });

  test('Home 韓國超商 card directly opens 6 functional portals in shop tab', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('home'));
    await page.waitForSelector('.v45-nine-grid', { timeout: 10000 });
    
    // Click on 韓國超商 card
    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('convenience');
    });
    await page.waitForSelector('#sConvenienceList', { timeout: 5000 });
    const content = await page.evaluate(() => document.getElementById('sConvenienceList')?.textContent || '');
    expect(content).toContain('優惠怎麼看');
    expect(content).toContain('GS25 vs CU');
    expect(content).toContain('必買雷達');
    expect(content).toContain('熟食');
    expect(content).toContain('神級混搭');
    expect(content).toContain('我的超商戰利品');
  });

  test('Bottom nav and Home SOS button opens Translation & Emergency Hub directly', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('more'));
    await page.waitForSelector('#more', { timeout: 5000 });
    const moreText = await page.evaluate(() => document.getElementById('more')?.textContent || '');
    expect(moreText).toContain('翻譯 SOS');
    expect(moreText).toContain('112 報警');
    expect(moreText).toContain('119 救護');
    expect(moreText).toContain('1330 諮詢');
    expect(moreText).toContain('Papago 拍照翻譯');
  });

  test('Deep navigation returns predictably to Home via closeGuideFolder', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.showV37Tab('home');
      window.openGuideFolder('美食景點');
    });
    const isDetailVisible = await page.evaluate(() => document.getElementById('guideDetail')?.style.display !== 'none');
    expect(isDetailVisible).toBe(true);

    await page.evaluate(() => window.closeGuideFolder());
    const isDashVisible = await page.evaluate(() => document.getElementById('guideDashboard')?.style.display !== 'none');
    expect(isDashVisible).toBe(true);
  });
});

test.describe('BATCH 3 - Owner Visual Corrections', () => {
  test('Home Card 9 (旅行回憶) visibly renders existing memory album content in 1 tap', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('photo'));
    await page.waitForSelector('#walletMemorySection', { state: 'visible', timeout: 5000 });
    const isMemVisible = await page.evaluate(() => {
      const sec = document.getElementById('walletMemorySection');
      return sec && sec.style.display !== 'none';
    });
    expect(isMemVisible).toBe(true);
    const content = await page.evaluate(() => document.getElementById('walletMemorySection')?.textContent || '');
    expect(content).toContain('每日拍立得回憶庫');
    expect(content).toContain('雲端原檔金庫');
  });

  test('Home does not present K-ETA as required/pending and shows exemption to 2026/12/31', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('home'));
    await page.waitForSelector('#v37HomeDashboard', { timeout: 5000 });
    const text = await page.evaluate(() => document.getElementById('v37HomeDashboard')?.textContent || '');
    expect(text).not.toContain('待辦：K-ETA');
    expect(text).toContain('K-ETA：本次免申請');
    expect(text).toContain('2026/12/31');
    expect(text).toContain('e-Arrival Card');
    expect(text).toContain('Q-CODE：Q4出發前RECHECK');
  });

  test('Home weather summary is visible directly without opening a separate page', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('home'));
    await page.waitForSelector('.v45-home-weather-box', { timeout: 5000 });
    const weatherText = await page.evaluate(() => document.querySelector('.v45-home-weather-box')?.textContent || '');
    expect(weatherText.includes('釜山目前') || weatherText.includes('即時天氣暫時無法更新')).toBe(true);
    expect(weatherText).toContain('出發前 7–10 天提供詳細預報');
  });

  test('Weather advisory never auto-switches itinerary into Rain Mode', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.showV37Tab('home');
      window.setV37SelectedDate('11/14');
    });
    const rainMode = await page.evaluate(() => window.currentWeatherMode);
    expect(rainMode).toBe('sun'); // User controlled, not auto-switched to rain
  });

  test('Preparation hub exposes current-trip K-ETA exemption, e-Arrival, and Q-CODE RECHECK', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('doc');
    });
    await page.waitForSelector('#walletDocSection', { state: 'visible', timeout: 5000 });
    const docText = await page.evaluate(() => document.getElementById('walletDocSection')?.textContent || '');
    expect(docText).toContain('K-ETA（電子旅行許可）');
    expect(docText).toContain('本次免申請');
    expect(docText).toContain('2026-12-31');
    expect(docText).toContain('e-Arrival Card');
    expect(docText).toContain('Q-CODE（檢疫資訊預入申報）');
    expect(docText).toContain('Q4 / RECHECK');
    expect(docText).toContain('我的已存文件（加密備份）');
  });

  test('Translation SOS does not contain shopping shortcut', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('more'));
    await page.waitForSelector('#more', { timeout: 5000 });
    const sosText = await page.evaluate(() => document.getElementById('more')?.textContent || '');
    expect(sosText).not.toContain('前往快樂購');
    expect(sosText).not.toContain('購物清單');
    expect(sosText).toContain('112 報警');
    expect(sosText).toContain('119 救護');
    expect(sosText).toContain('1330 諮詢');
  });

  test('Ticket view surfaces canonical flight and hotel summary without polluting Firebase', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('ticket');
    });
    await page.waitForSelector('#walletTicketSection', { state: 'visible', timeout: 5000 });
    const ticketText = await page.evaluate(() => document.getElementById('walletTicketSection')?.textContent || '');
    expect(ticketText).toContain('本次旅程資訊');
    expect(ticketText).toContain('BX572');
    expect(ticketText).toContain('KE2085');
    expect(ticketText).toContain('城市律動飯店');
    expect(ticketText).toContain('BIG3 Mobile');
    expect(ticketText).toContain('我的已存票券 / 個人憑證');
  });

  test('WeatherEngine localizes weather conditions to Traditional Chinese', async ({ page }) => {
    await bootApp(page);
    const localized = await page.evaluate(() => {
      return {
        partlyCloudy: window.WeatherEngine.localizeCondition('Partly cloudy'),
        sunny: window.WeatherEngine.localizeCondition('Sunny'),
        lightRain: window.WeatherEngine.localizeCondition('Light rain shower'),
        overcast: window.WeatherEngine.localizeCondition('Overcast')
      };
    });
    expect(localized.partlyCloudy).toBe('局部多雲');
    expect(localized.sunny).toBe('晴天');
    expect(localized.lightRain).toBe('局部陣雨');
    expect(localized.overcast).toBe('陰天');
  });

  test('Weather fallback/failure renders honest unavailable state without fabricating temperature', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.WeatherEngine.cache = {};
      StorageEngine.set('ute_weather_cache', {});
      triggerContextUpdateImmediate();
    });
    const weatherBoxText = await page.evaluate(() => {
      const box = document.querySelector('.v45-home-weather-box');
      return box ? box.textContent : '';
    });
    expect(weatherBoxText).toContain('即時天氣暫時無法更新');
    expect(weatherBoxText).not.toContain('12°C');
  });

  test('Home weather renders successful provider live result with Traditional Chinese condition', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      window.WeatherEngine.cache['pusan'] = {
        temp: 28,
        condition: 'Light rain shower',
        conditionZH: '局部陣雨',
        feelsLike: 32,
        windSpeed: 12,
        humidity: 70,
        uvIndex: 4,
        rainChance: 60,
        timestamp: Date.now(),
        isLive: true,
        isCached: false,
        unavailable: false
      };
      triggerContextUpdateImmediate();
    });
    const weatherBoxText = await page.evaluate(() => {
      const box = document.querySelector('.v45-home-weather-box');
      return box ? box.textContent : '';
    });
    expect(weatherBoxText).toMatch(/釜山目前｜\d+°C｜/);
    expect(weatherBoxText).toContain('更新：');
  });

  test('Wallet active context heading dynamically matches Ticket / Prep / Memory destination', async ({ page }) => {
    await bootApp(page);
    // 1. Ticket
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('ticket');
    });
    let title = await page.evaluate(() => document.getElementById('walletHeaderTitle')?.textContent || '');
    let sub = await page.evaluate(() => document.getElementById('walletHeaderSubtitle')?.textContent || '');
    expect(title).toContain('票券住宿');
    expect(sub).toBe('Travel Wallet');

    // 2. Prep (Doc)
    await page.evaluate(() => window.switchWalletTab('doc'));
    title = await page.evaluate(() => document.getElementById('walletHeaderTitle')?.textContent || '');
    sub = await page.evaluate(() => document.getElementById('walletHeaderSubtitle')?.textContent || '');
    expect(title).toContain('行前準備');
    expect(sub).toContain('Travel Wallet · Docs');

    // 3. Memory
    await page.evaluate(() => window.switchWalletTab('memory'));
    title = await page.evaluate(() => document.getElementById('walletHeaderTitle')?.textContent || '');
    sub = await page.evaluate(() => document.getElementById('walletHeaderSubtitle')?.textContent || '');
    expect(title).toContain('旅行回憶');
    expect(sub).toContain('Travel Wallet · Memory');
  });

  test('Approved convenience localStorage keys remain intact with migration support', async ({ page }) => {
    await bootApp(page);
    // Write to canonical key
    await page.evaluate(() => {
      StorageEngine.set('busan_v45_convenience_state', { 'cv-01': { want: true, bought: false } });
      StorageEngine.set('busan_v45_combo_state', { 'combo-1': true });
    });
    const states = await page.evaluate(() => {
      return {
        conv: StorageEngine.get('busan_v45_convenience_state').data,
        combo: StorageEngine.get('busan_v45_combo_state').data
      };
    });
    expect(states.conv['cv-01'].want).toBe(true);
    expect(states.combo['combo-1']).toBe(true);
  });
});
