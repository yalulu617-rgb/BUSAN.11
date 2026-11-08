// @ts-check
/**
 * BUSAN.11 V45 — Two-Layer Runtime Verification Script
 * Layer A: Firebase Data REST API Verification (Read-Only)
 * Layer B: Browser Headless UI Content & UX Flow Verification
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const FIREBASE_BASE = 'https://busan-trip-2026-4148f-default-rtdb.asia-southeast1.firebasedatabase.app';
let TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';

// ── Simple Static Server ──────────────────────────────────────────────────
function startStaticServer(port = 8080) {
  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, () => resolve(server));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port already in use, reuse existing server
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

// ── Helper: REST GET ───────────────────────────────────────────────────────
function restGet(path) {
  return new Promise((resolve) => {
    https.get(`${FIREBASE_BASE}/${path}.json`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = json ? (Array.isArray(json) ? json.filter(Boolean).length : Object.keys(json).length) : 0;
          resolve({ path, statusCode: res.statusCode, ok: res.statusCode === 200, count, data: json });
        } catch (e) {
          resolve({ path, statusCode: res.statusCode, ok: false, count: 0, error: e.message });
        }
      });
    }).on('error', (err) => {
      resolve({ path, statusCode: 0, ok: false, count: 0, error: err.message });
    });
  });
}

async function runDataLayerVerification() {
  console.log('\n============================================================');
  console.log('LAYER A: FIREBASE REST DATA VERIFICATION');
  console.log('============================================================');

  const paths = [
    { key: 'busan_v36_iti', min: 17, name: 'Itinerary' },
    { key: 'busan_v36_hotel', min: 1, name: 'Hotel Data' },
    { key: 'busan_v36_guide', min: 10, name: 'Guide Landmarks' },
    { key: 'busan_v36_shop', min: 2, name: 'Personal Shopping' },
    { key: 'busan_v36_voice', min: 7, name: 'Voice Phrase Cards' },
    { key: 'busan_v36_prep', min: 5, name: 'Pre-trip Checklist' },
    { key: 'busan_v36_tickets', min: 1, name: 'Tickets' },
    { key: 'busan_v36_profiles', min: 2, name: 'User Profiles' },
  ];

  let allPassed = true;
  const summary = [];

  for (const item of paths) {
    const result = await restGet(item.key);
    const passed = result.ok && result.count >= item.min;
    if (!passed) allPassed = false;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${item.key} (${item.name}) -> HTTP ${result.statusCode}, Count: ${result.count} (Min expected: ${item.min})`);
    summary.push({ path: item.key, name: item.name, status: result.statusCode, count: result.count, passed });
  }

  console.log(`\nLayer A Result: ${allPassed ? '✅ ALL DATA PATHS VERIFIED' : '❌ DATA INTEGRITY FAILURE'}`);
  return { allPassed, summary };
}

async function runUiLayerVerification(baseUrl) {
  console.log('\n============================================================');
  console.log(`LAYER B: UI & CONTENT RUNTIME VERIFICATION (${baseUrl})`);
  console.log('============================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  const results = [];
  function record(name, pass, detail) {
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${detail}`);
    results.push({ name, pass, detail });
  }

  try {
    // 1. Boot App
    await page.goto(baseUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#mainApp', { state: 'visible', timeout: 15000 });
    record('App Boot', true, '#mainApp visible');

    // 2. Itinerary Data & Day 1-5 Rendering
    await page.evaluate(() => window.showV37Tab('itinerary'));
    await page.waitForFunction(() => Array.isArray(window.itineraryData) && window.itineraryData.length >= 17, { timeout: 15000 });
    const itiCount = await page.evaluate(() => window.itineraryData.length);
    record('Itinerary Data', itiCount >= 17, `Total ${itiCount} records in memory`);

    const days = ['11/13', '11/14', '11/15', '11/16', '11/17'];
    let dayAllPass = true;
    for (const d of days) {
      await page.evaluate((day) => window.filterItineraryDay(day), d);
      const rows = page.locator('#itiContent .iti-row');
      await rows.first().waitFor({ state: 'visible', timeout: 5000 });
      const c = await rows.count();
      if (c < 1) dayAllPass = false;
      console.log(`       Day ${d}: ${c} rendered entries`);
    }
    record('Day 1-5 Itinerary UI', dayAllPass, 'All 5 days have >= 1 rendered rows');

    // 3. Voice Translation Cards (7/7 with TW & KR)
    await page.evaluate(() => {
      window.showV37Tab('home');
      window.openGuideFolder('工具');
    });
    await page.waitForFunction(() => Array.isArray(window.voiceData) && window.voiceData.length >= 7, { timeout: 15000 });
    const voiceCards = page.locator('#voiceGridUI .voice-card');
    await voiceCards.first().waitFor({ state: 'visible', timeout: 5000 });
    const voiceCount = await voiceCards.count();
    let voiceTextValid = (voiceCount === 7);
    for (let i = 0; i < voiceCount; i++) {
      const card = voiceCards.nth(i);
      const tw = (await card.locator('span').innerText()).trim();
      const kr = (await card.locator('b').innerText()).trim();
      if (!tw || !kr || tw === 'undefined' || kr === 'undefined') voiceTextValid = false;
    }
    record('Translation Cards', voiceTextValid, `Rendered ${voiceCount}/7 cards with valid TW & KR`);

    // 4. Shopping Items (2 historical records visible)
    await page.evaluate(() => {
      window.showV37Tab('shop');
      window.setShopTabMode('my');
    });
    await page.waitForFunction(() => Array.isArray(window.shopList) && window.shopList.length >= 2, { timeout: 15000 });
    const shopItems = page.locator('#sList .shop-item');
    await shopItems.first().waitFor({ state: 'visible', timeout: 5000 });
    const shopCount = await shopItems.count();
    const shopText = await page.locator('#sList').innerText();
    const shopOk = shopCount >= 2 && shopText.includes('Re4dy') && shopText.includes('Imint無糖咖啡糖');
    record('Personal Shopping', shopOk, `Rendered ${shopCount} items ("Re4dy", "Imint無糖咖啡糖")`);

    // 5. Recommendations (Food >= 6, Shop >= 9, Nearby >= 22)
    const recFoodCount = await page.evaluate(() => (window.RECOMMENDED_FOOD || []).length);
    const recShopCount = await page.evaluate(() => (window.RECOMMENDED_SHOPPING || []).length);
    const nearbyDb = await page.evaluate(() => window.SMART_NEARBY_DATABASE || {});
    const nearbyCount = ((nearbyDb.Busan || []).length) + ((nearbyDb.Gyeongju || []).length);
    record('Recommendations', recFoodCount >= 6 && recShopCount >= 9 && nearbyCount >= 22, `Food: ${recFoodCount}, Shop: ${recShopCount}, Nearby: ${nearbyCount}`);

    // 6. Hotel Information
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('hotel');
    });
    const hotelCard = page.locator('#walletHotelInfoCard, #walletHotelSection');
    await hotelCard.first().waitFor({ state: 'visible', timeout: 5000 });
    const hotelText = await hotelCard.first().innerText();
    const hotelOk = hotelText.includes('城市律動飯店') || hotelText.includes('Urban Groove Hotel');
    record('Hotel Details', hotelOk, 'Urban Groove Hotel rendered with map links');

    // 7. Navigation & FAB Back Button
    await page.evaluate(() => window.showV37Tab('home'));
    const fab = page.locator('#fabBack');
    const fabInitiallyHidden = await fab.isHidden();
    await page.evaluate(() => window.openGuideFolder('美食景點'));
    const fabVisibleInDeep = await fab.isVisible();
    await fab.click();
    const returnedToDashboard = await page.locator('#guideDashboard').isVisible();
    const fabHiddenAfterReturn = await fab.isHidden();
    const navOk = fabInitiallyHidden && fabVisibleInDeep && returnedToDashboard && fabHiddenAfterReturn;
    record('Deep Navigation', navOk, 'openGuideFolder -> #fabBack visible -> click -> #guideDashboard visible');

  } catch (err) {
    record('UI Verification Exception', false, err.message);
  } finally {
    await browser.close();
  }

  const allPassed = results.every(r => r.pass);
  console.log(`\nLayer B Result: ${allPassed ? '✅ ALL UI FLOWS VERIFIED' : '❌ UI REGRESSION DETECTED'}`);
  return { allPassed, results };
}

async function main() {
  const dataResult = await runDataLayerVerification();
  
  let server = null;
  if (TARGET_URL.includes('localhost')) {
    const urlObj = new URL(TARGET_URL);
    server = await startStaticServer(parseInt(urlObj.port || '8080', 10));
  }

  let uiResult;
  try {
    uiResult = await runUiLayerVerification(TARGET_URL);
  } finally {
    if (server) {
      server.close();
    }
  }

  const overallSuccess = dataResult.allPassed && uiResult.allPassed;
  console.log('\n============================================================');
  console.log(`OVERALL RUNTIME VERIFICATION: ${overallSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('============================================================\n');

  if (!overallSuccess) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error during runtime verification:', err);
  process.exit(1);
});
