// Verification script for travel content
// Ensures data layer counts and UI itinerary count + flight codes.
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
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080';

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
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') resolve(null);
      else reject(err);
    });
  });
}

function fetchJson(path) {
  return new Promise(resolve => {
    https.get(`${FIREBASE_BASE}/${path}.json`, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = json ? (Array.isArray(json) ? json.filter(Boolean).length : Object.keys(json).length) : 0;
          resolve({ ok: res.statusCode === 200, count });
        } catch {
          resolve({ ok: false, count: 0 });
        }
      });
    }).on('error', () => resolve({ ok: false, count: 0 }));
  });
}

async function verifyDataLayer() {
  const specs = [
    { key: 'busan_v36_iti', min: 17 },
    { key: 'busan_v36_hotel', min: 1 },
    { key: 'busan_v36_guide', min: 10 },
    { key: 'busan_v36_shop', min: 2 },
    { key: 'busan_v36_voice', min: 7 },
    { key: 'busan_v36_prep', min: 5 },
    { key: 'busan_v36_tickets', min: 1 },
    { key: 'busan_v36_profiles', min: 2 },
  ];
  let allPass = true;
  for (const s of specs) {
    const r = await fetchJson(s.key);
    const pass = r.ok && r.count >= s.min;
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${s.key} count=${r.count}`);
    if (!pass) allPass = false;
  }
  return allPass;
}

async function verifyUi() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#mainApp', { timeout: 15000 });
  // Ensure itinerary data loaded
  await page.evaluate(() => window.showV37Tab('itinerary'));
  await page.waitForFunction(() => Array.isArray(window.itineraryData) && window.itineraryData.length >= 17, { timeout: 15000 });
  const itiCount = await page.evaluate(() => window.itineraryData.length);
  const flightsData = await page.evaluate(() => window.TRAVEL_CONTENT_V45.flights);
  const flightPass = (flightsData?.outbound?.flightNo === 'BX572' && flightsData?.return?.flightNo === 'KE2085');
  console.log(`[${itiCount >= 17 ? 'PASS' : 'FAIL'}] Itinerary count ${itiCount}`);
  console.log(`[${flightPass ? 'PASS' : 'FAIL'}] Flight codes present`);

  // ── XLSM canonical data assertions ───────────────────────────────────────
  const tc = await page.evaluate(() => window.TRAVEL_CONTENT_V45);

  // 1. K-ETA exemption date
  const ketaDate = tc?.immigration?.keta?.exemptionEndDate;
  const ketaPass = ketaDate === '2026-12-31';
  console.log(`[${ketaPass ? 'PASS' : 'FAIL'}] K-ETA exemption date = ${ketaDate}`);

  // 2. e-Arrival Card section exists
  const eArrivalPass = !!tc?.immigration?.eArrivalCard?.title;
  console.log(`[${eArrivalPass ? 'PASS' : 'FAIL'}] e-Arrival Card section present`);

  // 3. No hard 6-month passport rule (check documentsAndFinance)
  const docs = tc?.preTrip?.documentsAndFinance || [];
  const hardPassportRule = docs.some(d => d.includes('6 個月以上'));
  const noHardPassportPass = !hardPassportRule;
  console.log(`[${noHardPassportPass ? 'PASS' : 'FAIL'}] No hard 6-month passport rule`);

  // 4. Q-CODE Q4 status not hard-coded as required or not-required
  const qcodeNotes = tc?.immigration?.qcode?.notes || '';
  const qcodeQ4Pass = qcodeNotes.includes('Q4') && qcodeNotes.includes('重新確認');
  console.log(`[${qcodeQ4Pass ? 'PASS' : 'FAIL'}] Q-CODE Q4 status = recheck (not hard-coded)`);

  // 5. Visit Busan Pass prices
  const vbp = tc?.visitBusanPass?.plans;
  const vbp24h = vbp?.h24?.priceKRW === 55000;
  const vbp48h = vbp?.h48?.priceKRW === 85000;
  const vbpBig3 = vbp?.big3?.priceKRW === 45000 && vbp?.big3?.quota?.includes('1') && vbp?.big3?.quota?.includes('2');
  const vbpBig5 = vbp?.big5?.priceKRW === 65000 && vbp?.big5?.quota?.includes('2') && vbp?.big5?.quota?.includes('3');
  console.log(`[${vbp24h ? 'PASS' : 'FAIL'}] Visit Busan Pass 24H = 55000 KRW`);
  console.log(`[${vbp48h ? 'PASS' : 'FAIL'}] Visit Busan Pass 48H = 85000 KRW`);
  console.log(`[${vbpBig3 ? 'PASS' : 'FAIL'}] BIG3 = 45000 / 1A+2B`);
  console.log(`[${vbpBig5 ? 'PASS' : 'FAIL'}] BIG5 = 65000 / 2A+3B`);

  // 6. Attraction group classification
  const groupA = tc?.visitBusanPass?.attractions?.groupA || [];
  const groupB = tc?.visitBusanPass?.attractions?.groupB || [];
  const xSkyIsA = groupA.some(a => a.name.includes('X the SKY'));
  const spaLandIsA = groupA.some(a => a.name.includes('Spa Land'));
  const songdoCableIsB = groupB.some(a => a.name.includes('水晶纜車'));
  const arteIsB = groupB.some(a => a.name.includes('ARTE'));
  console.log(`[${xSkyIsA ? 'PASS' : 'FAIL'}] BUSAN X the SKY = A group`);
  console.log(`[${spaLandIsA ? 'PASS' : 'FAIL'}] Spa Land = A group`);
  console.log(`[${songdoCableIsB ? 'PASS' : 'FAIL'}] Songdo Cable Car = B group`);
  console.log(`[${arteIsB ? 'PASS' : 'FAIL'}] ARTE MUSEUM = B group`);

  // 7. Recommended plan = BIG3 Mobile
  const big3Recommended = vbp?.big3?.recommended === true;
  console.log(`[${big3Recommended ? 'PASS' : 'FAIL'}] Recommended plan = BIG3 Mobile`);

  await browser.close();

  const xlsmPass = ketaPass && eArrivalPass && noHardPassportPass && qcodeQ4Pass
    && vbp24h && vbp48h && vbpBig3 && vbpBig5
    && xSkyIsA && spaLandIsA && songdoCableIsB && arteIsB && big3Recommended;
  return itiCount >= 17 && flightPass && xlsmPass;
}

(async () => {
  const server = await startStaticServer(8080);
  const dataOk = await verifyDataLayer();
  const uiOk = await verifyUi();
  if (server) server.close();
  if (dataOk && uiOk) {
    console.log('✅ verify_travel_content PASSED');
    process.exit(0);
  } else {
    console.error('❌ verify_travel_content FAILED');
    process.exit(1);
  }
})();
