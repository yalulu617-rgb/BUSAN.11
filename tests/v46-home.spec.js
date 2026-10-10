import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { bootApp } from './helpers/boot.js';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function engine() {
  const ctx = vm.createContext({ Date, Intl, console });
  ctx.window = ctx;
  vm.runInContext(source('ute/ute_home_v46.js'), ctx);
  return ctx.V46HomeEngine;
}

test('V46: full-year Korea calendar correctly switches before/during/after', () => {
  const e = engine();
  expect(e.toDay(new Date('2026-11-12T14:59:59Z'))).toBe('2026-11-12');
  expect(e.toDay(new Date('2026-11-12T15:00:00Z'))).toBe('2026-11-13');
  expect(e.modeFor('2026-11-12')).toBe('before');
  expect(e.modeFor('2026-11-13')).toBe('during');
  expect(e.modeFor('2026-11-17')).toBe('during');
  expect(e.modeFor('2026-11-18')).toBe('after');
  expect(e.modeFor('2027-11-13')).toBe('after');
  expect(e.daysBetween('2026-10-10', '2026-11-13')).toBe(34);
});

test('V46: preview never changes the true date or reservation status', () => {
  const e = engine();
  const reservations = [{ id: 'sky-capsule', status: '尚未預訂' }, { id: 'ktx-korail', status: '不需要' }];
  const model = e.createModel({
    now: new Date('2026-10-10T06:00:00Z'),
    previewMode: 'during', previewDay: '2026-11-15',
    context: { reservations },
    packing: [{ done: true }, { done: false }],
    shopping: [{ checked: true }, { checked: false }],
    photos: [{ url: 'test.jpg' }]
  });
  expect(model.naturalMode).toBe('before');
  expect(model.mode).toBe('during');
  expect(model.today).toBe('2026-10-10');
  expect(model.selectedDay).toBe('2026-11-15');
  expect(model.next).toBe(null);
  expect(model.packing.done).toBe(1);
  expect(model.photosCount).toBe(1);
  expect(model.boughtCount).toBe(1);
  expect(model.reminders.some(r => r.id === 'gyeongju-transport')).toBe(false);
  expect(reservations[0].status).toBe('尚未預訂');
});

test('V46: missing weather/amount is never replaced with invented numbers', () => {
  const e = engine();
  const model = e.createModel({
    now: new Date('2026-11-20T00:00:00+09:00'),
    context: { currentWeather: { unavailable: true, temp: 18 }, budget: {} }
  });
  expect(model.mode).toBe('after');
  expect(model.weather).toBe(null);
  expect(model.spent).toBe(null);
  expect(model.photosCount).toBe(0);
  expect(model.boughtCount).toBe(0);
});

test('V46: three phases render and keep the original eleven-entry menu', async ({ page }) => {
  await bootApp(page);
  const home = page.locator('#v37HomeDashboard .v46-home');
  await expect(home).toBeVisible();
  for (const mode of ['before', 'during', 'after']) {
    await page.evaluate(m => window.setV46HomePreview(m), mode);
    await expect(home).toHaveAttribute('data-v46-mode', mode);
    await expect(page.locator('#v37HomeDashboard .v45-nine-card')).toHaveCount(11);
    await expect(page.locator('#liveTravelCard')).toBeVisible();
  }
  await page.evaluate(() => window.setV46HomePreview('before'));
  await expect(page.locator('.v46-days')).toHaveCount(0);
  await page.evaluate(() => window.setV46HomePreview('after'));
  await expect(page.locator('.v46-days')).toHaveCount(0);
  await page.evaluate(() => window.setV46HomePreview('during'));
  await expect(page.locator('.v46-day')).toHaveCount(5);
  await page.getByRole('button', { name: '回到自動' }).click();
  await expect(page.locator('.v46-auto')).toHaveCount(0);
});

test('V46: shopping source and album batch input remain untouched', () => {
  const html = source('index.html');
  expect(html).toContain('id="shopGalleryUpload" data-shop-photo-input');
  expect(html).toContain('id="photoImgUpload" multiple');
  expect(html).toContain("uploadMultipleToImgBB(this.files, 'photo')");
  expect(source('components/v46-home.js')).toContain("setShopTabMode('my')");
  expect(source('services/utils.js')).toContain('window.uploadMultipleToImgBB');
});
