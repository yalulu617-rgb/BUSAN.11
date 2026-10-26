// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

// Last pre-release device-only data regression. All fixtures are synthetic.
// Real Firebase must never be accessible to this suite.
test('V46 retains encrypted private ledger, pending local edits and IndexedDB photos across restart', async ({page}) => {
  await bootApp(page);
  expect(await page.evaluate(() =>
    window.firebase?.__ciOnly === true && window.NetworkEngine?._db?.__testOnly === true
  ), 'Refuse testing against the production Firebase').toBe(true);

  const original = await page.evaluate(async () => {
    if (!window.NetworkEngine?._db?.__testOnly) throw Error('NOT ISOLATED');
    const pin = '673218';
    const setup = await window.PrivateLedgerEngine.setup('user1', pin, pin);
    if (setup.length) throw Error('Unexpected existing ledger');
    await window.PrivateLedgerEngine.add('user1', {
      id: 'ci-device-ledger', name: 'Synthetic encrypted expense',
      amt: 874, currency: 'KRW', payer:'user1', notes:'test-only'
    });
    const lockedVault = localStorage.getItem('busan_v45_private_vault_user1');
    if (!lockedVault || lockedVault.includes('Synthetic encrypted expense'))
      throw Error('Private bill is not safely encrypted at rest');
    window.PrivateLedgerEngine.lock();

    const pending = [{method:'UNRECOGNIZED',path:'never-send-synthetic-fixture',
      data:{note:'unsubmitted device-only edit',id:'ci-pending'}}];
    const saved = window.StorageEngine.set('pendingSyncQueue', pending);
    if (!saved.success) throw Error('Cannot persist pending local fixture');

    const canvas=document.createElement('canvas');
    canvas.width=16;canvas.height=16;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#21a1cf';
    ctx.fillRect(0,0,16,16);
    const image=await new Promise((resolve,reject) =>
      canvas.toBlob(blob=>blob ? resolve(blob):reject(Error('No test image')),'image/png'));
    const key=await window.ShoppingPhotoEngine.save(
      new File([image], 'synthetic-shopping-photo.png', {type:'image/png'}));
    const ref=await window.ShoppingPhotoEngine.attach(key,'Synthetic photo');
    const photo=await window.ShoppingPhotoEngine.get(key);
    if (!photo?.full || !photo?.thumb || ref?.storage !== 'indexeddb')
      throw Error('Device-only photo not persisted');
    return {pin,lockedVault,pending,key,
      photoBytes:photo.full.size,thumbBytes:photo.thumb.size,
      photoType:photo.full.type};
  });

  // Exercise real V46 re-rendering and navigation before loading a fresh page.
  await page.evaluate(() => {
    window.showV37Tab('home');
    window.setV46HomePreview('during');
    window.setV46HomePreview('after');
    window.setV46HomePreview('auto');
  });

  // A cache-version check and app reload must not mutate browser-origin data.
  await page.evaluate(async () => {
    const sw = await navigator.serviceWorker?.getRegistration?.();
    if (sw) await sw.update();
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#mainApp')).toBeVisible();

  const restored = await page.evaluate(async ({pin,key}) => {
    const encryptedVault=localStorage.getItem('busan_v45_private_vault_user1');
    const pending=window.StorageEngine.get('pendingSyncQueue',[]).data;
    const record=await window.ShoppingPhotoEngine.get(key);
    await window.PrivateLedgerEngine.unlock('user1',pin);
    const bills=window.PrivateLedgerEngine.getBills('user1');
    window.PrivateLedgerEngine.lock();
    return {encryptedVault,pending,photo:record&&{
      key:record.key,fullSize:record.full?.size,thumbSize:record.thumb?.size,
      fullType:record.full?.type},bills};
  },{pin:original.pin,key:original.key});

  expect(restored.encryptedVault).toBe(original.lockedVault);
  expect(restored.pending).toEqual(original.pending);
  expect(restored.photo).toEqual({
    key:original.key,fullSize:original.photoBytes,
    thumbSize:original.thumbBytes,fullType:original.photoType
  });
  expect(restored.bills).toEqual([expect.objectContaining({
    id:'ci-device-ledger',name:'Synthetic encrypted expense',amt:874,currency:'KRW'
  })]);
});
