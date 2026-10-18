// BUSAN.11 GATE 2: independent, headed Firefox browser-native zoom.
// Standalone CI script; never auto-discovered by standard headless Playwright.
// Only real X11 key events with DPR and layout measurements constitute evidence.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { firefox } from '@playwright/test';
import globalSetup from '../../tests/global-setup.js';
import { bootApp } from '../../tests/helpers/boot.js';

const OUT = 'gate2-native-firefox-evidence';
const report = {
  test: 'GATE2 Firefox native page zoom 100% to 200%',
  method: 'Headed Firefox under Xvfb/Openbox; xdotool injects X11 Control+0 and Control+plus into Firefox chrome',
  verdict: 'NOT TESTED',
  startedAt: new Date().toISOString(),
  commands: [], measurements: [], phases: [], features: [],
  blockedExternalUrls: [], blockedProductionFirebaseRequests: [],
};
let browser, context, page;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function xdo(...args) {
  report.commands.push('xdotool ' + args.join(' '));
  return execFileSync('xdotool', args, { encoding: 'utf8', timeout: 10000 }).trim();
}
async function record(label) {
  const metrics = await page.evaluate(() => ({
    devicePixelRatio: window.devicePixelRatio,
    innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    outerWidth: window.outerWidth, outerHeight: window.outerHeight,
    visualViewportWidth: window.visualViewport?.width,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    rootCssZoom: getComputedStyle(document.documentElement).zoom,
  }));
  const row = { label, ...metrics };
  report.measurements.push(row);
  console.log('[NATIVE_ZOOM_METRIC] ' + JSON.stringify(row));
  return row;
}
async function shot(name) {
  await page.screenshot({ path: OUT + '/' + name + '.png', animations: 'disabled' });
}
function findWindow() {
  let ids;
  try {
    ids = xdo('search', '--onlyvisible', '--class', 'firefox').split(/\s+/).filter(Boolean);
  } catch {
    ids = xdo('search', '--onlyvisible', '--name', 'Mozilla Firefox').split(/\s+/).filter(Boolean);
  }
  assert.ok(ids.length > 0, 'No visible Firefox X11 window; browser-native zoom NOT TESTED');
  const windows = ids.map(id => {
    const name = xdo('getwindowname', id);
    const geometry = xdo('getwindowgeometry', '--shell', id);
    const width = Number(geometry.match(/^WIDTH=(\d+)$/m)?.[1] || 0);
    const height = Number(geometry.match(/^HEIGHT=(\d+)$/m)?.[1] || 0);
    return { id, name, width, height };
  });
  windows.sort((a, b) => b.width * b.height - a.width * a.height);
  report.x11Windows = windows;
  const chosen = windows[0];
  assert.ok(chosen.width >= 700 && chosen.height >= 500, 'Firefox X11 window unexpectedly small');
  return chosen;
}
async function checkPhase(phase) {
  await page.locator('#tab-home').click();
  await page.evaluate(value => window.setV46HomePreview(value), phase);
  const home = page.locator('#v37HomeDashboard .v46-home');
  await home.waitFor({ state: 'visible', timeout: 10000 });
  assert.equal(await home.getAttribute('data-v46-mode'), phase);
  await page.locator('#v37HomeDashboard #liveTravelCard').waitFor({ state: 'visible' });
  const bag = page.locator('#v37HomeDashboard details.v46-tools');
  if (!await bag.evaluate(el => el.open)) await bag.locator('summary').click();
  assert.equal(await bag.locator('button.v45-nine-card').count(), 11);
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clipped: [...document.querySelectorAll('#v37HomeDashboard #liveTravelCard, #v37HomeDashboard .v46-tools summary, #v37HomeDashboard button.v45-nine-card')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.left < -2 || r.right > document.documentElement.clientWidth + 3;
      }).map(el => el.textContent.trim().slice(0, 60)),
  }));
  report.phases.push({ phase, ...geometry });
  assert.ok(geometry.scrollWidth <= geometry.viewport + 3, phase + ': horizontal overflow at native 200%');
  assert.deepEqual(geometry.clipped, [], phase + ': clipped controls at native 200%');
  await shot('phase-' + phase + '-native-200');
}
async function checkElevenFeatures() {
  const destinations = [
    ['今日行程', '#itinerary.active'], ['天氣・楓況', '#homeWeatherDetailPanel'],
    ['旅行記帳', '#split.active'], ['吃喝・景點', '#guideDetail'],
    ['超商・超市', '#shopConvenienceContainer'], ['快樂購', '#shop.active'],
    ['翻譯・SOS', '#more.active'], ['旅行回憶', '#wallet.active'],
    ['住宿・交通', '#wallet.active'], ['票券・優惠', '#wallet.active'],
    ['行前準備', '#prepChecklistCard'],
  ];
  for (const [label, destination] of destinations) {
    await page.locator('#tab-home').click();
    await page.evaluate(() => window.setV46HomePreview('during'));
    if (label === '天氣・楓況') {
      await page.evaluate(() => { if (window.homeWeatherDetailExpanded) window.toggleHomeWeatherDetail(); });
    }
    const bag = page.locator('#v37HomeDashboard details.v46-tools');
    if (!await bag.evaluate(el => el.open)) await bag.locator('summary').click();
    const card = bag.locator('button.v45-nine-card').filter({ hasText: label });
    assert.equal(await card.count(), 1, 'Missing feature: ' + label);
    await card.click({ timeout: 12000 });
    await page.locator(destination).waitFor({ state: 'visible', timeout: 12000 });
    report.features.push({ label, destination, result: 'PASS' });
    if (label === '吃喝・景點') {
      await page.getByRole('button', { name: '返回首頁功能導覽' }).click();
      await page.locator('#v37HomeDashboard .v46-home').waitFor({ state: 'visible' });
    } else {
      await page.locator('#tab-home').click();
      await page.locator('#v37HomeDashboard .v46-home').waitFor({ state: 'visible' });
    }
  }
  await shot('eleven-entries-return-native-200');
}

try {
  assert.equal(process.env.CI, 'true', 'Refusing non-CI execution');
  assert.equal(process.env.BUSAN_CI_FIREBASE_ISOLATED, '1', 'Refusing production Firebase access');
  assert.equal(process.env.PLAYWRIGHT_TEST_BASE_URL, 'http://localhost:8080');
  assert.ok(process.env.DISPLAY, 'Native X11 display is required');
  await mkdir(OUT, { recursive: true });
  await globalSetup(); // Disposable runner checkout ONLY, fixture guards production Firebase.
  browser = await firefox.launch({ headless: false });
  report.firefoxVersion = browser.version();
  context = await browser.newContext({
    baseURL: 'http://localhost:8080',
    viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1,
  });
  await context.route('**/*', route => {
    const url = route.request().url();
    let parsed;
    try { parsed = new URL(url); } catch { return route.abort(); }
    if (parsed.hostname === 'localhost' && parsed.protocol === 'http:') return route.continue();
    report.blockedExternalUrls.push(url);
    if (/firebasedatabase\.app|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/i.test(url)) {
      report.blockedProductionFirebaseRequests.push(url);
    }
    return route.abort();
  });
  page = await context.newPage();
  await bootApp(page);
  report.firebaseIsolated = await page.evaluate(() => Boolean(
    window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly
  ));
  assert.ok(report.firebaseIsolated, 'Firebase in-memory fixture is not active; STOP');

  const win = findWindow();
  report.targetX11Window = win;
  xdo('windowactivate', '--sync', win.id);
  xdo('key', '--clearmodifiers', 'ctrl+0');
  await sleep(700);
  const baseline = await record('native-100-baseline');
  await shot('native-100-baseline');
  assert.ok(Math.abs(baseline.devicePixelRatio - 1) < 0.2,
    'Baseline DPR not approximately 1; do not assume browser zoom 100%');

  let zoom;
  for (let n = 1; n <= 11; n++) {
    xdo('key', '--clearmodifiers', 'ctrl+plus');
    await sleep(450);
    const observation = await record('X11-CtrlPlus-' + n);
    const dprRatio = observation.devicePixelRatio / baseline.devicePixelRatio;
    const widthRatio = baseline.innerWidth / observation.innerWidth;
    if (Math.abs(dprRatio - 2) <= 0.07 && Math.abs(widthRatio - 2) <= 0.17) {
      zoom = observation;
      break;
    }
  }
  assert.ok(zoom, 'Firefox native 200% NOT PROVEN: no simultaneous DPR and layout-width confirmation');
  assert.ok(Math.abs(baseline.outerWidth - zoom.outerWidth) <= 12,
    'Outer window width changed, invalid zoom control');
  assert.equal(baseline.rootCssZoom, zoom.rootCssZoom,
    'CSS zoom was modified; native evidence invalid');
  report.nativeZoom = {
    result: 'PASS', from: 100, to: 200, x11Window: win.id,
    dprRatio: zoom.devicePixelRatio / baseline.devicePixelRatio,
    cssViewportWidthRatio: baseline.innerWidth / zoom.innerWidth,
    physicalOuterWidthBefore: baseline.outerWidth,
    physicalOuterWidthAfter: zoom.outerWidth,
    commandCount: report.commands.filter(c => c.includes('ctrl+plus')).length,
  };
  console.log('[NATIVE_ZOOM_CONFIRMED] ' + JSON.stringify(report.nativeZoom));
  await shot('native-200-confirmed');
  for (const phase of ['before', 'during', 'after']) await checkPhase(phase);
  await checkElevenFeatures();
  const finalMetrics = await record('native-200-after-navigation');
  assert.ok(Math.abs(finalMetrics.devicePixelRatio / baseline.devicePixelRatio - 2) < 0.08,
    'Firefox zoom did not remain at native 200% throughout acceptance');
  assert.deepEqual(report.blockedProductionFirebaseRequests, [],
    'Production Firebase request attempted; isolation violated');
  report.verdict = 'PASS';
} catch (error) {
  report.verdict = 'NO-GO';
  report.error = { message: String(error?.message || error), stack: String(error?.stack || '') };
  console.error('[GATE2_NATIVE_ZOOM_NO_GO] ' + report.error.stack);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await mkdir(OUT, { recursive: true });
  await writeFile(OUT + '/report.json', JSON.stringify(report, null, 2) + '\n');
  await writeFile(OUT + '/x11-commands.log', report.commands.join('\n') + '\n');
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  console.log('[GATE2_NATIVE_ZOOM_VERDICT] ' + report.verdict);
}
