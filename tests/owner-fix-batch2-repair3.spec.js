// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

const reservationStates = {
  bx572: '資訊不足',
  ke2085: '資訊不足',
  hotel: '資訊不足',
  'ktx-korail': '尚未預訂',
  'sky-capsule': '尚未預訂',
  hanbok: '已預訂',
  klook: '資訊不足',
  kkday: '資訊不足',
  'visit-busan-pass': '資訊不足',
};

test.describe('Owner Fix Batch 2 Repair 3 — truthful reservations and credentials', () => {
  test.beforeEach(async ({ page }) => { await bootApp(page); });

  test('Ticket shows all canonical reservations with one truthful state and no fake credential', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('ticket');
    });

    const cards = page.locator('#walletTicketsList .reservation-state-card');
    await expect(cards).toHaveCount(9);

    for (const [id, state] of Object.entries(reservationStates)) {
      const card = page.locator(`[data-reservation-id="${id}"]`);
      await expect(card).toBeVisible();
      await expect(card.locator('.reservation-status')).toHaveText(state);
      await expect(card.locator('.reservation-credential')).toHaveText('憑證尚未上傳');
      await expect(card.locator('a, button, canvas, [data-qr], [data-barcode]')).toHaveCount(0);
    }

    await expect(page.locator('[data-reservation-id="bx572"]')).toContainText('2026/11/13 · TPE 13:25 → PUS 17:00');
    await expect(page.locator('[data-reservation-id="ke2085"]')).toContainText('2026/11/17 · PUS 14:50 → TPE 16:30');
    await expect(page.locator('[data-reservation-id="hotel"]')).toContainText('住宿資料不等於訂單憑證');
    await expect(page.locator('[data-reservation-id="hanbok"]')).toContainText('目前沒有可檢視憑證');
    await expect(page.locator('[data-reservation-id="visit-busan-pass"]')).toContainText('方案資訊；尚無購買證據');

    const { rawReservations, allowedStates } = await page.evaluate(() => ({
      rawReservations: window.TRAVEL_CONTENT_V45.reservations,
      allowedStates: window.TripContextEngine.reservationStates,
    }));
    expect(allowedStates).toEqual(['已預訂', '尚未預訂', '不需要', '資訊不足']);
    expect(JSON.stringify(rawReservations)).not.toMatch(/bookingNumber|referenceNumber|orderNumber|barcode|qrCode/i);
  });

  test('Docs shows truthful personal states while retaining official immigration guidance', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('doc');
    });

    const docs = page.locator('#personalCredentialStatesUI .personal-credential-state');
    await expect(docs).toHaveCount(6);

    const expected = {
      passport: '尚未上傳',
      keta: '本次免申請（豁免至 2026/12/31）',
      'e-arrival-card': '尚未申報',
      'q-code': '尚未上傳',
      insurance: '尚未上傳',
      hanbok: '已預訂・憑證尚未上傳',
    };
    for (const [id, state] of Object.entries(expected)) {
      const card = page.locator(`[data-credential-id="${id}"]`);
      await expect(card.locator('.credential-status')).toHaveText(state);
      await expect(card.locator('.credential-view')).toBeDisabled();
      await expect(card.locator('.credential-view')).toHaveText('無可檢視');
    }

    await expect(page.getByRole('link', { name: '官方 e-Arrival Card' })).toHaveAttribute('href', 'https://www.e-arrivalcard.go.kr/');
    await expect(page.locator('#immigrationRulesUI')).toContainText('免費官方電子申報');
    await expect(page.locator('#immigrationRulesUI')).toContainText('抵達韓國前 3 天內');
    await expect(page.locator('#immigrationRulesUI')).toContainText('已有有效 K-ETA 者免填');
    await expect(page.locator('#walletDocSection canvas, #walletDocSection [data-qr], #walletDocSection [data-barcode]')).toHaveCount(0);
  });

  test('Coupon, Hotel, K-ETA and canonical flights retain their certified factual state', async ({ page }) => {
    await page.evaluate(() => {
      window.showV37Tab('wallet');
      window.switchWalletTab('coupon');
    });
    await expect(page.locator('#walletCouponSection')).toContainText('尚未新增優惠券或會員卡');
    await expect(page.locator('#walletCouponSection')).toContainText('無可顯示條碼');

    await page.evaluate(() => window.switchWalletTab('hotel'));
    await expect(page.locator('#walletHotelInfoCard')).not.toContainText('尚未填寫住宿資料');
    const hotelText = await page.locator('#walletHotelInfoCard').innerText();
    expect(hotelText.replaceAll('-', '/')).toContain('2026/11/13');
    expect(hotelText.replaceAll('-', '/')).toContain('2026/11/17');

    await page.evaluate(() => window.showV37Tab('home'));
    await page.waitForFunction(() => document.getElementById('v37HomeDashboard')?.textContent?.includes('2026/12/31'));
    await expect(page.locator('#v37HomeDashboard')).toContainText('K-ETA：本次免申請');

    const travel = await page.evaluate(() => ({
      outbound: window.TRAVEL_CONTENT_V45.flights.outbound,
      inbound: window.TRAVEL_CONTENT_V45.flights.return,
    }));
    expect(travel.outbound).toMatchObject({ flightNo: 'BX572', date: '2026-11-13', departureTime: '13:25', arrivalTime: '17:00' });
    expect(travel.inbound).toMatchObject({ flightNo: 'KE2085', date: '2026-11-17', departureTime: '14:50', arrivalTime: '16:30' });
  });
});
