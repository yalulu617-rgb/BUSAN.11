// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

const firebaseWritesByPage = new WeakMap();
const firebaseWriteMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

test.beforeEach(async ({ page }) => {
  const writes = [];
  firebaseWritesByPage.set(page, writes);
  page.on('request', request => {
    const url = request.url();
    if (firebaseWriteMethods.has(request.method()) && /firebaseio\.com|firebasedatabase\.app/i.test(url)) {
      writes.push({ method: request.method(), url });
    }
  });
});

test.afterEach(async ({ page }) => {
  expect(firebaseWritesByPage.get(page) || [], 'Production/Firebase test writes must stay at zero').toEqual([]);
});

test.describe('BUSAN.11 V45 — Owner UX Batch A', () => {
  test('home follows traveler mental model and keeps 11 discoverable entries', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('home'));

    await expect(page.locator('#liveTravelCard')).toBeVisible();
    await expect(page.locator('#v37HomeDashboard')).toContainText('LIVE TRAVEL CARD');
    await expect(page.locator('#v37HomeDashboard')).toContainText('楓況');
    await expect(page.locator('#homeHighFrequencyTitle')).toContainText('旅行中高頻');
    await expect(page.locator('#homeManagementTitle')).toContainText('旅行管理');

    const cards = page.locator('.v45-nine-card');
    await expect(cards).toHaveCount(11);
    const text = await page.locator('.v45-home-nine-grid').innerText();
    for (const label of ['今日行程','天氣・楓況','旅行記帳','吃喝・景點','超商・超市','快樂購','翻譯・SOS','旅行回憶','住宿・交通','票券・優惠','行前準備']) {
      expect(text).toContain(label);
    }
  });

  test('legacy guide identities are display-blocked without hiding valid SCENTICA Gwangan', async ({ page }) => {
    await bootApp(page);
    const result = await page.evaluate(() => {
      const blocked = ['Matchandeul','味讚王','Haemok','海木','ZIMCARRY','Solsot','Byeolchaeban','SCENTICA Jeonpo','센티카 전포','Pohang Dwaeji Gukbap'];
      return {
        missed: blocked.filter(title => !window.isOwnerHiddenTravelItem({ title })),
        validGwanganBlocked: window.isOwnerHiddenTravelItem({ title: 'SCENTICA Gwangan' })
      };
    });
    expect(result.missed).toEqual([]);
    expect(result.validGwanganBlocked).toBe(false);

    await page.evaluate(() => {
      window.guideData = [
        { key:'stale-1', type:'必吃美食', title:'味讚王', desc:'legacy' },
        { key:'stale-2', type:'必吃美食', title:'Solsot', desc:'legacy' },
        { key:'valid-1', type:'必吃美食', title:'Owner Valid Food', desc:'keep' }
      ];
      window.currentGuideTab = '必吃美食';
      window.renderGuideContent();
    });
    const guideText = await page.locator('#guideList').innerText();
    expect(guideText).toContain('Owner Valid Food');
    expect(guideText).not.toMatch(/味讚王|Solsot/);
  });

  test('supermarket is discoverable from Home without changing the 6 convenience portals', async ({ page }) => {
    await bootApp(page);
    await page.locator('.v45-nine-card').filter({ hasText: '超商・超市' }).click();
    await expect(page.locator('#shop')).toHaveClass(/active/);
    await expect(page.locator('#shopConvenienceContainer')).toBeVisible();
    await expect(page.locator('.supermarket-direct-card')).toBeVisible();
    await expect(page.locator('[data-convenience-topic]')).toHaveCount(6);
    for (const id of ['discount', 'compare', 'radar', 'microwave', 'combos', 'loot']) {
      await expect(page.locator(`[data-convenience-topic="${id}"]`)).toBeVisible();
    }

    const portalText = await page.locator('#shopConvenienceContainer').innerText();
    for (const label of ['優惠怎麼看','GS25 vs CU','必買雷達','熟食＆微波教室','神級混搭','我的超商戰利品']) {
      expect(portalText).toContain(label);
    }
    await expect(page.locator('.supermarket-direct-card')).toContainText('E-Mart Munhyeon');
    await expect(page.locator('.supermarket-direct-card')).toContainText('10:00–23:00');
    await expect(page.locator('.supermarket-direct-card')).toContainText('GS25 서면유성점');
    await expect(page.locator('.supermarket-direct-card')).toContainText('세븐일레븐 부산서면다인점');
  });

  test('translation workspace is one integrated SOS destination', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('more'));
    await expect(page.locator('#translationWorkspace')).toBeVisible();
    await expect(page.locator('#newCardTw')).toBeVisible();
    await expect(page.locator('#newCardKr')).toBeVisible();
    await expect(page.locator('#voiceGridUI .voice-card').first()).toBeVisible();
    await expect(page.locator('#more')).toContainText('Papago');

    await page.evaluate(() => { window.showV37Tab('home'); window.openGuideFolder('工具'); });
    await expect(page.locator('#more')).toHaveClass(/active/);
    await expect(page.locator('#translationWorkspace')).toBeVisible();
  });

  test('prep entry and bottom-nav state are predictable across programmatic navigation', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.showV37Tab('shop'));
    await expect(page.locator('#tab-home')).toHaveClass(/active/);
    await page.evaluate(() => window.showV37Tab('photo'));
    await expect(page.locator('#tab-wallet')).toHaveClass(/active/);
    await page.evaluate(() => window.showV37Tab('more'));
    await expect(page.locator('#tab-more')).toHaveClass(/active/);

    await page.evaluate(() => window.showV37Tab('home'));
    await page.locator('.v45-nine-card').filter({ hasText: '行前準備' }).click();
    await expect(page.locator('#wallet')).toHaveClass(/active/);
    await expect(page.locator('#walletDocSection')).toBeVisible();
    await expect(page.locator('#prepChecklistCard')).toBeVisible();
    await expect(page.locator('#btnWalletDoc')).toContainText('行前');
  });
});
