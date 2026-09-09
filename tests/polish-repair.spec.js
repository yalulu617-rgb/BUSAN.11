// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

test('Home navigation uses native, keyboard-operable controls', async ({ page }) => {
  await bootApp(page);

  const cards = page.locator('.v45-nine-card');
  await expect(cards).toHaveCount(9);
  for (let index = 0; index < 9; index += 1) {
    const card = cards.nth(index);
    await expect(card).toHaveJSProperty('tagName', 'BUTTON');
    await expect(card).toHaveAttribute('type', 'button');
    expect((await card.getAttribute('aria-label')) || (await card.innerText()).trim()).toBeTruthy();
  }

  const hero = page.locator('.home-nav-button');
  await expect(hero).toHaveCount(1);
  await expect(hero).toHaveJSProperty('tagName', 'BUTTON');
  await expect(hero).toHaveAttribute('aria-label', /開啟/);

  const collections = page.locator('.home-collection-button');
  await expect(collections).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    await expect(collections.nth(index)).toHaveJSProperty('tagName', 'BUTTON');
    await expect(collections.nth(index)).toHaveAttribute('aria-label', /開啟.+收藏/);
  }

  await cards.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#itinerary')).toHaveClass(/active/);

  await page.locator('#tab-home').click();
  await cards.first().focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#itinerary')).toHaveClass(/active/);
});

test('icon-only controls expose descriptive accessible names', async ({ page }) => {
  await bootApp(page);

  await expect(page.locator('#addShopItemBtn')).toHaveAccessibleName('新增購物項目');
  await expect(page.locator('button[onclick="quickAddBill()"]')).toHaveAccessibleName('加入快速記帳');

  await page.locator('#tab-itinerary').click();
  await page.waitForSelector('#itinerary.active');
  await page.locator('#tab-wallet').click();
  await page.waitForSelector('#wallet.active');
  await page.locator('#btnWalletHotel').click();
  await page.waitForSelector('#walletHotelSection', { state: 'visible' });
  await page.locator('#btnWalletDoc').click();
  await page.waitForSelector('#walletDocSection', { state: 'visible' });
  await page.locator('#tab-more').click();
  await page.waitForSelector('#more.active');

  const unnamed = await page.evaluate(() => {
    const targetSelectors = [
      '.btn-edit',
      '.btn-delete',
      '.prep-link',
      '#addShopItemBtn',
      'button[onclick="quickAddBill()"]',
      '#more .v38-mini-btn'
    ];
    return [...document.querySelectorAll(targetSelectors.join(','))]
      .filter(element => {
        const text = (element.textContent || '').trim();
        const label = element.getAttribute('aria-label') || element.getAttribute('title') || text;
        return !label || /^[+✎🗑🔊]$/.test(label);
      })
      .map(element => element.outerHTML);
  });
  expect(unnamed).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 430, height: 932 }
]) {
  test(`mobile touch targets and page width remain safe at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await bootApp(page);

    const assertNoPageOverflow = async () => {
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
      expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1);
    };

    const assertTouchTargets = async (selector) => {
      const targets = page.locator(selector).filter({ visible: true });
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        const box = await targets.nth(index).boundingBox();
        expect(box, `${selector} #${index} has no box`).toBeTruthy();
        expect(box.height, `${selector} #${index} height`).toBeGreaterThanOrEqual(43.5);
      }
    };

    await assertNoPageOverflow();

    await page.locator('#tab-wallet').click();
    await assertTouchTargets('.wallet-tabs .day-tab');

    await page.locator('#btnWalletHotel').click();
    await page.waitForSelector('#walletHotelSection', { state: 'visible' });
    await assertTouchTargets('#walletHotelSection .map-tag, #walletHotelSection .v38-mini-btn');
    await assertNoPageOverflow();

    await page.locator('#btnWalletDoc').click();
    await page.waitForSelector('#walletDocSection', { state: 'visible' });
    await assertTouchTargets('#walletDocSection .mobile-touch-link, #walletDocSection .v38-mini-btn');
    await assertNoPageOverflow();

    await page.locator('#tab-itinerary').click();
    await page.waitForSelector('#itinerary.active');
    await assertTouchTargets('#itinerary .map-tag');
    await assertNoPageOverflow();

    await page.locator('#tab-more').click();
    await page.waitForSelector('#more.active');
    await assertTouchTargets('#more .v38-mini-btn');
    await assertNoPageOverflow();

    const navBox = await page.locator('.bottom-nav').boundingBox();
    expect(navBox).toBeTruthy();
    expect(Math.abs(navBox.y + navBox.height - viewport.height)).toBeLessThanOrEqual(1);
  });
}
