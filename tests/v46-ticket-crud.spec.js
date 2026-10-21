// @ts-check
import {test, expect} from '@playwright/test';
import {bootApp} from './helpers/boot.js';

// No live Firebase: abort every wallet mutation test unless the CI in-memory
// fixture is active. Never weaken assertions or force-click hidden controls.
test.beforeEach(async ({page}) => {
  await bootApp(page);
  const isolated=await page.evaluate(()=>window.NetworkEngine?._db?.__testOnly === true);
  expect(isolated,'Refusing ticket CRUD against a production database').toBe(true);
  await page.locator('#tab-wallet').click();
  await page.evaluate(()=>window.switchWalletTab('ticket'));
  await expect(page.locator('#walletTicketSection')).toBeVisible();
});

test('V46 ticket: edit existing record, keep voucher, save and delete last record without resurrection', async ({page})=>{
  await page.evaluate(async()=>{
    await window.NetworkEngine._db.ref(window.DB_TICKETS).set({
      saved1:{type:'🎫 門票',title:'舊票券',desc:'先前時段',voucher:'https://example.org/keep-receipt.png',reservationState:'已預訂',booked:true}
    });
  });
  await page.waitForFunction(()=>window.ticketData?.length===1);
  const card=page.locator('#walletTicketsList').getByRole('button',{name:'編輯票券 舊票券'});
  await card.click();
  await expect(page.locator('#tkTitle')).toHaveValue('舊票券');
  await expect(page.locator('#tempVoucher')).toHaveValue('https://example.org/keep-receipt.png');
  await page.locator('#tkTitle').fill('新票券標題');
  await page.locator('#tkDesc').fill('改成 11/15 09:30');
  await page.locator('#saveTicketBtn').click();
  await page.waitForFunction(()=>window.ticketData?.some(t=>t.title==='新票券標題'));
  const updated=await page.evaluate(async()=>(await window.NetworkEngine._db.ref(window.DB_TICKETS).once('value')).val());
  expect(updated.saved1.title).toBe('新票券標題');
  expect(updated.saved1.desc).toBe('改成 11/15 09:30');
  expect(updated.saved1.voucher).toBe('https://example.org/keep-receipt.png');
  expect(Object.keys(updated)).toHaveLength(1);
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#walletTicketsList').getByRole('button',{name:'刪除票券 新票券標題'}).click();
  await page.waitForFunction(()=>window.ticketData?.length===0);
  const result=await page.evaluate(async()=>({
    remote:(await window.NetworkEngine._db.ref(window.DB_TICKETS).once('value')).val(),
    local:window.StorageEngine.get('busan_v36_tickets',[]).data,
    displayed:document.getElementById('walletTicketsList')?.textContent
  }));
  expect(result.remote).toBeNull();
  expect(result.local).toEqual([]);
  expect(result.displayed).not.toContain('新票券標題');
  await page.locator('#tab-home').click();
  await page.locator('#tab-wallet').click();
  await expect(page.locator('#walletTicketsList')).not.toContainText('新票券標題');
});

test('V46 ticket: add, cancel edit and reject false-success network writes', async ({page})=>{
  await page.locator('#tkTitle').fill('新增的 KTX 憑證');
  await page.locator('#tkDesc').fill('11/15 去程');
  await page.locator('#tkReservationState').selectOption('已預訂');
  await page.locator('#saveTicketBtn').click();
  await page.waitForFunction(()=>window.ticketData?.some(t=>t.title==='新增的 KTX 憑證'));
  const key=await page.evaluate(()=>window.ticketData.find(t=>t.title==='新增的 KTX 憑證').key);
  await page.locator('#walletTicketsList').getByRole('button',{name:'編輯票券 新增的 KTX 憑證'}).click();
  await page.locator('#tkTitle').fill('暫時修改但取消');
  await page.locator('#cancelTicketEditBtn').click();
  await expect(page.locator('#tkEditKey')).toHaveValue('');
  await page.locator('#walletTicketsList').getByRole('button',{name:'編輯票券 新增的 KTX 憑證'}).click();
  await page.locator('#tkTitle').fill('不應寫入的改動');
  await page.evaluate(()=>{
    window.__savedUpdate=window.NetworkEngine.firebaseUpdate;
    window.NetworkEngine.firebaseUpdate=async()=>({success:false,data:null,error:'simulated-network-error'});
  });
  await page.locator('#saveTicketBtn').click();
  await expect(page.locator('#_toastPrompt')).toContainText('票券未儲存');
  const unchanged=await page.evaluate(async key=>(await window.NetworkEngine._db.ref(window.DB_TICKETS+'/'+key).once('value')).val(),key);
  expect(unchanged.title).toBe('新增的 KTX 憑證');
  await page.evaluate(()=>{window.NetworkEngine.firebaseUpdate=window.__savedUpdate;});
});

test('V46 canonical reservation: KTX status and receipt are editable overlays, and deleting restores default', async({page})=>{
  const ktx=page.locator('#walletTicketsList [data-reservation-id="ktx-korail"]');
  await expect(ktx.locator('.reservation-status')).toHaveText('尚未預訂');
  await ktx.getByRole('button',{name:'編輯預約 KTX / KORAIL'}).click();
  await expect(page.locator('#tkReservationId')).toHaveValue('ktx-korail');
  await page.locator('#tkDesc').fill('11/15 釜山 → 慶州，兩人相鄰');
  await page.locator('#tkReservationState').selectOption('已預訂');
  await page.locator('#saveTicketBtn').click();
  await expect(ktx.locator('.reservation-status')).toHaveText('已預訂');
  await expect(ktx.locator('.reservation-details')).toContainText('兩人相鄰');
  const rows=await page.evaluate(async()=>(await window.NetworkEngine._db.ref(window.DB_TICKETS).once('value')).val());
  const keys=Object.keys(rows||{});
  expect(keys).toHaveLength(1);
  expect(rows[keys[0]].reservationId).toBe('ktx-korail');
  expect(window).not.toBe(null);
  page.once('dialog',dialog=>dialog.accept());
  await ktx.getByRole('button',{name:'刪除個人預約資料 KTX / KORAIL'}).click();
  await expect(ktx.locator('.reservation-status')).toHaveText('尚未預訂');
  await expect(ktx.locator('.reservation-details')).toContainText('釜山 → 慶州');
  const final=await page.evaluate(async()=>(await window.NetworkEngine._db.ref(window.DB_TICKETS).once('value')).val());
  expect(final).toBeNull();
});
