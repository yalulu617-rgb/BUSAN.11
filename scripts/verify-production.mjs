import { chromium } from 'playwright';

const expectedSha = process.env.EXPECTED_SHA;
const productionUrl = process.env.PRODUCTION_URL
  || 'https://yalulu617-rgb.github.io/BUSAN.11/index.html';
const expectedCacheName = 'busan-trip-v45-production-v7-final-pwa';

if (!/^[0-9a-f]{40}$/i.test(expectedSha || '')) {
  throw new Error('EXPECTED_SHA must be a full 40-character Git commit SHA');
}

console.log(`--- Verifying Live Deployment: ${productionUrl} ---`);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  const response = await page.goto(productionUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  if (!response || response.status() !== 200) {
    throw new Error(`Live page returned HTTP ${response ? response.status() : 'null'}`);
  }
  console.log('✅ HTTP Status: 200 OK');

  const cacheBuster = `sha=${encodeURIComponent(expectedSha)}`;
  const releaseUrl = new URL(`data/release.json?${cacheBuster}`, productionUrl).href;
  const serviceWorkerUrl = new URL(`sw.js?${cacheBuster}`, productionUrl).href;
  const [releaseResponse, serviceWorkerResponse] = await Promise.all([
    page.request.get(releaseUrl),
    page.request.get(serviceWorkerUrl)
  ]);
  if (!releaseResponse.ok() || !serviceWorkerResponse.ok()) {
    throw new Error('Unable to load deployed release metadata or Service Worker');
  }

  const release = await releaseResponse.json();
  const serviceWorkerSource = await serviceWorkerResponse.text();
  const cacheMatch = serviceWorkerSource.match(/\bconst\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/);
  if (release.appVersion !== 'V45') {
    throw new Error(`Expected deployed appVersion V45, found ${release.appVersion}`);
  }
  if (release.gitCommit !== expectedSha) {
    throw new Error(`Deployed gitCommit mismatch: ${release.gitCommit}`);
  }
  if (!cacheMatch) {
    throw new Error('Unable to find deployed Service Worker CACHE_NAME');
  }
  if (cacheMatch[1] !== expectedCacheName) {
    throw new Error(`Unexpected deployed Service Worker CACHE_NAME: ${cacheMatch[1]}`);
  }
  if (release.cacheVersion !== cacheMatch[1]) {
    throw new Error('Deployed cacheVersion does not match Service Worker CACHE_NAME');
  }
  console.log('✅ Release metadata:', release.appVersion, release.gitCommit, release.cacheVersion);

  await page.waitForSelector('#splash, #mainApp', {
    state: 'attached',
    timeout: 15000
  });
  console.log('✅ App DOM attached');

  const enterButton = page.locator('.btn-enter');
  if (await enterButton.isVisible()) {
    await enterButton.click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForSelector('#mainApp', { state: 'visible', timeout: 15000 });
  console.log('✅ Main App visible');

    const homeIa = page.locator('.v45-home-nine-grid');
    await homeIa.waitFor({ state: 'visible', timeout: 10000 });

    const highFrequencyCount = await homeIa
      .locator('.home-high-frequency-grid .v45-nine-card')
      .count();

    const managementCount = await homeIa
      .locator('.home-management-grid .v45-nine-card')
      .count();

    if (highFrequencyCount !== 8) {
      throw new Error(
        `Expected 8 travel-use Home entries, found ${highFrequencyCount}`
      );
    }

    if (managementCount !== 3) {
      throw new Error(
        `Expected 3 travel-management Home entries, found ${managementCount}`
      );
    }

    const homeText = (await homeIa.innerText()).replace(/\s+/g, ' ');

    const requiredHomeEntries = [
      '今日行程',
      '天氣・楓況',
      '旅行記帳',
      '吃喝・景點',
      '超商・超市',
      '快樂購',
      '翻譯・SOS',
      '旅行回憶',
      '住宿・交通',
      '票券・優惠',
      '行前準備'
    ];

    for (const label of requiredHomeEntries) {
      if (!homeText.includes(label)) {
        throw new Error(`Missing required Home entry: ${label}`);
      }
    }

    console.log(
      `✅ Home IA verified: ${highFrequencyCount} travel-use + ${managementCount} management entries`
    );

    const ownerCapabilities = await page.evaluate(() => ({
      editGuide: typeof window.editGuide === 'function',
      editShop: typeof window.editShop === 'function',
      openOwnerCustomize: typeof window.openOwnerCustomize === 'function',
      saveCoupon: typeof window.saveCoupon === 'function',
      editCoupon: typeof window.editCoupon === 'function',
      renderCode128Svg: typeof window.renderCode128Svg === 'function',
      editVoice: typeof window.editVoice === 'function',
      speakKorean: typeof window.speakKorean === 'function',
      savePrepItem: typeof window.savePrepItem === 'function',
      editPrep: typeof window.editPrep === 'function',
      canonicalFoodCount: (window.RECOMMENDED_FOOD || []).length,
      canonicalShopCount: (window.RECOMMENDED_SHOPPING || []).length
    }));
    for (const [name, value] of Object.entries(ownerCapabilities)) {
      if (name.endsWith('Count')) continue;
      if (!value) throw new Error(`Missing Batch B owner capability: ${name}`);
    }
    if (ownerCapabilities.canonicalFoodCount < 6 || ownerCapabilities.canonicalShopCount < 9) {
      throw new Error('Canonical recommendation datasets unexpectedly changed');
    }

    await page.evaluate(() => { window.showV37Tab('wallet'); window.switchWalletTab('coupon'); });
    await page.locator('#walletCouponSection').waitFor({ state: 'visible', timeout: 5000 });
    for (const selector of ['#couponTitle', '#couponCode', '#couponImgUpload', '#saveCouponBtn']) {
      if (await page.locator(selector).count() !== 1) throw new Error(`Missing Coupon CRUD control: ${selector}`);
    }

    await page.evaluate(() => window.switchWalletTab('doc'));
    await page.locator('#walletDocSection').waitFor({ state: 'visible', timeout: 5000 });
    for (const selector of ['#prepProgressUI', '#prepText', '#prepCategory', '#savePrepBtn']) {
      if (await page.locator(selector).count() !== 1) throw new Error(`Missing Packing List control: ${selector}`);
    }

    await page.evaluate(() => window.showV37Tab('more'));
    await page.locator('#translationWorkspace').waitFor({ state: 'visible', timeout: 5000 });
    for (const selector of ['#newCardTw', '#newCardKr', '#saveVoiceBtn']) {
      if (await page.locator(selector).count() !== 1) throw new Error(`Missing Translation CRUD control: ${selector}`);
    }
    console.log('✅ Batch B owner-editable surfaces verified read-only');

  if (await page.locator('#deviceOwner').count() === 0) {
    throw new Error('Profile selector #deviceOwner not found in live DOM');
  }
  console.log('✅ Profile selector verified');

  if (pageErrors.length > 0) {
    throw new Error(`Fatal page errors detected: ${pageErrors.join('; ')}`);
  }
  console.log('✅ 0 fatal page errors detected');
  console.log('🎉 Live Production Verification PASSED!');
} catch (error) {
  console.error('❌ Live site verification failed:', error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
