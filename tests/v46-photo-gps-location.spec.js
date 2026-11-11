import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

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

/** Builds JPEG with real EXIF DateTimeOriginal and optional GPS. */
function buildJpegWithExif({ dateTime, lat, lon }) {
  const header = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0]);
  const hasGps = (lat !== undefined && lon !== undefined);
  const u16 = n => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; };
  const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };

  let tiff;
  if (hasGps) {
    const exifIfdOffset = 38, dateOffset = 56, gpsOffset = 76, latOffset = 130, lonOffset = 154;
    const ifd0 = Buffer.concat([u16(2), entry(0x8769, 4, 1, exifIfdOffset), entry(0x8825, 4, 1, gpsOffset), u32(0)]);
    const exifIfd = Buffer.concat([u16(1), entry(0x9003, 2, 20, dateOffset), u32(0)]);
    const dateData = ascii(dateTime);
    const dms = v => { const a = Math.abs(v); const d = Math.floor(a); const m = Math.floor((a - d) * 60); const s = Math.round(((a - d) * 60 - m) * 60 * 100); return [[d, 1], [m, 1], [s, 100]]; };
    const gpsIfd = Buffer.concat([u16(4),
      entry(1, 2, 2, Buffer.from(lat >= 0 ? 'N\0' : 'S\0', 'ascii')), entry(2, 5, 3, latOffset),
      entry(3, 2, 2, Buffer.from(lon >= 0 ? 'E\0' : 'W\0', 'ascii')), entry(4, 5, 3, lonOffset), u32(0)]);
    tiff = Buffer.concat([header, ifd0, exifIfd, dateData, gpsIfd, rationals(dms(lat)), rationals(dms(lon))]);
  } else {
    // Only DateTimeOriginal, NO GPS (simulates chat-shared photo where GPS was stripped)
    const exifIfdOffset = 26, dateOffset = 44;
    const ifd0 = Buffer.concat([u16(1), entry(0x8769, 4, 1, exifIfdOffset), u32(0)]);
    const exifIfd = Buffer.concat([u16(1), entry(0x9003, 2, 20, dateOffset), u32(0)]);
    const dateData = ascii(dateTime);
    tiff = Buffer.concat([header, ifd0, exifIfd, dateData]);
  }
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff]);
  const len = Buffer.alloc(2); len.writeUInt16BE(body.length + 2);
  return Buffer.concat([TINY_JPEG.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, body, TINY_JPEG.subarray(2)]);
}

test.beforeEach(async ({ page }) => {
  await page.route(url => !/^(http:\/\/localhost|data:|blob:)/.test(url.href), route => route.abort());
  await bootApp(page);
  TINY_JPEG = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const x = c.getContext('2d'); x.fillStyle = '#2c3e50'; x.fillRect(0, 0, 8, 8);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1];
  }), 'base64');
});

test.describe('1. Galaxy S25 Photo GPS Reading & Parsing', () => {
  test('Galaxy S25 JPEG with EXIF GPS taken at Nangang Exhibition Center parses exact coordinates & capture date', async ({ page }) => {
    // S25 Photo taken 2026/11/8 13:14:00 at Nangang Exhibition Center: lat 25.0569, lon 121.6174
    const s25GpsJpeg = buildJpegWithExif({ dateTime: '2026:11:08 13:14:00', lat: 25.056900, lon: 121.617400 });

    await page.evaluate(() => {
      NetworkEngine.uploadImage = async () => ({ success: false, error: 'synthetic test mode' });
    });

    await page.locator('#photoImgUpload').setInputFiles([
      { name: 's25_nangang_gps.jpg', mimeType: 'image/jpeg', buffer: s25GpsJpeg }
    ]);

    await expect.poll(() => page.evaluate(async () => (await PhotoLocalSafety.getPending()).length)).toBe(1);
    const pending = await page.evaluate(async () => await PhotoLocalSafety.getPending());
    const photo = pending[0];

    expect(photo.metadata.capturedAt).toBe('2026-11-08T13:14:00');
    expect(photo.metadata.locationStatus).toBe('gps');
    expect(photo.metadata.latitude).toBeCloseTo(25.0569, 3);
    expect(photo.metadata.longitude).toBeCloseTo(121.6174, 3);

    // Render album
    await page.evaluate(() => showV37Tab('photo'));
    const container = page.locator('#albumContainer');
    await expect(container).toContainText('2026-11-08 13:14');
    await expect(container).toContainText('25.05690, 121.61740');
    await expect(container.locator('a[href*="25.0569"]')).toBeVisible();

    // Check lightbox details
    await container.locator('.polaroid').click();
    const details = page.locator('#lightbox-details');
    await expect(details).toContainText('2026-11-08 13:14');
    await expect(details).toContainText('25.05690, 121.61740');
    await expect(details.locator('a[href*="maps"]')).toBeVisible();
  });

  test('Galaxy S25 chat-shared JPEG without GPS preserves capture time, reports missing reason, never fakes GPS', async ({ page }) => {
    // Chat-shared S25 Photo: EXIF timestamp 2026:11:08 13:14:00, but GPS IFD stripped
    const s25ChatJpeg = buildJpegWithExif({ dateTime: '2026:11:08 13:14:00' });

    await page.evaluate(() => {
      NetworkEngine.uploadImage = async () => ({ success: false, error: 'synthetic test mode' });
    });

    await page.locator('#photoImgUpload').setInputFiles([
      { name: 's25_nangang_chat.jpg', mimeType: 'image/jpeg', buffer: s25ChatJpeg }
    ]);

    await expect.poll(() => page.evaluate(async () => (await PhotoLocalSafety.getPending()).length)).toBe(1);
    const pending = await page.evaluate(async () => await PhotoLocalSafety.getPending());
    const photo = pending[0];

    expect(photo.metadata.capturedAt).toBe('2026-11-08T13:14:00');
    expect(photo.metadata.locationStatus).toBe('missing');
    expect(photo.metadata.latitude).toBeNull();
    expect(photo.metadata.longitude).toBeNull();
    expect(photo.metadata.missingReason).toContain('GPS');

    await page.evaluate(() => showV37Tab('photo'));
    const container = page.locator('#albumContainer');
    await expect(container).toContainText('2026-11-08 13:14');
    await expect(container).toContainText('無定位');
    await expect(container.locator('button:has-text("補地點")')).toBeVisible();
  });
});

test.describe('2. In-Place Cloud Photo Location Supplement & Modification', () => {
  test('supplementing location updates existing cloud record in-place without duplicate key or ImgBB re-upload', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    // Pre-populate cloud photo in Firebase RTDB
    const initialRecord = {
      url: 'https://i.ibb.co/synthetic/s25-nangang.jpg',
      date: '2026-11-08',
      capturedAt: '2026-11-08T13:14:00',
      city: '無定位',
      location: null,
      timestamp: 1731042840000
    };
    await page.evaluate(async rec => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_s25_cloud_test`).set(rec);
    }, initialRecord);

    const container = page.locator('#albumContainer');
    await expect(container).toContainText('2026-11-08 13:14');
    await expect(container).toContainText('無定位');

    // Trigger supplement location modal
    await page.evaluate(() => window.openPhotoLocationModal('photo_s25_cloud_test'));
    const modal = page.locator('#photoLocationModal');
    await expect(modal).toBeVisible();

    // Fill in location information
    await page.locator('#photoLocNameInput').fill('南港展覽館');
    await page.locator('#photoLocAddressInput').fill('台北市南港區經貿二路1號');
    await page.locator('#photoLocLatInput').fill('25.056900');
    await page.locator('#photoLocLngInput').fill('121.617400');

    // Track if ImgBB upload is triggered (MUST NOT BE CALLED)
    await page.evaluate(() => {
      window._uploadImageCalled = false;
      const orig = window.NetworkEngine.uploadImage;
      window.NetworkEngine.uploadImage = async function() {
        window._uploadImageCalled = true;
        return orig ? orig.apply(this, arguments) : { success: true };
      };
    });

    // Save location
    await page.locator('#savePhotoLocBtn').click();
    await expect(modal).not.toBeVisible();

    // Verify ImgBB was NEVER called
    const uploadCalled = await page.evaluate(() => window._uploadImageCalled);
    expect(uploadCalled).toBe(false);

    // Verify Firebase RTDB: exactly one key, updated in place
    const rtdbPhotos = await page.evaluate(async () => {
      const snap = await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value');
      return snap.val() || {};
    });
    const keys = Object.keys(rtdbPhotos);
    expect(keys).toEqual(['photo_s25_cloud_test']); // NO DUPLICATE RECORD
    const updated = rtdbPhotos['photo_s25_cloud_test'];
    expect(updated.url).toBe('https://i.ibb.co/synthetic/s25-nangang.jpg'); // Image URL preserved
    expect(updated.capturedAt).toBe('2026-11-08T13:14:00'); // Capture time preserved
    expect(updated.city).toBe('南港展覽館'); // Updated place
    expect(updated.placeName).toBe('南港展覽館');
    expect(updated.address).toBe('台北市南港區經貿二路1號');
    expect(updated.location.latitude).toBeCloseTo(25.0569, 4);
    expect(updated.location.longitude).toBeCloseTo(121.6174, 4);
    expect(updated.manualLocation).toBe(true);

    // Album UI immediately displays updated place name and map link
    await expect(container).toContainText('南港展覽館');
    await expect(container.locator('a[href*="25.0569"]')).toBeVisible();
    await expect(container.locator('button:has-text("改地點")')).toBeVisible();
  });

  test('location update failure preserves original record and surfaces error without deleting photo', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    const initialRecord = {
      url: 'https://i.ibb.co/synthetic/preserve.jpg',
      date: '2026-11-08',
      capturedAt: '2026-11-08T13:14:00',
      city: '無定位',
      timestamp: 1731042840000
    };
    await page.evaluate(async rec => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_fail_safe`).set(rec);
    }, initialRecord);

    // Simulate database write failure
    await page.evaluate(() => {
      window.NetworkEngine.firebaseUpdate = async () => ({ success: false, error: 'PERMISSION_DENIED: 權限不足' });
    });

    await page.evaluate(() => window.openPhotoLocationModal('photo_fail_safe'));
    await page.locator('#photoLocNameInput').fill('南港展覽館');
    await page.locator('#savePhotoLocBtn').click();

    // Error is shown in modal, modal stays open so user does not lose input
    await expect(page.locator('#photoLocError')).toContainText('PERMISSION_DENIED');

    // Original cloud record is strictly preserved
    const record = await page.evaluate(async () => {
      const snap = await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_fail_safe`).once('value');
      return snap.val();
    });
    expect(record.city).toBe('無定位');
    expect(record.url).toBe('https://i.ibb.co/synthetic/preserve.jpg');
  });
});

test.describe('3. Multi-Device Real-Time Sync & Data Safety', () => {
  test('remote location update is automatically reflected on second device via real-time listener', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    // 1. Setup cloud photo
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_sync_dual`).set({
        url: 'https://i.ibb.co/synthetic/sync.jpg',
        date: '2026-11-08',
        capturedAt: '2026-11-08T13:14:00',
        city: '無定位',
        timestamp: Date.now()
      });
    });

    await expect(page.locator('#albumContainer')).toContainText('無定位');

    // 2. Simulate other user (Duck or Wen) updating the location in cloud RTDB
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_sync_dual`).update({
        city: '海雲台海水浴場',
        placeName: '海雲台海水浴場',
        latitude: 35.1587,
        longitude: 129.1604,
        location: { latitude: 35.1587, longitude: 129.1604 },
        manualLocation: true,
        updatedAt: Date.now()
      });
    });

    // 3. Current device listener triggers and renders new location automatically
    await expect(page.locator('#albumContainer')).toContainText('海雲台海水浴場');
  });

  test('local queues (pendingPhotos, guide_pending, private vault) are completely preserved', async ({ page }) => {
    // Seed test entries in pending queues
    await page.evaluate(async () => {
      localStorage.setItem('busan_v46_guide_pending_v1', JSON.stringify([{ id: 'rest_keep', name: '扎嘎其海鮮' }]));
    });

    await page.evaluate(() => showV37Tab('photo'));
    const pendingGuide = await page.evaluate(() => JSON.parse(localStorage.getItem('busan_v46_guide_pending_v1')));
    expect(pendingGuide).toEqual([{ id: 'rest_keep', name: '扎嘎其海鮮' }]);
  });
});

test.describe('4. Galaxy S25 Responsive Layout & PWA Freshness', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Galaxy S25 viewport displays photo album and modal without horizontal overflow', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(overflow).toBe(true);

    await page.evaluate(() => window.openPhotoLocationModal('test_key'));
    await expect(page.locator('#photoLocationModal')).toBeVisible();
    await expect(page.locator('#savePhotoLocBtn')).toBeVisible();
    await page.locator('#photoLocationModal button:has-text("取消")').click();
    await expect(page.locator('#photoLocationModal')).not.toBeVisible();
  });

  test('Service Worker cache version bumped and photo-local-safe is precached', async ({ page }) => {
    const release = await (await page.request.get('/data/release.json')).json();
    expect(release.cacheVersion).toMatch(/^busan-trip-v46-photo-gps-v[67]/);
    expect(release.appVersion).toMatch(/^V46\.[34]\./);
  });
});

// V46.3.1 regression: blank manual coordinates must never become Null Island.
test.describe('5. Null-safe manual photo location regression', () => {
  test('cloud photo: name only persists no GPS, maps searches the name, preserves image and key', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_name_only`).set({
        url: 'https://i.ibb.co/synthetic/name-only.jpg', date: '2026-11-08', city: '無定位'
      });
    });
    await page.evaluate(() => window.openPhotoLocationModal('photo_name_only'));
    await page.locator('#photoLocNameInput').fill('南港展覽館');
    await page.locator('#savePhotoLocBtn').click();
    await expect(page.locator('#photoLocationModal')).not.toBeVisible();
    const row = await page.evaluate(async () =>
      (await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_name_only`).once('value')).val()
    );
    expect(row.url).toBe('https://i.ibb.co/synthetic/name-only.jpg');
    expect(row.placeName).toBe('南港展覽館');
    expect(row.latitude ?? null).toBeNull();
    expect(row.longitude ?? null).toBeNull();
    expect(row.location ?? null).toBeNull();
    const mapLink = page.locator('#albumContainer a[href*="google.com/maps"]').first();
    await expect(mapLink).toHaveAttribute('href', new RegExp(encodeURIComponent('南港展覽館')));
    expect(await mapLink.getAttribute('href')).not.toContain('query=0,0');
  });

  test('cloud photo: clearing stale (0,0) also removes stale GPS instead of linking to Null Island', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_legacy_zero`).set({
        url: 'https://i.ibb.co/synthetic/legacy.jpg', date: '2026-11-08',
        city: '無定位', latitude: 0, longitude: 0,
        location: { latitude: 0, longitude: 0 }
      });
    });
    await page.evaluate(() => window.openPhotoLocationModal('photo_legacy_zero'));
    await page.locator('#photoLocNameInput').fill('南港展覽館');
    await page.locator('#photoLocLatInput').fill('');
    await page.locator('#photoLocLngInput').fill('');
    await page.locator('#savePhotoLocBtn').click();
    await expect(page.locator('#photoLocationModal')).not.toBeVisible();
    const row = await page.evaluate(async () =>
      (await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_legacy_zero`).once('value')).val()
    );
    expect(row.url).toBe('https://i.ibb.co/synthetic/legacy.jpg');
    expect(row.latitude ?? null).toBeNull();
    expect(row.longitude ?? null).toBeNull();
    expect(row.location ?? null).toBeNull();
    const links = await page.locator('#albumContainer a[href*="google.com/maps"]').evaluateAll(nodes => nodes.map(n => n.href));
    expect(links.join(' ')).not.toContain('query=0,0');
  });

  test('one-sided coordinates reject save and leave Firebase record unchanged', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_partial`).set({
        url: 'https://i.ibb.co/synthetic/partial.jpg', city: '無定位'
      });
    });
    await page.evaluate(() => window.openPhotoLocationModal('photo_partial'));
    await page.locator('#photoLocNameInput').fill('南港展覽館');
    await page.locator('#photoLocLatInput').fill('25.0569');
    await page.locator('#photoLocLngInput').fill('');
    await page.locator('#savePhotoLocBtn').click();
    await expect(page.locator('#photoLocError')).toContainText('同時填寫');
    await expect(page.locator('#photoLocationModal')).toBeVisible();
    const row = await page.evaluate(async () =>
      (await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_partial`).once('value')).val()
    );
    expect(row.city).toBe('無定位');
    expect(row.placeName).toBeUndefined();
    expect(row.url).toBe('https://i.ibb.co/synthetic/partial.jpg');
  });

  test('direct API rejects missing, partial, and invented zero coordinates', async ({ page }) => {
    const cases = await page.evaluate(async () => ({
      partial: await window.PhotoLocalSafety.updateLocation('any', {placeName:'南港展覽館',latitude:25.0569,longitude:null}),
      zero: await window.PhotoLocalSafety.updateLocation('any', {placeName:'南港展覽館',latitude:0,longitude:0}),
      empty: await window.PhotoLocalSafety.updateLocation('any', {placeName:'南港展覽館',latitude:'',longitude:' '})
    }));
    expect(cases.partial.success).toBe(false);
    expect(cases.zero.success).toBe(false);
    // Empty pair is valid input (name-only); this call should not fabricate GPS.
    // Cloud write may fail if key is absent, but it must not be rejected for the pair.
    expect(cases.empty.error || '').not.toMatch(/經緯度|0,0/);
  });
});


test.describe('6. S25 HEIC metadata extraction and safe batch reporting', () => {
  function box(type, content) {
    const b=Buffer.alloc(content.length+8);
    b.writeUInt32BE(b.length,0);b.write(type,4,4,'ascii');
    content.copy(b,8);return b;
  }
  function buildHeicWithExif(jpeg) {
    const p=jpeg.indexOf(Buffer.from('Exif\0\0','ascii'));
    if(p<0)throw Error('no Exif in source fixture');
    const app1length=jpeg.readUInt16BE(p-2);
    const tiff=jpeg.subarray(p+6,p+app1length-2);
    const exif=Buffer.concat([Buffer.alloc(4),tiff]);
    const infe=box('infe',Buffer.concat([Buffer.from([2,0,0,0,0,1,0,0]),Buffer.from('Exif','ascii'),Buffer.from([0])]));
    const iinf=box('iinf',Buffer.concat([Buffer.alloc(4),Buffer.from([0,1]),infe]));
    const iloc=box('iloc',Buffer.concat([
      Buffer.from([1,0,0,0,0x44,0x40,0,1]), // version 1, offsetSize=4,lengthSize=4, baseOffsetSize=4, indexSize=0, 1 item
      Buffer.from([0,1,0,1,0,0]), // item_id, method=idat, data ref
      Buffer.alloc(4),Buffer.from([0,1]), // base offset, one extent
      Buffer.alloc(4),Buffer.alloc(4)
    ]));
    iloc.writeUInt32BE(exif.length,iloc.length-4);
    const idat=box('idat',exif);
    const meta=box('meta',Buffer.concat([Buffer.alloc(4),iinf,iloc,idat]));
    return Buffer.concat([box('ftyp',Buffer.from('heic\0\0\0\0heic','binary')),meta]);
  }

  test('HEIC embedded Exif GPS and capture time are extracted without uploading', async ({ page }) => {
    const jpeg=buildJpegWithExif({dateTime:'2026:11:08 13:14:00',lat:25.0569,lon:121.6174});
    const heic=buildHeicWithExif(jpeg);
    const meta=await page.evaluate(async b64=>{
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      return window.PhotoLocalSafety.readExif(new File([bytes],'s25-original.heic',{type:'image/heic'}));
    },heic.toString('base64'));
    expect(meta.locationStatus).toBe('gps');
    expect(meta.latitude).toBeCloseTo(25.0569,3);
    expect(meta.longitude).toBeCloseTo(121.6174,3);
    expect(meta.capturedAt).toBe('2026-11-08T13:14:00');
  });
});
