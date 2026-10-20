import { test, expect, chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from './helpers/boot.js';

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
  expect(x.rootColorScheme).toContain('only light');
  expect(x.bodyColorScheme).toContain('only light');
  expect(x.theme).toBe('light');
  await page.screenshot({path:'visual-android-force-light/os-dark-390.png',animations:'disabled'});
  // An explicit opt-in theme switch is separate from browser-generated forced dark.
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible();
  x=await read();
  expect(x.rootColorScheme).toContain('only light');
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
    expect(state.root).toContain('only light');
    expect(state.mode).toBe('light');
    await page.screenshot({path:'visual-android-force-light/force-dark-webcontents-393px.png',animations:'disabled'});
    await page.evaluate(()=>window.showV37Tab('wallet',null,{haptic:false}));
    await page.screenshot({path:'visual-android-force-light/force-dark-wallet.png',animations:'disabled'});
    await context.close();
  }finally{await browser.close();}
});
