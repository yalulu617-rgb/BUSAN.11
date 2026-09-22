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

  test('Packing List exposes progress plus add/edit/delete workflow', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('doc');
      window.prepData = [
        { key: 'prep-1', text: '護照', category: '證件', done: true, link: '' },
        { key: 'prep-2', text: '充電器', category: '電子', done: false, link: '' }
      ];
      renderPrepList();
    });
    await expect(page.locator('#prepProgressUI')).toContainText('完成 1 / 2');
    await expect(page.locator('#prepProgressUI')).toContainText('50%');
    await expect(page.locator('#prepListUI .btn-edit')).toHaveCount(2);

    const result = await page.evaluate(async () => {
      const updates = [];
      const pushes = [];
      NetworkEngine.firebaseUpdate = async (path, data) => { updates.push({ path, data }); return { success: true }; };
      NetworkEngine.firebasePush = async (path, data) => { pushes.push({ path, data }); return { success: true }; };
      editPrep('prep-2');
      document.getElementById('prepText').value = 'USB-C 充電器';
      await savePrepItem();
      document.getElementById('prepText').value = '雨傘';
      document.getElementById('prepCategory').value = '其他';
      await savePrepItem();
      return { updates, pushes };
    });
    expect(result.updates[0].path).toBe('busan_v36_prep/prep-2');
    expect(result.pushes[0].path).toBe('busan_v36_prep');
    expect(result.pushes[0].data.kind).toBe('packing');
  });
});
