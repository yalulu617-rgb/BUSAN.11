import {test, expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

test.beforeEach(async({page})=>{
  await bootApp(page);
  expect(await page.evaluate(()=>window.firebase?.__ciOnly === true &&
    window.NetworkEngine?._db?.__testOnly === true),
    'Navigation QA must never touch production Firebase').toBe(true);
});

test('five real train stations open matching itinerary and return to Korea-local auto',async({page})=>{
  await page.evaluate(()=>window.setV46HomePreview('during'));
  const accordion=page.locator('#v37HomeDashboard details.v46-rail-accordion');
  if(!(await accordion.evaluate(el=>el.open))) await accordion.locator('summary').click();
  await expect(accordion).toHaveAttribute('open','');
  for(const [n,iso,day] of [[1,'2026-11-13','11/13'],[3,'2026-11-15','11/15'],[5,'2026-11-17','11/17']]){
    await page.locator('#v37HomeDashboard .v46-owner-days .v46-day').nth(n-1).click();
    await expect(page.locator('#itinerary.container')).toHaveClass(/active/);
    await expect.poll(()=>page.evaluate(()=>window.currentFilterDay)).toBe(day);
    await expect(page.locator('#itinerary .day-tabs .day-tab.active').first()).toContainText(day.slice(3)+'日');
    await expect(page.locator('#itiContent .iti-row').first()).toBeVisible();
    const state=await page.evaluate(()=>({mode:window.v46HomePreviewMode,day:window.v46HomePreviewDay}));
    expect(state).toEqual({mode:'auto',day:null});
    await page.evaluate(()=>window.showV37Tab('home'));
    if(n!==5){
      await page.evaluate(()=>window.setV46HomePreview('during'));
      if(!(await accordion.evaluate(el=>el.open))) await accordion.locator('summary').click();
    }
  }
  const model=await page.evaluate(()=>window.getTripContext()?.v46Home);
  expect(model.selectedDay).toBe(model.naturalMode==='during'?model.today:'2026-11-13');
});

test('unknown station cannot navigate or rewrite travel date',async({page})=>{
  const state=await page.evaluate(()=>({before:window.currentFilterDay,accepted:window.openV46TrainDay('2030-01-01'),after:window.currentFilterDay}));
  expect(state.accepted).toBe(false);
  expect(state.after).toBe(state.before);
});
