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
