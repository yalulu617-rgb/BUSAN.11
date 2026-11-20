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
