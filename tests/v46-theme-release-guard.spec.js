import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from './helpers/boot.js';

// V46 release guard: inherited V36 dark mode must not unexpectedly turn the
// upgraded owner's whole phone screen black. Never alter production data.
test('V46 opens cream light on phones despite legacy dark setting, after restart and tab changes',async({page})=>{
  await fs.mkdir('visual-theme',{recursive:true});
  await page.addInitScript(()=>{
    if (sessionStorage.getItem('v46-seeded') !== '1') {
      localStorage.setItem('busan_v36_theme','dark');
      localStorage.removeItem('busan_v46_theme');
      sessionStorage.setItem('v46-seeded','1');
    }
  });
  const results=[];
  for(const width of [320,360,390,430]){
    await page.setViewportSize({width,height:844});
    await page.emulateMedia({colorScheme:'dark'});
    await bootApp(page);
    await expect(page.locator('#v37HomeDashboard .v46-home')).toBeVisible();
    const check=async(section)=>{
      await expect(page.locator('html')).toHaveAttribute('data-theme','light');
      const v=await page.evaluate(()=>({
        theme:document.documentElement.getAttribute('data-theme'),
        body:getComputedStyle(document.body).backgroundColor,
        vars:getComputedStyle(document.body).getPropertyValue('--bg-color').trim(),
        v36:localStorage.getItem('busan_v36_theme'),
        v46:localStorage.getItem('busan_v46_theme'),
        section:document.querySelector('.container.active')?.id
      }));
      // CSS colors must be pale, not #0f0f11 or similarly near-black.
      const nums=(v.body.match(/\d+(\.\d+)?/g)||[]).slice(0,3).map(Number);
      expect(nums.length).toBe(3);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(220);
      expect(v.v36).toBe('dark'); // old preference must remain, for rollback
      results.push({width,section,...v});
    };
    await check('home');
    if(width===390)await page.screenshot({path:'visual-theme/390-home-cream-os-dark.png',animations:'disabled'});
    for(const id of ['itinerary','wallet','split','shop','more','home']){
      await page.evaluate(id=>window.showV37Tab(id,null,{haptic:false}),id);
      await check(id);
      if(width===390 && (id==='wallet'||id==='itinerary'))await page.screenshot({path:'visual-theme/390-'+id+'-cream-os-dark.png',animations:'disabled'});
    }
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#mainApp')).toBeVisible();
    await check('reopened');
  }
  await fs.writeFile('visual-theme/results.json',JSON.stringify(results,null,2));
});

test('V46 explicit manual theme choice uses new key without overwriting old V36 preference',async({page})=>{
  await page.addInitScript(()=>{
    if(sessionStorage.getItem('v46-toggled')!=='1'){
      localStorage.setItem('busan_v36_theme','dark');
      localStorage.removeItem('busan_v46_theme');
      sessionStorage.setItem('v46-toggled','1');
    }
  });
  await page.emulateMedia({colorScheme:'dark'});
  await bootApp(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.evaluate(()=>window.toggleDarkMode());
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('busan_v46_theme'))).toBe('dark');
  await page.evaluate(()=>window.toggleDarkMode());
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#mainApp')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  const data=await page.evaluate(()=>({
    old:localStorage.getItem('busan_v36_theme'),fresh:localStorage.getItem('busan_v46_theme')
  }));
  expect(data).toEqual({old:'dark',fresh:'light'});
});
