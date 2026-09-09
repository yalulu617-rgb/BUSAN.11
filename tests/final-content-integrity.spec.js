// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();

function loadContent() {
  const context = vm.createContext({ console });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(root, 'data/travel-content.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/recommended.js'), 'utf8'), context);
  return context;
}

function text(items) {
  return items.map(item => `${item.time} ${item.title} ${item.desc} ${item.tr}`).join('\n');
}

test.describe('Final content integrity', () => {
  test('canonical itinerary has the approved five-day travel plan', () => {
    const { TRAVEL_CONTENT_V45: content, RECOMMENDED_ITINERARY: derived } = loadContent();
    const day1 = content.itinerary['11/13'];
    const day2 = content.itinerary['11/14'];
    const day3 = content.itinerary['11/15'];
    const day4 = content.itinerary['11/16'];
    const day5 = content.itinerary['11/17'];
    const day1Text = text(day1);
    const day2Text = text(day2);
    const day3Text = text(day3);
    const day4Text = text(day4);
    const day5Text = text(day5);

    expect([day1, day2, day3, day4, day5].map(day => day.length)).toEqual([5, 9, 5, 4, 8]);
    expect(day1Text).toContain('13:25 BX572 桃園 (TPE) ➔ 金海 (PUS)');
    expect(day1Text).toContain('17:00 抵達金海國際機場 (PUS)');
    expect(day1.filter(item => `${item.title} ${item.desc}`.includes('BX572'))).toHaveLength(1);
    expect(day1Text).toContain('18:10 預計離開機場');
    expect(day1Text).toContain('19:10 預計抵達西面飯店');
    expect(day1Text).toContain('依抵達時間與體力選擇');

    expect(day2[0].time).toBe('09:15～09:20');
    expect(day2Text).toContain('尚未預訂');
    expect(day2Text).toContain('Suminine');
    expect(day2Text).toContain('수민이네');
    expect(day2Text).toContain('Kakao T／計程車前往 Centum City');
    expect(day2Text).not.toMatch(/青沙浦[^\n]*(地鐵 2 號線|Metro Line 2)/);
    expect(day2Text).toContain('M Drone Light Show（場次待官方確認）');
    expect(day2Text).toContain('2026 年 11 月確切演出場次於出發前依官方公告再次確認');
    expect(day2Text).not.toContain('Busan Fireworks Festival');
    expect(day2Text).toContain('韓式外送炸雞 ✕ 炸醬麵飯店宵夜');
    expect(day2Text).toContain('並非已預訂');
    expect(day2Text).not.toContain('Gwangalli Eonyang Bulgogi Busanjip');

    expect(day3Text).toContain('Byeolchaeban Gyodong Ssambap');
    expect(day3Text).toContain('별채반 교동쌈밥');
    expect(day3Text).not.toContain('午餐：Solsot');
    expect(day3Text).toContain('韓服');
    expect(day3Text).toContain('大陵苑');
    expect(day3Text).toContain('月精橋');
    expect(day3Text).toContain('東宮與月池');
    expect(day3Text).toContain('10/15 起確認並購買');
    expect(day3Text).toContain('尚未預訂');

    expect(day4Text).toContain('Huinnyeoul Jeomppang');
    expect(day4Text).toContain('Footbath Cafe View 2');
    expect(day4Text).toContain('Haemok Haeundae');
    expect(day4.find(item => item.title.includes('Haemok')).time).toBe('約 19:00～19:30');

    expect(day5Text).not.toContain('Zimcarry');
    expect(day5Text).toContain('行李暫寄飯店');
    expect(day5Text).toContain('Pohang Dwaeji Gukbap');
    expect(day5Text).toContain('11:30 啟程前往金海機場 (PUS)');
    expect(day5Text).toContain('約 12:15～13:30 抵達 PUS');
    expect(day5Text).toContain('14:50 KE2085 自金海機場起飛');
    expect(day5Text).toContain('16:30 KE2085 抵達桃園機場 (TPE)');

    const canonical = Object.values(content.itinerary).flat();
    expect(derived).toHaveLength(canonical.length);
    expect(derived.map(item => `${item.day}|${item.time}|${item.desc}`)).toEqual(
      Object.entries(content.itinerary).flatMap(([day, items]) => items.map(item =>
        `${day}|${item.time}|${item.title}${item.desc ? ` - ${item.desc}` : ''}`
      ))
    );
  });

  test('food lineup and critical navigation retain truthful roles', () => {
    const { TRAVEL_CONTENT_V45: content } = loadContent();
    const foodText = content.food.map(item => `${item.name} ${item.category} ${item.desc}`).join('\n');
    const required = [
      'Matchandeul Wang Sogeum Gui Seomyeon',
      'Suminine',
      '韓式外送炸雞 ✕ 炸醬麵飯店宵夜',
      'Gwangalli Eonyang Bulgogi Busanjip',
      'Byeolchaeban Gyodong Ssambap',
      'Huinnyeoul Jeomppang',
      'Footbath Cafe View 2',
      'Haemok Haeundae',
      'Pohang Dwaeji Gukbap'
    ];
    for (const name of required) expect(foodText).toContain(name);
    expect(foodText).toContain('備選晚餐');
    expect(foodText).toContain('規劃體驗，並非已預訂');
    expect(foodText).not.toContain('Solsot');
    expect(foodText).not.toContain('東萊蔘雞湯');

    const criticalItems = [
      ...Object.values(content.itinerary).flat().filter(item => item.map),
      ...content.food
    ];
    for (const item of criticalItems) {
      expect(item.map, item.title || item.name).toMatch(/^https:\/\/map\.naver\.com\/p\/search\//);
      expect(item.map, item.title || item.name).not.toContain('/entry/place/');
    }
  });
});
