// V46 trip-companion and low-power motion acceptance.
// Uses only CI synthetic Firebase, never production.
import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import vm from 'node:vm';
import {bootApp} from './helpers/boot.js';

test('pure companion: Seoul clock, canonical place-only NAVER, no fabricated locations',()=>{
  const sandbox={Date,Intl,Number,URL,console};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('ute/ute_trip_companion.js','utf8'),sandbox);
  const engine=sandbox.V46TripCompanion;
  const itinerary=[
    {day:'11/13',key:'rec_d1_1',time:'13:25',desc:'BX572 flight - plane'},
    {day:'11/13',key:'rec_d1_3',time:'約 19:00',desc:'城市律動飯店 - Check-in'},
    {day:'11/13',key:'rec_d1_4',time:'晚間',desc:'西面街頭小吃'},
    {day:'11/14',key:'rec_d2_2',time:'10:00',desc:'OPS Haeundae - bakery'}
  ];
  const registry={urban_groove:{naver:'https://naver.me/5SKCdrOx'},
    ops_haeundae:{naver:'https://naver.me/5EQ3khJY'}};
  const mapKeys={'11/13':{3:'urban_groove',4:'seomyeon_station'},
    '11/14':{2:'ops_haeundae'}};
  const v=engine.createModel({iso:'2026-11-13',today:'2026-11-13',
    now:new Date('2026-11-13T09:00:00Z'),itinerary,registry,mapKeys});
  expect(v.title).toContain('城市律動飯店'); // 18:00 Seoul -> next 19:00
  expect(v.naver).toBe('https://naver.me/5SKCdrOx');
  expect(v.basis).toBe('time');
  const other=engine.createModel({iso:'2026-11-13',today:'2026-11-13',
    now:new Date('2026-11-13T09:00:00Z'),itinerary,registry,mapKeys,manualIndex:2});
  expect(other.naver).toBe(null); // no verified link for Seomyeon streets
  expect(engine.validNaver('https://evil.example/naver.me/test')).toBe(null);
  expect(engine.validNaver('javascript:alert(1)')).toBe(null);
  expect(engine.createModel({iso:'2030-01-01',itinerary}).available).toBe(false);
});

test.beforeEach(async({page})=>{
  await bootApp(page);
  expect(await page.evaluate(()=>window.NetworkEngine?._db?.__testOnly &&
    window.firebase?.__ciOnly)).toBe(true);
});

test('three travel phases: compact art banners, train only during journey, light background',async({page})=>{
  const home=page.locator('#v37HomeDashboard .v46-home');
  const hero=page.locator('#v37HomeDashboard .v46-story-hero');
  const rail=page.locator('#v37HomeDashboard .v46-visible-rail-card');
  const viewportWidths=[320,360,390,430];
  for(const width of viewportWidths){
    await page.setViewportSize({width,height:850});
    await page.evaluate(()=>window.setV46HomePreview('before'));
    await expect(home).toHaveAttribute('data-v46-mode','before');
    await expect(rail).toHaveCount(0);
    await expect(page.locator('#v37HomeDashboard .v46-pretrip-rail-link')).toBeVisible();
    await expect(page.locator('#v37HomeDashboard .v46-preflight-strip')).toBeVisible();
    await expect(hero.locator('img')).toHaveAttribute('src','assets/images/v46-owner-fit-before.webp');
    await expect.poll(()=>hero.evaluate(el=>Math.round(el.getBoundingClientRect().height))).toBeLessThan(250);
    await page.evaluate(()=>window.setV46HomePreview('during'));
    await expect(rail).toBeVisible();
    await expect(rail.locator('.v46-owner-train-track')).toBeVisible();
    await expect(rail.locator('.v46-owner-days button.v46-day')).toHaveCount(5);
    await expect(rail.locator('.v46-trip-companion')).toBeVisible();
    await expect(hero.locator('img')).toHaveAttribute('src','assets/images/v46-owner-fit-during.webp');
    const widths=await page.evaluate(()=>{
      const select=s=>document.querySelector(s)?.getBoundingClientRect();
      return {
        hero:select('#v37HomeDashboard .v46-story-hero').height,
        train:select('#v37HomeDashboard .v46-owner-train-track').height,
        mascot:select('#v37HomeDashboard .v46-mascot-image svg').width,
        page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth
      };
    });
    expect(widths.hero).toBeLessThan(200);
    expect(widths.train).toBeLessThan(150);
    expect(widths.mascot).toBeLessThanOrEqual(40);
    expect(widths.page).toBeLessThanOrEqual(widths.viewport+3);
    await page.evaluate(()=>window.setV46HomePreview('after'));
    await expect(rail).toHaveCount(0);
    await expect(hero.locator('img')).toHaveAttribute('src','assets/images/v46-owner-fit-after.webp');
    const bg=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgb\(251, 246, 237\)/);
  }
});

test('five-day companion: manual station, exact NAVER, preview/reset and device persistence',async({page})=>{
  await page.evaluate(()=>window.setV46HomePreview('during'));
  const card=page.locator('#v37HomeDashboard .v46-trip-companion');
  await expect(card).toBeVisible();
  await expect(card).toContainText('下一站');
  const first=await page.evaluate(()=>window.getTripContext().v46Home.nextStop);
  expect(first.iso).toBe('2026-11-13');
  expect(first.index).toBe(0);
  await page.getByRole('button',{name:'下一站 →'}).click();
  await expect(card.locator('.v46-stop-count')).toHaveText('2/6');
  await page.getByRole('button',{name:'下一站 →'}).click();
  await expect(card.locator('.v46-stop-count')).toHaveText('3/6');
  await expect(card.locator('a[href^="https://naver.me/"]')).toHaveAttribute('href','https://naver.me/5SKCdrOx');
  await page.reload();
  await page.evaluate(()=>window.setV46HomePreview('during'));
  await expect(card.locator('.v46-stop-count')).toHaveText('3/6');
  await page.getByRole('button',{name:'依韓國時間建議'}).click();
  const basis=await page.evaluate(()=>window.getTripContext().v46Home.nextStop.basis);
  expect(basis).toBe('preview'); // not yet traveling
  await page.evaluate(()=>window.setV46HomeDay('2026-11-15'));
  const gyeongju=await page.evaluate(()=>window.getTripContext().v46Home.nextStop);
  expect(gyeongju.iso).toBe('2026-11-15');
  await page.evaluate(()=>window.setV46TrainStop('2026-11-15','next'));
  const lunch=await page.evaluate(()=>window.getTripContext().v46Home.nextStop);
  expect(lunch.title).toContain('水鏡舍');
  expect(lunch.naver).toBe('https://naver.me/5ne4lqLJ');
});

test('train animations can be turned off and character greets only on tap',async({page})=>{
  await page.evaluate(()=>window.setV46HomePreview('during'));
  const card=page.locator('#v37HomeDashboard .v46-trip-companion');
  const toggle=card.locator('.v46-motion-toggle');
  const before=await toggle.getAttribute('aria-pressed');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed',before==='true'?'false':'true');
  const track=page.locator('#v37HomeDashboard .v46-owner-train-track');
  await expect(track).toHaveAttribute('data-v46-motion',before==='true'?'off':'on');
  await card.locator('.v46-mascot-hello').click();
  await expect(card.locator('.v46-mascot-message')).toContainText('旅途愉快');
  await page.evaluate(()=>window.setV46HomePreview('auto'));
  const stored=await page.evaluate(()=>window.localStorage.getItem('busan11.v46.train.motion.v1'));
  expect(['on','off']).toContain(stored);
});
