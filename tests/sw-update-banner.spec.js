import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Exercise the production banner without depending on a service-worker update race.
const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const bannerFunction = appSource.match(/    function _showSwUpdateBanner\(worker\) {[\s\S]*?^    }/m)[0];

test('SW update notice does not block navigation and its Update button still works', async ({ page }) => {
  await page.setContent('<button id="navigation" style="position:fixed;top:0;left:0;width:100%;height:100px;" onclick="this.dataset.clicks = String(Number(this.dataset.clicks || 0) + 1)">Navigation</button>');
  await page.evaluate(code => {
    window.swUpdateMessages = [];
    new Function('worker', `${code}; _showSwUpdateBanner(worker);`)({
      postMessage: message => window.swUpdateMessages.push(message)
    });
  }, bannerFunction);

  const banner = page.locator('#swUpdateBanner');
  await expect(banner).toBeVisible();
  // The informational text and wrapper padding both overlap the navigation button.
  const textBox = await banner.locator('span').boundingBox();
  const bannerBox = await banner.boundingBox();
  await page.mouse.click(textBox.x + textBox.width / 2, textBox.y + textBox.height / 2);
  await expect(page.locator('#navigation')).toHaveAttribute('data-clicks', '1');
  await page.mouse.click(bannerBox.x + 8, bannerBox.y + bannerBox.height / 2);
  await expect(page.locator('#navigation')).toHaveAttribute('data-clicks', '2');
  await expect(banner).toBeVisible();

  await page.locator('#swUpdateBtn').click();
  expect(await page.evaluate(() => window.swUpdateMessages)).toEqual([{ action: 'skipWaiting' }]);
  await expect(banner).toHaveCount(0);
  await expect(page.locator('#navigation')).toHaveAttribute('data-clicks', '2');
});
