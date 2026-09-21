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
  expect(day1).toContain('Matchandeul Wang Sogeum Gui Seomyeon');
  expect(day1).not.toMatch(/西面站飯店|西面飯店/);

  const day2 = await dayText(page, '11/14');
  for (const value of ['OPS Haeundae', '尾浦（Mipo）➔ 青沙浦（Cheongsapo）', 'Suminine', 'Spa Land', 'SCENTICA Gwangan', 'Gwangalli', '韓式外送炸雞']) {
    expect(day2).toContain(value);
  }
  expect(day2.indexOf('OPS Haeundae')).toBeLessThan(day2.indexOf('尾浦（Mipo）'));
  expect(day2.indexOf('Spa Land')).toBeLessThan(day2.indexOf('SCENTICA Gwangan'));
  expect(day2.indexOf('SCENTICA Gwangan')).toBeLessThan(day2.indexOf('Gwangalli'));

  const day3 = await dayText(page, '11/15');
  for (const value of ['水鏡舍', '수경사', 'Klook 慶州一日韓服', '大陵苑', '瞻星臺', '雞林', '月精橋', '皇理團路', 'Hwangnamppang Main Store', 'Park Yongja Gyeongju Myeongdong Jjolmyeon', 'Donggung & Wolji']) {
    expect(day3).toContain(value);
  }
  expect(day3).not.toMatch(/Solsot|솔솥|Byeolchaeban|별채반/);

  const day4 = await dayText(page, '11/16');
  for (const value of ['Crystal Cruise 來回票', 'Huinnyeoul', 'Footbath Cafe View 2', 'Tonshou Nampo', '南浦蔘雞湯', 'B&C Gwangbok', '南浦洞最後購物']) {
    expect(day4).toContain(value);
  }
  expect(day4).not.toMatch(/Haemok|해목|海木/);

  const day5 = await dayText(page, '11/17');
  for (const value of ['Your Type Jeonpo', 'E-Mart', '取行李、完成退房', '計程車直達', '退稅', 'SES 正式註冊', 'KE2085']) {
    expect(day5).toContain(value);
  }
  expect(day5).not.toMatch(/Zimcarry|짐캐리|Pohang Dwaeji Gukbap|포항돼지국밥/);
});
