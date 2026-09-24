// @ts-check
import { test, expect } from '@playwright/test';
import { bootApp } from './helpers/boot.js';

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} day
 */
const dayText = async (page, day) => {
  await page.evaluate(selectedDay => {
    window.itineraryData = window.RECOMMENDED_ITINERARY;
    window.currentWeatherMode = 'sun';
    window.showV37Tab('itinerary');
    window.filterIti(selectedDay);
  }, day);
  await expect(page.locator('#itinerary')).toBeVisible();
  return page.locator('#itiContent').innerText();
};

test('final five-day content freeze renders correctly on mobile', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile-chrome', 'Focused mobile verification only');
  await bootApp(page);

  const day1 = await dayText(page, '11/13');
  expect(day1).toContain('BX572');
  expect(day1).toContain('Urban Groove Hotel');
  expect(day1).toContain('城市律動飯店');
  expect(day1).toContain('凡內谷站 6 號出口');
  expect(day1).toContain('西面街頭小吃／逛街');
  expect(day1).toContain('E-Mart Munhyeon');
  expect(day1).toContain('若延誤或疲累就直接略過');
  expect(day1).not.toMatch(/Matchandeul|맛찬들/);
  expect(day1).not.toMatch(/西面站飯店|西面飯店/);

  const day2 = await dayText(page, '11/14');
  for (const value of ['OPS Haeundae', '🍂 秋色加點', '楓況良好', '20～30 分鐘下坡', '尾浦（Mipo）➔ 青沙浦（Cheongsapo）', 'Suminine', 'Spa Land', 'SCENTICA Gwangan', 'Gwangalli', '韓式外送炸雞']) {
    expect(day2).toContain(value);
  }
  expect(day2.indexOf('OPS Haeundae')).toBeLessThan(day2.indexOf('尾浦（Mipo）'));
  expect(day2.indexOf('Spa Land')).toBeLessThan(day2.indexOf('SCENTICA Gwangan'));
  expect(day2.indexOf('SCENTICA Gwangan')).toBeLessThan(day2.indexOf('Gwangalli'));
  expect(day2).not.toContain('SCENTICA Jeonpo');

  const day3 = await dayText(page, '11/15');
  for (const value of ['水鏡舍', '수경사', '花路韓服', '꽃길한복', '大陵苑', '瞻星臺', '雞林', '月精橋', '皇理團路', 'Hwangnamppang Main Store', 'Park Yongja Gyeongju Myeongdong Jjolmyeon', 'Donggung & Wolji']) {
    expect(day3).toContain(value);
  }
  expect(day3).not.toMatch(/Solsot|솔솥|Byeolchaeban|별채반/);
  expect(day3).toContain('慢郵筒／寄給未來自己的明信片');
  expect(day3).toContain('約 2～2.5 小時');

  const day4 = await dayText(page, '11/16');
  for (const value of ['Crystal Cruise 來回票', 'Huinnyeoul', 'Footbath Cafe View 2', 'Tonshou Nampo', '南浦蔘雞湯', 'B&C Gwangbok', '南浦洞最後購物']) {
    expect(day4).toContain(value);
  }
  expect(day4).not.toMatch(/Haemok|해목|海木/);

  const day5 = await dayText(page, '11/17');
  for (const value of ['Your Type Jeonpo', '유어타입 전포', 'E-Mart Munhyeon', '이마트 문현점', '取行李、完成退房', '計程車直達', '退稅', 'SES 正式註冊', 'KE2085']) {
    expect(day5).toContain(value);
  }
  expect(day5).not.toMatch(/Zimcarry|짐캐리|Pohang Dwaeji Gukbap|포항돼지국밥/);

  await page.evaluate(() => window.filterIti('11/14'));
  const verifiedNaverRow = page.locator('#itiContent .iti-row').filter({ hasText: 'OPS Haeundae' });
  await verifiedNaverRow.locator('.iti-transport-detail summary').click();
  const verifiedNaverActions = verifiedNaverRow.locator('.iti-map-actions a');
  await expect(verifiedNaverActions).toHaveCount(1);
  await expect(verifiedNaverActions).toContainText('NAVER');
  await expect(verifiedNaverActions).toHaveAttribute('href', 'https://naver.me/5EQ3khJY');
  await expect(verifiedNaverRow.locator('.iti-map-actions')).not.toContainText(/Google|Kakao/);

  await page.evaluate(() => window.filterIti('11/13'));
  const unverifiedNaverRow = page.locator('#itiContent .iti-row').filter({ hasText: '抵達金海國際機場' });
  await unverifiedNaverRow.locator('.iti-transport-detail summary').click();
  await expect(unverifiedNaverRow.locator('.iti-map-actions a')).toHaveCount(0);
  await expect(unverifiedNaverRow.locator('.iti-map-actions')).not.toContainText(/Google|Kakao/);

  await page.evaluate(() => {
    window.showV37Tab('wallet');
    window.switchWalletTab('hotel');
  });
  await expect(page.locator('#walletNearbyList')).toContainText('🍇 晚間水果／超市');
  await expect(page.locator('#walletNearbyList')).toContainText('E-Mart Munhyeon');
  await expect(page.locator('#walletNearbyList')).toContainText('🏪 便利商店');
  await expect(page.locator('#walletNearbyList')).toContainText('Urban Groove／凡內谷站 6 號出口');

  await page.evaluate(() => window.showV37Tab('home'));
  await expect(page.locator('.v45-nine-card')).toHaveCount(11);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
