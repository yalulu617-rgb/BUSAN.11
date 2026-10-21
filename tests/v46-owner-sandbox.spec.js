// @ts-check
import {test,expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

test('V46 owner sandbox has a visible warning and cannot access real Firebase',async({page})=>{
  const outgoing=[];
  page.on('request', request=>{
    if (/firebaseio\.com|firebasedatabase\.app|api\.imgbb\.com/i.test(request.url()))
      outgoing.push(request.url());
  });
  await bootApp(page);
  await expect(page.locator('#v46-sandbox-notice')).toBeVisible();
  await expect(page.locator('#v46-sandbox-notice')).toContainText('請勿上傳真實票券');
  const isolated=await page.evaluate(()=>window.firebase?.__ciOnly === true &&
    window.NetworkEngine?._db?.__testOnly === true);
  expect(isolated).toBe(true);
  const js=await page.request.get('/js/firebase.js');
  expect(js.status()).toBe(200);
  const body=await js.text();
  expect(body).toContain('__testOnly:true');
  expect(body).not.toContain('busan-trip-2026-4148f');
  expect(body).not.toMatch(/AIzaSy|8a4c0f3b5d2e7a9b1c6f/);
  const legacy=await page.request.get('/services/network.js');
  expect(legacy.status()).toBe(404);
  expect(outgoing).toEqual([]);
});

test('V46 sandbox permits mock ticket editing without persisting it to live backend',async({page})=>{
  await bootApp(page);
  await page.evaluate(()=>window.showV37Tab('wallet'));
  await page.evaluate(()=>window.switchWalletTab('ticket'));
  await page.locator('#tkTitle').fill('僅供操作測試的票券');
  await page.locator('#saveTicketBtn').click();
  await page.waitForFunction(()=>window.ticketData?.some(t=>t.title==='僅供操作測試的票券'));
  const safe=await page.evaluate(async()=>({
    ci:window.NetworkEngine._db.__testOnly,
    record:(await window.NetworkEngine._db.ref(window.DB_TICKETS).once('value')).val()
  }));
  expect(safe.ci).toBe(true);
  expect(Object.values(safe.record||{}).some(x=>x.title==='僅供操作測試的票券')).toBe(true);
});
