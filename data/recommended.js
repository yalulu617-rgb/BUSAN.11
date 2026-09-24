// ─────────────────────────────────────────────────────────────────────────
// Compatibility Adapter: Recommended Guides & Radars Static Databases
// Derived directly from Canonical Source: window.TRAVEL_CONTENT_V45
// ─────────────────────────────────────────────────────────────────────────

(function() {
  const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  function getCanonical() {
    return target.TRAVEL_CONTENT_V45 || {};
  }

  function mapFor(key) {
    return (target.AUTHORITATIVE_MAPS_V45 || {})[key] || {};
  }

  const c = getCanonical();

  // ── RECOMMENDED_FOOD derived from canonical food ─────────────────────────
  if (c.food && Array.isArray(c.food)) {
    target.RECOMMENDED_FOOD = c.food.map((f, idx) => ({
      id: f.id || ('rf' + (idx + 1)),
      category: f.category,
      name: f.name,
      desc: f.desc + (f.sop ? ' (SOP: ' + f.sop + ')' : ''),
      mapKey: f.mapKey || '',
      map: mapFor(f.mapKey).naver || mapFor(f.mapKey).google || mapFor(f.mapKey).kakao || ''
    }));
  } else {
    target.RECOMMENDED_FOOD = [
      { id: 'rf1', category: 'Day 2 午餐', name: 'Suminine（수민이네）', desc: '青沙浦烤貝與海鮮拉麵。', mapKey: 'suminine', map: mapFor('suminine').naver },
      { id: 'rf2', category: 'Day 3 午餐', name: '水鏡舍（수경사）', desc: '慶州固定午餐。', mapKey: 'sugeongsa', map: mapFor('sugeongsa').naver },
      { id: 'rf3', category: 'Day 3 晚餐', name: 'Park Yongja Gyeongju Myeongdong Jjolmyeon', desc: '東宮與月池前的固定晚餐。', mapKey: 'park_yongja', map: mapFor('park_yongja').naver || mapFor('park_yongja').google },
      { id: 'rf4', category: 'Day 4 晚餐 MAIN', name: 'Tonshou Nampo', desc: '南浦固定主方案。', mapKey: 'tonshou_nampo', map: mapFor('tonshou_nampo').google },
      { id: 'rf5', category: 'Day 4 晚餐 PLAN B', name: '南浦蔘雞湯', desc: 'Tonshou 候位或營業狀況不適合時採用。', mapKey: 'nampo_samgyetang', map: mapFor('nampo_samgyetang').naver },
      { id: 'rf6', category: 'Day 5 早餐', name: 'Your Type Jeonpo', desc: '離釜前早餐。', mapKey: 'your_type_jeonpo', map: mapFor('your_type_jeonpo').naver || mapFor('your_type_jeonpo').google }
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

  // Only verified, non-placeholder nearby records remain active.
  target.SMART_NEARBY_DATABASE = {
    Busan: [
      { type: '🛒 超市', name: 'E-Mart Munhyeon / 이마트 문현점', address: '부산 남구 전포대로91번길 47', status: '10:00–23:00', mapKey: 'emart_munhyeon', ...mapFor('emart_munhyeon') },
      { type: '🏪 便利商店', name: 'GS25 서면유성점', address: '부산 부산진구 황령대로 9', status: '24h', mapKey: 'gs25_seomyeon_yuseong', ...mapFor('gs25_seomyeon_yuseong') },
      { type: '🏪 便利商店', name: '세븐일레븐 부산서면다인점', address: '부산 부산진구 신천대로65번길 91', status: '凡內谷站步行約 3 分鐘', mapKey: 'seveneleven_seomyeon_dain', ...mapFor('seveneleven_seomyeon_dain') }
    ],
    Gyeongju: []
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
        mapKey: item.mapKey || '',
        route: item.route || '',
        destinationKr: item.destinationKr || ''
      });
    });
  });

  target.RECOMMENDED_ITINERARY = derivedIti;
})();
