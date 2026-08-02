// ─────────────────────────────────────────────────────────────────────────
// V42 Production: Recommended Guides & Radars Static Databases
// ─────────────────────────────────────────────────────────────────────────

window.RECOMMENDED_SHOPPING = [
  { id: 'rs1', category: 'CU 必買', name: '延世大生乳包', desc: '超商甜點天花板，爆漿口感不甜膩' },
  { id: 'rs2', category: 'CU 必買', name: '冰塊杯 + 香蕉牛奶', desc: '韓國人夏日清涼神仙飲品組合' },
  { id: 'rs3', category: 'Olive Young', name: 'UNOVE 深層護髮膜', desc: '受損髮救星，柔順有感，Olive Young 排行榜常客' },
  { id: 'rs4', category: 'Olive Young', name: 'Torriden 玻尿酸保濕精華', desc: '極速補水，質地清爽，妝前保濕必備' },
  { id: 'rs5', category: 'DAISO', name: 'Daiso 造型貼紙與文具', desc: '便宜精緻，多款卡通與生活設計小物' },
  { id: 'rs6', category: 'LOTTE Mart', name: 'HBAF 杏仁果系列', desc: '蜂蜜奶油、芥慢、烤玉米等多種人氣口味' },
  { id: 'rs7', category: 'Homeplus', name: '零食與拉麵福袋', desc: '大份量量販包裝，多種韓國經典泡麵一次帶走' },
  { id: 'rs8', category: '藥妝', name: '蜈蚣丸消炎藥', desc: '當地藥局必備，針對喉嚨痛與發炎極速見效' },
  { id: 'rs9', category: '伴手禮', name: '慶州皇南餅', desc: '紅豆沙餡綿密，慶州傳統經典點心' }
];

window.RECOMMENDED_FOOD = [
  { id: 'rf1', category: '豬肉湯飯', name: '凡內谷豬肉湯飯', desc: '經典釜山濃郁大骨湯底，肉質軟嫩' },
  { id: 'rf2', category: '烤肉', name: '味讚王鹽烤肉', desc: '厚切三層肉，專人桌邊代烤，外酥內嫩' },
  { id: 'rf3', category: 'Seafood', name: '海木鰻魚飯', desc: '海雲台奢華米其林推薦日式鰻魚飯' },
  { id: 'rf4', category: '咖啡', name: '⚠️ [UNSAFE] Thrill On The Mug (已永久停業 2026-06-06)', desc: '⚠️ 已於 2026 年 6 月 6 日永久停業，請勿前往。替代推薦：Lisboa 咖啡館 (흰여울문화마을)' },
  { id: 'rf5', category: '甜點', name: '西面黑糖餅', desc: '西面街頭傳統小吃，堅果豐富香甜' },
  { id: 'rf6', category: '夜景', name: '廣安里 M 無人機秀', desc: '週六晚間廣安大橋夜空璀璨燈光秀' }
];

window.SMART_NEARBY_DATABASE = {
  Busan: [
    { type: '🚇 地鐵', name: '凡內谷地鐵站 (6號出口)', dist: 100, rate: 4.5, status: '營業中', naver: 'https://map.naver.com/p/entry/place/13479629', kakao: 'https://map.kakao.com/?id=21160751', google: 'https://maps.app.goo.gl/beameom' },
    { type: '🛒 CU', name: 'CU 凡內谷站店', dist: 50, rate: 4.2, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_beom' },
    { type: '🏪 GS25', name: 'GS25 凡內谷中央店', dist: 80, rate: 4.1, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_beom' },
    { type: '💄 Olive Young', name: 'Olive Young 西面中央店', dist: 780, rate: 4.6, status: '10:00 - 22:30', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_seom' },
    { type: '🏬 Daiso', name: '大創 Daiso 西面店', dist: 850, rate: 4.4, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_seom' },
    { type: '🍜 美食', name: '凡內谷祖傳豬肉湯飯', dist: 120, rate: 4.7, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/13491414', kakao: 'https://map.kakao.com/?id=7940176', google: 'https://maps.app.goo.gl/pork_beom' },
    { type: '🍜 美食', name: '味讚王鹽烤肉 西面店', dist: 950, rate: 4.8, status: '11:30 - 23:00', naver: 'https://map.naver.com/p/entry/place/11571731', kakao: 'https://map.kakao.com/?id=7937320', google: 'https://maps.app.goo.gl/chan_seom' },
    { type: '☕ 咖啡', name: 'Compose Coffee 凡內谷店', dist: 150, rate: 4.3, status: '08:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/compose_beom' },
    { type: '💊 藥局', name: '凡內谷中央藥局', dist: 140, rate: 4.0, status: '09:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_beom' },
    { type: '🏪 ATM', name: '釜山銀行 ATM (地鐵站內)', dist: 110, rate: 4.0, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_beom' },
    { type: '🏥 醫院', name: '釜山大學醫院 (急診中心)', dist: 3500, rate: 4.3, status: '24小時急診', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_univ' }
  ],
  Gyeongju: [
    { type: '🚇 地鐵', name: '慶州火車站 (Bus Stop)', dist: 300, rate: 4.2, status: '營業中', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/gj_station' },
    { type: '🛒 CU', name: 'CU 慶州皇南店', dist: 150, rate: 4.3, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_gj' },
    { type: '🏪 GS25', name: 'GS25 慶州大陵店', dist: 200, rate: 4.2, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_gj' },
    { type: '💄 Olive Young', name: 'Olive Young 慶州皇吾店', dist: 850, rate: 4.5, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_gj' },
    { type: '🏬 Daiso', name: '大創 Daiso 慶州店', dist: 980, rate: 4.3, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_gj' },
    { type: '🍜 美食', name: '皇南小麥麵', dist: 250, rate: 4.6, status: '11:00 - 20:00', naver: 'https://map.naver.com/p/entry/place/13491414', kakao: 'https://map.kakao.com/?id=7940176', google: 'https://maps.app.goo.gl/wheat_gj' },
    { type: '🍜 美食', name: 'Solsot 釜飯 慶州店', dist: 180, rate: 4.7, status: '11:30 - 21:00', naver: 'https://map.naver.com/p/entry/place/11571731', kakao: 'https://map.kakao.com/?id=7937320', google: 'https://maps.app.goo.gl/rice_gj' },
    { type: '☕ 咖啡', name: '星巴克 慶州大陵苑店', dist: 350, rate: 4.5, status: '08:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/star_gj' },
    { type: '💊 藥局', name: '慶州中央藥局', dist: 650, rate: 4.1, status: '09:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_gj' },
    { type: '🏪 ATM', name: '新韓銀行 ATM (大陵苑旁)', dist: 220, rate: 4.0, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_gj' },
    { type: '🏥 醫院', name: '慶州東國大學醫院 (急診中心)', dist: 2800, rate: 4.4, status: '24小時急診', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_gj' }
  ]
};

window.RECOMMENDED_ITINERARY = [
  // Day 1 (11/13) - 西面
  { key: "rec_d1_1", day: "11/13", time: "08:25", desc: "✈️ 【出發】星宇航空 JX900 啟航赴釜山", tr: "✈️ 飛機", map: "" },
  { key: "rec_d1_2", day: "11/13", time: "11:45", desc: "🛬 抵達釜山金海國際機場", tr: "🚇 輕軌+地鐵", map: "https://map.naver.com/p/entry/place/11585098" },
  { key: "rec_d1_3", day: "11/13", time: "13:00", desc: "🏨 城市律動飯店 (Urban Groove Hotel) 寄放行李", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/13479629" },
  { key: "rec_d1_4", day: "11/13", time: "13:30", desc: "🍜 【午餐】西面老奶奶換錢所 + 凡內谷祖傳豬肉湯飯", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/13491414" },
  { key: "rec_d1_5", day: "11/13", time: "15:00", desc: "🛍️ 【西面商圈】西面地下街 + Olive Young 血拚", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/1057416399" },
  { key: "rec_d1_6", day: "11/13", time: "18:30", desc: "🥩 【晚餐】味讚王鹽烤肉 (西面店) 專人桌邊代烤三層肉", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/11571731" },

  // Day 2 (11/14) - 膠囊/廣安里
  { key: "rec_d2_1", day: "11/14", time: "09:30", desc: "🥞 【早餐】西面黑糖餅 / 輕食咖啡", tr: "🚇 地鐵 2 號線", map: "" },
  { key: "rec_d2_2", day: "11/14", time: "11:00", desc: "🚡 【海雲台藍線公園】尾浦搭乘七彩天空膠囊列車", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/1335043818" },
  { key: "rec_d2_3", day: "11/14", time: "13:00", desc: "🦀 【午餐】海雲台名店海木鰻魚飯 / 鱈魚湯", tr: "🚶 步行", map: "" },
  { key: "rec_d2_4", day: "11/14", time: "15:30", desc: "🏖️ 海雲台沙灘漫步與冬柏島散策", tr: "🚶 步行", map: "" },
  { key: "rec_d2_5", day: "11/14", time: "18:00", desc: "🌉 【廣安里】欣賞廣安大橋浪漫夕陽夜景", tr: "🚕 計程車", map: "https://map.naver.com/p/entry/place/13491414" },
  { key: "rec_d2_6", day: "11/14", time: "20:00", desc: "🎇 廣安里 M 無人機秀 (週六限定璀璨燈光秀)", tr: "🚶 步行", map: "" },

  // Day 3 (11/15) - 慶州韓服
  { key: "rec_d3_1", day: "11/15", time: "08:30", desc: "🚌 搭乘巴士/火車前往千年古都慶州", tr: "🚌 高速巴士", map: "" },
  { key: "rec_d3_2", day: "11/15", time: "10:30", desc: "🎎 【皇理團路】韓屋體驗與精緻韓服換裝", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/1057416399" },
  { key: "rec_d3_3", day: "11/15", time: "12:30", desc: "🍚 【午餐】Solsot 釜飯 (慶州店) 韓屋裡品嚐美味釜飯", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/11571731" },
  { key: "rec_d3_4", day: "11/15", time: "14:30", desc: "🌲 【大陵苑】參觀巨大歷史古墓群與天馬塚", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/13491807" },
  { key: "rec_d3_5", day: "11/15", time: "16:00", desc: "🏛️ 瞻星台天文歷史地標打卡", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/11571617" },
  { key: "rec_d3_6", day: "11/15", time: "18:00", desc: "🍁 【東宮與月池】欣賞月池絕美夜景與夜楓倒影", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/13491823" },

  // Day 4 (11/16) - 海濱漫步
  { key: "rec_d4_1", day: "11/16", time: "09:30", desc: "🚶 前往影島松島天空步道", tr: "🚇 地鐵+公車", map: "https://map.naver.com/p/entry/place/36735520" },
  { key: "rec_d4_2", day: "11/16", time: "11:00", desc: "🌊 松島海上纜車 (水晶車廂俯瞰無敵海景)", tr: "🚡 纜車", map: "" },
  { key: "rec_d4_3", day: "11/16", time: "12:30", desc: "🍜 【午餐】札嘎其海鮮市場品嚐海鮮百匯 / 西面美食", tr: "🚇 地鐵", map: "" },
  { key: "rec_d4_4", day: "11/16", time: "14:00", desc: "🎨 【白淺灘文化村】懸崖彩繪藝術村散策", tr: "🚌 公車", map: "" },
  { key: "rec_d4_5", day: "11/16", time: "15:00", desc: "⚠️ [UNSAFE] 🦶 【足浴體驗】족욕카페뷰 2호점 (흰여울길 207, 10:00-19:30, 約 ₩16,000/30分, 步行走馬路內巷，⚠️ 절영해안산책路施工封閉至2026年12月)", tr: "🚌 公車 7/71/508 號", map: "https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B02%ED%98%B8%EC%A0%90" },
  { key: "rec_d4_6", day: "11/16", time: "16:30", desc: "☕ 【影島咖啡】Lisboa 咖啡館 (흰여울문화마을, 最寬闊海景露台, 已驗證 2026 正常營業) ✅ SAFE", tr: "🚶 步行", map: "https://map.naver.com/p/search/LISBOA+%EC%98%81%EB%8F%84" },

  // Day 5 (11/17) - 賦歸
  { key: "rec_d5_1", day: "11/17", time: "09:30", desc: "🛍️ 樂天百貨/樂天超市最後採購伴手禮", tr: "🚶 步行", map: "" },
  { key: "rec_d5_2", day: "11/17", time: "11:30", desc: "🍜 【午餐】回味首日凡內谷豬肉湯飯", tr: "🚶 步行", map: "https://map.naver.com/p/entry/place/13491807" },
  { key: "rec_d5_3", day: "11/17", time: "12:30", desc: "🚕 前往金海國際機場並辦理退稅手續", tr: "🚇 地鐵+輕軌", map: "https://map.naver.com/p/entry/place/11585098" },
  { key: "rec_d5_4", day: "11/17", time: "14:50", desc: "✈️ 【回程】搭乘大韓航空 KE2085 班機返台", tr: "✈️ 飛機", map: "" }
];
