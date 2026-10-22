import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { bootApp } from './helpers/boot.js';

test('V46 sticky compact header: scroll, phase switch, weather, bag, restore',async({page})=>{
 await fs.mkdir('visual-sticky',{recursive:true});
 const results=[];
 for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:844});
   await bootApp(page);
   await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
   await page.evaluate(()=>{
      window.WeatherEngine.cache={
        Busan:{temp:18,conditionZH:'晴朗',timestamp:Date.now(),source:'Open-Meteo'},
        Gyeongju:{temp:16,conditionZH:'多雲',timestamp:Date.now(),source:'Open-Meteo'}
      };
      window.triggerContextUpdate?.();
      window.setV46HomePreview('during');
      window.scrollTo(0,0);
   });
   const header=page.locator('#v37HomeDashboard .v46-sticky-head');
   await expect(header).toBeVisible();
   await expect(header).not.toHaveClass(/is-compact/);
   await expect(header.locator('.v46-weather-current')).toContainText('釜山 18°C');
   await expect(header.locator('.v46-weather-current')).toContainText('慶州 16°C');
   const full=await header.boundingBox();
   await page.screenshot({path:'visual-sticky/'+width+'-expanded.png',animations:'disabled'});
   await page.evaluate(()=>window.scrollTo(0,460));
   await expect(header).toHaveClass(/is-compact/);
   await expect(header.locator('.v46-mini-weather')).toBeVisible();
   await expect(header.locator('.v46-mini-weather')).toContainText('釜山 18°');
   const mini=await header.boundingBox();
   expect(full&&mini).toBeTruthy();
   expect(mini.height).toBeLessThan(full.height-40);
   expect(mini.y).toBeGreaterThanOrEqual(-3);
   expect(mini.y).toBeLessThanOrEqual(50);
   const bag=header.locator('.v46-inline-tools');
   await bag.locator('summary').click();
   await expect(bag).toHaveAttribute('open','');
   await expect(bag.locator('.v45-nine-card')).toHaveCount(11);
   await expect(bag.locator('.v45-nine-card').first()).toBeVisible();
   const box=await bag.locator('summary').boundingBox();
   expect(box.x).toBeGreaterThanOrEqual(-2);
   expect(box.x+box.width).toBeLessThanOrEqual(width+2);
   await page.screenshot({path:'visual-sticky/'+width+'-compact-menu.png',animations:'disabled'});
   await bag.locator('summary').click();
   await expect(bag).not.toHaveAttribute('open','');
   const select=header.locator('.v46-mini-phase-select');
   await expect(select).toBeVisible();
   await select.selectOption('after');
   await expect(page.locator('#v37HomeDashboard .v46-home')).toHaveAttribute('data-v46-mode','after');
   await page.evaluate(()=>window.scrollTo(0,0));
   await expect(page.locator('#v37HomeDashboard .v46-sticky-head')).not.toHaveClass(/is-compact/);
   await page.screenshot({path:'visual-sticky/'+width+'-restored.png',animations:'disabled'});
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
   expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+3);
   results.push({width,fullHeight:full.height,compactHeight:mini.height,weather:'from fixture',bagCount:11,phaseSwitch:'after',restored:true,overflow});
 }
 await fs.writeFile('visual-sticky/summary.json',JSON.stringify(results,null,2));
});
