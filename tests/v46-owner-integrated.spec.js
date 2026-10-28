import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from './helpers/boot.js';

// Evidence comes from the real APP, with the existing in-memory CI Firebase fixture.
// This test does NOT mark the OWNER visual design approved.
test('V46 owner fit: real app screenshots, full-size image, rightward rail, 11 entries',async({page})=>{
 const target='visual-review';
 await fs.mkdir(target,{recursive:true});
 const report=[];
 for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:844});
   await bootApp(page);
   const menu=page.locator('#v37HomeDashboard .v45-nine-card');
   for(const phase of ['before','during','after']){
     await page.evaluate(value=>window.setV46HomePreview(value),phase);
     await expect(page.locator('#v37HomeDashboard .v46-home')).toHaveAttribute('data-v46-mode',phase);
     await expect(menu).toHaveCount(11);
     const hero=page.locator('#v37HomeDashboard .v46-hero.v46-story-hero');
     const image=hero.locator('img.v46-story-img');
     await expect(image).toHaveAttribute('src',`assets/images/v46-owner-fit-${phase}.webp`);
     const asset=await image.evaluate(async el=>{
       await el.decode();
       return {width:el.naturalWidth,height:el.naturalHeight,
          fit:getComputedStyle(el).objectFit,rendered:el.getBoundingClientRect().toJSON()};
     });
     expect(asset.width).toBe(1190);
     expect(asset.height).toBe(1322);
     expect(asset.fit).toBe('cover');
     const overflow=await page.evaluate(()=>({
       body:document.documentElement.scrollWidth,visible:document.documentElement.clientWidth
     }));
     expect(overflow.body).toBeLessThanOrEqual(overflow.visible+3);
     const btn=hero.locator('button.v46-hero-link');
     await expect(btn).toBeVisible();
     const rect=await btn.boundingBox(),hrect=await hero.boundingBox();
     expect(rect&&hrect).toBeTruthy();
     expect(rect.x).toBeGreaterThanOrEqual(hrect.x-2);
     expect(rect.x+rect.width).toBeLessThanOrEqual(hrect.x+hrect.width+2);
     expect(rect.y).toBeGreaterThanOrEqual(hrect.y-2);
     expect(rect.y+rect.height).toBeLessThanOrEqual(hrect.y+hrect.height+2);
     await page.screenshot({path:`${target}/${width}-${phase}-viewport.png`,animations:'disabled'});
     if(width===390)await page.screenshot({path:`${target}/390-${phase}-full.png`,fullPage:true,animations:'disabled'});
     report.push({width,phase,image:asset,overflow,hero:hrect,cta:rect});
   }
   await page.evaluate(()=>window.setV46HomePreview('during'));
   const visibleCard=page.locator('#v37HomeDashboard .v46-visible-rail-card');
   await expect(page.locator('#v37HomeDashboard .v46-home')).toHaveAttribute('data-v46-mode','during');
   await expect(visibleCard,'train cannot require expanding an accordion').toBeVisible();
   await expect(page.locator('#v37HomeDashboard details.v46-rail-accordion')).toHaveCount(0);
   const mascot=page.locator('#v37HomeDashboard .v46-mascot-image svg');
   await expect(mascot).toBeVisible();
   const mascotRect=await mascot.boundingBox();
   expect(mascotRect?.width).toBeLessThanOrEqual(40);
   expect(mascotRect?.height).toBeLessThanOrEqual(42);
   const rail=page.locator('#v37HomeDashboard .v46-owner-train-track');
   const train=rail.locator('.v46-owner-train-marker');
   const img=train.locator('img');
   await img.evaluate(async el=>el.decode());
   expect(await img.evaluate(el=>getComputedStyle(el).transform)).toContain('-1');
   const days=page.locator('#v37HomeDashboard .v46-owner-days button.v46-day');
   await expect(days).toHaveCount(5);
   const xs=[];
   for(const i of [0,2,4]){
      await days.nth(i).click();
      const targetDay=['11/13','11/14','11/15','11/16','11/17'][i];
      await expect(page.locator('#itinerary.container')).toHaveClass(/active/);
      await expect.poll(()=>page.evaluate(()=>window.currentFilterDay)).toBe(targetDay);
      await page.evaluate(()=>window.showV37Tab('home'));
      await page.evaluate(()=>window.setV46HomePreview('during'));
      await page.evaluate(iso=>window.setV46HomeDay(iso),'2026-'+targetDay.replace('/','-'));
      await expect(visibleCard).toBeVisible();
      await expect(days.nth(i)).toHaveAttribute('aria-pressed','true');
      const t=await train.boundingBox(),r=await rail.boundingBox();
      expect(t&&r).toBeTruthy();
      expect(t.x).toBeGreaterThanOrEqual(r.x-2);
      expect(t.x+t.width).toBeLessThanOrEqual(r.x+r.width+2);
      xs.push(t.x);
      if(width===390){
       await rail.scrollIntoViewIfNeeded();
       await page.screenshot({path:`${target}/390-train-Day${i+1}.png`,animations:'disabled'});
      }
   }
   expect(xs[0]).toBeLessThan(xs[1]);
   expect(xs[1]).toBeLessThan(xs[2]);
   report.push({width,phase:'train',positions:xs});
 }
 await fs.writeFile('visual-review/report.json',JSON.stringify(report,null,2));
});
