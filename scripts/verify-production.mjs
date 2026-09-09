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

  const cardCount = await page.locator('.v45-nine-card').count();
  if (cardCount !== 9) {
    throw new Error(`Expected exactly 9 Home cards, found ${cardCount}`);
  }
  console.log('✅ Home 9-Card count:', cardCount);

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
