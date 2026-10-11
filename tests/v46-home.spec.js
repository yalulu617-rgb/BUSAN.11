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

test('V46: booking reminders only clear with explicitly linked confirmed voucher', () => {
  const e = engine();
  const base = {
    now: new Date('2026-10-10T05:00:00Z'),
    context: { reservations: [
      { id: 'sky-capsule', status: '尚未預訂' },
      { id: 'hanbok', status: '已預訂' }
    ]}
  };
  const initial = e.createModel(base);
  expect(initial.reminders.find(r => r.id === 'sky-capsule')?.status).toBe('待確認預約');
  expect(initial.reminders.find(r => r.id === 'hanbok')?.status).toContain('行程資料標記已預訂');

  const misleadingTitle = e.createModel({
    ...base, context: {
      ...base.context,
      tickets: [{ title: '天空膠囊列車', booked: true, voucher: 'https://example.com/voucher' }]
    }
  });
  expect(misleadingTitle.reminders.find(r => r.id === 'sky-capsule')).toBeDefined();

  const bookedWithoutVoucher = e.createModel({
    ...base, context: {
      ...base.context,
      tickets: [{ reservationId: 'sky-capsule', booked: true, voucher: '' }]
    }
  });
  expect(bookedWithoutVoucher.reminders.find(r => r.id === 'sky-capsule')?.status)
    .toBe('已預訂・待保存憑證');

  const savedWithoutBooking = e.createModel({
    ...base, context: {
      ...base.context,
      tickets: [{ reservationId: 'sky-capsule', booked: false, voucher: 'https://example.com/voucher' }]
    }
  });
  expect(savedWithoutBooking.reminders.find(r => r.id === 'sky-capsule')?.status)
    .toBe('憑證已保存・預訂待核對');

  const fullyVerified = e.createModel({
    ...base, context: {
      ...base.context,
      tickets: [{ reservationId: 'sky-capsule', booked: true, voucher: 'https://example.com/voucher' }]
    }
  });
  expect(fullyVerified.reminders.find(r => r.id === 'sky-capsule')).toBeUndefined();
});

test('V46: financial summary stays empty until actual expense records exist', () => {
  const e = engine();
  const now = new Date('2026-11-20T00:00:00+09:00');
  const empty = e.createModel({ now, context: { budget: { overallSpent: 0 } } });
  expect(empty.spent).toBe(null);
  const recorded = e.createModel({
    now, hasExpenseRecords: true, context: { budget: { overallSpent: 2560 } }
  });
  expect(recorded.spent).toBe(2560);
});

test('V46: after-trip summaries derive from refreshed in-memory snapshots, not storage writes', async ({ page }) => {
  await bootApp(page);
  await page.evaluate(() => {
    window.photoList = [{ url: 'photoA.webp' }, { url: 'photoB.webp' }];
    window.shopList = [
      { text: 'Yegam', checked: true }, { text: 'Coffee candy', checked: false }
    ];
    window.setV46HomePreview('after');
  });
  const summary = await page.locator('#v37HomeDashboard .v46-summary').innerText();
  expect(summary).toContain('2');
  expect(summary).toContain('1');
  const model = await page.evaluate(() => window.getTripContext()?.v46Home);
  expect(model.photosCount).toBe(2);
  expect(model.boughtCount).toBe(1);
});

test('V46: memory gallery only renders existing secure photo URLs, never mockup photos', () => {
  const e=engine();
  const state=e.createModel({
    now:new Date('2026-11-20T09:00:00Z'),
    photos:[{url:'https://example.org/real-trip.webp'},{url:'javascript:alert(1)'},{url:''}]
  });
  expect(state.photosCount).toBe(3);
  expect(state.photoPreview.length).toBe(1);
  expect(state.photoPreview[0].url).toBe('https://example.org/real-trip.webp');
});

test('V4.1: all phase heroes use actual in-app illustration instead of old mountain photo', async ({ page }) => {
  await bootApp(page);
  for (const phase of ['before','during','after']) {
    await page.evaluate(p => window.setV46HomePreview(p), phase);
    const hero=page.locator('#v37HomeDashboard #liveTravelCard');
    await expect(hero.locator('.v46-watercolor-illustration')).toHaveCount(1);
    await expect(hero.locator('img[src="13972.png"]')).toHaveCount(0);
  }
});

test('V4.1 visual evidence: capture all three mobile phases for human review', async ({ page }, testInfo) => {
  // Evidence, not an assertion that watercolor illustration matches OWNER's art.
  if (testInfo.project.name !== 'chromium') test.skip();
  await page.setViewportSize({ width: 390, height: 844 });
  await bootApp(page);
  for (const mode of ['before','during','after']) {
    await page.evaluate(p => window.setV46HomePreview(p), mode);
    await expect(page.locator('#v37HomeDashboard .v46-home')).toHaveAttribute('data-v46-mode',mode);
    await expect(page.locator('#liveTravelCard .v46-watercolor-illustration')).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    const png=await page.screenshot({animations:'disabled',fullPage:false});
    await testInfo.attach('v46-' + mode + '-mobile-390px', {body:png,contentType:'image/png'});
  }
});


test('V4.1: all eleven functions are collapsed by default and open on demand', async ({ page }) => {
  await bootApp(page);
  for (const phase of ['before', 'during', 'after']) {
    await page.evaluate(() => { window.v46AllToolsExpanded = false; });
    await page.evaluate(p => window.setV46HomePreview(p), phase);
    const bag = page.locator('#v37HomeDashboard details.v46-tools');
    await expect(bag).not.toHaveAttribute('open', '');
    await expect(bag.locator('.v45-nine-card')).toHaveCount(11);
    await expect(bag.locator('.v45-nine-card').first()).toBeHidden();
    await bag.locator('summary').click();
    await expect(bag).toHaveAttribute('open', '');
    await expect(bag.locator('.v45-nine-card').first()).toBeVisible();
    await bag.locator('summary').click();
    await expect(bag.locator('.v45-nine-card').first()).toBeHidden();
  }
});

test('V46: illustrated rail only during travel with five real day buttons', async ({ page }) => {
  await bootApp(page);
  for (const mode of ['before','during','after']) {
    await page.evaluate(m => window.setV46HomePreview(m), mode);
    const train=page.locator('#v37HomeDashboard .v46-train-world');
    await expect(train).toHaveCount(mode==='during'?1:0);
    if (mode==='during') {
      const days=page.locator('#v37HomeDashboard button.v46-day');
      await expect(days).toHaveCount(5);
      await days.nth(2).click();
      await expect(days.nth(2)).toHaveAttribute('aria-pressed','true');
      await expect(train.locator('.v46-train-art')).toHaveCount(1);
    }
  }
});
