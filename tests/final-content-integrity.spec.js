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
  vm.runInContext(fs.readFileSync(path.join(root, 'data/map-registry.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/travel-content.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/recommended.js'), 'utf8'), context);
  return context;
}

function text(items) {
  return items.map(item => `${item.time} ${item.title} ${item.desc} ${item.tr} ${item.route || ''} ${item.destinationKr || ''}`).join('\n');
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

    expect([day1, day2, day3, day4, day5].every(day => day.length >= 5)).toBe(true);
    expect(day1Text).toContain('13:25 BX572 桃園 (TPE) ➔ 金海 (PUS)');
    expect(day1Text).toContain('17:00 抵達金海國際機場 (PUS)');
    expect(day1.filter(item => `${item.title} ${item.desc}`.includes('BX572'))).toHaveLength(1);
    expect(day1Text).toContain('Urban Groove Hotel（城市律動飯店）');
    expect(day1Text).toContain('凡內谷站 6 號出口');
    expect(day1Text).not.toContain('西面飯店');
    expect(day1Text).not.toContain('西面站飯店');
    expect(day1Text).toContain('西面街頭小吃／逛街');
    expect(day1Text).toContain('E-Mart Munhyeon（이마트 문현점）');
    expect(day1Text).toContain('若延誤或疲累就直接略過');
    expect(day1Text).not.toMatch(/Matchandeul|맛찬들/);

    expect(day2Text.indexOf('OPS Haeundae')).toBeLessThan(day2Text.indexOf('尾浦（Mipo）'));
    expect(day2Text).toContain('31 Jungdong 1-ro');
    expect(day2Text).toContain('🍂 秋色加點');
    expect(day2Text).toContain('楓況良好且 Sky Capsule 報到前有充足緩衝才啟用');
    expect(day2Text).toContain('計程車上坡');
    expect(day2Text).toContain('20～30 分鐘下坡');
    expect(day2Text).toContain('尾浦（Mipo）➔ 青沙浦（Cheongsapo）');
    expect(day2Text).toContain('尚未預訂');
    expect(day2Text).toContain('Suminine');
    expect(day2Text).toContain('수민이네');
    expect(day2Text).toContain('Kakao T／計程車前往 Centum City');
    expect(day2Text).not.toMatch(/青沙浦[^\n]*(地鐵 2 號線|Metro Line 2)/);
    expect(day2Text.indexOf('Spa Land')).toBeLessThan(day2Text.indexOf('SCENTICA Gwangan'));
    expect(day2Text.indexOf('SCENTICA Gwangan')).toBeLessThan(day2Text.indexOf('Gwangalli'));
    expect(day2Text).toContain('부산 수영구 광안로 25');
    expect(day2Text).not.toContain('SCENTICA Jeonpo');
    expect(day2Text).toContain('M Drone Light Show（場次待官方確認）');
    expect(day2Text).toContain('2026 年 11 月確切演出場次於出發前依官方公告再次確認');
    expect(day2Text).not.toContain('Busan Fireworks Festival');
    expect(day2Text).toContain('韓式外送炸雞 ✕ 炸醬麵飯店宵夜');
    expect(day2Text).toContain('並非已預訂');
    expect(day2Text).not.toContain('Gwangalli Eonyang Bulgogi Busanjip');

    expect(day3Text).toContain('水鏡舍（수경사）');
    expect(day3Text).not.toMatch(/Solsot|솔솥|Byeolchaeban|별채반|Bulguksa|Beomeosa/);
    expect(day3Text).toContain('花路韓服');
    expect(day3Text).toContain('꽃길한복');
    expect(day3Text).toContain('最晚 18:50 前');
    expect(day3Text).toContain('韓服');
    expect(day3Text).toContain('大陵苑');
    expect(day3Text).toContain('瞻星臺');
    expect(day3Text).toContain('雞林');
    expect(day3Text).toContain('月精橋');
    expect(day3Text).toContain('約 2～2.5 小時');
    expect(day3Text).toContain('慢郵筒／寄給未來自己的明信片');
    expect(day3Text).toContain('Hwangnamppang Main Store');
    expect(day3Text).toContain('Park Yongja Gyeongju Myeongdong Jjolmyeon');
    expect(day3Text).toContain('東宮與月池（Donggung & Wolji）');
    expect(day3Text).toContain('不硬填未預訂車次');

    expect(day4Text).toContain('Crystal Cruise 來回票');
    expect(day4Text).toContain('round trip（來回）');
    expect(day4Text).toContain('Huinnyeoul／白淺灘文化村');
    expect(day4Text).toContain('Huinnyeoul Jeomppang');
    expect(day4Text).toContain('Footbath Cafe View 2');
    expect(day4Text).toContain('MAIN：Tonshou Nampo');
    expect(day4Text).toContain('PLAN B 改吃南浦蔘雞湯');
    expect(day4Text).toContain('B&C Gwangbok');
    expect(day4Text).toContain('南浦洞最後購物');
    expect(day4Text).toContain('地鐵 1 號線返回凡內谷');
    expect(day4Text).not.toMatch(/Haemok|해목|海木/);

    expect(day5Text).toContain('Your Type Jeonpo');
    expect(day5Text).toContain('E-Mart Munhyeon（이마트 문현점）');
    expect(day5Text).toContain('取行李、完成退房');
    expect(day5Text).toContain('最晚退房時間為 12:00');
    expect(day5Text).toContain('約 11:05 Urban Groove Hotel ➔ 金海機場 (PUS)');
    expect(day5Text).toContain('計程車直達');
    expect(day5Text).toContain('約 11:30～11:45 抵達 PUS');
    expect(day5Text).toContain('退稅、韓國 SES 正式註冊');
    expect(day5Text).not.toMatch(/Zimcarry|짐캐리|Pohang Dwaeji Gukbap|포항돼지국밥|行李暫寄飯店/);
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
      'Suminine',
      '韓式外送炸雞 ✕ 炸醬麵飯店宵夜',
      'Gwangalli Eonyang Bulgogi Busanjip',
      '水鏡舍',
      'Park Yongja Gyeongju Myeongdong Jjolmyeon',
      'Huinnyeoul Jeomppang',
      'Footbath Cafe View 2',
      'Tonshou Nampo',
      '南浦蔘雞湯',
      'Your Type Jeonpo'
    ];
    for (const name of required) expect(foodText).toContain(name);
    expect(foodText).toContain('備選晚餐');
    expect(foodText).toContain('規劃體驗，並非已預訂');
    expect(foodText).not.toMatch(/Matchandeul|맛찬들/);
    expect(foodText).not.toContain('Solsot');
    expect(foodText).not.toContain('Byeolchaeban');
    expect(foodText).not.toContain('Haemok');
    expect(foodText).not.toContain('Pohang Dwaeji Gukbap');
    expect(foodText).not.toContain('東萊蔘雞湯');

    const { AUTHORITATIVE_MAPS_V45: registry } = loadContent();
    const criticalItems = [...Object.values(content.itinerary).flat(), ...content.food];
    for (const item of criticalItems) {
      expect(item.mapKey, item.title || item.name).toBeTruthy();
      expect(registry[item.mapKey], item.mapKey).toBeTruthy();
    }
    const canonicalUrls = criticalItems.flatMap(item => {
      const entry = registry[item.mapKey] || {};
      return [entry.naver, entry.kakao, entry.google].filter(Boolean);
    });
    for (const url of canonicalUrls) {
      expect(url).not.toMatch(/map\.naver\.com\/(?:p|v5)\/search\//);
      expect(url).not.toContain('map.kakao.com/?q=');
      expect(url).not.toContain('maps.app.goo.gl');
    }
    for (const platform of ['naver', 'kakao']) {
      const urls = Object.values(registry).map(entry => entry[platform]).filter(Boolean);
      expect(new Set(urls).size).toBe(urls.length);
    }
    expect(registry.age_yeongdo.naver).toBeUndefined();
    expect(JSON.stringify(registry.age_yeongdo)).not.toMatch(/THRILL|Thrill|xqylsCAu/);
  });

  test('transport, nearby-life and WOWPASS truth states match the final addendum', () => {
    const { TRAVEL_CONTENT_V45: content, SMART_NEARBY_DATABASE: nearby } = loadContent();
    const canonical = Object.values(content.itinerary).flat();
    const routed = canonical.filter(item => item.route);
    expect(routed.length).toBeGreaterThanOrEqual(20);
    expect(routed.every(item => item.route.includes('➔'))).toBe(true);
    expect(canonical.map(item => `${item.title} ${item.desc} ${item.route || ''}`).join('\n')).toContain('Urban Groove Hotel／凡內谷站 6 號出口');
    expect(content.transport.zimcarry).toBeUndefined();
    expect(content.wowpass.steps[0].desc).toContain('10 月再次確認');
    expect(content.wowpass.steps[0].desc).not.toContain('西面站機台');

    const activeNearby = Object.values(nearby).flat().map(item => `${item.type} ${item.name}`).join('\n');
    expect(activeNearby).not.toMatch(/Matchandeul|맛찬들|Haemok|해목|海木|Solsot|솔솥|Byeolchaeban|별채반/);
  });
});
