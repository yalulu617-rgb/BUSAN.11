import { test, expect } from '@playwright/test';

const shell = `<!doctype html><html><body>
  <input id="memorySearchInput"><div id="albumContainer"></div>
  <div id="lightbox" role="dialog" aria-hidden="true" style="display:none;opacity:0">
    <button id="lightbox-prev" hidden></button><button id="lightbox-next" hidden></button>
    <img id="lightbox-img"><div id="lightbox-counter">1 / 1</div><div id="lightbox-details"></div>
  </div>
</body></html>`;

test('album uses captured chronology and the search-filtered list at both boundaries', async ({ page }) => {
  await page.setContent(shell);
  await page.addScriptTag({ path: 'js/ui.js' });
  await page.addScriptTag({ path: 'js/memory.js' });
  await page.evaluate(() => {
    window.photoList = [
      { key: 'late-upload', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', capturedAt: '2026-11-15T12:00:00', date: '2026-11-15', city: 'Busan', uploadedAt: '2026-11-18T00:00:00' },
      { key: 'early-upload', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', capturedAt: '2026-11-13T10:00:00', date: '2026-11-13', city: 'Busan', uploadedAt: '2026-11-19T00:00:00' },
      { key: 'other-city', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', capturedAt: '2026-11-14T10:00:00', date: '2026-11-14', city: 'Seoul' }
    ];
    window.renderMemoryAlbum();
  });
  await page.locator('#memorySearchInput').fill('Busan');
  await page.evaluate(() => window.renderMemoryAlbum());
  await page.locator('#albumContainer .polaroid').first().click();
  await expect(page.locator('#lightbox-counter')).toHaveText('1 / 2');
  await expect(page.locator('#lightbox-prev')).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#lightbox-counter')).toHaveText('1 / 2');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lightbox-counter')).toHaveText('2 / 2');
  await expect(page.locator('#lightbox-next')).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lightbox-counter')).toHaveText('2 / 2');
  await page.evaluate(() => {
    const box = document.getElementById('lightbox');
    const touch = (type, x) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: 120 }] });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientX: x, clientY: 120 }] });
      box.dispatchEvent(event);
    };
    touch('touchstart', 100);
    touch('touchend', 200);
  });
  await expect(page.locator('#lightbox-counter')).toHaveText('1 / 2');
  const current = await page.evaluate(() => window.currentLightboxKey);
  expect(current).toBe('late-upload');
});

test('five date albums show capture-day counts, scoped photos and an uncategorized fallback without changing data', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <div id="memoryDayTabs"></div>
    <input id="memorySearchInput" oninput="window.memoryAlbumDay='all'; renderMemoryAlbum()">
    <div id="memoryAlbumSummary"></div><div id="albumContainer"></div>
  </body></html>`);
  await page.addScriptTag({ path: 'js/memory.js' });
  const snapshot = await page.evaluate(() => {
    const url = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    window.photoList = [
      { key: 'day13', url, capturedAt: '2026-11-13T09:00:00', date: '2026-11-13', city: '釜山' },
      { key: 'day15', url, capturedAt: '2026-11-15T17:00:00', date: '2026-11-15', city: '慶州' },
      { key: 'day17', url, capturedAt: '2026-11-17T10:00:00', date: '2026-11-17', city: '釜山' },
      { key: 'outside', url, capturedAt: '2026-11-19T08:00:00', date: '2026-11-19', city: '台灣' },
      { key: 'undated', url, date: '拍攝日期待補', city: '無定位' }
    ];
    const original = JSON.stringify(window.photoList);
    window.renderMemoryAlbum();
    return original;
  });
  await expect(page.locator('[data-memory-day="2026-11-17"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(1);
  await expect(page.locator('[data-memory-day="2026-11-13"] .memory-day-chip-count')).toHaveText('1 張');
  await expect(page.locator('[data-memory-day="other"] .memory-day-chip-count')).toHaveText('2 張');

  await page.locator('[data-memory-day="2026-11-15"]').click();
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(1);
  await expect(page.locator('#memoryAlbumSummary')).toContainText('11/15');
  expect(await page.evaluate(() => window.memoryVisiblePhotos.map(p => p.key))).toEqual(['day15']);

  await page.locator('[data-memory-day="other"]').click();
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(2);
  expect(await page.evaluate(() => window.memoryVisiblePhotos.map(p => p.key))).toEqual(['outside', 'undated']);

  await page.locator('[data-memory-day="all"]').click();
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(5);
  await expect(page.locator('#albumContainer .memory-album-group-heading')).toHaveCount(4);
  await page.locator('#memorySearchInput').fill('慶州');
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(1);
  expect(await page.evaluate(() => window.memoryVisiblePhotos.map(p => p.key))).toEqual(['day15']);
  expect(await page.evaluate(() => JSON.stringify(window.photoList))).toBe(snapshot);
});

test('day albums keep empty days visible and preserve user choice when the album re-renders', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <div id="memoryDayTabs"></div><input id="memorySearchInput">
    <div id="memoryAlbumSummary"></div><div id="albumContainer"></div>
  </body></html>`);
  await page.addScriptTag({ path: 'js/memory.js' });
  await page.evaluate(() => {
    window.photoList = [{ key: 'one', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', date: '2026/11/13', capturedAt: null }];
    window.renderMemoryAlbum();
  });
  await page.locator('[data-memory-day="2026-11-14"]').click();
  await expect(page.locator('#albumContainer .memory-empty-state')).toContainText('沒有照片');
  await page.evaluate(() => window.renderMemoryAlbum());
  await expect(page.locator('[data-memory-day="2026-11-14"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-memory-day="2026-11-13"]').click();
  await expect(page.locator('#albumContainer .polaroid')).toHaveCount(1);
});
