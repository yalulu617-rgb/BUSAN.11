import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

// A byte-checked PNG, mocked exclusively inside the isolated test browser.
// These tests NEVER read production Firebase or issue real ImgBB requests.
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8vy2RgYGBiYGBgYGBAQAZ0AIaFSfNtAAAAABJRU5ErkJggg==';

async function installIsolatedMocks(page, options = {}) {
  await bootApp(page);
  const result = await page.evaluate(({ png, count, corsBlocked }) => {
    if (!window.NetworkEngine?._db?.__testOnly) throw new Error('Refusing to run cloud rescue against live Firebase');
    window.__rescueArchived = [];
    window.__rescueClicks = 0;
    const realObjectUrl = window.URL.createObjectURL.bind(window.URL);
    window.URL.createObjectURL = blob => {
      if (blob.type === 'application/zip' || blob.type === 'application/json')
        window.__rescueArchived.push(blob);
      return realObjectUrl(blob);
    };
    HTMLAnchorElement.prototype.click = function () { window.__rescueClicks++; };
    window.Image = class MockImage {
      set src(value) {
        const url = String(value || '');
        queueMicrotask(() => {
          if (url.includes('gone.jpg')) { this.onerror?.(new Event('error')); return; }
          this.naturalWidth = url.includes('tile.jpg') ? 185 : 1280;
          this.naturalHeight = url.includes('tile.jpg') ? 185 : 800;
          this.onload?.();
        });
      }
    };
    const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0));
    const realFetch = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      if (!String(url).startsWith('https://i.ibb.co/')) return realFetch(url, opts);
      if (corsBlocked) throw new TypeError('Failed to fetch (simulated CORS denial)');
      return Promise.resolve(new Response(bytes.slice(), {
        status: 200, headers: { 'content-type': 'image/png' }
      }));
    };
    // Strong read-only guard: a rescue must not write/remove photos in RTDB.
    ['firebaseWrite','firebaseUpdate','firebaseRemove','uploadImage'].forEach(method => {
      window.NetworkEngine[method] = () => { throw new Error('Cloud rescue invoked forbidden '+method); };
    });
    const photos = Array.from({length: count},(_,i) => ({
      key: 'remote_' + String(i).padStart(3,'0'),
      url:'https://i.ibb.co/good' + String(i) + '.jpg',
      date:'2026-11-15', capturedAt:'2026-11-15T10:00:00',
      filename:'photo_'+i+'.jpg'
    }));
    if (count === 5) {
      photos[2].url = 'https://i.ibb.co/tile.jpg';
      photos[3].url = 'https://i.ibb.co/gone.jpg';
      photos[4].url = 'https://example.org/not-imgbb.jpg';
    }
    window.photoList = photos;
    // Do not render 301 remote <img> tags: that would contact real ImgBB.
    // The rescue reads existing photoList directly and all fetches are mocked.
    window.CloudPhotoRescue.refreshCount();
    return { snapshot: JSON.stringify(photos), hasModule: typeof window.CloudPhotoRescue?.start };
  }, { png: TINY_PNG, count: options.count || 5, corsBlocked: Boolean(options.corsBlocked) });
  expect(result.hasModule).toBe('function');
  return result.snapshot;
}

test('existing uploaded photos: read-only ImgBB audit recovers real bytes, not 200 error tiles or URL-only records', async ({page}) => {
  const snapshot = await installIsolatedMocks(page);
  await page.evaluate(async () => await window.CloudPhotoRescue.start());
  const result = await page.evaluate(async () => {
    const info = window.CloudPhotoRescue.getSummary();
    const zip = window.__rescueArchived.find(blob => blob.type === 'application/zip');
    if (!zip) throw new Error('No actual ZIP blob was created');
    const entries = await window.PhotoLocalSafety.parseZipDirectory(zip,{includeBackupManifest:true});
    const files = entries.filter(entry => entry.filename.endsWith('.png'));
    const manifestEntry = entries.find(entry => entry.filename === 'backup-manifest.json');
    const manifestFile = await window.PhotoLocalSafety.extractZipEntry(zip, manifestEntry);
    const manifest = JSON.parse(await manifestFile.text());
    const contents = [];
    const verifiedHashes = [];
    for (const entry of files) {
      const file = await window.PhotoLocalSafety.extractZipEntry(zip, entry);
      const bytes = new Uint8Array(await file.arrayBuffer());
      contents.push([...bytes].slice(0, 8));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      const actual = [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const manifestRow = manifest.photos.find(p=>p.archiveFilename===entry.filename);
      verifiedHashes.push(actual===manifestRow?.sha256);
    }
    return { info, archiveSize: zip.size, entryCount: files.length, signatures: contents,
      manifest: manifest.photos.map(p => ({sha256:p.sha256,hostedUrl:p.hostedUrl})),
      verifiedHashes,
      clicks: window.__rescueClicks };
  });
  expect(result.info.total).toBe(5);
  expect(result.info.counts.displayable).toBe(2);
  expect(result.info.counts['suspected-error-image']).toBe(1);
  expect(result.info.counts['image-unavailable']).toBe(1);
  expect(result.info.counts['unsupported-link']).toBe(1);
  expect(result.info.downloaded).toBe(2);
  expect(result.entryCount).toBe(2);
  expect(result.manifest).toHaveLength(2);
  for (const photo of result.manifest) expect(photo.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(result.verifiedHashes).toEqual([true,true]);
  expect(result.archiveSize).toBeGreaterThan(100);
  for(const signature of result.signatures) expect(signature).toEqual([137,80,78,71,13,10,26,10]);
  expect(result.clicks).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(window.photoList))).toBe(snapshot);
  await expect(page.locator('#cloudRescueStatus')).toContainText('已封裝 ZIP 並提出下載 2 張');
});

test('ImgBB CORS restriction is reported as unresolved, not mislabeled photo loss', async ({page}) => {
  await installIsolatedMocks(page, {count:3, corsBlocked:true});
  await page.evaluate(async () => await window.CloudPhotoRescue.start());
  const result = await page.evaluate(async () => {
    const summary = window.CloudPhotoRescue.getSummary();
    window.CloudPhotoRescue.downloadReport();
    const reportBlob = window.__rescueArchived.find(blob => blob.type === 'application/json');
    const report = JSON.parse(await reportBlob.text());
    return { summary, archiveCount:window.__rescueArchived.filter(b=>b.type==='application/zip').length,
      reports:report.photos.map(p=>({status:p.status,downloadStatus:p.downloadStatus,reason:p.downloadReason})) };
  });
  expect(result.summary.total).toBe(3);
  expect(result.summary.counts.displayable).toBe(3);
  expect(result.summary.downloaded).toBe(0);
  expect(result.archiveCount).toBe(0);
  expect(result.reports).toHaveLength(3);
  expect(result.reports.every(x=>x.downloadStatus==='unreadable-from-browser')).toBeTruthy();
  expect(result.reports.every(x=>x.reason.includes('不能判定圖檔遺失'))).toBeTruthy();
  await expect(page.locator('#cloudRescueStatus')).toContainText('報告只是清單，不是照片備份');
});

test('301 historic cloud photo records are counted and ZIP files are bounded by a safe per-part limit', async ({page}) => {
  await installIsolatedMocks(page, {count:301});
  await page.evaluate(async () => await window.CloudPhotoRescue.start());
  const first = await page.evaluate(async () => {
    const blob = window.__rescueArchived.find(b=>b.type==='application/zip');
    const entries = await window.PhotoLocalSafety.parseZipDirectory(blob);
    return { info:window.CloudPhotoRescue.getSummary(),
      files: entries.filter(x=>x.filename.endsWith('.png')).length,
      zipSize:blob.size };
  });
  expect(first.info.total).toBe(301);
  expect(first.info.downloaded).toBe(45);
  expect(first.info.remainingCandidates).toBe(256);
  expect(first.files).toBe(45);
  // The memory panel may not be open; check the button's own state, not its hidden ancestor.
  await expect(page.locator('#cloudRescueNext')).not.toHaveAttribute('hidden');
  await page.evaluate(async () => await window.CloudPhotoRescue.downloadNext());
  const second = await page.evaluate(() => ({info:window.CloudPhotoRescue.getSummary(),zips:window.__rescueArchived.filter(b=>b.type==='application/zip').length}));
  expect(second.info.downloaded).toBe(90);
  expect(second.info.remainingCandidates).toBe(211);
  expect(second.zips).toBe(2);
});

test('ZIP builder failure must NOT count photos as recovered or skip the whole batch', async ({page}) => {
  await installIsolatedMocks(page,{count:3});
  const state = await page.evaluate(async () => {
    const original = window.PhotoLocalSafety.createCloudPhotosZip;
    window.PhotoLocalSafety.createCloudPhotosZip = async () => {
      throw new Error('simulated archive failure');
    };
    await window.CloudPhotoRescue.start();
    const first = window.CloudPhotoRescue.getSummary();
    window.PhotoLocalSafety.createCloudPhotosZip = original;
    await window.CloudPhotoRescue.downloadNext();
    const second = window.CloudPhotoRescue.getSummary();
    return {first,second,zipCount:window.__rescueArchived.filter(b=>b.type==='application/zip').length};
  });
  expect(state.first.downloaded).toBe(0);
  expect(state.first.nextCursor).toBe(0);
  expect(state.first.remainingCandidates).toBe(3);
  expect(state.second.downloaded).toBe(3);
  expect(state.second.remainingCandidates).toBe(0);
  expect(state.zipCount).toBe(1);
});


test('saved ZIP verification checks each image hash, reports missing photos, then confirms all 3 on the device', async ({page}) => {
  await installIsolatedMocks(page,{count:3});
  const state = await page.evaluate(async png => {
    const bytes = Uint8Array.from(atob(png), c=>c.charCodeAt(0));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    const records = window.photoList.map((p,i)=>({
      id:p.key, cloudKey:p.key, filename:p.key+'.png',
      hostedUrl:p.url, blob:bytes.slice().buffer, sha256, synced:true,
      metadata:{capturedAt:p.capturedAt}
    }));
    const build=async (part,name)=>new File([await window.PhotoLocalSafety.createCloudPhotosZip(part)],
      name,{type:'application/zip'});
    const zipA=await build(records.slice(0,2),'rescue-part1.zip');
    const zipB=await build(records.slice(2),'rescue-part2.zip');
    const first=await window.CloudPhotoBackupVerifier.verify([zipA]);
    const second=await window.CloudPhotoBackupVerifier.verify([zipB]);
    return {first:{...first,missingRecords:first.missingRecords.length},
      second:{...second,missingRecords:second.missingRecords.length},
      visibleText:document.getElementById('cloudRescueVerifyStatus').textContent};
  },TINY_PNG);
  expect(state.first).toMatchObject({total:3,verified:2,missing:1,complete:false,archives:1,issues:0});
  expect(state.second).toMatchObject({total:3,verified:3,missing:0,complete:true,archives:2,issues:0});
  expect(state.visibleText).toContain('已從 ZIP 解開並校驗 3 張');
});

test('tampered local ZIP is rejected and does not count a photo as safely backed up', async ({page}) => {
  await installIsolatedMocks(page,{count:1});
  const result=await page.evaluate(async png=>{
    const bytes=Uint8Array.from(atob(png), c=>c.charCodeAt(0));
    const shaBytes=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    const sha256=[...shaBytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    const photo=window.photoList[0];
    const zip=await window.PhotoLocalSafety.createCloudPhotosZip([{
      id:photo.key,cloudKey:photo.key,filename:photo.key+'.png',
      hostedUrl:photo.url,blob:bytes.buffer,sha256,synced:true
    }]);
    const packed=new Uint8Array(await zip.arrayBuffer());
    // Corrupt bytes inside the stored PNG without changing manifest or ZIP CRC.
    const marker=bytes.slice(0,8);
    let found=-1;
    for(let i=0;i<packed.length-marker.length;i++){
      if(marker.every((val,j)=>packed[i+j]===val)){found=i;break;}
    }
    if(found<0) throw new Error('PNG fixture absent from ZIP');
    packed[found+13]^=1;
    const corrupted=new File([packed],'corrupt-rescue.zip',{type:'application/zip'});
    const bad=await window.CloudPhotoBackupVerifier.verify([corrupted]);
    window.CloudPhotoBackupVerifier.reset();
    const good=new File([zip],'verified-rescue.zip',{type:'application/zip'});
    const recovered=await window.CloudPhotoBackupVerifier.verify([good]);
    return {bad:{total:bad.total,verified:bad.verified,issues:bad.issues,complete:bad.complete},
      recovered:{total:recovered.total,verified:recovered.verified,issues:recovered.issues,complete:recovered.complete}};
  },TINY_PNG);
  expect(result.bad).toEqual({total:1,verified:0,issues:1,complete:false});
  expect(result.recovered).toEqual({total:1,verified:1,issues:0,complete:true});
});
