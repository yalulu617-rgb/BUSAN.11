// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test.describe('Owner Fix Batch 1 targeted repair', () => {
  test.beforeEach(async ({ page }) => { await bootApp(page); });

  test('canonical itinerary is authoritative while custom data remains separate', async ({ page }) => {
    const result = await page.evaluate(() => {
      const custom = [
        { key: 'legacy-out-1630', day: '11/13', time: '16:30', desc: '抵達金海機場舊時間', tr: '入境' },
        { key: 'legacy-out-1730', day: '11/13', time: '17:30', desc: 'BX572 抵達金海機場舊時間', tr: '入境' },
        { key: 'legacy-back', day: '11/17', time: '16:30', desc: 'KE2085 自金海機場起飛舊時間', tr: '登機' },
        { key: 'note-out', day: '11/13', time: '12:00', desc: 'BX572 座位 12A，記得選靠窗', tr: '個人提醒' },
        { key: 'note-back', day: '11/17', time: '11:00', desc: 'KE2085 託運 23kg', tr: '個人提醒' },
        { key: 'custom-1', day: '11/14', time: '08:00', desc: 'Luna custom stop', tr: '步行' },
        { key: 'stale-day2-fireworks', day: '11/14', time: '19:30', desc: '廣安里 M 無人機煙火秀', tr: '步行' },
        { key: 'day2-personal', day: '11/14', time: '21:30', desc: '回飯店整理戰利品', tr: '步行' },
        { key: 'stale-day3-solsot', day: '11/15', time: '12:00', desc: '【午餐】Solsot 釜飯', tr: '步行' },
        { key: 'day3-personal', day: '11/15', time: '15:30', desc: '皇理團路買伴手禮', tr: '步行' }
      ];
      const merged = window.mergeCanonicalItinerary(custom);
      const canonical = Object.values(window.TRAVEL_CONTENT_V45.itinerary).flat();
      return {
        canonicalCount: canonical.length,
        customCount: window.customItineraryData.length,
        mergedCount: merged.length,
        dayCounts: Object.values(window.TRAVEL_CONTENT_V45.itinerary).map(items => items.length),
        day1: merged.filter(x => x.day === '11/13').map(x => `${x.time} ${x.desc}`),
        day2: merged.filter(x => x.day === '11/14').map(x => `${x.time} ${x.desc}`),
        day3: merged.filter(x => x.day === '11/15').map(x => `${x.time} ${x.desc}`),
        day5: merged.filter(x => x.day === '11/17').map(x => `${x.time} ${x.desc}`),
        hasLegitimateCustom: merged.some(x => x.key === 'custom-1'),
        customKeys: window.customItineraryData.map(x => x.key),
        pretrip: (window.v37SimulatedDate = '11/10', window.getItineraryDisplayDay()),
        after: (window.v37SimulatedDate = '11/20', window.hasSelectedItineraryDay = false, window.getItineraryDisplayDay())
      };
    });
    expect(result.canonicalCount).toBe(31);
    expect(result.customCount).toBe(10);
    expect(result.mergedCount).toBe(36);
    expect(result.dayCounts).toEqual([5, 9, 5, 4, 8]);
    expect(result.customKeys).toEqual([
      'legacy-out-1630', 'legacy-out-1730', 'legacy-back', 'note-out', 'note-back', 'custom-1',
      'stale-day2-fireworks', 'day2-personal', 'stale-day3-solsot', 'day3-personal'
    ]);
    expect(result.hasLegitimateCustom).toBe(true);
    expect(result.day1.join('\n')).toContain('13:25 BX572 桃園 (TPE) ➔ 金海 (PUS)');
    expect(result.day1.join('\n')).toContain('17:00 抵達金海國際機場 (PUS)');
    expect(result.day1.join('\n')).toContain('12:00 BX572 座位 12A，記得選靠窗');
    expect(result.day1.join('\n')).not.toContain('16:30 抵達金海機場舊時間');
    expect(result.day1.join('\n')).not.toContain('17:30 BX572');
    expect(result.day2.join('\n')).not.toContain('19:30 廣安里 M 無人機煙火秀');
    expect(result.day2.join('\n')).toContain('21:30 回飯店整理戰利品');
    expect(result.day3.join('\n')).not.toContain('12:00 【午餐】Solsot 釜飯');
    expect(result.day3.join('\n')).toContain('15:30 皇理團路買伴手禮');
    expect(result.day3.filter(row => row.includes('Byeolchaeban Gyodong Ssambap'))).toHaveLength(1);
    expect(result.day2.filter(row => row.includes('M Drone Light Show（場次待官方確認）'))).toHaveLength(1);
    expect(result.day5.join('\n')).toContain('11:00 KE2085 託運 23kg');
    expect(result.day5.join('\n')).toContain('14:50 KE2085 自金海機場起飛');
    expect(result.day5.join('\n')).toContain('16:30 KE2085 抵達桃園機場');
    expect(result.day5.join('\n')).not.toContain('16:30 KE2085 自金海機場起飛');
    expect(result.pretrip).toBe('11/13');
    expect(result.after).toBe('11/17');
  });

  test('Docs tab self-renders canonical immigration links and truthful empty cards', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('immigrationRulesUI').replaceChildren();
      window.showV37Tab('wallet');
      window.switchWalletTab('doc');
    });
    await expect(page.locator('#walletDocSection')).toBeVisible();
    await expect(page.getByRole('link', { name: 'K-ETA 官方公告' })).toBeVisible();
    await expect(page.getByRole('link', { name: '官方 e-Arrival Card' })).toHaveAttribute('href', 'https://www.e-arrivalcard.go.kr/');
    await expect(page.getByRole('link', { name: 'Q-CODE 官方說明' })).toBeVisible();
    await expect(page.locator('#walletDocSection')).toContainText('尚未上傳');
    await expect(page.locator('#walletDocSection button:disabled')).toHaveCount(6);
  });

  test('AI assistant reads current canonical immigration guidance', async ({ page }) => {
    const html = await page.evaluate(() => window.AIAssistantEngine.generateSuggestions({
      currentDate: '11/10',
      uncompletedPreps: [{ key: 'passport' }]
    }));
    expect(html).toContain('2026/12/31 KST');
    expect(html).toContain('免費官方電子申報');
    expect(html).toContain('仍有效的 K-ETA');
    expect(html).toContain('取決於 KDCA 當期檢疫管理地區與個人旅遊史');
    expect(html).toContain('出發前依官方最新公告再次確認');
    expect(html).not.toContain('72 小時申請');
    expect(html).not.toContain('務必申請 K-ETA');
    expect(html).not.toContain('填寫 Q-Code，避免入境受阻');
  });

  test('manual shopping adds and offline queue use the selected shopping owner', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const originalPush = window.NetworkEngine.firebasePush;
      const originalQueue = window.addToOfflineQueue;
      const sent = [];
      const queued = [];
      window.shopList = [];
      try {
        window.deviceOwner = 'user2';
        window.currentShopOwner = 'user1';
        window.NetworkEngine.firebasePush = async (path, value) => { sent.push({ path, value }); };
        document.getElementById('newShop').value = 'OWNER-B1-MANUAL-U1';
        await window.addShopItem();

        window.deviceOwner = 'user1';
        window.currentShopOwner = 'user2';
        document.getElementById('newShop').value = 'OWNER-B1-MANUAL-U2';
        await window.addShopItem();

        window.NetworkEngine.firebasePush = async () => { throw new Error('controlled offline'); };
        window.addToOfflineQueue = (method, path, value) => queued.push({ method, path, value });
        document.getElementById('newShop').value = 'OWNER-B1-OFFLINE-U2';
        await window.addShopItem();
      } finally {
        window.NetworkEngine.firebasePush = originalPush;
        window.addToOfflineQueue = originalQueue;
      }
      return { sent, queued };
    });
    expect(result.sent.map(x => x.value.owner)).toEqual(['user1', 'user2']);
    expect(result.queued).toHaveLength(1);
    expect(result.queued[0].method).toBe('PUSH');
    expect(result.queued[0].value.owner).toBe('user2');
  });

  test('recommended shopping add uses shopping owner independently of device owner', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.deviceOwner = 'user1';
      window.currentShopOwner = 'user2';
      let payload;
      const originalPush = window.NetworkEngine.firebasePush;
      try {
        window.NetworkEngine.firebasePush = async (_path, value) => { payload = value; };
        await window.addRecShopToMyList(window.RECOMMENDED_SHOPPING[0].id);
      } finally {
        window.NetworkEngine.firebasePush = originalPush;
      }
      return payload;
    });
    expect(result.owner).toBe('user2');
  });

  test('public payer default and real BudgetEngine settlement remain correct', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('split'));
    await page.selectOption('#deviceOwner', 'user2');
    await page.evaluate(() => window.updateOwner());
    await expect(page.locator('#payer')).toHaveValue('user2');
    await page.selectOption('#payer', 'user1');
    await expect(page.locator('#payer')).toHaveValue('user1');

    const settlements = await page.evaluate(() => {
      const render = bills => {
        window.sharedBills = bills;
        window.currentBillTab = '公費';
        window.TripContextEngine.tripContext = {
          budget: window.BudgetEngine.calculateBudget(bills, [], 0.024, '11/13', window.u1, window.u2, window.deviceOwner, '公費')
        };
        window.renderBills();
        return document.getElementById('settlement').textContent;
      };
      return {
        owed: render([{ key: 'a', name: '公費', amt: 1000, currency: 'TWD', payer: 'user1', type: '公費' }]),
        balanced: render([
          { key: 'b', name: '公費一', amt: 500, currency: 'TWD', payer: 'user1', type: '公費' },
          { key: 'c', name: '公費二', amt: 500, currency: 'TWD', payer: 'user2', type: '公費' }
        ])
      };
    });
    expect(settlements.owed).toContain('鴨');
    expect(settlements.owed).toContain('溫');
    expect(settlements.owed).toContain('500');
    expect(settlements.balanced).toContain('帳目完美平衡');
  });
});
