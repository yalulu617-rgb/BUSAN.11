import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

// Real JPEG rendered by Chromium canvas (synthetic pixels)
let TINY_JPEG = Buffer.alloc(0);

function ascii(s) { return Buffer.concat([Buffer.from(s, 'ascii'), Buffer.from([0])]); }
function rationals(vals) {
  const b = Buffer.alloc(vals.length * 8);
  vals.forEach(([n, d], i) => { b.writeUInt32LE(n, i * 8); b.writeUInt32LE(d, i * 8 + 4); });
  return b;
}
function entry(tag, type, count, valueOrOffset) {
  const b = Buffer.alloc(12);
  b.writeUInt16LE(tag, 0); b.writeUInt16LE(type, 2); b.writeUInt32LE(count, 4);
  if (Buffer.isBuffer(valueOrOffset)) valueOrOffset.copy(b, 8); else b.writeUInt32LE(valueOrOffset, 8);
  return b;
}
function jpegWithExif({ dateTime, lat, lon }) {
  const header = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0]);
  const exifIfdOffset = 38, dateOffset = 56, gpsOffset = 76, latOffset = 130, lonOffset = 154;
  const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const ifd0 = Buffer.concat([u16(2), entry(0x8769, 4, 1, exifIfdOffset), entry(0x8825, 4, 1, gpsOffset), u32(0)]);
  const exifIfd = Buffer.concat([u16(1), entry(0x9003, 2, 20, dateOffset), u32(0)]);
  const dateData = ascii(dateTime);
  const dms = v => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.floor((a - d) * 60); const s = Math.round(((a - d) * 60 - m) * 60 * 100); return [[d, 1], [m, 1], [s, 100]]; };
  const gpsIfd = Buffer.concat([u16(4),
    entry(1, 2, 2, Buffer.from(lat >= 0 ? 'N\0' : 'S\0', 'ascii')), entry(2, 5, 3, latOffset),
    entry(3, 2, 2, Buffer.from(lon >= 0 ? 'E\0' : 'W\0', 'ascii')), entry(4, 5, 3, lonOffset), u32(0)]);
  const tiff = Buffer.concat([header, ifd0, exifIfd, dateData, gpsIfd, rationals(dms(lat)), rationals(dms(lon))]);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(body.length + 2);
  return Buffer.concat([TINY_JPEG.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, body, TINY_JPEG.subarray(2)]);
}

test.beforeEach(async ({ page }) => {
  await page.route(url => !/^(http:\/\/localhost|data:|blob:)/.test(url.href), route => route.abort());
  await bootApp(page);
  TINY_JPEG = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const x = c.getContext('2d'); x.fillStyle = '#c96'; x.fillRect(0, 0, 8, 8);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }), 'base64');
});

test.describe('V46 Dual-User Sync & Cross-Device Repair', () => {

  test('1. Auth Modal: real email input, role selection, privacy notice, and state toggling', async ({ page }) => {
    await page.evaluate(() => showV37Tab('split'));
    await expect(page.locator('#authSyncCard')).toBeVisible();
    await page.locator('#openAuthModalBtn').click();
    await expect(page.locator('#authModal')).toBeVisible();
    
    // Privacy limitation notice visible
    await expect(page.locator('#authModal')).toContainText('相簿隱私說明');

    // Switch to Duck role: defaults to Google Sign-In mode
    await page.locator('#authSelectDuck').click();
    expect(await page.evaluate(() => window.deviceOwner)).toBe('user2');
    await expect(page.locator('#authGoogleSection')).toBeVisible();
    await expect(page.locator('#authGoogleBtn')).toBeVisible();
    await expect(page.locator('#authGoogleBtn')).toContainText('以 Google 帳號登入 (鴨)');

    // Duck can toggle to Email/password if desired
    await page.getByRole('button', { name: '或改用 Email/密碼登入' }).click();
    await expect(page.locator('#authEmailSection')).toBeVisible();
    await page.locator('#authEmailInput').fill('real.duck@gmail.com');
    await expect(page.locator('#authEmailInput')).toHaveValue('real.duck@gmail.com');

    // Switch to Wen role: defaults to Email/password mode
    await page.locator('#authSelectWen').click();
    expect(await page.evaluate(() => window.deviceOwner)).toBe('user1');
    await expect(page.locator('#authEmailSection')).toBeVisible();
    await page.locator('#authEmailInput').fill('real.wen@gmail.com');
    await expect(page.locator('#authEmailInput')).toHaveValue('real.wen@gmail.com');
    await expect(page.locator('#authLoginBtn')).toHaveText('登入同步 (溫)');

    // Close modal
    await page.getByRole('button', { name: '取消' }).first().click();
    await expect(page.locator('#authModal')).toBeHidden();
  });

  test('2. Public Shared Budget: bidirectional cloud sync & listener update', async ({ page }) => {
    await page.evaluate(() => showV37Tab('split'));
    
    // 1. Initial shared budget default is 50,000
    expect(await page.evaluate(() => window.OwnerBudgetSettings.getLimit('shared'))).toBe(50000);

    // 2. User A updates shared budget to 80,000
    await page.locator('#ownerBudgetEdit').click();
    await page.locator('#ownerBudgetAmount').fill('80000');
    await page.getByRole('button', { name: '儲存預算' }).click();

    // Verify local limit and cloud RTDB write
    expect(await page.evaluate(() => window.OwnerBudgetSettings.getLimit('shared'))).toBe(80000);
    const cloudBudget = await page.evaluate(async () => {
      const snap = await window.NetworkEngine._db.ref(window.DB_BUDGET).once('value');
      return snap.val();
    });
    expect(cloudBudget.shared).toBe(80000);

    // 3. User B receives cloud update from Firebase (e.g. 95,000)
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(window.DB_BUDGET).set({ shared: 95000, updatedAt: Date.now() });
    });

    // Verify User B's local state updated immediately via real-time listener
    await expect.poll(async () => {
      return await page.evaluate(() => window.OwnerBudgetSettings.getLimit('shared'));
    }).toBe(95000);
    await expect(page.locator('#budgetText')).toContainText('95,000');
  });

  test('3. Restaurant Sync: outbox preservation, stable idempotent write, error display', async ({ page }) => {
    await page.evaluate(() => { showV37Tab('home'); openGuideFolder('美食景點'); });
    await page.locator('#guideSubTabs').getByText('必吃美食').click();
    await page.locator('#btnFoodAdd').click();

    // Fill form
    await page.locator('#gdTitle').fill('南浦洞蔘雞湯');
    await page.locator('#gdDesc').fill('雙人共享必吃');
    await page.locator('#gdLink').fill('https://naver.me/samgyetang');

    // Simulate offline or unauthenticated write
    await page.evaluate(() => {
      window.NetworkEngine.firebaseWrite = async () => ({ success: false, error: 'PERMISSION_DENIED: 401 Unauthorized' });
      window.NetworkEngine.firebaseUpdate = async () => ({ success: false, error: 'PERMISSION_DENIED: 401 Unauthorized' });
    });

    await page.locator('#saveGuideBtn').click();

    // S25 pending record MUST remain preserved in localStorage
    const pending = await page.evaluate(() => StorageEngine.get('busan_v46_guide_pending_v1', []).data);
    expect(pending.length).toBe(1);
    expect(pending[0].payload.title).toBe('南浦洞蔘雞湯');
    const stableKey = pending[0].key;

    // Detailed error reason displayed
    await expect(page.locator('#guidePendingSyncBar')).toContainText('未登入或權限不足');

    // Restore cloud write and trigger retry
    await page.evaluate(() => {
      window.NetworkEngine.firebaseWrite = async (path, data) => {
        await window.NetworkEngine._db.ref(path).set(data);
        return { success: true };
      };
    });

    await page.evaluate(() => retryPendingGuideSync());

    // Verified written to cloud database at exact stable key
    const serverVal = await page.evaluate(async (k) => {
      return (await window.NetworkEngine._db.ref(window.DB_GUIDE + '/' + k).once('value')).val();
    }, stableKey);
    expect(serverVal.title).toBe('南浦洞蔘雞湯');

    // Outbox cleaned up
    expect(await page.evaluate(() => StorageEngine.get('busan_v46_guide_pending_v1', []).data)).toHaveLength(0);

    // Retrying again is strictly idempotent (no duplicates)
    await page.evaluate(() => retryPendingGuideSync());
    const count = await page.evaluate(async () => {
      const all = (await window.NetworkEngine._db.ref(window.DB_GUIDE).once('value')).val() || {};
      return Object.values(all).filter(r => r.title === '南浦洞蔘雞湯').length;
    });
    expect(count).toBe(1);
  });

  test('4. Photo Sync: EXIF GPS preserved, stable path, retry idempotence, no duplicates', async ({ page }) => {
    const gpsPhoto = jpegWithExif({ dateTime: '2026:11:09 12:00:00', lat: 35.158, lon: 129.160 });
    
    // Simulate photo upload
    await page.evaluate(() => {
      window.NetworkEngine.uploadImage = async () => ({
        success: true,
        data: { url: 'https://i.ibb.co/synthetic-host/photo1.jpg' }
      });
      // First attempt: Firebase denied
      window.NetworkEngine.firebaseWrite = async () => ({
        success: false,
        error: 'PERMISSION_DENIED'
      });
    });

    await page.locator('#photoImgUpload').setInputFiles([
      { name: 'trip_photo.jpg', mimeType: 'image/jpeg', buffer: gpsPhoto }
    ]);

    // Local IndexedDB MUST keep original photo and error
    await expect.poll(async () => {
      const items = await page.evaluate(async () => await PhotoLocalSafety.getPending());
      return items.length;
    }).toBe(1);

    const pendingPhoto = await page.evaluate(async () => (await PhotoLocalSafety.getPending())[0]);
    expect(pendingPhoto.metadata.capturedAt).toBe('2026-11-09T12:00:00');
    expect(pendingPhoto.metadata.latitude).toBeCloseTo(35.158, 3);
    // Hosted url cached so it will NOT re-upload image bytes to ImgBB
    expect(pendingPhoto.hostedUrl).toBe('https://i.ibb.co/synthetic-host/photo1.jpg');

    // Cloud allows write now
    await page.evaluate(() => {
      window.NetworkEngine.firebaseWrite = async (path, data) => {
        await window.NetworkEngine._db.ref(path).set(data);
        return { success: true };
      };
    });

    // Retry photo sync
    await page.evaluate(async () => await retryPendingPhotos());

    // Verified written to stable Firebase path
    const cloudPhotos = await page.evaluate(async () => {
      return (await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value')).val() || {};
    });
    const photosArr = Object.values(cloudPhotos);
    expect(photosArr.length).toBe(1);
    expect(photosArr[0].url).toBe('https://i.ibb.co/synthetic-host/photo1.jpg');
    expect(photosArr[0].location.latitude).toBeCloseTo(35.158, 3);

    // IndexedDB outbox cleaned
    expect(await page.evaluate(async () => (await PhotoLocalSafety.getPending()).length)).toBe(0);

    // Double retry does NOT create duplicate
    await page.evaluate(async () => await retryPendingPhotos());
    const countAfter = await page.evaluate(async () => {
      const all = (await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value')).val() || {};
      return Object.keys(all).length;
    });
    expect(countAfter).toBe(1);
  });

  test('5. Precaching & Offline PWA: All new sync scripts are cached in Service Worker', async ({ page }) => {
    const swContent = await page.evaluate(async () => {
      const res = await fetch('/sw.js');
      return await res.text();
    });
    expect(swContent).toContain('./js/auth-sync.js');
    expect(swContent).toContain('./owner-budget-settings.js');
    expect(swContent).toContain('./photo-local-safe.js');
    expect(swContent).toContain('./restaurant-save-guard.js');
  });
});
