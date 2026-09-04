import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const context = vm.createContext({});
context.window = context;
vm.runInContext(source('data/travel-content.js'), context);
vm.runInContext(source('data/recommended.js'), context);
const stores = context.RECOMMENDED_SHOPPING.filter(item => ['sm10', 'sm11'].includes(item.id));

test('Image Batch 1: shopping catalog stores provide local WebP assets', () => {
  expect(stores.map(item => item.name)).toEqual(['SCENTICA 香水店', 'OLIVE YOUNG 南浦洞店']);
  for (const store of stores) {
    for (const path of [store.image.thumb, store.image.full]) {
      const bytes = readFileSync(new URL('../' + path, import.meta.url));
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      expect(bytes.length).toBeLessThan(100000);
      expect(source('sw.js')).toContain('./' + path);
    }
  }
});

// Isolated DOM with production renderers: no Firebase writes or external image requests.
async function fixture(page) {
  await page.route('http://images.test/**', route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    return route.fulfill({ contentType: 'image/webp', body: readFileSync(new URL('../' + path, import.meta.url)) });
  });
  await page.setContent('<base href="http://images.test/"><div id="sRecList"></div><div id="sList"></div>');
  await page.addStyleTag({ content: source('assets/css/item-images.css') });
  await page.addScriptTag({ content: source('services/item-images.js') });
  const renderers = ['renderRecommendedShopping', 'renderShop'].map(name =>
    source('components/renderers.js').match(new RegExp(`window\\.${name} = function\\(\\) {[\\s\\S]*?^};`, 'm'))[0]).join('\n');
  await page.addScriptTag({ content: renderers });
  await page.evaluate(items => {
    window.StorageEngine = { get: () => ({ data: [], success: true }) };
    window.currentRecShopFilter = 'ALL';
    window.RECOMMENDED_SHOPPING = [...items, { id: 'missing', name: 'No photo', category: 'Other', desc: '' }];
    window.renderRecommendedShopping();
  }, stores);
}

test('Image Batch 1: lazy thumbnails and placeholders open accessible previews', async ({ page }) => {
  await fixture(page);
  await expect(page.getByRole('img', { name: 'No photo：尚無圖片', exact: true })).toBeVisible();
  for (const store of stores) {
    const button = page.getByRole('button', { name: '放大圖片：' + store.name, exact: true });
    await expect(button.locator('img')).toHaveAttribute('loading', 'lazy');
    await button.click();
    const dialog = page.getByRole('dialog', { name: '商品與店家圖片預覽' });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(dialog.locator('img')).toHaveAttribute('src', 'http://images.test/' + store.image.full);
    await page.getByRole('button', { name: '關閉圖片預覽', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
  }
});

test('Image Batch 1: photo clicks preserve shopping state and failed thumbnails fall back', async ({ page }) => {
  await fixture(page);
  await page.evaluate(store => {
    document.getElementById('sRecList').replaceChildren();
    window.shopList = [{ key: 'test', owner: 'user1', text: store.name, image: store.image, checked: false }];
    window.toggleShop = () => { window.shopList[0].checked = true; };
    window.renderShop();
  }, stores[0]);
  const button = page.getByRole('button', { name: '放大圖片：' + stores[0].name, exact: true });
  await button.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => window.shopList[0].checked)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await button.locator('img').evaluate(img => img.dispatchEvent(new Event('error')));
  await expect(button).toHaveCount(0);
  await expect(page.getByRole('img', { name: stores[0].name + '：尚無圖片', exact: true })).toBeVisible();
});

test('Image Batch 2: device photos resize, replace in place, persist and degrade safely', async ({ page, context: browserContext }) => {
  await page.route('http://photo.test/**', route => route.fulfill({ contentType: 'text/html', body: '<main id="list"></main>' }));
  await page.goto('http://photo.test/');
  await page.addScriptTag({ content: source('ute/ute_shopping_photo.js') });
  const key = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return ShoppingPhotoEngine.save(new File([blob], 'camera.png', { type: 'image/png' }));
  });
  const first = await page.evaluate(async key => {
    const record = await ShoppingPhotoEngine.get(key);
    const thumb = await createImageBitmap(record.thumb);
    const full = await createImageBitmap(record.full);
    return { thumb: [thumb.width, thumb.height, record.thumb.type], full: [full.width, full.height, record.full.type] };
  }, key);
  expect(Math.max(...first.thumb.slice(0, 2))).toBeLessThanOrEqual(320);
  expect(Math.max(...first.full.slice(0, 2))).toBeLessThanOrEqual(1200);
  expect(['image/webp', 'image/jpeg']).toContain(first.thumb[2]);
  expect(['image/webp', 'image/jpeg']).toContain(first.full[2]);

  const replacementKey = await page.evaluate(async key => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 1200;
    canvas.getContext('2d').fillStyle = '#f30';
    canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return ShoppingPhotoEngine.save(new File([blob], 'replacement.png', { type: 'image/png' }), key);
  }, key);
  expect(replacementKey).toBe(key);
  expect(await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('busan-shopping-photos');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const count = open.result.transaction('photos').objectStore('photos').count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    };
  }))).toBe(1);
  const reference = await page.evaluate(key => ShoppingPhotoEngine.attach(key, 'Luna 購物照片'), key);
  expect(reference).toEqual({ storage: 'indexeddb', key, alt: 'Luna 購物照片' });

  const secondPage = await browserContext.newPage();
  await secondPage.route('http://photo.test/**', route => route.fulfill({ contentType: 'text/html', body: '<main id="list"></main>' }));
  await secondPage.goto('http://photo.test/');
  await secondPage.addScriptTag({ content: source('ute/ute_shopping_photo.js') });
  await secondPage.addScriptTag({ content: source('services/item-images.js') });
  await secondPage.evaluate(ref => { document.getElementById('list').innerHTML = ItemImages.render(ref, '離線照片'); }, reference);
  const thumbnail = secondPage.getByRole('button', { name: '放大圖片：離線照片' });
  await expect(thumbnail.locator('img')).toHaveAttribute('loading', 'lazy');
  await expect(thumbnail.locator('img')).toHaveAttribute('decoding', 'async');
  await expect.poll(() => thumbnail.locator('img').evaluate(img => img.src.startsWith('blob:') && img.complete && img.naturalWidth > 0)).toBe(true);
  await thumbnail.click();
  await expect(secondPage.getByRole('dialog', { name: '商品與店家圖片預覽' })).toBeVisible();
  await secondPage.getByRole('button', { name: '關閉圖片預覽' }).click();
  await secondPage.evaluate(key => ShoppingPhotoEngine.remove(key), key);
  await secondPage.evaluate(ref => { document.getElementById('list').innerHTML = ItemImages.render(ref, '已刪除照片'); }, reference);
  await expect(secondPage.getByRole('img', { name: '已刪除照片：尚無圖片' })).toBeVisible();
  await secondPage.close();
});

test('Image Batch 2: shopping hooks keep photos optional and delete device blobs', async ({ page }) => {
  const rendererSource = source('components/renderers.js');
  const functions = ['addShopItem', 'deleteShop'].map(name =>
    rendererSource.match(new RegExp(`window\\.${name} = async function \\(.*?\\) {[\\s\\S]*?^};`, 'm'))[0]).join('\n');
  await page.setContent('<input id="newShop" value="Item"><input id="shopWhere"><select id="shopCategory"><option>其他</option></select><input id="tempShopPhoto"><div id="sList"></div>');
  await page.addScriptTag({ content: `
    window.deviceOwner = 'user1'; window.shopList = []; let fakeNow = 0; Date.now = () => ++fakeNow;
    window.StorageEngine = { set() {} }; window.DB_SHOP = 'shop';
    window.NetworkEngine = { firebasePush: async () => {}, firebaseRemove: async () => {} };
    window.renderShop = () => {}; window.showToast = () => {}; window.confirm = () => true;
    window.photoCalls = { attach: [], remove: [], clear: 0 };
    window.ShoppingPhotoEngine = {
      attach: async (key, alt) => { photoCalls.attach.push([key, alt]); return key ? { storage: 'indexeddb', key, alt } : null; },
      remove: async key => photoCalls.remove.push(key), clearSelection: () => photoCalls.clear++
    };
    ${functions}
  ` });
  await page.evaluate(() => addShopItem());
  expect(await page.evaluate(() => shopList[0].image)).toBeUndefined();
  expect(await page.evaluate(() => JSON.stringify(shopList))).not.toMatch(/data:|base64|Blob/);
  await page.evaluate(() => { newShop.value = 'Photo item'; tempShopPhoto.value = 'photo-key'; return addShopItem(); });
  expect(await page.evaluate(() => shopList[1].image)).toEqual({ storage: 'indexeddb', key: 'photo-key', alt: 'Photo item' });
  await page.evaluate(() => deleteShop(shopList[1].key));
  expect(await page.evaluate(() => photoCalls)).toEqual({ attach: [['', 'Item'], ['photo-key', 'Photo item']], remove: ['photo-key'], clear: 2 });
  expect(source('index.html')).toContain('capture="environment"');
  expect(source('index.html')).not.toContain("uploadSingleToImgBB(this.files[0], 'shop')");
});
