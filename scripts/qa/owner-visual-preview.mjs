import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from '../../tests/helpers/boot.js';
import globalSetup from '../../tests/global-setup.js';

const out = 'visual-review';
await fs.mkdir(out,{recursive:true});
if(process.env.CI!=='true'||process.env.BUSAN_CI_FIREBASE_ISOLATED!=='1') throw Error('Visual review must use CI in-memory Firebase');
await globalSetup();
const browser = await chromium.launch({headless:true});
const report={kind:'V46 OWNER VISUAL PREVIEW, NOT RELEASE',branch:'v46-visual-review-20261019',scenes:[]};
try{
 for(const width of [390,360]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();
  await bootApp(page);
  const safe=await page.evaluate(()=>Boolean(window.firebase?.__ciOnly && window.NetworkEngine?._db?.__testOnly));
  if(!safe)throw Error('Firebase fixture missing; abort visual capture');
  for(const phase of ['before','during','after']){
   await page.evaluate(v=>window.setV46HomePreview(v),phase);
   await page.locator('#v37HomeDashboard .v46-home').waitFor({state:'visible'});
   await page.waitForTimeout(700);
   const m=await page.evaluate(()=>{
      const hero=document.querySelector('#liveTravelCard');
      const a=document.querySelector('#v37HomeDashboard .v46-hero-copy');
      const art=document.querySelector('#v37HomeDashboard .v46-watercolor-illustration');
      const layout=r=>{if(!r)return null;const q=r.getBoundingClientRect();return {x:q.x,y:q.y,w:q.width,h:q.height}};
      return {viewport:document.documentElement.clientWidth,pageWidth:document.documentElement.scrollWidth,hero:layout(hero),copy:layout(a),art:layout(art),buttons:[...document.querySelectorAll('#v37HomeDashboard .v46-phase')].map(el=>({title:el.textContent.trim(),r:layout(el)})),nav:[...document.querySelectorAll('.bottom-nav .nav-item')].map(el=>({name:el.id,box:layout(el)}))};
   });
   const basename=String(width)+'-'+phase;
   await page.screenshot({path:out+'/'+basename+'-viewport.png',animations:'disabled'});
   await page.screenshot({path:out+'/'+basename+'-full.png',fullPage:true,animations:'disabled'});
   report.scenes.push({width,phase,...m});
   if(m.pageWidth>m.viewport+3)throw Error(basename+' horizontal overflow');
   if(m.nav.some(x=>x.box?.h<44))throw Error(basename+' bottom nav hit area');
  }
  await context.close();
 }
}finally{
 await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));
 await browser.close();
}