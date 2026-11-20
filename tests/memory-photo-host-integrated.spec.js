import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

const validPhoto = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#a7764e"/></svg>';
const validDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(validPhoto).toString('base64');

test('real memory tab shows daily highlights for existing pictures without re-upload or another sign-in', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);
  const state = await page.evaluate((goodUrl) => {
    if (!window.NetworkEngine?._db?.__testOnly)
      throw new Error('This test MUST use isolated Firebase; refusing live data');
    const original = [
      { key:'broken', url:'https://i.ibb.co/broken.jpg', date:'2026-11-17', capturedAt:'2026-11-17T10:45:00', city:'無定位' },
      { key:'good', url:goodUrl, date:'2026-11-17', capturedAt:'2026-11-17T11:10:00', placeName:'釜山' },
      { key:'previous', url:goodUrl, date:'2026-11-15', capturedAt:'2026-11-15T11:10:00', city:'慶州' }
    ];
    window.photoList = original;
    window.showV37Tab('photo');
    window.selectMemoryAlbumDay('2026-11-17');
    return { original:JSON.stringify(original), healthLoaded:typeof window.PhotoHostHealth?.inspect === 'function' };
  }, validDataUrl);
  expect(state.healthLoaded).toBe(true);
  await expect(page.locator('#walletMemorySection')).toBeVisible();
  await expect(page.locator('#memoryDailyHighlights')).toBeVisible();
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(2);
  await expect(page.locator('#memoryAlbumSummary')).toContainText('11/17');
  await expect(page.locator('#todayPhotosContainer .memory-highlight-source-warning')).toHaveCount(1);
  await page.evaluate(() => window.openLightbox('https://i.ibb.co/broken.jpg', 'broken'));
  await expect(page.locator('#lightbox-host-status')).toBeVisible();
  // Simulate ImgBB's HTTP 200 blue error picture after the CDN load settles.
  await page.evaluate(() => {
    const img = document.getElementById('lightbox-img');
    Object.defineProperty(img, 'naturalWidth', { configurable:true, value:185 });
    Object.defineProperty(img, 'naturalHeight', { configurable:true, value:185 });
    img.onload();
  });
  await expect(page.locator('#lightbox-host-status')).toContainText('疑似');
  await expect(page.locator('#lightbox-counter')).toContainText('/ 2');
  await page.evaluate(() => {
    const img = document.getElementById('lightbox-img');
    delete img.naturalWidth;
    delete img.naturalHeight;
    window.moveLightbox(-1);
  });
  await expect(page.locator('#lightbox-host-status')).toBeHidden();
  await expect(page.locator('#lightbox-img')).toHaveJSProperty('naturalWidth', 640);
  expect(await page.evaluate(() => JSON.stringify(window.photoList))).toBe(state.original);
});

test('tiny non-ImgBB photos are not mislabeled; physical records stay intact', async ({ page }) => {
  await bootApp(page);
  const result = await page.evaluate(() => {
    if (!window.NetworkEngine?._db?.__testOnly) throw new Error('Requires isolated Firebase');
    return {
      recognized:window.PhotoHostHealth.inspect('https://i.ibb.co/broken.jpg',{ naturalWidth:185,naturalHeight:185 }).status,
      unknown:window.PhotoHostHealth.inspect('https://example.test/photo.png',{ naturalWidth:185,naturalHeight:185 }).status,
      normal:window.PhotoHostHealth.inspect('https://i.ibb.co/normal.jpg',{ naturalWidth:1080,naturalHeight:1440 }).status
    };
  });
  expect(result).toEqual({ recognized:'suspect', unknown:'ok',normal:'ok' });
});

test('ImgBB direct image URLs bypass the PWA cache, so temporary error tiles cannot remain stuck offline', async ({ page }) => {
  await page.route('https://i.ibb.co/**', route => route.fulfill({
    status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},
    body:validPhoto
  }));
  await bootApp(page);
  const worker = await (await page.request.get('/sw.js')).text();
  expect(worker).toContain("'ibb.co'");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = 'https://i.ibb.co/ci-photo-cache-check.jpg';
    });
  });
  const cachedPhotoUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    const records = (await Promise.all(names.map(async name =>
      (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
    return records.filter(url => url.startsWith('https://i.ibb.co/'));
  });
  expect(cachedPhotoUrls, 'ImgBB CDN URLs must never be cached by our PWA').toEqual([]);
});
