// @ts-check
import {test,expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

test.beforeEach(async({page})=>{
  await bootApp(page);
  expect(await page.evaluate(()=>
    window.firebase?.__ciOnly===true && window.NetworkEngine?._db?.__testOnly===true
  ),'Never mutate the owner\'s real Firebase').toBe(true);
});

test('V46 deleting last custom itinerary clears authoritative cache without harming canonical five days',async({page})=>{
  await page.evaluate(async()=>{
    if(!window.NetworkEngine._db.__testOnly)throw Error('STOP: live Firebase');
    await window.NetworkEngine._db.ref(window.DB_ITI).set({
      'owner-last-row':{day:'11/13',time:'19:40',desc:'個人臨時補充行程',tr:'步行',map:''}
    });
  });
  await page.waitForFunction(()=>window.customItineraryData?.some(x=>x.desc==='個人臨時補充行程'));
  await expect.poll(()=>page.evaluate(()=>
    window.StorageEngine.get('busan_v36_itinerary',[]).data?.length
  )).toBe(1);
  await page.evaluate(async()=>{
    if(!window.NetworkEngine._db.__testOnly)throw Error('STOP: live Firebase');
    await window.NetworkEngine._db.ref(window.DB_ITI+'/owner-last-row').remove();
  });
  await page.waitForFunction(()=>window.customItineraryData?.length===0);
  const state=await page.evaluate(()=>({
    cached:window.StorageEngine.get('busan_v36_itinerary',[]).data,
    oldRows:window.itineraryData.filter(x=>x.desc==='個人臨時補充行程'),
    canonicalCount:window.RECOMMENDED_ITINERARY.length,
    currentCount:window.itineraryData.length,
    days:[...new Set(window.itineraryData.map(x=>x.day))]
  }));
  expect(state.cached).toEqual([]);
  expect(state.oldRows).toHaveLength(0);
  expect(state.canonicalCount).toBeGreaterThan(0);
  expect(state.currentCount).toBe(state.canonicalCount);
  for(const day of ['11/13','11/14','11/15','11/16','11/17'])expect(state.days).toContain(day);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#mainApp')).toBeVisible();
  await page.waitForFunction(()=>window.customItineraryData?.length===0);
  expect(await page.evaluate(()=>window.StorageEngine.get('busan_v36_itinerary',[]).data)).toEqual([]);
});

test('V46 itinerary save failure preserves user input and does not claim success',async({page})=>{
  await page.evaluate(()=>{
    window.showV37Tab('itinerary');
    window.__itineraryOriginalPush=window.NetworkEngine.firebasePush;
    window.NetworkEngine.firebasePush=async()=>({success:false,data:null,error:'CI disconnected'});
  });
  await page.locator('#itiDesc').fill('不能丟失的個人行程');
  await page.evaluate(()=>window.saveItinerary());
  await expect(page.locator('#itiDesc')).toHaveValue('不能丟失的個人行程');
  const remote=await page.evaluate(async()=>(
    await window.NetworkEngine._db.ref(window.DB_ITI).once('value')
  ).val());
  expect(Object.keys(remote||{})).toHaveLength(0);
  await page.evaluate(()=>{window.NetworkEngine.firebasePush=window.__itineraryOriginalPush;});
});

test('V46 failed itinerary delete does not remove the owner row',async({page})=>{
  await page.evaluate(async()=>{
    await window.NetworkEngine._db.ref(window.DB_ITI).set({
      preserve:{day:'11/14',time:'20:30',desc:'不能誤刪的行程',tr:'地鐵'}
    });
    window.__itineraryOriginalRemove=window.NetworkEngine.firebaseRemove;
    window.NetworkEngine.firebaseRemove=async()=>({success:false,error:'CI forced failure'});
  });
  await page.waitForFunction(()=>window.customItineraryData?.some(x=>x.desc==='不能誤刪的行程'));
  page.once('dialog',dialog=>dialog.accept());
  await page.evaluate(()=>window.deleteItinerary('preserve'));
  const after=await page.evaluate(async()=>({
    remote:(await window.NetworkEngine._db.ref(window.DB_ITI+'/preserve').once('value')).val(),
    ui:window.customItineraryData.some(x=>x.desc==='不能誤刪的行程')
  }));
  expect(after.remote.desc).toBe('不能誤刪的行程');
  expect(after.ui).toBe(true);
  await page.evaluate(()=>{window.NetworkEngine.firebaseRemove=window.__itineraryOriginalRemove;});
});
