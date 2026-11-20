import { test, expect } from '@playwright/test';

test('VLOG storyboard lets the user replace and remove only real same-day candidates', async ({ page }) => {
  await page.setContent(`<!doctype html><html><body>
    <div id="vlogStatus"></div><div id="vlogStoryboard"></div>
    <button id="vlogPickBtn"></button><button id="vlogDownloadBtn" hidden></button><button id="vlogCancelBtn" hidden></button>
    <input id="vlogLocalFiles" type="file">
  </body></html>`);
  await page.addScriptTag({ path: 'js/vlog.js' });
  await page.evaluate(() => {
    const photos = [
      { key: 'selected-real-photo', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', capturedAt: '2026-11-13T10:00:00', date: '2026-11-13', city: 'selected-real-photo', _vlogDate: '2026-11-13' },
      { key: 'replacement-real-photo', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADt=', capturedAt: '2026-11-13T11:00:00', date: '2026-11-13', city: 'replacement-real-photo', _vlogDate: '2026-11-13' },
      { key: 'other-day-photo', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADu=', capturedAt: '2026-11-14T10:00:00', date: '2026-11-14', city: 'other-day-photo', _vlogDate: '2026-11-14' }
    ];
    window.photoList = photos;
    window.VlogSelectionEngine = {
      tripDays: ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'],
      pickHighlights: async () => ({ selected: [photos[0]], candidates: photos, qualityChecked: 0, dates: ['2026-11-13'] })
    };
  });
  await page.evaluate(() => window.prepareVlog());
  await expect(page.locator('#vlogStoryboard .vlog-selection-card')).toHaveCount(1);
  const daySelect = page.locator('#vlogStoryboard select');
  await expect(daySelect.locator('option')).toHaveCount(2);
  await daySelect.selectOption('1');
  await page.getByRole('button', { name: '替換', exact: true }).click();
  await expect(page.locator('#vlogStoryboard')).toContainText('replacement-real-photo');
  await page.getByRole('button', { name: '移除 2026-11-13 精選照片' }).click();
  await expect(page.locator('#vlogStoryboard .vlog-selection-card')).toHaveCount(0);
  await expect(page.locator('#vlogDownloadBtn')).toBeHidden();
  await expect(page.locator('#vlogStatus')).toContainText('空的');
});
