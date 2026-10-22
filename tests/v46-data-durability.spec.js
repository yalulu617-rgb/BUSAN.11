// @ts-check
import {test, expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

// CI in-memory Firebase only. Never run these writes against the user's real DB.
test.beforeEach(async({page}) => {
  await bootApp(page);
  const isolated=await page.evaluate(()=>window.firebase?.__ciOnly === true &&
    window.NetworkEngine?._db?.__testOnly === true);
  expect(isolated, 'Do not touch production Firebase').toBe(true);
});

test('V46 reopening the APP retains tickets, photo records, shopping and encrypted vault metadata',async({page})=>{
  await page.evaluate(async()=>{
    const db=window.NetworkEngine._db;
    if(!db.__testOnly) throw Error('NOT ISOLATED');
    sessionStorage.setItem('__busan_v46_ci_fixture_persist','1');
    await db.ref(window.DB_TICKETS).set({
      'owner-ticket':{type:'🚄 車票',title:'KTX 已儲存票券',desc:'11/15 09:30',
        reservationId:'ktx-korail',reservationState:'已預訂',
        booked:true,voucher:'https://example.org/ktx-test-voucher.jpg',updatedAt:12345}
    });
    await db.ref(window.DB_PHOTOS).set({
      'owner-photo':{url:'https://example.org/busan-memory.jpg',date:'11/15',
        city:'慶州',desc:'原有旅行照片',timestamp:12345}
    });
    await db.ref(window.DB_SHOP).set({
      'owner-shop':{text:'已買旅行伴手禮',owner:'user1',checked:true,notes:'原本備註'}
    });
    localStorage.setItem('busan_v45_private_vault_user1',
      JSON.stringify({version:1,ciphertext:'test-encrypted-only',salt:'test-salt'}));
  });
  await page.waitForFunction(()=>window.ticketData?.some(x=>x.title==='KTX 已儲存票券') &&
    window.photoList?.some(x=>x.desc==='原有旅行照片') &&
    window.shopList?.some(x=>x.text==='已買旅行伴手禮'));
  const before=await page.evaluate(()=>{
    const t=window.ticketData.find(x=>x.title==='KTX 已儲存票券');
    const p=window.photoList.find(x=>x.desc==='原有旅行照片');
    const s=window.shopList.find(x=>x.text==='已買旅行伴手禮');
    return {ticket:{key:t.key,status:t.reservationState,voucher:t.voucher},
      photo:{key:p.key,city:p.city,date:p.date},
      shopping:{key:s.key,checked:s.checked,notes:s.notes},
      encryptedVault:localStorage.getItem('busan_v45_private_vault_user1')};
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#mainApp')).toBeVisible();
  await page.waitForFunction(()=>window.ticketData?.some(x=>x.title==='KTX 已儲存票券') &&
    window.photoList?.some(x=>x.desc==='原有旅行照片') &&
    window.shopList?.some(x=>x.text==='已買旅行伴手禮'));
  const after=await page.evaluate(()=>{
    const t=window.ticketData.find(x=>x.title==='KTX 已儲存票券');
    const p=window.photoList.find(x=>x.desc==='原有旅行照片');
    const s=window.shopList.find(x=>x.text==='已買旅行伴手禮');
    return {ticket:{key:t.key,status:t.reservationState,voucher:t.voucher},
      photo:{key:p.key,city:p.city,date:p.date},
      shopping:{key:s.key,checked:s.checked,notes:s.notes},
      encryptedVault:localStorage.getItem('busan_v45_private_vault_user1')};
  });
  expect(after).toEqual(before);
  await page.evaluate(()=>window.showV37Tab('wallet'));
  await expect(page.locator('#walletTicketsList')).toContainText('KTX 已儲存票券');
  const reservation=page.locator('#walletTicketsList [data-reservation-id="ktx-korail"]');
  await expect(reservation.locator('.reservation-status')).toContainText('已預訂');
});

test('V46 failed photo deletion keeps the remote photo and does not claim success', async({page})=>{
  await page.evaluate(async()=>{
    await window.NetworkEngine._db.ref(window.DB_PHOTOS).set({
      'keep-photo':{url:'https://example.org/keep.jpg',date:'11/14',city:'釜山',desc:'保留照片'}
    });
    window.currentLightboxKey='keep-photo';
    window.__originalPhotoRemove=window.NetworkEngine.firebaseRemove;
    window.NetworkEngine.firebaseRemove=async()=>({success:false,data:null,error:'CI simulated disconnect'});
  });
  page.once('dialog',d=>d.accept());
  await page.evaluate(()=>window.deleteCurrentPhoto());
  const state=await page.evaluate(async()=>({
    remote:(await window.NetworkEngine._db.ref(window.DB_PHOTOS+'/keep-photo').once('value')).val(),
    currentKey:window.currentLightboxKey
  }));
  expect(state.remote.desc).toBe('保留照片');
  expect(state.currentKey).toBe('keep-photo');
  await page.evaluate(()=>{window.NetworkEngine.firebaseRemove=window.__originalPhotoRemove;});
});

test('V46 image upload with failed Firebase write never reports a stored photo',async({page})=>{
  await page.evaluate(async()=>{
    const db=window.NetworkEngine._db;
    await db.ref(window.DB_PHOTOS).set({
      old:{url:'https://example.org/old.jpg',date:'11/13',city:'釜山',desc:'舊照片'}
    });
    window.__originalImgUpload=window.NetworkEngine.uploadImage;
    window.__originalPhotoPush=window.NetworkEngine.firebasePush;
    window.__originalCompress=window.compressImage;
    window.compressImage=async file=>file;
    window.NetworkEngine.uploadImage=async()=>({success:true,data:{url:'https://example.org/unsaved.jpg'}});
    window.NetworkEngine.firebasePush=async()=>({success:false,error:'CI simulated Firebase rejection'});
    const f=new File(['disposable-image'],'failed.jpg',{type:'image/jpeg'});
    await window.uploadMultipleToImgBB([f],'photo');
  });
  await expect(page.locator('#photoUploadStatus')).toContainText('已儲存 0/1');
  await expect(page.locator('#photoUploadStatus')).toContainText('失敗 1 張');
  const result=await page.evaluate(async()=>({
    remote:(await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value')).val(),
    local:(window.photoList||[]).map(x=>x.desc)
  }));
  expect(Object.keys(result.remote||{})).toEqual(['old']);
  expect(result.local).toContain('舊照片');
  await page.evaluate(()=>{
    window.NetworkEngine.uploadImage=window.__originalImgUpload;
    window.NetworkEngine.firebasePush=window.__originalPhotoPush;
    window.compressImage=window.__originalCompress;
  });
});

test('V46 pending offline sync: rejected Firebase envelope retains changes until acknowledged', async ({page}) => {
  const result = await page.evaluate(async () => {
    if (!window.NetworkEngine?._db?.__testOnly) throw new Error('NOT ISOLATED');
    const previous = window.NetworkEngine.firebaseWrite;
    try {
      window.StorageEngine.set('pendingSyncQueue', []);
      const queued = window.addToOfflineQueue('SET', 'busan_v36_shop/test-offline', {text:'keep me'});
      window.NetworkEngine.firebaseWrite = async () => ({success:false, error:'CI offline write rejected'});
      await window.syncOfflineQueue();
      const afterReject = window.StorageEngine.get('pendingSyncQueue', []).data;
      window.NetworkEngine.firebaseWrite = async () => ({success:true, data:null, error:null});
      await window.syncOfflineQueue();
      const afterSuccess = window.StorageEngine.get('pendingSyncQueue', []).data;
      return {queued, afterReject, afterSuccess, syncing: window.isSyncing};
    } finally {
      window.NetworkEngine.firebaseWrite = previous;
    }
  });
  expect(result.queued).toBe(true);
  expect(result.afterReject).toHaveLength(1);
  expect(result.afterReject[0].data.text).toBe('keep me');
  expect(result.afterSuccess).toEqual([]);
  expect(result.syncing).toBe(false);
});

test('V46 pending offline sync: unknown operations and failed local persistence never silently dequeue', async ({page}) => {
  const result = await page.evaluate(async () => {
    if (!window.NetworkEngine?._db?.__testOnly) throw new Error('NOT ISOLATED');
    const storageSet = window.StorageEngine.set;
    const firebaseWrite = window.NetworkEngine.firebaseWrite;
    try {
      window.StorageEngine.set('pendingSyncQueue', [{method:'UNRECOGNIZED',path:'test',data:1}]);
      await window.syncOfflineQueue();
      const unknownKept = window.StorageEngine.get('pendingSyncQueue', []).data.length;
      window.StorageEngine.set('pendingSyncQueue', [{method:'SET',path:'test',data:2}]);
      window.NetworkEngine.firebaseWrite = async () => ({success:true, data:null, error:null});
      window.StorageEngine.set = (key, value) => key === 'pendingSyncQueue'
        ? {success:false, error:'CI simulated quota error'} : storageSet.call(window.StorageEngine,key,value);
      await window.syncOfflineQueue();
      window.StorageEngine.set = storageSet;
      const failedSaveKept = window.StorageEngine.get('pendingSyncQueue', []).data.length;
      return {unknownKept, failedSaveKept, syncing:window.isSyncing};
    } finally {
      window.StorageEngine.set = storageSet;
      window.NetworkEngine.firebaseWrite = firebaseWrite;
    }
  });
  expect(result.unknownKept).toBe(1);
  expect(result.failedSaveKept).toBe(1);
  expect(result.syncing).toBe(false);
});
