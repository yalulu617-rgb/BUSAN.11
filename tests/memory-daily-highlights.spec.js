import { test, expect } from '@playwright/test';

const source = `<!doctype html><html lang="zh-TW"><body>
  <div id="memoryDayTabs"></div>
  <input id="memorySearchInput" oninput="window.memoryAlbumDay='all'; renderMemoryAlbum()">
  <div id="memoryAlbumSummary"></div>
  <section id="memoryDailyHighlights">
    <div id="memoryHighlightStatus"></div>
    <div id="todayPhotosContainer"></div>
  </section>
  <div id="albumContainer"></div>
</body></html>`;

const PHOTO_URL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

async function load(page) {
  await page.setContent(source);
  await page.addScriptTag({ path: 'js/memory.js' });
  await page.addScriptTag({ path: 'js/memory-highlights.js' });
}

test('existing five-day photo records automatically populate daily highlights and follow date/search', async ({ page }) => {
  await load(page);
  const initial = await page.evaluate((url) => {
    window.photoList = [
      { key:'a', url, date:'2026-11-13', capturedAt:'2026-11-13T09:00:00', city:'釜山' },
      { key:'b', url, date:'2026-11-15', capturedAt:'2026-11-15T11:00:00', city:'慶州' },
      { key:'c', url, date:'2026-11-15', capturedAt:'2026-11-15T13:00:00', city:'慶州' },
      { key:'d', url, date:'2026-11-15', capturedAt:'2026-11-15T15:00:00', city:'慶州' },
      { key:'e', url, date:'2026-11-17', capturedAt:'2026-11-17T10:00:00', city:'釜山' },
      { key:'unknown', url, date:'拍攝日期待補', city:'無定位' }
    ];
    const snapshot = JSON.stringify(window.photoList);
    window.renderMemoryAlbum();
    return snapshot;
  }, PHOTO_URL);
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(1);
  await expect(page.locator('#memoryHighlightStatus')).toContainText('現有相簿');
  await page.locator('[data-memory-day="2026-11-15"]').click();
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(3);
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card').first()).toContainText('慶州');
  await page.locator('[data-memory-day="all"]').click();
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(4); // Three trip dates and undated
  await expect(page.locator('#todayPhotosContainer')).toContainText('日期待分類');
  await page.locator('#memorySearchInput').fill('慶州');
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(1); // All view: one representative of 11/15
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(3);
  expect(await page.evaluate(() => JSON.stringify(window.photoList))).toBe(initial);
});

test('highlight cards open the original image in the existing lightbox, with no cloud writes', async ({ page }) => {
  await load(page);
  const result = await page.evaluate((url) => {
    let calls = 0;
    window.NetworkEngine = { firebaseWrite(){ calls++; throw Error('No cloud writes allowed'); } };
    window.openLightbox = (image, key) => { window.lastOpenedHighlight = { image, key }; };
    window.photoList = [{key:'original-key', url, date:'2026-11-15', capturedAt:'2026-11-15T08:00:00'}];
    window.renderMemoryAlbum();
    return calls;
  }, PHOTO_URL);
  expect(result).toBe(0);
  await page.locator('#todayPhotosContainer .memory-highlight-card').click();
  expect(await page.evaluate(() => window.lastOpenedHighlight)).toEqual({ image: PHOTO_URL, key: 'original-key' });
});

test('highlights are visibly nonempty before quality scoring, and retain fallbacks on CORS failures', async ({ page }) => {
  await load(page);
  await page.evaluate((url) => {
    window.VlogSelectionEngine = {
      tripDays: ['2026-11-15'],
      pickHighlights: async () => { throw new Error('CDN does not allow canvas pixels'); }
    };
    window.photoList = [
      {key:'photo1', url, date:'2026-11-15', capturedAt:'2026-11-15T09:00:00'},
      {key:'photo2', url, date:'2026-11-15', capturedAt:'2026-11-15T10:00:00'}
    ];
    window.renderMemoryAlbum();
  }, PHOTO_URL);
  await expect(page.locator('#todayPhotosContainer .memory-highlight-card')).toHaveCount(2);
  await expect(page.locator('#memoryHighlightStatus')).toContainText('現有相簿');
});

test('daily highlights display an explanation instead of an empty white area when no photos match', async ({ page }) => {
  await load(page);
  await page.evaluate(() => { window.photoList = []; window.renderMemoryAlbum(); });
  await expect(page.locator('#todayPhotosContainer .memory-highlight-empty')).toContainText('沒有照片');
  await expect(page.locator('#memoryHighlightStatus')).toContainText('不需要重新上傳');
});
