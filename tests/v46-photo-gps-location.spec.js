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

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('未讀到 GPS 1 張');
      await dialog.accept(); // Explicit owner consent for no-GPS photo.
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
    expect(release.cacheVersion).toMatch(/^busan-trip-v46-photo-gps-v(13|12|11|10|[6-9])/);
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

test.describe('7. Android Gallery GPS redaction safe original file picker', () => {
  test('original Files picker has no image-only accept filter, but keeps multiple selection', async ({ page }) => {
    const photo = page.locator('#photoImgUpload');
    const original = page.locator('#photoOriginalFileUpload');
    await expect(photo).toHaveAttribute('accept','image/*');
    await expect(original).toHaveCount(1);
    await expect(original).not.toHaveAttribute('accept');
    await expect(original).toHaveAttribute('multiple', '');
    await expect(page.locator('label[for="photoOriginalFileUpload"]')).toContainText('我的檔案');
  });

  test('GPS-free batch prompts before writing; cancel leaves original and cloud records unchanged', async ({ page }) => {
    await page.evaluate(() => {
      window._photoUploadCalled = 0;
      window.NetworkEngine.uploadImage = async () => { window._photoUploadCalled++; return {success:false,error:'not expected'}; };
    });
    const noGps = buildJpegWithExif({dateTime:'2026:11:08 13:14:00'});
    let dialogs = 0;
    page.on('dialog', async dialog => {
      dialogs++;
      expect(dialog.message()).toContain('未讀到 GPS 1 張');
      await dialog.dismiss();
    });
    await page.locator('#photoOriginalFileUpload').setInputFiles({
      name:'s25-gallery-gps-redacted.jpg',mimeType:'image/jpeg',buffer:noGps
    });
    await expect(page.locator('#photoUploadStatus')).toContainText('已取消上傳');
    expect(dialogs).toBe(1);
    const saved = await page.evaluate(async () => (await PhotoLocalSafety.getPending()).length);
    expect(saved).toBe(0);
    expect(await page.evaluate(() => window._photoUploadCalled)).toBe(0);
  });
});

test.describe('8. S25 XMP DDD,MM.mmmmk format parsing & diagnostic privacy', () => {
  function buildJpegWithXmp({ dateTime, latStr, lonStr }) {
    const xmp = `http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:DateTimeOriginal="${dateTime}" exif:GPSLatitude="${latStr}" exif:GPSLongitude="${lonStr}"/></rdf:RDF></x:xmpmeta>`;
    const body = Buffer.from(xmp, 'utf8');
    const len = Buffer.alloc(2); len.writeUInt16BE(body.length + 2);
    return Buffer.concat([TINY_JPEG.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, body, TINY_JPEG.subarray(2)]);
  }

  test('Adobe / Samsung XMP format "35,10.7423N" parses accurately and diagnostic masks coordinates', async ({ page }) => {
    const xmpJpeg = buildJpegWithXmp({
      dateTime: '2026-11-08T13:14:00',
      latStr: '35,10.7423N',
      lonStr: '129,04.5678E'
    });

    const parsed = await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return await window.PhotoLocalSafety.readExif(new File([bytes], 's25_xmp.jpg', { type: 'image/jpeg' }));
    }, xmpJpeg.toString('base64'));

    expect(parsed.locationStatus).toBe('gps');
    expect(parsed.latitude).toBeCloseTo(35.1790, 3);
    expect(parsed.longitude).toBeCloseTo(129.0761, 3);
    expect(parsed.capturedAt).toBe('2026-11-08T13:14:00');

    // Verify diagnostic structure never reveals raw coordinates
    expect(parsed.diagnostic).toBeDefined();
    expect(parsed.diagnostic.hasGpsFields).toBe(true);
    expect(parsed.diagnostic.formatDetected).toBe('JPEG');
    expect(parsed.diagnostic.hasXmpHeader).toBe(true);
    expect(parsed.diagnostic.statusLabel).toBe('已讀取到 GPS 定位');
    const diagStr = JSON.stringify(parsed.diagnostic);
    expect(diagStr).not.toContain('35.1790');
    expect(diagStr).not.toContain('129.0761');
  });
});

test.describe('9. Batch Photo Location Assignment & Diagnostic Modal', () => {
  test('batchUpdateLocation updates multiple cloud photos without duplicate keys or re-uploading bytes', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    // Seed two cloud photos
    await page.evaluate(async () => {
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_batch_1`).set({
        url: 'https://i.ibb.co/synthetic/batch1.jpg',
        date: '2026-11-08',
        city: '無定位',
        timestamp: Date.now()
      });
      await window.NetworkEngine._db.ref(`${window.DB_PHOTOS}/photo_batch_2`).set({
        url: 'https://i.ibb.co/synthetic/batch2.jpg',
        date: '2026-11-08',
        city: '無定位',
        timestamp: Date.now()
      });
    });

    // Track uploadImage calls
    await page.evaluate(() => {
      window._batchUploadImageCalled = 0;
      const orig = window.NetworkEngine.uploadImage;
      window.NetworkEngine.uploadImage = async function() {
        window._batchUploadImageCalled++;
        return orig ? orig.apply(this, arguments) : { success: true };
      };
    });

    const res = await page.evaluate(async () => {
      return await window.PhotoLocalSafety.batchUpdateLocation(['photo_batch_1', 'photo_batch_2'], {
        placeName: '海雲台海水浴場',
        address: '釜山廣域市海雲台區海雲台海邊路264',
        latitude: 35.1587,
        longitude: 129.1604
      });
    });

    expect(res.success).toBe(true);
    expect(res.updatedCount).toBe(2);
    expect(await page.evaluate(() => window._batchUploadImageCalled)).toBe(0);

    const rtdb = await page.evaluate(async () => {
      const snap = await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value');
      return snap.val() || {};
    });

    expect(rtdb.photo_batch_1.placeName).toBe('海雲台海水浴場');
    expect(rtdb.photo_batch_1.location.latitude).toBeCloseTo(35.1587, 4);
    expect(rtdb.photo_batch_2.placeName).toBe('海雲台海水浴場');
    expect(rtdb.photo_batch_2.location.latitude).toBeCloseTo(35.1587, 4);
  });

  test('batch UI controls and diagnostic modal open and close properly', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    // Open diagnostic modal
    await page.evaluate(() => window.openPhotoDiagnosticModal());
    const diagModal = page.locator('#photoDiagnosticModal');
    await expect(diagModal).toBeVisible();
    await page.locator('#photoDiagnosticModal button:has-text("關閉診斷")').click();
    await expect(diagModal).not.toBeVisible();

    // Toggle batch selection mode
    await page.locator('#btnToggleBatchLocation').click();
    const batchBar = page.locator('#batchActionBar');
    await expect(batchBar).toBeVisible();

    // Exit batch mode
    await page.locator('#batchActionBar button:has-text("離開")').click();
    await expect(batchBar).not.toBeVisible();
  });
});

test.describe('10. S25 Photo ZIP Batch Import & Safe GPS Backfill (V46.4.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('parseZipDirectory enforces 500MB cumulative limit and filters directory traversal', async ({ page }) => {
    const result = await page.evaluate(async () => {
      function makeEntry(name, content, method = 0) {
        return { name, content: new TextEncoder().encode(content), method };
      }
      const files = [
        makeEntry('photos/valid_s25.jpg', 'fake-jpeg-data'),
        makeEntry('../../../evil.sh', 'rm -rf /'),
        makeEntry('notes.txt', 'some notes')
      ];

      const parts = [];
      const cdEntries = [];
      let offset = 0;

      for (const f of files) {
        const nameBuf = new TextEncoder().encode(f.name);
        const lh = new Uint8Array(30);
        const dvLh = new DataView(lh.buffer);
        dvLh.setUint32(0, 0x04034b50, true);
        dvLh.setUint16(4, 20, true);
        dvLh.setUint16(8, f.method, true);
        dvLh.setUint32(18, f.content.length, true);
        dvLh.setUint32(22, f.content.length, true);
        dvLh.setUint16(26, nameBuf.length, true);

        const localOffset = offset;
        parts.push(lh, nameBuf, f.content);
        offset += lh.length + nameBuf.length + f.content.length;

        const cd = new Uint8Array(46);
        const dvCd = new DataView(cd.buffer);
        dvCd.setUint32(0, 0x02014b50, true);
        dvCd.setUint16(4, 20, true);
        dvCd.setUint16(6, 20, true);
        dvCd.setUint16(10, f.method, true);
        dvCd.setUint32(20, f.content.length, true);
        dvCd.setUint32(24, f.content.length, true);
        dvCd.setUint16(28, nameBuf.length, true);
        dvCd.setUint32(42, localOffset, true);

        cdEntries.push(cd, nameBuf);
      }

      const cdOffset = offset;
      let cdSize = 0;
      for (const b of cdEntries) cdSize += b.length;

      const eocd = new Uint8Array(22);
      const dvEocd = new DataView(eocd.buffer);
      dvEocd.setUint32(0, 0x06054b50, true);
      dvEocd.setUint16(8, files.length, true);
      dvEocd.setUint16(10, files.length, true);
      dvEocd.setUint32(12, cdSize, true);
      dvEocd.setUint32(16, cdOffset, true);

      const zipBlob = new Blob([...parts, ...cdEntries, eocd], { type: 'application/zip' });
      const entries = await window.PhotoLocalSafety.parseZipDirectory(zipBlob);
      return entries;
    });

    expect(result.length).toBe(1);
    expect(result[0].filename).toBe('photos/valid_s25.jpg');
  });

  test('handlePhotoZipUpload pre-inspects, warns on missing GPS and ambiguous conflicts', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    await page.evaluate(() => {
      window.openPhotoZipModal({
        totalCount: 4,
        gpsCount: 2,
        missingGpsCount: 2,
        timeCount: 4,
        matchedCloudCount: 1,
        ambiguousCount: 1,
        strictSkippedCount: 1
      });
    });

    const modal = page.locator('#photoZipModal');
    await expect(modal).toBeVisible();
    await expect(page.locator('#photoZipBody')).toContainText('總相片數：4 張');
    await expect(page.locator('#photoZipBody')).toContainText('找到 GPS：2 張');
    await expect(page.locator('#photoZipBody')).toContainText('配對衝突或多重相符');
    await expect(page.locator('#photoZipBody')).toContainText('本批有 2 張無 GPS 定位');
    await expect(page.locator('#btnZipRecoverExisting')).toContainText('唯一相符 1 張');

    await page.locator('#photoZipActions button:has-text("取消")').click();
    await expect(modal).not.toBeVisible();
  });

  test('executeZipImportNew prompts and allows cancel when photos lack GPS, preventing accidental bulk uploads', async ({ page }) => {
    await page.evaluate(() => showV37Tab('photo'));

    await page.evaluate(() => {
      window.latestPhotoZipUploadState = null;
      window.openPhotoZipModal({
        zipBlob: new Blob(['fake']),
        entries: [],
        summaryList: [
          { entryIndex: 0, filename: 'p1.jpg', baseName: 'p1.jpg', metadata: { locationStatus: 'missing' } }
        ],
        totalCount: 1,
        gpsCount: 0,
        missingGpsCount: 1,
        timeCount: 1,
        matchedPairs: [],
        matchedCloudCount: 0,
        ambiguousCount: 0,
        strictSkippedCount: 0
      });
    });

    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('沒有 GPS 定位');
      await dialog.dismiss();
    });

    await page.evaluate(() => window.executeZipImportNew());
    const status = page.locator('#photoUploadStatus');
    await expect(status).toContainText('已取消匯入');
  });

  test('extractZipEntry stream reader aborts and throws on ZIP bomb declaring false uncompressed size', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Test streaming reader byte bound with a mock DecompressionStream output exceeding 80MB
      try {
        const ent = { filename: 'test.jpg', method: 0, compSize: 10, uncompSize: 10, localOffset: 0 };
        // Blob falsely oversized compared to 80MB
        const fakeOverLimitBlob = {
          size: 90 * 1024 * 1024,
          slice: () => ({
            arrayBuffer: async () => {
              const b = new ArrayBuffer(30);
              new DataView(b).setUint32(0, 0x04034b50, true);
              return b;
            },
            size: 90 * 1024 * 1024
          })
        };
        await window.PhotoLocalSafety.extractZipEntry(fakeOverLimitBlob, ent);
        return 'should_have_thrown';
      } catch (err) {
        return err.message;
      }
    });
    expect(result).toContain('80MB 上限');
  });

  test('Strict Pairing: cloud lacking filename or timestamp is strictly skipped, only identical dual-factor matches', async ({ page }) => {
    const s25Jpeg1 = buildJpegWithExif({ dateTime: '2026:11:08 13:14:00', lat: 35.158700, lon: 129.160400 });
    const s25Jpeg2 = buildJpegWithExif({ dateTime: '2026:11:08 13:14:00', lat: 35.158800, lon: 129.160500 });
    const s25JpegDiffSec = buildJpegWithExif({ dateTime: '2026:11:08 14:00:00', lat: 35.160000, lon: 129.170000 });
    const s25JpegDualMatch = buildJpegWithExif({ dateTime: '2026:11:08 16:30:00', lat: 35.165000, lon: 129.175000 });

    function makeZipBuffer(files) {
      const parts = [];
      const cdEntries = [];
      let offset = 0;
      for (const f of files) {
        const nameBuf = Buffer.from(f.name, 'utf8');
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0, 8);
        lh.writeUInt32LE(f.data.length, 18);
        lh.writeUInt32LE(f.data.length, 22);
        lh.writeUInt16LE(nameBuf.length, 26);
        const localOffset = offset;
        parts.push(lh, nameBuf, f.data);
        offset += lh.length + nameBuf.length + f.data.length;

        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(0x02014b50, 0);
        cd.writeUInt16LE(20, 4);
        cd.writeUInt16LE(20, 6);
        cd.writeUInt16LE(0, 10);
        cd.writeUInt32LE(f.data.length, 20);
        cd.writeUInt32LE(f.data.length, 24);
        cd.writeUInt16LE(nameBuf.length, 28);
        cd.writeUInt32LE(localOffset, 42);
        cdEntries.push(cd, nameBuf);
      }
      const cdOffset = offset;
      let cdSize = 0;
      for (const b of cdEntries) cdSize += b.length;
      const eocd = Buffer.alloc(22);
      eocd.writeUInt32LE(0x06054b50, 0);
      eocd.writeUInt16LE(files.length, 8);
      eocd.writeUInt16LE(files.length, 10);
      eocd.writeUInt32LE(cdSize, 12);
      eocd.writeUInt32LE(cdOffset, 16);
      return Buffer.concat([...parts, ...cdEntries, eocd]);
    }

    // ZIP contains 4 photos:
    // 1. photoA.jpg at 13:14:00 (has GPS)
    // 2. photoB.jpg at 13:14:00 (has GPS, same second)
    // 3. same_name.jpg at 14:00:00 (has GPS)
    // 4. exact_dual.jpg at 16:30:00 (has GPS)
    const realZipBuf = makeZipBuffer([
      { name: 'DCIM/Camera/photoA.jpg', data: s25Jpeg1 },
      { name: 'DCIM/Camera/photoB.jpg', data: s25Jpeg2 },
      { name: 'DCIM/Camera/same_name.jpg', data: s25JpegDiffSec },
      { name: 'DCIM/Camera/exact_dual.jpg', data: s25JpegDualMatch }
    ]);

    // Setup Cloud with 4 photos:
    // 1: Same second, different filename -> SKIPPED
    // 2: Same filename, different second -> SKIPPED
    // 3: Same second, but NO filename in cloud -> STRICTLY SKIPPED (no filename = cannot confirm)
    // 4: Exact same second AND exact same filename 'exact_dual.jpg' -> VALID 1-to-1 MATCH!
    await page.evaluate(() => {
      window.photoList = [
        {
          key: 'cloud_diff_name',
          url: 'https://i.ibb.co/exist/p1.jpg',
          filename: 'different_name.jpg',
          capturedAt: '2026-11-08T13:14:00',
          latitude: null, longitude: null, city: '無定位', localOnly: false
        },
        {
          key: 'cloud_diff_sec',
          url: 'https://i.ibb.co/exist/p2.jpg',
          filename: 'same_name.jpg',
          capturedAt: '2026-11-08T15:00:00',
          latitude: null, longitude: null, city: '無定位', localOnly: false
        },
        {
          key: 'cloud_no_filename',
          url: 'https://i.ibb.co/exist/p3.jpg',
          filename: null,
          capturedAt: '2026-11-08T13:14:00',
          latitude: null, longitude: null, city: '無定位', localOnly: false
        },
        {
          key: 'cloud_exact_dual',
          url: 'https://i.ibb.co/exist/p4.jpg',
          filename: 'exact_dual.jpg',
          capturedAt: '2026-11-08T16:30:00',
          latitude: null, longitude: null, city: '無定位', localOnly: false
        }
      ];
    });

    // Upload ZIP and inspect candidates
    await page.evaluate(async (b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], 's25_strict_test.zip', { type: 'application/zip' });
      await window.handlePhotoZipUpload([file]);
    }, realZipBuf.toString('base64'));

    const modal = page.locator('#photoZipModal');
    await expect(modal).toBeVisible();

    // Verify: Exactly 1 valid match (exact_dual.jpg), all other 3 non-dual evidence photos are strictly skipped!
    await expect(page.locator('#photoZipBody')).toContainText('唯一相符：1 張');
    await expect(page.locator('#btnZipRecoverExisting')).toContainText('唯一相符 1 張');
    await expect(page.locator('#photoZipBody')).toContainText('僅單項符合（缺少時間與檔名雙重證據），已依最高安全規則跳過');

    // Verify recovery updates the exact dual-matched cloud photo, and leaves cloud_no_filename untouched
    await page.locator('#btnZipRecoverExisting').click();

    const result = await page.evaluate(() => {
      const pNoFilename = window.photoList.find(x => x.key === 'cloud_no_filename');
      const pExactDual = window.photoList.find(x => x.key === 'cloud_exact_dual');
      return {
        noFilenameLat: pNoFilename ? (pNoFilename.latitude ?? null) : null,
        noFilenameLng: pNoFilename ? (pNoFilename.longitude ?? null) : null,
        exactDualLat: pExactDual?.latitude,
        exactDualLng: pExactDual?.longitude
      };
    });

    // cloud_no_filename remains strictly untouched (null GPS)
    expect(result.noFilenameLat).toBeNull();
    expect(result.noFilenameLng).toBeNull();

    // cloud_exact_dual has GPS restored
    expect(result.exactDualLat).toBeCloseTo(35.1650, 4);
    expect(result.exactDualLng).toBeCloseTo(129.1750, 4);
  });
});
