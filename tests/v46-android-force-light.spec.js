import { test, expect, chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from './helpers/boot.js';
function assertLightRendering(state) {
  // CSSOM serializes "only light" as "light only" or simply "light" on
  // different Android/Chromium versions. Reject dark, not serialization order.
  for(const value of [state.rootColorScheme??state.root, state.bodyColorScheme??state.bodyScheme].filter(Boolean)){
    expect(value).toMatch(/\blight\b/);
    expect(value).not.toMatch(/\bdark\b/);
  }
  const match=String(state.background??state.body).match(/rgba?\(\s*(\d+)[,\s]+\s*(\d+)[,\s]+\s*(\d+)/i);
  expect(match,'Computed page background must be an RGB color').not.toBeNull();
  const rgb=match.slice(1,4).map(Number);
  expect(Math.min(...rgb),'Page background must remain pale cream, never near-black').toBeGreaterThanOrEqual(220);
}


test('V46 opts out of UA auto darkening, including dark Android browser', async ({page})=>{
  await fs.mkdir('visual-android-force-light',{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({colorScheme:'dark'});
  await bootApp(page);
  const read=async()=>page.evaluate(()=>{
    const html=document.documentElement;
    const meta=document.querySelector('meta[name="color-scheme"]')?.content;
    const body=getComputedStyle(document.body);
    const raw=getComputedStyle(html);
    return {meta,rootColorScheme:raw.colorScheme,bodyColorScheme:body.colorScheme,
      background:body.backgroundColor,theme:html.getAttribute('data-theme')};
  });
  let x=await read();
  expect(x.meta).toBe('only light');
  assertLightRendering(x);
  expect(x.theme).toBe('light');
  await page.screenshot({path:'visual-android-force-light/os-dark-390.png',animations:'disabled'});
  // An explicit opt-in theme switch is separate from browser-generated forced dark.
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible();
  x=await read();
  assertLightRendering(x);
});

test('Chromium force dark web contents honors only-light opt-out',async()=>{
  await fs.mkdir('visual-android-force-light',{recursive:true});
  const browser=await chromium.launch({headless:true,args:[
    '--enable-features=WebContentsForceDark',
    '--force-dark-mode'
  ]});
  try{
    const context=await browser.newContext({...devices['Pixel 7'],colorScheme:'dark'});
    const page=await context.newPage();
    await bootApp(page);
    await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible();
    const state=await page.evaluate(()=>({
      root:getComputedStyle(document.documentElement).colorScheme,
      mode:document.documentElement.getAttribute('data-theme'),
      body:getComputedStyle(document.body).backgroundColor,
      rootLightMeta:document.querySelector('meta[name="color-scheme"]')?.content
    }));
    expect(state.rootLightMeta).toBe('only light');
    assertLightRendering(state);
    expect(state.mode).toBe('light');
    await page.screenshot({path:'visual-android-force-light/force-dark-webcontents-393px.png',animations:'disabled'});
    await page.evaluate(()=>window.showV37Tab('wallet',null,{haptic:false}));
    await page.screenshot({path:'visual-android-force-light/force-dark-wallet.png',animations:'disabled'});
    await context.close();
  }finally{await browser.close();}
});
