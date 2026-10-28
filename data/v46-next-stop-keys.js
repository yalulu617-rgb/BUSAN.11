// V46 Trip Companion: curated links to the existing, verified NAVER registry.
// Each index is the 1-based position in the canonical itinerary for that day.
// No fuzzy search, guessed coordinates or Google/Kakao substitutes.
(function(target) {
  'use strict';
  target.V46_NEXT_STOP_MAP_KEYS = Object.freeze({
    '11/13': {3:'urban_groove',5:'emart_munhyeon',6:'urban_groove'},
    '11/14': {1:null,2:'ops_haeundae',4:'mipo_station',5:'cheongsapo_station',
      6:'suminine',7:'spaland_centum',8:'scentica_gwangan',
      9:'gwangalli_beach',10:'gwangalli_beach',11:'urban_groove'},
    '11/15': {2:'sugeongsa',3:'kkotgil_hanbok',4:'daereungwon',
      5:'cheomseongdae',6:'gyerim',7:'woljeonggyo',8:'hwangnidan',
      9:'hwangnamppang',10:'park_yongja',11:'donggung_wolji'},
    '11/16': {1:'songdo_cable',2:'songdo_cable',3:'huinnyeoul',
      4:'huinnyeoul_jeomppang',6:'tonshou_nampo',7:'bnc_gwangbok',
      9:'urban_groove'},
    '11/17': {1:'your_type_jeonpo',2:'emart_munhyeon',3:'urban_groove'}
  });
})(typeof window !== 'undefined' ? window : globalThis);
