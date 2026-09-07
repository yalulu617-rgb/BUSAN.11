// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test.describe('Owner Fix Batch 1', () => {
  test.beforeEach(async ({ page }) => { await bootApp(page); });

  test('canonical itinerary survives custom data and has correct flight sequence', async ({ page }) => {
    const result = await page.evaluate(() => {
      const custom = { key: 'custom-1', day: '11/14', time: '08:00', desc: 'Luna custom stop', tr: '步行', map: '' };
      const merged = window.mergeCanonicalItinerary([custom]);
      return {
        day1: merged.filter(x => x.day === '11/13').map(x => `${x.time} ${x.desc}`),
        day5: merged.filter(x => x.day === '11/17').map(x => `${x.time} ${x.desc}`),
        customCount: merged.filter(x => x.key === 'custom-1').length,
        pretrip: (window.v37SimulatedDate = '11/10', window.getItineraryDisplayDay()),
        after: (window.v37SimulatedDate = '11/20', window.hasSelectedItineraryDay = false, window.getItineraryDisplayDay())
      };
    });
    expect(result.day1.join('\n')).toContain('17:00 BX572 抵達金海機場');
    expect(result.day1.join('\n')).toContain('預計抵達西面飯店');
    expect(result.day1.join('\n')).not.toContain('17:30 西面飯店');
    expect(result.day5.join('\n')).toContain('14:50 KE2085 自金海機場起飛');
    expect(result.day5.join('\n')).toContain('16:30 KE2085 抵達桃園機場');
    expect(result.customCount).toBe(1);
    expect(result.pretrip).toBe('11/13');
    expect(result.after).toBe('11/17');
  });

  test('canonical immigration guidance and truthful empty documents render', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('wallet'));
    const info = await page.evaluate(() => window.TRAVEL_CONTENT_V45.immigration);
    expect(info.sourceDate).toBe('2026-09-07');
    expect(info.keta.notes).toContain('有效的 K-ETA');
    expect(info.eArrivalCard.notes).toContain('免費');
    expect(info.qcode.notes).toContain('7 天');
    await expect(page.getByRole('link', { name: '官方 e-Arrival Card' })).toHaveAttribute('href', 'https://www.e-arrivalcard.go.kr/');
    await expect(page.locator('#walletDocSection')).toContainText('尚未上傳');
    await expect(page.locator('#walletDocSection button:disabled')).toHaveCount(4);
  });

  test('shopping owner selection is stable and owns new recommended entries', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.shopList = [{ key: 'u1', text: 'U1 item', owner: 'user1', checked: false }];
      window.currentShopOwner = 'user2';
      window.renderShop();
      let payload;
      const originalPush = window.NetworkEngine.firebasePush;
      window.NetworkEngine.firebasePush = async (_path, value) => { payload = value; };
      await window.addRecShopToMyList(window.RECOMMENDED_SHOPPING[0].id);
      window.NetworkEngine.firebasePush = originalPush;
      return { owner: window.currentShopOwner, payloadOwner: payload.owner, text: document.querySelector('#sList').textContent, status: document.querySelector('#shopOwnerStatus').textContent };
    });
    expect(result.owner).toBe('user2');
    expect(result.payloadOwner).toBe('user2');
    expect(result.text).toContain('清單尚無購物項目');
    expect(result.status).toContain('鴨');
  });

  test('profile switch defaults public payer and settlement uses BudgetEngine output', async ({ page }) => {
    await page.evaluate(() => window.showV37Tab('split'));
    await page.selectOption('#deviceOwner', 'user2');
    await page.evaluate(() => window.updateOwner());
    await expect(page.locator('#payer')).toHaveValue('user2');
    const settlement = await page.evaluate(() => {
      window.sharedBills = [{ key: 's1', name: 'Shared', amt: 100, currency: 'TWD', payer: 'user1' }];
      const original = window.getTripContext;
      window.getTripContext = () => ({ budget: { totalSharedTWD: 100, totalPrivateTWD: 0, settleText: '<b>ENGINE SETTLEMENT</b>' } });
      window.renderBills();
      const html = document.querySelector('#settlement').innerHTML;
      window.getTripContext = original;
      return html;
    });
    expect(settlement).toContain('ENGINE SETTLEMENT');
  });
});
