// ─────────────────────────────────────────────────────────────────────────
// Compatibility Adapter: Recommended Guides & Radars Static Databases
// Derived directly from Canonical Source: window.TRAVEL_CONTENT_V45
// ─────────────────────────────────────────────────────────────────────────

(function() {
  const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  function getCanonical() {
    return target.TRAVEL_CONTENT_V45 || {};
  }

  const c = getCanonical();

  // ── RECOMMENDED_FOOD derived from canonical food ─────────────────────────
  if (c.food && Array.isArray(c.food)) {
    target.RECOMMENDED_FOOD = c.food.map((f, idx) => ({
      id: f.id || ('rf' + (idx + 1)),
      category: f.category,
      name: f.name,
      desc: f.desc + (f.sop ? ' (SOP: ' + f.sop + ')' : ''),
      map: f.map || ''
    }));
  } else {
    target.RECOMMENDED_FOOD = [
      { id: 'rf1', category: 'Day 2 午餐', name: 'Suminine（수민이네）', desc: '青沙浦烤貝與海鮮拉麵。', map: 'https://map.naver.com/p/search/%EC%88%98%EB%AF%BC%EC%9D%B4%EB%84%A4' },
      { id: 'rf2', category: 'Day 3 午餐', name: '水鏡舍（수경사）', desc: '慶州固定午餐。', map: 'https://map.naver.com/p/search/%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC' },
      { id: 'rf3', category: 'Day 3 晚餐', name: 'Park Yongja Gyeongju Myeongdong Jjolmyeon', desc: '東宮與月池前的固定晚餐。', map: 'https://map.naver.com/p/search/%EB%B0%95%EC%9A%A9%EC%9E%90%20%EA%B2%BD%EC%A3%BC%EB%AA%85%EB%8F%99%EC%AB%84%EB%A9%B4' },
      { id: 'rf4', category: 'Day 4 晚餐 MAIN', name: 'Tonshou Nampo', desc: '南浦固定主方案。', map: 'https://map.naver.com/p/search/%ED%86%A4%EC%87%BC%EC%9A%B0%20%EB%82%A8%ED%8F%AC' },
      { id: 'rf5', category: 'Day 4 晚餐 PLAN B', name: '南浦蔘雞湯', desc: 'Tonshou 候位或營業狀況不適合時採用。', map: 'https://map.naver.com/p/search/%EB%82%A8%ED%8F%AC%EB%8F%99%20%EC%82%BC%EA%B3%84%ED%83%95' },
      { id: 'rf6', category: 'Day 5 早餐', name: 'Your Type Jeonpo', desc: '離釜前早餐。', map: 'https://map.naver.com/p/search/Your%20Type%20Jeonpo' }
    ];
  }

  // ── RECOMMENDED_SHOPPING derived from canonical 27 shopping catalog ─────
  if (c.shopping && c.shopping.beautyMakeup && c.shopping.medicineSkincare && c.shopping.souvenirClothingCulture) {
    const allShop = [
      ...c.shopping.beautyMakeup.map(s => ({ ...s, category: '美妝彩妝' })),
      ...c.shopping.medicineSkincare.map(s => ({ ...s, category: '醫藥保養' })),
      ...c.shopping.souvenirClothingCulture.map(s => ({ ...s, category: '伴手文創' }))
    ];
    target.RECOMMENDED_SHOPPING = allShop.map((s, idx) => ({
      id: s.id || ('rs' + (idx + 1)),
      category: s.category + (s.spot ? ' (' + s.spot + ')' : ''),
      name: s.name + (s.kr ? ' (' + s.kr + ')' : ''),
      desc: s.desc,
      image: s.image || null
    }));
  } else {
    target.RECOMMENDED_SHOPPING = [
      { id: 'rs1', category: '美妝彩妝 (Olive Young)', name: 'CLIO Kill Cover 氣墊粉餅 (클리오 킬커버 쿠션)', desc: '遮瑕持久度高，秋冬服貼不卡粉' },
      { id: 'rs2', category: '美妝彩妝 (Olive Young)', name: 'fwee 唇頰兩用布丁膏 (퓌 푸딩팟)', desc: '軟糯泥狀質地，霧面暈染超自然' },
      { id: 'rs3', category: '美妝彩妝 (Olive Young)', name: 'rom&nd 果汁/琉璃光澤唇釉 (롬앤 쥬시 래스팅 틴트)', desc: '水光成膜快，修飾唇紋顯氣色' },
      { id: 'rs4', category: '醫藥保養 (藥局)', name: '東國製藥 Madecassol 積雪草軟膏 (마데카솔 연고)', desc: '草本積雪草萬用修護軟膏' },
      { id: 'rs5', category: '醫藥保養 (Olive Young)', name: 'Olive Young Care Plus 隱形痘痘貼 (케어플러스 패치)', desc: '薄透服貼吸附力強，回購率第一' },
      { id: 'rs6', category: '醫藥保養 (Olive Young)', name: 'Torriden 5D 玻尿酸保濕精華 (토리든 수분세럼)', desc: '極速補水清爽不黏，妝前打底必備' },
      { id: 'rs7', category: '伴手文創 (樂天超市)', name: '三珍魚餅（Samjin Amook）真空禮盒 (삼진어묵 선물세트)', desc: '釜山代表名產，多種口味即食或煮湯' },
      { id: 'rs8', category: '伴手文創 (樂天超市)', name: 'HBAF 調味杏仁果系列 (HBAF 아몬드)', desc: '蜂蜜奶油、烤玉米、大蒜麵包口味' },
      { id: 'rs9', category: '伴手文創 (文創小店)', name: '影島白淺灘貝殼手工香氛皂 (영도 조개 수제비누)', desc: '海洋香調純手工精緻貝殼皂' }
    ];
  }

  // ── SMART_NEARBY_DATABASE (supplemental operational map metadata) ────────
  target.SMART_NEARBY_DATABASE = {
    Busan: [
      { type: '🚇 地鐵', name: '凡內谷地鐵站 (6號出口)', dist: 100, rate: 4.5, status: '營業中', naver: 'https://map.naver.com/p/entry/place/13479629', kakao: 'https://map.kakao.com/?id=21160751', google: 'https://maps.app.goo.gl/beameom' },
      { type: '🛒 CU', name: 'CU 凡內谷站店', dist: 50, rate: 4.2, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_beom' },
      { type: '🏪 GS25', name: 'GS25 凡內谷中央店', dist: 80, rate: 4.1, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_beom' },
      { type: '💄 Olive Young', name: 'Olive Young 西面中央店', dist: 780, rate: 4.6, status: '10:00 - 22:30', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_seom' },
      { type: '🏬 Daiso', name: '大創 Daiso 西面店', dist: 850, rate: 4.4, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_seom' },
      { type: '☕ 咖啡', name: 'Compose Coffee 凡內谷店', dist: 150, rate: 4.3, status: '08:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/compose_beom' },
      { type: '💊 藥局', name: '凡內谷中央藥局', dist: 140, rate: 4.0, status: '09:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_beom' },
      { type: '🏪 ATM', name: '釜山銀行 ATM (地鐵站內)', dist: 110, rate: 4.0, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_beom' },
      { type: '🏥 醫院', name: '釜山大學醫院 (急診中心)', dist: 3500, rate: 4.3, status: '24小時急診', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_univ' },
      { type: '🛒 超市', name: 'E-Mart Munhyeon / 이마트 문현점', naver: 'https://map.naver.com/v5/search/%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EB%AC%B8%ED%98%84%EC%A0%90', kakao: 'https://map.kakao.com/?q=%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EB%AC%B8%ED%98%84%EC%A0%90', google: 'https://www.google.com/maps/search/?api=1&query=%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EB%AC%B8%ED%98%84%EC%A0%90' },
      { type: '☕ 早餐', name: 'Your Type Jeonpo / 유어타입 전포', naver: 'https://map.naver.com/v5/search/%EC%9C%A0%EC%96%B4%ED%83%80%EC%9E%85%20%EC%A0%84%ED%8F%AC', kakao: 'https://map.kakao.com/?q=%EC%9C%A0%EC%96%B4%ED%83%80%EC%9E%85%20%EC%A0%84%ED%8F%AC', google: 'https://www.google.com/maps/search/?api=1&query=%EC%9C%A0%EC%96%B4%ED%83%80%EC%9E%85%20%EC%A0%84%ED%8F%AC' }
    ],
    Gyeongju: [
      { type: '🚇 地鐵', name: '慶州火車站 (Bus Stop)', dist: 300, rate: 4.2, status: '營業中', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/gj_station' },
      { type: '🛒 CU', name: 'CU 慶州皇南店', dist: 150, rate: 4.3, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_gj' },
      { type: '🏪 GS25', name: 'GS25 慶州大陵店', dist: 200, rate: 4.2, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_gj' },
      { type: '💄 Olive Young', name: 'Olive Young 慶州皇吾店', dist: 850, rate: 4.5, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_gj' },
      { type: '🏬 Daiso', name: '大創 Daiso 慶州店', dist: 980, rate: 4.3, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_gj' },
      { type: '🍜 美食', name: '慶州十元麵包 (皇理團路)', dist: 200, rate: 4.6, status: '10:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13491414', kakao: 'https://map.kakao.com/?id=7940176', google: 'https://maps.app.goo.gl/10won_gj' },
      { type: '☕ 咖啡', name: '星巴克 慶州大陵苑店', dist: 350, rate: 4.5, status: '08:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/star_gj' },
      { type: '💊 藥局', name: '慶州中央藥局', dist: 650, rate: 4.1, status: '09:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_gj' },
      { type: '🏪 ATM', name: '新韓銀行 ATM (大陵苑旁)', dist: 220, rate: 4.0, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_gj' },
      { type: '🏥 醫院', name: '慶州東國大學醫院 (急診中心)', dist: 2800, rate: 4.4, status: '24小時急診', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_gj' },
      { type: '🍚 午餐', name: '水鏡舍 / 수경사', naver: 'https://map.naver.com/v5/search/%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC', kakao: 'https://map.kakao.com/?q=%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC', google: 'https://www.google.com/maps/search/?api=1&query=%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC' }
    ]
  };

  // ── RECOMMENDED_ITINERARY derived from canonical itinerary ───────────────
  const cIti = c.itinerary || {};
  const derivedIti = [];

  ['11/13', '11/14', '11/15', '11/16', '11/17'].forEach((dayKey, dIdx) => {
    const dayItems = cIti[dayKey] || [];
    dayItems.forEach((item, itemIdx) => {
      derivedIti.push({
        key: 'rec_d' + (dIdx + 1) + '_' + (itemIdx + 1),
        day: dayKey,
        time: item.time,
        desc: item.title + (item.desc ? ' - ' + item.desc : ''),
        tr: item.tr || '🚶 步行',
        map: item.map || '',
        route: item.route || '',
        destinationKr: item.destinationKr || ''
      });
    });
  });

  target.RECOMMENDED_ITINERARY = derivedIti;
})();
