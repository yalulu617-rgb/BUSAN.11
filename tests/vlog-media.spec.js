import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('on-device composer downloads a playable 720x1280 ~60-second video', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  test.skip(process.env.VLOG_MEDIA_E2E !== '1', 'Run explicitly: VLOG_MEDIA_E2E=1 npx playwright test tests/vlog-media.spec.js --project=mobile-chrome');
  await page.setContent(`<!doctype html><html><body>
    <div id="vlogStatus"></div><div id="vlogStoryboard"></div>
    <button id="vlogPickBtn"></button><button id="vlogDownloadBtn"></button><button id="vlogCancelBtn"></button>
    <input id="vlogLocalFiles" type="file">
  </body></html>`);
  await page.addScriptTag({ path: 'ute/ute_vlog.js' });
  await page.addScriptTag({ path: 'js/vlog.js' });
  const supportsRecorder = await page.evaluate(() => Boolean(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream));
  test.skip(!supportsRecorder, 'This browser does not expose canvas MediaRecorder');

  await page.evaluate(async () => {
    window.PhotoLocalSafety = { readExif: async () => ({ capturedAt: '2026-11-13T10:00:00' }) };
    const source = document.createElement('canvas');
    source.width = 192; source.height = 192;
    const context = source.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 192, 192);
    gradient.addColorStop(0, '#176c86'); gradient.addColorStop(1, '#f7bc72');
    context.fillStyle = gradient; context.fillRect(0, 0, 192, 192);
    context.fillStyle = '#fff3d6'; context.fillRect(54, 48, 84, 96);
    const blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
    const photo = new File([blob], 'PXL_20261113_100000.png', { type: 'image/png' });
    await window.prepareVlogFromFiles([photo]);
  });
  await expect(page.locator('#vlogDownloadBtn')).toBeVisible();
  const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
  await page.evaluate(() => window.exportVlog());
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  const outputPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(outputPath);
  const base64 = (await fs.readFile(outputPath)).toString('base64');
  const metadata = await page.evaluate(async ({ base64, filename }) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const type = filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const video = document.createElement('video');
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Downloaded video is not playable'));
    });
    const result = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, type };
    URL.revokeObjectURL(url);
    return result;
  }, { base64, filename: download.suggestedFilename() });
  expect(metadata.width).toBe(720);
  expect(metadata.height).toBe(1280);
  expect(metadata.duration).toBeGreaterThanOrEqual(59);
  expect(metadata.duration).toBeLessThanOrEqual(62);
});
