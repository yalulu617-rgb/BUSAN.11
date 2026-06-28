// ==========================================
// Universal Travel Engine (UTE)
// Module: Travel Knowledge Base
// ==========================================

const travelKnowledge = {
  cities: {
    Busan: {
      id: "Busan",
      nameTW: "釜山",
      nameEN: "Busan",
      weatherQuery: "Busan",
      emergency: {
        hospital: "釜山大學醫院 (+82-51-240-5114)",
        police: "釜山鎮警察署 (+82-51-890-9224)",
        consult: "1330",
        cops: "112",
        medical: "119"
      },
      transportation: {
        desc: "🚇 地鐵 1~4 號線 / 輕軌 / 一般公車",
        taxi: "起步價約 4,800 KRW，支援 Kakao T 叫車"
      },
      recommendations: {
        breakfast: "凡內谷豬肉湯飯 / 密陽血腸豬肉湯飯",
        oliveYoung: "Olive Young 西面中央店",
        cu: "CU 凡內谷站店",
        gs25: "GS25 凡內谷中央店",
        seven: "7-ELEVEN 凡內谷店",
        exchange: "西面老奶奶換錢所 / 友利換錢所"
      }
    },
    Gyeongju: {
      id: "Gyeongju",
      nameTW: "慶州",
      nameEN: "Gyeongju",
      weatherQuery: "Gyeongju",
      emergency: {
        hospital: "慶州東國大學醫院 (+82-54-770-8114)",
        police: "慶州警察署 (+82-54-760-0324)",
        consult: "1330",
        cops: "112",
        medical: "119"
      },
      transportation: {
        desc: "🚌 主要以市內公車 (10/11/700路) 或租賃電動車/步行聯絡",
        taxi: "起步價約 4,000 KRW，部分郊區景點車程較遠"
      },
      recommendations: {
        breakfast: "皇南小麥麵 / 大陵苑包飯定食",
        oliveYoung: "Olive Young 慶州皇吾店",
        cu: "CU 慶州皇南店",
        gs25: "GS25 慶州大陵店",
        seven: "7-ELEVEN 慶州皇南店",
        exchange: "慶州換錢所極少，建議在釜山或機場預先兌換好足額寶貴韓幣"
      }
    }
  },
  places: {
    "seomyeon": {
      id: "seomyeon",
      name: "西面",
      city: "Busan",
      country: "Korea",
      category: "station",
      latitude: 35.1578,
      longitude: 129.0592,
      station: "西面站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/13479633",
        kakao: "https://map.kakao.com/?id=21160752",
        google: "https://maps.app.goo.gl/seomyeon"
      },
      tags: ["轉乘大站", "西面地下街", "繁華商圈"],
      transportation: "釜山地鐵 1, 2 號線交會西面站",
      nearby: "樂天百貨, 西面製造街"
    },
    "beameom": {
      id: "beameom",
      name: "凡內谷",
      city: "Busan",
      country: "Korea",
      category: "station",
      latitude: 35.1485,
      longitude: 129.0638,
      station: "凡內谷站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/13479629",
        kakao: "https://map.kakao.com/?id=21160751",
        google: "https://maps.app.goo.gl/beameom"
      },
      tags: ["地鐵站", "飯店鄰近"],
      transportation: "地鐵 1 號線凡內谷站",
      nearby: "城市律動飯店, 豬肉湯飯"
    },
    "capsule": {
      id: "capsule",
      name: "海雲台藍線公園",
      city: "Busan",
      country: "Korea",
      category: "attraction",
      latitude: 35.1601,
      longitude: 129.1762,
      station: "中洞站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/1335043818",
        kakao: "https://map.kakao.com/?id=1418859942",
        google: "https://maps.app.goo.gl/blueline"
      },
      tags: ["膠囊列車", "海岸火車", "美景"],
      transportation: "地鐵 2 號線中洞站 7 號出口步行約 15 分鐘",
      nearby: "尾浦尾港, 海雲台沙灘"
    },
    "gwangan": {
      id: "gwangan",
      name: "廣安里",
      city: "Busan",
      country: "Korea",
      category: "attraction",
      latitude: 35.1531,
      longitude: 129.1189,
      station: "廣安站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/13491414",
        kakao: "https://map.kakao.com/?id=7940176",
        google: "https://maps.app.goo.gl/gwangan"
      },
      tags: ["廣安大橋", "無人機秀", "海景沙灘"],
      transportation: "地鐵 2 號線廣安站 3/5 號出口步行約 10 分鐘",
      nearby: "廣安大橋咖啡街, 民樂水邊公園"
    },
    "bulguksa": {
      id: "bulguksa",
      name: "佛國寺",
      city: "Gyeongju",
      country: "Korea",
      category: "attraction",
      latitude: 35.7901,
      longitude: 129.3317,
      station: "慶州站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/11571731",
        kakao: "https://map.kakao.com/?id=7937320",
        google: "https://maps.app.goo.gl/bulguksa"
      },
      tags: ["世界文化遺產", "碎石步道", "佛教歷史"],
      transportation: "從慶州客運站搭乘 10 或 11 號公車（約 40 分鐘）",
      nearby: "石窟庵, 朝鮮慶州觀光園區"
    },
    "daereungwon": {
      id: "daereungwon",
      name: "大陵苑",
      city: "Gyeongju",
      country: "Korea",
      category: "attraction",
      latitude: 35.8385,
      longitude: 129.2131,
      station: "慶州大陵苑下車",
      maps: {
        naver: "https://map.naver.com/p/entry/place/13491807",
        kakao: "https://map.kakao.com/?id=8116260",
        google: "https://maps.app.goo.gl/daereungwon"
      },
      tags: ["天馬塚", "古墓群", "世界文化遺產"],
      transportation: "搭乘 70 號公車大陵苑下車，或自皇理團路步行 2 分鐘",
      nearby: "皇理團路, 瞻星台"
    },
    "cheomseongdae": {
      id: "cheomseongdae",
      name: "瞻星台",
      city: "Gyeongju",
      country: "Korea",
      category: "attraction",
      latitude: 35.8347,
      longitude: 129.2190,
      station: "瞻星台站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/11571617",
        kakao: "https://map.kakao.com/?id=7874945",
        google: "https://maps.app.goo.gl/cheomseongdae"
      },
      tags: ["天文觀測台", "東方古老地標", "國寶"],
      transportation: "大陵苑正門向東步行約 5 分鐘",
      nearby: "大陵苑, 東宮與月池"
    },
    "hwangnidangil": {
      id: "hwangnidangil",
      name: "皇理團路",
      city: "Gyeongju",
      country: "Korea",
      category: "attraction",
      latitude: 35.8382,
      longitude: 129.2098,
      station: "皇南洞公車站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/1057416399",
        kakao: "https://map.kakao.com/?id=24785465",
        google: "https://maps.app.goo.gl/hwangnidangil"
      },
      tags: ["韓屋特色街區", "文青咖啡館"],
      transportation: "大陵苑西側，步行即可達",
      nearby: "大陵苑, 皇南小麥麵"
    },
    "donggung": {
      id: "donggung",
      name: "東宮與月池",
      city: "Gyeongju",
      country: "Korea",
      category: "attraction",
      latitude: 35.8343,
      longitude: 129.2268,
      station: "東宮與月池站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/13491823",
        kakao: "https://map.kakao.com/?id=7937367",
        google: "https://maps.app.goo.gl/donggung"
      },
      tags: ["新羅離宮", "經典夜景", "臨海殿"],
      transportation: "瞻星台向東步行約 10 分鐘，或搭乘 602 號公車",
      nearby: "瞻星台, 半月城"
    },
    "walk_coast": {
      id: "walk_coast",
      name: "松島天空步道",
      city: "Busan",
      country: "Korea",
      category: "attraction",
      latitude: 35.0768,
      longitude: 129.0191,
      station: "松島海水浴場",
      maps: {
        naver: "https://map.naver.com/p/entry/place/36735520",
        kakao: "https://map.kakao.com/?id=26848030",
        google: "https://maps.app.goo.gl/songdoblue"
      },
      tags: ["海上步道", "松島纜車"],
      transportation: "地鐵 1 號線札嘎其站 2 號出口轉乘公車 26/30/71 至松島海水浴場",
      nearby: "松島海上纜車, 松島雲橋"
    },
    "return_flight": {
      id: "return_flight",
      name: "金海國際機場",
      city: "Busan",
      country: "Korea",
      category: "airport",
      latitude: 35.1795,
      longitude: 128.9382,
      station: "金海機場輕軌站",
      maps: {
        naver: "https://map.naver.com/p/entry/place/11585098",
        kakao: "https://map.kakao.com/?id=7901764",
        google: "https://maps.app.goo.gl/gimhae"
      },
      tags: ["出境大廳", "退稅手續"],
      transportation: "搭乘輕電鐵至金海機場站",
      nearby: "退稅櫃台, 機場美食"
    }
  },
  stations: {
    "seomyeon": { name: "西面站", lines: ["1號線", "2號線"], transfer: true },
    "beameom": { name: "凡內谷站", lines: ["1號線"], transfer: false }
  },
  foods: {
    "pork_soup": { name: "豬肉湯飯", city: "Busan", recommendation: "凡內谷豬肉湯飯" },
    "cold_noodle": { name: "皇南小麥麵", city: "Gyeongju", recommendation: "皇南小麥麵" }
  },
  shopping: {
    "lotte": { name: "樂天百貨西面店", city: "Busan" },
    "olive_young": { name: "Olive Young 西面店", city: "Busan" }
  },
  transport: {
    "subway": "地鐵單程 1,450 KRW 起",
    "taxi_busan": "起步價 4,800 KRW",
    "taxi_gyeongju": "起步價 4,000 KRW"
  },
  emergency: {
    "busan": { hospital: "釜山大學醫院 (+82-51-240-5114)", police: "釜山鎮警察署" },
    "gyeongju": { hospital: "慶州東國大學醫院 (+82-54-770-8114)", police: "慶州警察署" }
  },
  hotels: {
    "urban_groove": {
      name: "城市律動飯店",
      nameEN: "Urban Groove Hotel",
      city: "Busan",
      address: "18 Hwangnyeong-daero 17beon-gil, Busanjin-gu, Busan 47353, South Korea",
      station: "凡內谷站 6 號出口"
    }
  },
  airports: {
    "gimhae": { name: "金海機場", city: "Busan", transit: "金海機場輕軌" }
  },
  attractions: {
    "bulguksa": { name: "佛國寺", worldHeritage: true },
    "daereungwon": { name: "大陵苑", worldHeritage: true }
  },
  exchange: {
    "seomyeon": { name: "西面老奶奶換錢所", rate: "支援台幣換匯" }
  },
  phrases: {
    "taxi_helper": "기사님, 여기로 부탁드립니다. (司機先生，請帶我到這裡。)"
  }
};

if (typeof window !== "undefined") {
  window.travelKnowledge = travelKnowledge;
}
