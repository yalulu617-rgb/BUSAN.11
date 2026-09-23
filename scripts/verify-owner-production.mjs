import fs from 'node:fs';
import { chromium } from 'playwright';

const EXPECTED_SHA = process.env.EXPECTED_SHA?.trim();
const PRODUCTION_URL = (process.env.PRODUCTION_URL || 'https://yalulu617-rgb.github.io/BUSAN.11/').replace(/\/$/, '');
const REPORT_PATH = 'owner-production-acceptance-report.json';

const report = {
  status: 'RUNNING',
  expectedSha: EXPECTED_SHA || null,
  productionUrl: PRODUCTION_URL,
  actualFirebaseProductionWrites: 0,
  interceptedWriteCalls: 0,
  interceptedPaths: [],
  remoteImageUploads: 0,
  viewports: {},
  fatalPageErrors: [],
  unexpectedRuntimeErrors: [],
  acceptance: {}
};

let browser;
let writeGuardInstalled = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeReport() {
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function isFirebaseUrl(url) {
  return /(?:firebaseio\.com|firebasedatabase\.app)/i.test(url);
}

try {
  assert(EXPECTED_SHA, 'EXPECTED_SHA is required');

  const releaseResponse = await fetch(
    `${PRODUCTION_URL}/data/release.json?sha=${encodeURIComponent(EXPECTED_SHA)}&ts=${Date.now()}`,
    { cache: 'no-store', headers: { 'cache-control': 'no-cache', pragma: 'no-cache' } }
  );
  assert(releaseResponse.ok, `Production release metadata returned HTTP ${releaseResponse.status}`);
  const release = await releaseResponse.json();
  assert(release.appVersion === 'V45', `Expected Production appVersion V45, found ${release.appVersion}`);
  assert(release.gitCommit === EXPECTED_SHA, `Expected Production SHA ${EXPECTED_SHA}, found ${release.gitCommit}`);
  report.release = release;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block'
  });

  await context.route(/(?:api\.)?imgbb\.com/i, async route => {
    report.remoteImageUploads += 1;
    await route.abort('blockedbyclient');
  });

  const page = await context.newPage();
  page.on('pageerror', error => report.fatalPageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.unexpectedRuntimeErrors.push(message.text());
  });
  page.on('request', request => {
    if (writeGuardInstalled && isFirebaseUrl(request.url()) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.actualFirebaseProductionWrites += 1;
    }
  });
  page.on('websocket', socket => {
    if (!isFirebaseUrl(socket.url())) return;
    socket.on('framesent', event => {
      if (!writeGuardInstalled || typeof event.payload !== 'string') return;
      try {
        const frame = JSON.parse(event.payload);
        const action = frame?.d?.a;
        if (action === 'p' || action === 'm') report.actualFirebaseProductionWrites += 1;
      } catch {
        // Non-JSON protocol frames cannot represent Firebase put/merge operations.
      }
    });
  });

  await page.goto(`${PRODUCTION_URL}/?ownerAcceptance=${encodeURIComponent(EXPECTED_SHA)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000
  });
  await page.waitForFunction(() => (
    window.NetworkEngine
    && typeof window.NetworkEngine.firebaseWrite === 'function'
    && typeof window.NetworkEngine.firebaseUpdate === 'function'
    && typeof window.NetworkEngine.firebasePush === 'function'
    && typeof window.NetworkEngine.firebaseRemove === 'function'
    && Array.isArray(window.RECOMMENDED_FOOD)
    && Array.isArray(window.RECOMMENDED_SHOPPING)
    && Array.isArray(window.CANONICAL_VOICE_FALLBACK)
  ), undefined, { timeout: 30_000 });

  const guard = await page.evaluate(() => {
    window.OWNER_ACCEPTANCE_WRITES = [];
    const record = (op, path, data) => {
      window.OWNER_ACCEPTANCE_WRITES.push({ op, path, data: data ?? null });
    };
    const write = async (path, data) => { record('write', path, data); return { success: true }; };
    const update = async (path, data) => { record('update', path, data); return { success: true }; };
    const push = async (path, data) => {
      record('push', path, data);
      return { success: true, key: 'acceptance-memory-key' };
    };
    const remove = async path => { record('remove', path); return { success: true }; };
    for (const fn of [write, update, push, remove]) fn.__ownerAcceptanceStub = true;
    window.NetworkEngine.firebaseWrite = write;
    window.NetworkEngine.firebaseUpdate = update;
    window.NetworkEngine.firebasePush = push;
    window.NetworkEngine.firebaseRemove = remove;
    window.confirm = () => true;
    return {
      write: window.NetworkEngine.firebaseWrite.__ownerAcceptanceStub === true,
      update: window.NetworkEngine.firebaseUpdate.__ownerAcceptanceStub === true,
      push: window.NetworkEngine.firebasePush.__ownerAcceptanceStub === true,
      remove: window.NetworkEngine.firebaseRemove.__ownerAcceptanceStub === true
    };
  });
  assert(Object.values(guard).every(Boolean), 'Main-world Firebase write guard installation failed');
  writeGuardInstalled = true;
  report.mainWorldWriteGuard = guard;

  const overflow390 = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth
  }));
  assert(overflow390.width === 390 && overflow390.height === 844, 'Primary viewport is not 390x844');
  assert(!overflow390.overflow, `Horizontal overflow at 390x844: ${overflow390.scrollWidth}px`);
  report.viewports['390x844'] = overflow390;

  const result = await page.evaluate(async () => {
    const imageUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const canonicalBefore = {
      food: JSON.stringify(window.RECOMMENDED_FOOD),
      shopping: JSON.stringify(window.RECOMMENDED_SHOPPING),
      voice: JSON.stringify(window.CANONICAL_VOICE_FALLBACK),
      itinerary: JSON.stringify(window.TRAVEL_CONTENT_V45?.itinerary),
      convenience: JSON.stringify(window.TRAVEL_CONTENT_V45?.convenienceStore),
      hotel: JSON.stringify(window.TRAVEL_CONTENT_V45?.hotel)
    };

    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (!element) throw new Error(`Missing required form control: ${id}`);
      element.value = value;
    };

    window.ownerCustomizations = { food: {}, shop: {} };
    window.StorageEngine.set('busan_v45_owner_customizations', window.ownerCustomizations);

    window.currentGuideTab = '打卡景點';
    setValue('gdType', '打卡景點');
    setValue('gdTitle', 'Acceptance 景點');
    setValue('gdDesc', 'Acceptance 新增');
    setValue('gdLink', 'https://example.invalid/guide');
    setValue('tempGuideImg', imageUrl);
    setValue('gdEditKey', '');
    await window.addGuideItem();
    window.guideData = [{ key: 'acceptance-guide', type: '打卡景點', title: '舊景點', desc: '舊說明', link: '', img: imageUrl }];
    window.renderGuideContent();
    window.editGuide('acceptance-guide');
    setValue('gdTitle', 'Acceptance 更新景點');
    setValue('gdDesc', 'Acceptance 更新');
    await window.addGuideItem();
    await window.deleteGuide('acceptance-guide');

    const food = window.RECOMMENDED_FOOD[0];
    window.openOwnerCustomize('food', food.id);
    setValue('ownerCustomName', 'Acceptance 我的美食');
    setValue('ownerCustomDesc', 'Acceptance 美食筆記');
    setValue('tempOwnerCustomImg', imageUrl);
    await window.saveOwnerCustomizationFromModal();
    const foodView = window.getOwnerCustomizedItem('food', food);

    const shop = window.RECOMMENDED_SHOPPING[0];
    window.openOwnerCustomize('shop', shop.id);
    setValue('ownerCustomName', 'Acceptance 我的商品');
    setValue('ownerCustomDesc', 'Acceptance 購物筆記');
    setValue('tempOwnerCustomImg', imageUrl);
    await window.saveOwnerCustomizationFromModal();
    const shopView = window.getOwnerCustomizedItem('shop', shop);

    window.currentShopOwner = 'acceptance-owner';
    window.shopList = [];
    setValue('shopEditKey', '');
    setValue('newShop', 'Acceptance 新商品');
    setValue('shopWhere', '釜山');
    setValue('shopCategory', '其他');
    setValue('tempShopPhoto', '');
    await window.addShopItem();
    window.shopList = [{ key: 'acceptance-shop', text: '舊商品', where: 'A', category: '其他', checked: false, owner: 'acceptance-owner' }];
    window.renderShop();
    window.editShop('acceptance-shop');
    setValue('newShop', 'Acceptance 更新商品');
    setValue('shopWhere', 'B');
    await window.addShopItem();
    await window.toggleShop('acceptance-shop', false);
    await window.deleteShop('acceptance-shop');

    window.showV37Tab('wallet');
    window.switchWalletTab('coupon');
    setValue('couponEditKey', '');
    setValue('couponTitle', 'Acceptance 優惠券');
    setValue('couponDesc', 'Acceptance Coupon');
    setValue('couponCode', 'ABC123456');
    setValue('couponExpiry', '2026-11-30');
    setValue('couponLink', 'https://example.invalid/coupon');
    setValue('tempCouponImg', imageUrl);
    await window.saveCoupon();
    window.couponData = [{ key: 'acceptance-coupon', title: 'Acceptance 優惠券', desc: 'Acceptance Coupon', code: 'ABC123456', expiry: '2026-11-30', image: imageUrl, link: '' }];
    window.renderCoupons();
    const validBarcode = document.querySelectorAll('#couponList .coupon-barcode').length === 1;
    const couponImage = document.querySelector('#couponList .coupon-image')?.getAttribute('src') === imageUrl;
    window.editCoupon('acceptance-coupon');
    setValue('couponTitle', 'Acceptance 更新優惠券');
    setValue('couponCode', 'XYZ987');
    await window.saveCoupon();
    await window.deleteCoupon('acceptance-coupon');
    window.couponData = [{ key: 'blank-coupon', title: 'Blank', desc: '', code: '', expiry: '', image: '', link: '' }];
    window.renderCoupons();
    const blankBarcodeAbsent = document.querySelectorAll('#couponList .coupon-barcode').length === 0;
    const beforeUnsupported = window.OWNER_ACCEPTANCE_WRITES.length;
    setValue('couponEditKey', '');
    setValue('couponTitle', 'Unsupported');
    setValue('couponCode', '韓文');
    await window.saveCoupon();
    const unsupportedRejected = window.OWNER_ACCEPTANCE_WRITES.length === beforeUnsupported && window.renderCode128Svg('韓文') === '';

    window.showV37Tab('more');
    window.voiceCustomData = [];
    window.voiceData = window.mergeVoiceWorkspace([]);
    window.renderVoiceList();
    setValue('voiceEditKey', '');
    setValue('newCardTw', 'Acceptance 自訂中文');
    setValue('newCardKr', 'Acceptance 한국어');
    await window.addVoiceCard();
    window.voiceCustomData = [{ key: 'acceptance-voice', tw: '舊中文', kr: '이전 한국어', title: '舊中文', korean: '이전 한국어' }];
    window.voiceData = window.mergeVoiceWorkspace(window.voiceCustomData);
    window.renderVoiceList();
    window.editVoice('acceptance-voice');
    setValue('newCardTw', 'Acceptance 更新中文');
    setValue('newCardKr', 'Acceptance 수정 한국어');
    await window.addVoiceCard();
    await window.deleteVoice('acceptance-voice');
    window.editVoice('voice_1');
    setValue('newCardTw', 'Acceptance 官方覆寫');
    setValue('newCardKr', 'Acceptance 공식 수정');
    await window.addVoiceCard();
    await window.deleteVoice('voice_1');
    const voiceUi = {
      canonicalCount: window.CANONICAL_VOICE_FALLBACK.length,
      ttsVisible: Boolean(document.querySelector('#voiceGridUI .voice-action[aria-label="播放韓語發音"]')),
      papagoVisible: Array.from(document.querySelectorAll('#more button')).some(button => button.textContent.includes('Papago'))
    };

    window.showV37Tab('wallet');
    window.switchWalletTab('doc');
    window.prepData = [
      { key: 'prep-1', text: '護照', category: '證件', done: true, link: '' },
      { key: 'prep-2', text: '充電器', category: '電子', done: false, link: '' }
    ];
    window.renderPrepList();
    const progressText = document.getElementById('prepProgressUI')?.textContent || '';
    await window.togglePrep('prep-2', false);
    setValue('prepEditKey', '');
    setValue('prepText', '雨傘');
    setValue('prepCategory', '其他');
    setValue('prepLink', '');
    await window.savePrepItem();
    window.editPrep('prep-2');
    setValue('prepText', 'USB-C 充電器');
    await window.savePrepItem();
    await window.deletePrep('prep-2');

    const canonicalAfter = {
      food: JSON.stringify(window.RECOMMENDED_FOOD),
      shopping: JSON.stringify(window.RECOMMENDED_SHOPPING),
      voice: JSON.stringify(window.CANONICAL_VOICE_FALLBACK),
      itinerary: JSON.stringify(window.TRAVEL_CONTENT_V45?.itinerary),
      convenience: JSON.stringify(window.TRAVEL_CONTENT_V45?.convenienceStore),
      hotel: JSON.stringify(window.TRAVEL_CONTENT_V45?.hotel)
    };

    return {
      writes: window.OWNER_ACCEPTANCE_WRITES,
      guardStillInstalled: ['firebaseWrite', 'firebaseUpdate', 'firebasePush', 'firebaseRemove']
        .every(name => window.NetworkEngine[name]?.__ownerAcceptanceStub === true),
      food: {
        imageHandled: foodView?.image?.full === imageUrl,
        customizedName: foodView?.name,
        guideImageHandled: window.OWNER_ACCEPTANCE_WRITES.some(call => call.path === 'busan_v36_guide/acceptance-guide' && call.data?.img === imageUrl)
      },
      shopping: { customizedName: shopView?.name },
      coupon: { validBarcode, couponImage, blankBarcodeAbsent, unsupportedRejected },
      voice: voiceUi,
      packing: { progressText },
      canonical: Object.fromEntries(Object.keys(canonicalBefore).map(key => [key, canonicalBefore[key] === canonicalAfter[key]]))
    };
  });

  assert(result.guardStillInstalled, 'Firebase write guard was replaced during acceptance');
  assert(result.writes.length > 0, 'CRUD acceptance produced zero intercepted calls');
  const hasCall = (op, path) => result.writes.some(call => call.op === op && call.path === path);
  const hasPrefix = (op, prefix) => result.writes.some(call => call.op === op && call.path.startsWith(prefix));

  assert(hasCall('push', 'busan_v36_guide'), 'Guide add path was not intercepted');
  assert(hasCall('update', 'busan_v36_guide/acceptance-guide'), 'Guide edit path was not intercepted');
  assert(hasCall('remove', 'busan_v36_guide/acceptance-guide'), 'Guide delete path was not intercepted');
  assert(result.food.imageHandled && result.food.guideImageHandled, 'Guide/food image URL handling failed');
  assert(hasPrefix('write', 'busan_v45_owner_custom/food/'), 'Food owner overlay path was not intercepted');
  report.acceptance.foodSightsCrudImage = 'PASS';

  assert(hasPrefix('write', 'busan_v45_owner_custom/shop/'), 'Shopping owner overlay path was not intercepted');
  assert(hasCall('push', 'busan_v36_shop'), 'Shopping add path was not intercepted');
  assert(result.writes.filter(call => call.op === 'update' && call.path === 'busan_v36_shop/acceptance-shop').length >= 2, 'Shopping edit/toggle paths were not intercepted');
  assert(hasCall('remove', 'busan_v36_shop/acceptance-shop'), 'Shopping delete path was not intercepted');
  report.acceptance.shoppingCustomization = 'PASS';

  assert(hasCall('push', 'busan_v45_coupons'), 'Coupon add path was not intercepted');
  assert(hasCall('update', 'busan_v45_coupons/acceptance-coupon'), 'Coupon edit path was not intercepted');
  assert(hasCall('remove', 'busan_v45_coupons/acceptance-coupon'), 'Coupon delete path was not intercepted');
  assert(Object.values(result.coupon).every(Boolean), 'Coupon image/barcode assertions failed');
  report.acceptance.couponCrudImageBarcode = 'PASS';

  assert(result.voice.canonicalCount === 7, `Expected 7 canonical voice cards, found ${result.voice.canonicalCount}`);
  assert(result.voice.ttsVisible && result.voice.papagoVisible, 'TTS or Papago action is missing');
  assert(hasCall('push', 'busan_v36_voice'), 'Voice add path was not intercepted');
  assert(hasCall('update', 'busan_v36_voice/acceptance-voice'), 'Voice custom edit path was not intercepted');
  assert(hasCall('remove', 'busan_v36_voice/acceptance-voice'), 'Voice custom delete path was not intercepted');
  assert(result.writes.filter(call => call.op === 'update' && call.path === 'busan_v36_voice/voice_1').length >= 2, 'Voice canonical edit/hide paths were not intercepted');
  assert(result.writes.some(call => call.path === 'busan_v36_voice/voice_1' && call.data?.hidden === true), 'Canonical voice delete did not create a hidden override');
  report.acceptance.translationCrudTtsPapago = 'PASS';

  assert(result.packing.progressText.includes('完成 1 / 2') && result.packing.progressText.includes('50%'), 'Packing progress did not show 完成 1 / 2 and 50%');
  assert(hasCall('push', 'busan_v36_prep'), 'Packing add path was not intercepted');
  assert(result.writes.filter(call => call.op === 'update' && call.path === 'busan_v36_prep/prep-2').length >= 2, 'Packing toggle/edit paths were not intercepted');
  assert(hasCall('remove', 'busan_v36_prep/prep-2'), 'Packing delete path was not intercepted');
  report.acceptance.packingListCrudProgress = 'PASS';

  assert(Object.values(result.canonical).every(Boolean), `Canonical data changed: ${JSON.stringify(result.canonical)}`);
  report.acceptance.canonicalOwnerSeparation = 'PASS';
  report.canonicalData = result.canonical;

  await page.setViewportSize({ width: 430, height: 932 });
  const overflow430 = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth
  }));
  assert(overflow430.width === 430 && overflow430.height === 932, 'Secondary viewport is not 430x932');
  assert(!overflow430.overflow, `Horizontal overflow at 430x932: ${overflow430.scrollWidth}px`);
  report.viewports['430x932'] = overflow430;

  await page.waitForTimeout(250);
  assert(report.actualFirebaseProductionWrites === 0, `Detected ${report.actualFirebaseProductionWrites} real Firebase write operations`);
  assert(report.remoteImageUploads === 0, `Detected ${report.remoteImageUploads} remote image upload attempts`);
  assert(report.fatalPageErrors.length === 0, `Fatal page errors: ${report.fatalPageErrors.join(' | ')}`);
  assert(report.unexpectedRuntimeErrors.length === 0, `Unexpected runtime errors: ${report.unexpectedRuntimeErrors.join(' | ')}`);

  report.interceptedWriteCalls = result.writes.length;
  report.interceptedPaths = [...new Set(result.writes.map(call => `${call.op}:${call.path}`))];
  report.acceptance.regressionProtection = 'PASS';
  report.status = 'PASS';
  console.log(`ACTUAL_FIREBASE_PRODUCTION_WRITES=${report.actualFirebaseProductionWrites}`);
  console.log(`INTERCEPTED_WRITE_CALLS=${report.interceptedWriteCalls}`);
  console.log(`INTERCEPTED_PATHS=${report.interceptedPaths.join(',')}`);
  console.log('BATCH_B_PRODUCTION_OWNER_UX_ACCEPTANCE=PASS');
} catch (error) {
  report.status = 'FAIL';
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  writeReport();
}
