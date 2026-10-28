// V46 RELEASE CANDIDATE: mobile device emulation and isolated user-data acceptance.
// This suite must run with the disposable CI-only Firebase in-memory facade.
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

const width = Number(process.env.V46_QA_WIDTH || 390);
const height = Number(process.env.V46_QA_HEIGHT || 844);
const modeNames = ['before','during','after'];
const preview = (page, phase) => page.evaluate(value => window.setV46HomePreview(value), phase);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({width, height});
  await bootApp(page);
  const isolated = await page.evaluate(() =>
    Boolean(window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly));
  expect(isolated, 'QA must never reach live Firebase').toBe(true);
});

test('V46 responsive heroes: three phases render within actual mobile viewport', async ({ page }, testInfo) => {
  for (const phase of modeNames) {
    await preview(page, phase);
    const home = page.locator('#v37HomeDashboard .v46-home');
    const hero = page.locator('#v37HomeDashboard #liveTravelCard');
    await expect(home).toHaveAttribute('data-v46-mode',phase);
    await expect(hero).toBeVisible();
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector('#v37HomeDashboard #liveTravelCard');
      const area = document.getElementById('v37HomeDashboard');
      const bounds = hero.getBoundingClientRect();
      return {
        viewport: document.documentElement.clientWidth,
        bodyWidth: document.documentElement.scrollWidth,
        areaWidth: area.clientWidth,
        areaScrollWidth: area.scrollWidth,
        heroLeft: bounds.left, heroRight: bounds.right, heroWidth: bounds.width,
      };
    });
    expect(geometry.heroWidth).toBeGreaterThan(180);
    expect(geometry.heroLeft).toBeGreaterThanOrEqual(-2);
    expect(geometry.heroRight).toBeLessThanOrEqual(geometry.viewport + 3);
    expect(geometry.bodyWidth, 'Unwanted global horizontal scroll in '+phase).toBeLessThanOrEqual(geometry.viewport + 3);
    await testInfo.attach('v46-'+phase+'-'+width+'px.png', {
      body: await page.screenshot({ animations:'disabled' }),contentType:'image/png'
    });
  }
});

test('V46 touchscreen and navigation: full eleven entries remain operable and collapsible', async ({ page }) => {
  await preview(page,'during');
  const bag = page.locator('#v37HomeDashboard details.v46-tools');
  const summary=bag.locator('summary');
  await expect(bag).not.toHaveAttribute('open','');
  await summary.click();
  await expect(bag).toHaveAttribute('open','');
  const cards=bag.locator('button.v45-nine-card');
  await expect(cards).toHaveCount(11);
  for (const item of await cards.all()) {
    const rect=await item.boundingBox();
    expect(rect,'Every entry has a touch target').not.toBeNull();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  await cards.filter({hasText:'超商・超市'}).click();
  await expect(page.locator('#shop')).toHaveClass(/active/);
  await expect(page.locator('#shopConvenienceContainer')).toBeVisible();
  await page.locator('#tab-home').click();
  await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible();
  await preview(page,'during');
  const rail=page.locator('#v37HomeDashboard .v46-visible-rail-card');
  await expect(rail).toBeVisible();
  const day=page.locator('#v37HomeDashboard .v46-day');
  await expect(day).toHaveCount(5);
  await day.nth(2).click();
  await expect(day.nth(2)).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>window.setV46HomePreview('auto'));
  const state=await page.evaluate(()=>({
    previewDay:window.v46HomePreviewDay,mode:window.getTripContext()?.v46Home?.mode,
    naturalMode:window.getTripContext()?.v46Home?.naturalMode
  }));
  expect(state.previewDay).toBeNull();
  expect(state.mode).toBe(state.naturalMode);
});

test('V46 legacy data: shopping owners, bought marks, tickets, photos, bills and vault survive phase changes', async ({ page }) => {
  const seed = {
    shop: {
      oldUser1: {text:'Saved skin mask',owner:'user1',checked:true,img:'',category:'保養',notes:'不可遺失的備註'},
      oldUser2: {text:'Imint無糖咖啡糖',owner:'user2',checked:false,img:'',category:'食品',notes:'原使用者'}
    },
    photos: {
      oldPhoto: {url:'https://example.org/busan-photo.webp',desc:'旅行相簿舊照片'},
      oldPhoto2: {url:'https://example.org/gyeongju-photo.webp',desc:'慶州舊照片'}
    },
    tickets: {
      oldTicket: {title:'舊票券',type:'🎫 門票',voucher:'https://example.org/voucher',reservationId:'sample'},
    },
    bills: {
      oldBill: {name:'舊公費',amt:2500,currency:'KRW',type:'公費',payer:'user1'}
    }
  };
  await page.evaluate(async entries => {
    const db=window.NetworkEngine._db;
    if (!db?.__testOnly) throw new Error('Refuse tests without isolated Firebase');
    await Promise.all([
      db.ref(window.DB_SHOP).set(entries.shop),
      db.ref(window.DB_PHOTOS).set(entries.photos),
      db.ref(window.DB_TICKETS).set(entries.tickets),
      db.ref(window.DB_BILLS).set(entries.bills),
    ]);
    localStorage.setItem('busan_v45_private_vault_user1',
      JSON.stringify({version:1,ciphertext:'ci-encrypted-test-placeholder'}));
  },seed);
  await page.waitForFunction(() =>
    window.shopList?.length===2 && window.photoList?.length===2 &&
    window.ticketData?.some(x=>x.title==='舊票券') &&
    window.sharedBills?.some(x=>x.name==='舊公費')
  ,null,{timeout:12000});
  await page.evaluate(()=>window.triggerContextUpdateImmediate());
  const take = () => page.evaluate(async()=>{
    const db=window.NetworkEngine._db;
    const keys=[window.DB_SHOP,window.DB_PHOTOS,window.DB_TICKETS,window.DB_BILLS];
    const all=await Promise.all(keys.map(async key=>(await db.ref(key).once('value')).val()));
    return {server:all,privateVault:localStorage.getItem('busan_v45_private_vault_user1')};
  });
  const initial=await take();
  for(const phase of modeNames){
    await preview(page,phase);
    const bag=page.locator('#v37HomeDashboard details.v46-tools');
    await bag.locator('summary').click();
    await bag.locator('summary').click();
  }
  await preview(page,'after');
  const model=await page.evaluate(()=>window.getTripContext()?.v46Home);
  expect(model.photosCount).toBe(2);
  expect(model.boughtCount).toBe(1);
  await expect(page.locator('#v37HomeDashboard .v46-summary')).toContainText('2');
  expect(await take()).toEqual(initial);
  expect(initial.server[0].oldUser1.notes).toBe('不可遺失的備註');
  expect(initial.server[1].oldPhoto.desc).toBe('旅行相簿舊照片');
  expect(initial.server[2].oldTicket.voucher).toBe('https://example.org/voucher');
  expect(initial.server[3].oldBill.amt).toBe(2500);
  const upload=await page.locator('#photoImgUpload').evaluate(el=>({
    multiple:el.multiple,accept:el.accept,handler:el.getAttribute('onchange')
  }));
  expect(upload.multiple).toBe(true);
  expect(upload.accept).toBe('image/*');
  expect(upload.handler).toContain("uploadMultipleToImgBB(this.files, 'photo')");
});


// Test the actual multiple-file upload loop while replacing only the external ImgBB API.
// The Firebase write destination is the CI-only in-memory database.
test('V46 existing album: two images upload as distinct records without replacing existing photos', async ({ page }) => {
  await page.evaluate(async () => {
    if (!window.NetworkEngine?._db?.__testOnly) throw new Error('Unsafe test database');
    await window.NetworkEngine._db.ref(window.DB_PHOTOS).set({
      existing: {url:'https://example.org/existing.webp',date:'11/13',desc:'原有相簿紀錄'}
    });
  });
  await page.waitForFunction(()=>window.photoList?.length===1);
  const state=await page.evaluate(async()=>{
    const png='iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8vy2RgYGBiYGBgYGBAQAZ0AIaFSfNtAAAAABJRU5ErkJggg==';
    const bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0));
    const files=[
      new File([bytes],'test-one.png',{type:'image/png'}),
      new File([bytes],'test-two.png',{type:'image/png'})
    ];
    let uploadIndex=0;
    window.NetworkEngine.uploadImage=async()=>({
      success:true,data:{url:'https://example.org/ci-image-'+ ++uploadIndex+'.webp'}
    });
    await window.uploadMultipleToImgBB(files,'photo');
    const snap=await window.NetworkEngine._db.ref(window.DB_PHOTOS).once('value');
    return {
      uploadStatus:document.getElementById('photoUploadStatus').textContent,
      records:Object.values(snap.val()||{}),
      calls:uploadIndex
    };
  });
  expect(state.calls).toBe(2);
  expect(state.uploadStatus).toContain('成功 2/2');
  expect(state.records).toHaveLength(3);
  expect(state.records.some(x=>x.desc==='原有相簿紀錄')).toBe(true);
  expect(state.records.filter(x=>/^https:\/\/example\.org\/ci-image-[12]\.webp$/.test(x.url))).toHaveLength(2);
  await page.waitForFunction(()=>window.photoList?.length===3);
});

test('V46 offline: cache includes new artwork, travel shell, and remains usable without network', async ({ page, context, browserName }) => {
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:15000});
  const cacheResult=await page.evaluate(async()=>{
    const r=await navigator.serviceWorker.ready;
    const source=await (await fetch('sw.js',{cache:'no-store'})).text();
    const cacheName=(source.match(/const CACHE_NAME = '([^']+)'/)||[])[1];
    const cache=await caches.open(cacheName);
    const expected=['./index.html','./manifest.json','./assets/css/v46-home.css',
      './assets/images/v46-watercolor-hero-atlas.webp',
      './assets/images/v46-during-characters.webp',
      './components/v46-home.js','./ute/ute_home_v46.js'];
    return {active:Boolean(r.active),cacheName,missing:(await Promise.all(
      expected.map(async path=>(await cache.match(path)) ? null : path))).filter(Boolean),
      controlled:Boolean(navigator.serviceWorker.controller),
      installSkipsWaiting:(source.match(/self\.addEventListener\('install'[\s\S]*?\n\}\);/)||[''])[0].includes('self.skipWaiting()'),
      manualUpdateEnabled:source.includes("event.data.action === 'skipWaiting'")
    };
  });
  expect(cacheResult.active).toBe(true);
  expect(cacheResult.missing).toEqual([]);
  expect(cacheResult.installSkipsWaiting).toBe(false);
  expect(cacheResult.manualUpdateEnabled).toBe(true);
  if(browserName==='webkit') {
    // Playwright/Linux WebKit is unable to commit offline top-level navigations.
    // The warm cache and controlled-update policy are tested above; true offline
    // relaunch on physical iOS remains an explicit OWNER acceptance gate.
    return;
  }
  await context.setOffline(true);
  try {
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible({timeout:18000});
    await preview(page,'during');
    await expect(page.locator('#v37HomeDashboard .v46-day')).toHaveCount(5);
    const offlineAsset=await page.evaluate(async()=> {
      const response=await fetch('assets/images/v46-during-characters.webp');
      return {ok:response.ok,bytes:(await response.arrayBuffer()).byteLength};
    });
    expect(offlineAsset.ok).toBe(true);
    expect(offlineAsset.bytes).toBeGreaterThan(1000);
    // navigator.onLine is not reliable under browser emulation. Probe a same-origin
    // JS resource that was NOT precached: online it is 200; offline the SW may
    // return 503, or Firefox may reject fetch with a network TypeError outright.
    const sentinel=await page.evaluate(async()=>{
      try {
        const response=await fetch('tests/v46-release-acceptance.spec.js?ci-network-probe='+Date.now(), {
          cache:'no-store'
        });
        return {status:response.status,errorName:null};
      }catch(error){
        return {status:null,errorName:String(error?.name || '')};
      }
    });
    expect(
      sentinel.status===503 ||
      (sentinel.status===null && ['TypeError','NetworkError'].includes(sentinel.errorName)),
      'An uncached resource must be unreachable while offline: '+JSON.stringify(sentinel)
    ).toBe(true);
  }finally {
    await context.setOffline(false);
  }
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible({timeout:18000});
});


test('V46 release label: manifest, page title, and release metadata agree without changing PWA identity', async ({ page }) => {
  const manifest=await (await page.request.get('/manifest.json')).json();
  const release=await (await page.request.get('/data/release.json')).json();
  expect(manifest.name).toContain('V46');
  expect(manifest.short_name).toContain('V46');
  expect(manifest.id).toBe('./'); // must not create a second home-screen app identity
  expect(release.appVersion).toBe('V46');
  expect(release.releaseName).toContain('V46');
  expect(await page.title()).toContain('V46');
});
