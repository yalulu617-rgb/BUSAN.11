// BUSAN.11 V45 authoritative navigation registry.
// Canonical content must resolve navigation here; missing platform URLs stay omitted.
(function() {
  const googlePlace = (name, placeId) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;

  const maps = {
    gimhae_airport: { name: 'Gimhae International Airport', address: '부산 강서구 공항진입로 108', google: googlePlace('Gimhae International Airport', 'ChIJDfcSIsGSaDUR7DKMmkKpoxU') },
    urban_groove: { name: 'Urban Groove Hotel Busan', address: '부산 부산진구 황령대로17번길 18', naver: 'https://naver.me/5SKCdrOx', google: googlePlace('Urban Groove Hotel Busan', 'ChIJS-r8EWfraDURruJ36OPqg-w') },
    beomnaegol_station: { name: 'Beomnaegol Station', address: '부산 부산진구 범천동', google: googlePlace('Beomnaegol Station', 'ChIJQ8hzvXfraDURyOPri1dsIqI') },
    seomyeon_station: { name: 'Seomyeon Station', address: '부산 부산진구 중앙대로 730', google: googlePlace('Seomyeon Station', 'ChIJR_AMB2_raDURtkNgS_8-3FQ') },
    haeundae_station: { name: 'Haeundae Station', address: '부산 해운대구 해운대로 626', google: googlePlace('Haeundae Station', 'ChIJBX2Wp2CNaDURRe1HYiMmIt8') },
    ops_haeundae: { name: 'OPS Haeundae', address: '부산 해운대구 중동1로 31', naver: 'https://naver.me/5EQ3khJY', google: googlePlace('OPS Haeundae', 'ChIJQ8zHkGeNaDURiWBWoDoXAT8') },
    haewoljeong: { name: 'Haewoljeong', address: '부산 해운대구 달맞이길 190', google: googlePlace('Haewoljeong', 'ChIJoTv0XRaNaDUR4m_KFMMMqWE') },
    mipo_station: { name: 'Mipo Station', address: '부산 해운대구 달맞이길62번길 13', naver: 'http://naver.me/xqylsCAu' },
    cheongsapo_station: { name: 'Cheongsapo Station', address: '부산 해운대구 청사포로 116', naver: 'https://naver.me/58hGnQke' },
    suminine: { name: '수민이네', address: '부산 해운대구 청사포로58번길 118', naver: 'https://naver.me/x8tU7qAk', google: googlePlace('수민이네', 'ChIJ0VSIVAONaDURxjH37UnCd7c') },
    spaland_centum: { name: 'Spa Land Centum City', address: '부산 해운대구 센텀남대로 35', google: googlePlace('Spa Land Centum City', 'ChIJDT_5v8aSaDURXW8rEbumGh8') },
    scentica_gwangan: { name: 'SCENTICA Gwangan', address: '부산 수영구 광안로 25', naver: 'https://naver.me/5PlRgSE4', google: googlePlace('SCENTICA Gwangan', 'ChIJwZ74spztaDURAykSVCBlpCc') },
    gwangalli_beach: { name: 'Gwangalli Beach', address: '부산 수영구 광안해변로 219', google: googlePlace('Gwangalli Beach', 'ChIJxw7HJy_taDUR-xaSTeHwbf8') },
    emart_munhyeon: { name: 'E-Mart Munhyeon', address: '부산 남구 전포대로91번길 47', naver: 'https://naver.me/FLybIrq7', google: googlePlace('E-Mart Munhyeon', 'ChIJ8QhOl3jraDURa6xkvJoQppw') },
    your_type_jeonpo: { name: 'Your Type Jeonpo', address: '부산 부산진구 전포동', naver: 'https://naver.me/FErbfUoC', google: googlePlace('Your Type Jeonpo', 'ChIJva1hL5PraDURDb3SjE6ROL0') },
    busan_station: { name: 'Busan Station', address: '부산 동구 중앙대로 206', google: googlePlace('Busan Station', 'ChIJqxrVY9jraDURTqBi-qe-mAI') },
    gyeongju_station: { name: 'Gyeongju Station', address: '경북 경주시 건천읍 신경주역로 80', google: googlePlace('Gyeongju Station', 'ChIJ2dyF_jtGZjUR_Y4Rhbk0Cto') },
    sugeongsa: { name: '수경사', address: '경북 경주시', naver: 'https://naver.me/5ne4lqLJ' },
    kkotgil_hanbok: { name: '꽃길한복', address: '경북 경주시 금성로 235', naver: 'https://map.naver.com/v5/entry/place/1177407003', google: googlePlace('꽃길한복', 'ChIJN7UIuF1OZjURI0fncgk1uww') },
    daereungwon: { name: 'Daereungwon', address: '경북 경주시 황남동 31-1', naver: 'https://naver.me/F8Kn8074', google: googlePlace('Daereungwon', 'ChIJ13ANOUNOZjURBcoz1tMkAMw') },
    cheomseongdae: { name: 'Cheomseongdae', address: '경북 경주시 인왕동 839-1', naver: 'https://naver.me/FJH6OL4G', google: googlePlace('Cheomseongdae', 'ChIJa4qtrmdOZjURguRnUl7UqSg') },
    gyerim: { name: 'Gyerim', address: '경북 경주시 교동 1', naver: 'https://naver.me/GJZAvVf9', google: googlePlace('Gyerim', 'ChIJU5X-K2dOZjURerpfq9Vl4mo') },
    woljeonggyo: { name: 'Woljeonggyo', address: '경북 경주시 교동 274', naver: 'https://naver.me/FG7xnCs8', google: googlePlace('Woljeonggyo', 'ChIJI6-IFWBOZjURG2fe65bJAs0') },
    hwangnidan: { name: 'Hwangnidan-gil', address: '경북 경주시 포석로 1080', naver: 'https://naver.me/xrcMX5cf', google: googlePlace('Hwangnidan-gil', 'ChIJA8nY8ExPZjURPC-8kcf4l4E') },
    hwangnamppang: { name: 'Hwangnamppang Main Store', address: '경북 경주시 태종로 783', naver: 'https://naver.me/FWPdgQmy', google: googlePlace('Hwangnamppang Main Store', 'ChIJt_beGkNOZjURuYxSUlN0I0o') },
    park_yongja: { name: '박용자경주명동쫄면 본점', address: '경북 경주시 계림로93번길 3', naver: 'https://naver.me/x67y3OW9', google: googlePlace('박용자경주명동쫄면 본점', 'ChIJpU1PuUNOZjURVJCYscHUulU') },
    donggung_wolji: { name: 'Donggung and Wolji', address: '경북 경주시 원화로 102', naver: 'https://naver.me/FDDCKXDu', google: googlePlace('Donggung and Wolji', 'ChIJ9SUiOHBOZjUR_YnH8Lbjzt0') },
    songdo_cable: { name: 'Songdo Marine Cable Car', address: '부산 서구 송도해변로 171', naver: 'https://naver.me/5bIs8aIv', google: googlePlace('Songdo Marine Cable Car', 'ChIJQehEaUToaDURU7CTL4IJmZY') },
    huinnyeoul: { name: 'Huinnyeoul Culture Village', address: '부산 영도구 영선동4가 605-3', naver: 'https://naver.me/GOuQCVwx' },
    huinnyeoul_jeomppang: { name: '흰여울점빵', address: '부산 영도구 흰여울길 121', naver: 'https://naver.me/GLhxSVho' },
    footbath_view2: { name: '족욕카페뷰 2호점', address: '부산 영도구 흰여울길 207', google: googlePlace('족욕카페뷰 2호점', 'ChIJ20EuVbfpaDURem3Ko2noO4s') },
    tonshou_nampo: { name: 'Tonshou Nampo', address: '부산 중구', google: googlePlace('Tonshou Nampo', 'ChIJjfij-G3paDUR0612_8eTnSY') },
    bnc_gwangbok: { name: 'B&C Gwangbok', address: '부산 중구 광복로', google: googlePlace('B&C Gwangbok', 'ChIJp1mDlQrpaDURb9D5F6TUsVo') },
    nampo_shopping: { name: 'Nampo-dong', address: '부산 중구 남포동' },
    busan_x_sky: { name: 'BUSAN X the SKY', address: '부산 해운대구 달맞이길 30', naver: 'https://naver.me/5IS92bMA', google: googlePlace('BUSAN X the SKY', 'ChIJnbg-nA2NaDUR3DK_vogcxaI') },
    arte_museum_busan: { name: 'ARTE MUSEUM BUSAN', address: '부산 영도구 해양로247번길 29', google: googlePlace('ARTE MUSEUM BUSAN', 'ChIJvX_SQwDvaDURS28S4RX5ZVM') },
    gyeongju_museum: { name: 'Gyeongju National Museum', address: '경북 경주시 일정로 186', google: googlePlace('Gyeongju National Museum', 'ChIJRawRj0NOZjURV-Bwn4zSng4') },
    donggungwon: { name: 'Donggungwon', address: '경북 경주시 보문로 74-14', google: googlePlace('Donggungwon', 'ChIJHzgXmHVSZjURIBjSR8nQj3I') },
    nampo_samgyetang: { name: 'Nampo Samgyetang', address: '부산 중구', naver: 'https://naver.me/FqS4z5Rq' },
    gwangalli_bulgogi_busanjip: { name: '광안리 언양불고기 부산집', address: '부산 수영구' },
    gs25_seomyeon_yuseong: { name: 'GS25 서면유성점', address: '부산 부산진구 황령대로 9', google: googlePlace('GS25 서면유성점', 'ChIJlQ1SfHfraDURlRDMqfQhW_s') },
    seveneleven_seomyeon_dain: { name: '세븐일레븐 부산서면다인점', address: '부산 부산진구 신천대로65번길 91', google: 'https://www.google.com/maps/dir/?api=1&destination=%EB%B6%80%EC%82%B0%20%EB%B6%80%EC%82%B0%EC%A7%84%EA%B5%AC%20%EC%8B%A0%EC%B2%9C%EB%8C%80%EB%A1%9C65%EB%B2%88%EA%B8%B8%2091' },
    age_yeongdo: { name: '아게(AGE) / Cafe Age', address: '부산광역시 영도구 해양힐링로 55, 2-3층', lat: 35.0598722, lng: 129.0714442, google: 'https://www.google.com/maps/search/?api=1&query=35.0598722,129.0714442', kakao: 'https://map.kakao.com/link/map/AGE,35.0598722,129.0714442' }
  };

  if (typeof globalThis !== 'undefined') globalThis.AUTHORITATIVE_MAPS_V45 = maps;
  if (typeof window !== 'undefined') window.AUTHORITATIVE_MAPS_V45 = maps;
})();
