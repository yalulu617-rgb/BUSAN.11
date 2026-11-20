import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8vy2RgYGBiYGBgYGBAQAZ0AIaFSfNtAAAAABJRU5ErkJggg==';

test('uploaded original remains in IndexedDB after Firebase success, and downloads byte-identical ZIP', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await bootApp(page);
  const before = await page.evaluate(() => ({
    isolated: Boolean(window.NetworkEngine?._db?.__testOnly),
    retained: typeof window.PhotoLocalSafety?.getBackupState,
    export: typeof window.PhotoLocalSafety?.downloadOriginalsZip
  }));
  expect(before).toEqual({isolated:true,retained:'function',export:'function'});
  const raw = Buffer.from(PNG, 'base64');
  const state = await page.evaluate(async bytes => {
    window.NetworkEngine.uploadImage = async () =>
      ({success:true,data:{url:'https://i.ibb.co/isolated/original.png'}});
    const photo = new File([new Uint8Array(bytes)],'S25_20261116_original.png',{type:'image/png'});
    await window.uploadMultipleToImgBB([photo],'photo');
    const backup = await window.PhotoLocalSafety.getBackupState();
    const pending = await window.PhotoLocalSafety.getPending();
    const stored = await window.PhotoLocalSafety.getPending(); // pending must exclude synced archives
    const dbRows = await new Promise((resolve,reject)=>{
      const request=indexedDB.open('busan11_photo_local_v1',1);
      request.onsuccess=()=>{
        const db=request.result;
        const get=db.transaction('pendingPhotos','readonly').objectStore('pendingPhotos').getAll();
        get.onsuccess=()=>{db.close();resolve(get.result)};
        get.onerror=()=>reject(get.error);
      };
      request.onerror=()=>reject(request.error);
    });
    const original=dbRows.find(row=>row.synced && row.filename==='S25_20261116_original.png');
    let archiveBlob=null;
    const click=HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click=function(){
      if (this.download?.endsWith('.zip')) archiveBlob = fetch(this.href).then(response=>response.blob());
    };
    try {await window.downloadPhotoBackupsZip()} finally {HTMLAnchorElement.prototype.click=click}
    const zip=await archiveBlob;
    const contents=await window.PhotoLocalSafety.parseZipDirectory(zip);
    const pngEntry=contents.find(x=>x.filename.endsWith('S25_20261116_original.png'));
    const file=await window.PhotoLocalSafety.extractZipEntry(zip,pngEntry);
    const exported=Array.from(new Uint8Array(await file.arrayBuffer()));
    return {backup,pending:pending.length,stillPending:stored.length,
      retainedBytes:original?.blob?.byteLength||0,
      originalMatches:original && Array.from(new Uint8Array(original.blob)).join(',')===bytes.join(','),
      zipContainsOriginal:exported.join(',')===bytes.join(','),
      zipSize:zip.size,
      localUrl:await window.PhotoLocalSafety.getRetainedOriginalUrl(original.cloudKey),
      remoteKey:original.cloudKey};
  }, Array.from(raw));
  expect(state.backup.retained).toBeGreaterThanOrEqual(1);
  expect(state.backup.pending).toBe(0);
  expect(state.pending).toBe(0);
  expect(state.retainedBytes).toBe(raw.length);
  expect(state.originalMatches).toBeTruthy();
  expect(state.zipContainsOriginal).toBeTruthy();
  expect(state.zipSize).toBeGreaterThan(raw.length);
  expect(state.localUrl).toMatch(/^blob:/);
  expect(state.remoteKey).toMatch(/^photo_local_photo_/);
  await expect(page.locator('#photoBackupStatus')).toContainText('保留原圖 1 張');
});

test('cloud-image failure can use archived original without rewriting Firebase or deleting local bytes', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await bootApp(page);
  const done = await page.evaluate(async bytes => {
    if(!window.NetworkEngine?._db?.__testOnly)throw new Error('Unsafe live Firebase');
    window.NetworkEngine.uploadImage=async()=>({success:true,data:{url:'https://i.ibb.co/failure-fixture.png'}});
    await window.uploadMultipleToImgBB([new File([new Uint8Array(bytes)], 'backup.png',{type:'image/png'})],'photo');
    const snap=await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value');
    const list=Object.entries(snap.val()||{});
    const [key,photo]=list.find(([,p])=>p.url==='https://i.ibb.co/failure-fixture.png');
    window.photoList=[{...photo,key}];
    window.memoryAlbumDay='all';
    window.renderMemoryAlbum();
    window.openLightbox(photo.url,key);
    return {key,url:photo.url};
  },Array.from(Buffer.from(PNG,'base64')));
  await page.waitForFunction(()=>document.getElementById('lightbox-img').src);
  await page.evaluate(()=>{
    const image=document.getElementById('lightbox-img');
    Object.defineProperty(image,'naturalWidth',{configurable:true,value:185});
    Object.defineProperty(image,'naturalHeight',{configurable:true,value:185});
    image.onload();
  });
  await page.waitForFunction(()=>window.currentPhotoHostState==='local-backup');
  expect(await page.evaluate(()=>document.getElementById('lightbox-img').src)).toMatch(/^blob:/);
  await expect(page.locator('#lightbox-host-status')).toContainText('保留的原圖');
  const stored=await page.evaluate(async()=>window.PhotoLocalSafety.getBackupState());
  expect(stored.retained).toBeGreaterThanOrEqual(1);
  expect(stored.pending).toBe(0);
});
