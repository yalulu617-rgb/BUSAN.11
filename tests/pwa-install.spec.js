// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bootApp } from './helpers/boot.js';

function pngDimensions(path) {
  const png = readFileSync(new URL(`../${path}`, import.meta.url));
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Revision 7 manifest and install icons are subpath-safe and valid', async ({ page }) => {
  const response = await page.request.get('/manifest.json');
  expect(response.status()).toBe(200);
  const manifest = await response.json();

  expect(manifest).toMatchObject({
    name: '釜山慶州秋之旅 V45',
    short_name: '釜山V45',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#FFF9F2',
    theme_color: '#FFF9F2'
  });
  for (const field of ['id', 'start_url', 'scope']) {
    expect(manifest[field]).not.toMatch(/^\//);
  }

  const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
  const icon512 = manifest.icons.find(icon => icon.sizes === '512x512');
  expect(icon192).toMatchObject({ src: './icon-192.png', type: 'image/png', purpose: 'any' });
  expect(icon512).toMatchObject({ src: './icon-512.png', type: 'image/png', purpose: 'any' });
  expect(pngDimensions('icon-192.png')).toEqual({ width: 192, height: 192 });
  expect(pngDimensions('icon-512.png')).toEqual({ width: 512, height: 512 });
  expect((await page.request.get('/icon-192.png')).status()).toBe(200);
  expect((await page.request.get('/icon-512.png')).status()).toBe(200);
});

test('native install readiness is captured without prompting and requires the install button', async ({ page }) => {
  await bootApp(page);
  const initial = await page.evaluate(() => ({
    available: Boolean(window.PwaInstallEngine),
    state: window.PwaInstallEngine.getState()
  }));
  expect(initial.available).toBe(true);
  expect(initial.state.canPrompt).toBe(false);

  const prevented = await page.evaluate(() => {
    window.__pwaPromptCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => { window.__pwaPromptCalls += 1; } },
      userChoice: { value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) }
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(await page.evaluate(() => window.__pwaPromptCalls)).toBe(0);

  const bar = page.locator('#pwaInstallBar');
  const button = page.locator('#pwaInstallBtn');
  await expect(bar).toBeVisible();
  await expect(button).toHaveText('📲 安裝成 App');
  expect(await button.evaluate(element => element.tagName)).toBe('BUTTON');
  expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('.v45-nine-grid #pwaInstallBar').count()).toBe(0);
  expect(await page.locator('.v45-nine-card').count()).toBe(9);

  const barBox = await bar.boundingBox();
  const navBox = await page.locator('.bottom-nav').boundingBox();
  expect(barBox.y + barBox.height).toBeLessThan(navBox.y);

  await button.click();
  expect(await page.evaluate(() => window.__pwaPromptCalls)).toBe(1);
  expect(await page.evaluate(() => window.PwaInstallEngine.getState().canPrompt)).toBe(false);
  await expect(bar).toBeHidden();
});

test('appinstalled clears retained install readiness', async ({ page }) => {
  await bootApp(page);
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => {} },
      userChoice: { value: Promise.resolve({ outcome: 'accepted', platform: 'web' }) }
    });
    window.dispatchEvent(event);
  });
  expect(await page.evaluate(() => window.PwaInstallEngine.getState().canPrompt)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  const state = await page.evaluate(() => window.PwaInstallEngine.getState());
  expect(state.installed).toBe(true);
  expect(state.canPrompt).toBe(false);
  await expect(page.locator('#pwaInstallBar')).toBeHidden();
});

test('standalone mode hides install UI', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  });
  await bootApp(page);
  await expect(page.locator('#pwaInstallBar')).toBeHidden();
  expect(await page.evaluate(() => window.PwaInstallEngine.getState().standalone)).toBe(true);

  const state = await page.evaluate(() => window.PwaInstallEngine.getState());
  expect(state.installed).toBe(true);
  expect(state.canPrompt).toBe(false);
});

test('iOS offers dismissible Traditional Chinese Add to Home Screen guidance', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
    });
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  });
  await bootApp(page);

  const bar = page.locator('#pwaInstallBar');
  await expect(bar).toBeVisible();
  await expect(page.locator('#pwaInstallBtn')).toHaveText('📲 加入 iPhone 主畫面');
  await page.locator('#pwaInstallBtn').click();

  const dialog = page.locator('#pwaIosDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog).toHaveAttribute('aria-labelledby', 'pwaIosTitle');
  await expect(dialog).toContainText('使用 Safari 開啟 BUSAN.11');
  await expect(dialog).toContainText('分享');
  await expect(dialog).toContainText('加入主畫面');
  await expect(dialog).not.toContainText('自動安裝');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.locator('#pwaInstallDismiss').click();
  await expect(bar).toBeHidden();
});

test('service worker preserves controlled updates and caches the Revision 7 shell', async ({ page }) => {
  const source = await (await page.request.get('/sw.js')).text();
  const installHandler = source.match(/self\.addEventListener\('install',[\s\S]*?\n}\);/)[0];
  expect(source).toContain("busan-trip-v45-production-v7-final-pwa");
  expect(installHandler).not.toContain('self.skipWaiting()');
  expect(source).toContain("event.data.action === 'skipWaiting'");
  expect(source).toContain('self.skipWaiting()');
  expect(source).toContain("'./ute/ute_pwa_install.js'");
  expect(source).toContain("'./ute/ute_private_ledger.js'");
  expect(source).toContain("'./ute/ute_shopping_photo.js'");
  expect(source).toContain("'./icon-192.png'");
  expect(source).toContain("'./icon-512.png'");

  const app = await (await page.request.get('/js/app.js')).text();
  expect(app).toContain("navigator.serviceWorker.addEventListener('controllerchange'");
  expect(app).toContain('pointer-events:none');
  expect(app).toContain('pointer-events:auto');
  expect(app).toContain("worker.postMessage({ action: 'skipWaiting' })");
});

test('warm service-worker cache boots core navigation offline with private ledger locked', async ({ page, context }) => {
  await bootApp(page);
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return Boolean(registration.active);
  });
  expect(ready).toBe(true);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const appUrl = page.url();

  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto(appUrl, { waitUntil: 'domcontentloaded' });
  expect(await offlinePage.evaluate(() => navigator.onLine)).toBe(false);
  expect(await offlinePage.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await offlinePage.waitForSelector('#mainApp', { state: 'visible' });
  await expect(offlinePage.locator('.bottom-nav')).toBeVisible();
  expect(await offlinePage.locator('.bottom-nav .nav-item').allTextContents()).toEqual([
    '首頁', '今日', '記帳', '票券', 'SOS'
  ]);
  expect(await offlinePage.evaluate(() => window.privateBills)).toEqual([]);
  expect(await offlinePage.locator('.v45-nine-card').count()).toBe(9);
});
