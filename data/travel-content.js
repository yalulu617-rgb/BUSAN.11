// ─────────────────────────────────────────────────────────────────────────
// BUSAN.11 V45: Canonical Travel Content Source of Truth
// Source: 20261113-17 釜山(1).docx (32 Slides Content Architecture)
// SHA256: 7746ea523c1ae25c837b50c3ea08ca215e1552cc1d42658efee05589096e7356
// ─────────────────────────────────────────────────────────────────────────

(function() {
  const TRAVEL_CONTENT_V45 = {
  "meta": {
    "appVersion": "V45",
    "sourceFile": "20261113-17 釜山(1).docx",
    "sourceSha256": "7746ea523c1ae25c837b50c3ea08ca215e1552cc1d42658efee05589096e7356",
    "scriptSlides": 32,
    "tripDates": "2026-11-13/2026-11-17",
    "destination": "Busan + Gyeongju",
    "title": "2026 釜山 ✕ 慶州 5D4N 秋日海線漫遊手帳",
    "subtitle": "5D4N 雙城浪漫漫遊・韓服銀杏 ✕ 彩色膠囊列車 ✕ 廣安里夜景",
    "bucketList": [
      "1. 吃味讚王專人代烤 3.5cm 極厚熟成豬五花",
      "2. 搭海雲台彩色天空膠囊列車看海",
      "3. 新世界 Spa Land 汗蒸幕折羊角頭喝甜米釀",
      "4. 廣安里沙灘看 M Drone Light Show 與廣安大橋夜景",
      "5. 穿精緻韓服漫步慶州大陵苑金黃銀杏林",
      "6. 捕捉月精橋朱紅迴廊唯美夕陽水影",
      "7. 探訪東宮與月池古新羅宮殿金碧璀璨夜景",
      "8. 搭松島透明水晶纜車漫步海中龍宮步道",
      "9. 在白淺灘文化村面海喝咖啡泡景觀足浴",
      "10. 在南浦享用 Tonshou、採買 B&C 麵包並完成最後購物"
    ]
  },
  "emergency": {
    "ktoLine": "1330",
    "taipeiRepBusan": {
      "intl": "+82-10-4537-7961",
      "local": "010-4537-7961",
      "desc": "駐釜山台北辦事處 24 小時緊急求助專線（非急難重大事件請勿撥打）"
    },
    "police": "112",
    "medical": "119",
    "lostPassportDocs": [
      "護照影本 2 份",
      "2 吋大頭照 2 張",
      "身分證正本"
    ]
  },
  "preTrip": {
    "documentsAndFinance": [
      "護照正本（有效效期涵蓋整趟旅程即可；若效期接近到期，建議提前換新以降低航空公司風險）",
      "護照影本 2 份與 2 吋大頭照備用",
      "WOWPASS 卡 / T-money 交通卡",
      "海外高回饋信用卡（Visa / Mastercard）",
      "韓元現金（備妥千元台幣於機台換匯）"
    ],
    "electronics": [
      "韓國上網 SIM 卡 / eSIM（確認已開通設定）",
      "韓國規格雙圓孔轉接頭（4.8mm / 規格 Type C & F）",
      "行動電源（隨身登機，嚴禁託運；BX572 釜山航空規定：每人限攜 2 顆以下且 ≤160Wh，禁止放置行李廂，禁止飛行中充電或使用）",
      "充電線材與多孔充電插頭"
    ],
    "clothing": [
      "防風外套 / 羊羔毛保暖外套（海邊防風必備）",
      "洋蔥式發熱內搭、針織衫、長版大衣",
      "舒適好走的健走鞋 / 厚底運動鞋",
      "保暖圍巾、毛帽、手套"
    ],
    "dailyAndMedicine": [
      "個人常備藥（腸胃藥、止痛藥、綜合感冒藥）",
      "人工淚液 / 保濕眼藥水",
      "高保濕護唇膏、保濕隨身噴霧",
      "便攜輕量折疊傘"
    ],
    "baggageRules": {
      "outbound": "去程釜山航空 BX572：含託運行李 15kg",
      "inbound": "回程大韓航空 KE2085：含託運行李 23kg"
    },
    "bookingTimelines": {
      "ktx": "出發前 1 個月於 Korail 官網搶購高鐵票",
      "skyCapsule": "出發前 2～3 週於海雲台藍線公園官網預約"
    }
  },
  "wowpass": {
    "steps": [
      {
        "step": 1,
        "name": "出發前／出發前後取得規劃",
        "desc": "目前規劃於出發前取得 WOWPASS；最新購買／領取方式將於 10 月再次確認，目前不把任何現場機台申辦流程視為固定方案。"
      },
      {
        "step": 2,
        "name": "隨時儲值 (Top-up)",
        "desc": "支援台幣現鈔直接存入轉換為韓元餘額，匯率優於台灣臨櫃換匯。"
      },
      {
        "step": 3,
        "name": "手機綁定 (Bind)",
        "desc": "下載 WOWPASS App 綁定卡片，即時推播每筆扣款並掌握帳戶明細。"
      },
      {
        "step": 4,
        "name": "餘額提領 (Withdraw)",
        "desc": "旅程結束前可於機台提領韓元現鈔（每次扣手續費 1,000 韓元）。"
      }
    ],
    "warning": "【至關重要防呆】WOWPASS 消費錢包餘額 ≠ T-money 交通卡餘額！搭地鐵與公車前，需另外在超商或地鐵站機台以「韓元現金」儲值 T-money 晶片。"
  },
  "immigration": {
    "sourceDate": "2026-09-07",
    "passport": {
      "title": "護照 / 入境資格",
      "notes": "台灣旅客持有效中華民國護照可免簽證入境韓國，短期觀光最長 90 天。護照效期涵蓋整趟旅程即可；若接近到期，建議提前換新以降低航空公司通關疑慮。"
    },
    "keta": {
      "title": "K-ETA（電子旅行許可）",
      "exemptionEndDate": "2026-12-31",
      "notes": "台灣護照持有人目前受 K-ETA 豁免，豁免期至 2026-12-31 KST。已取得且仍有效的 K-ETA 可繼續使用，並免填入境卡。",
      "officialUrl": "https://www.k-eta.go.kr/portal/board/viewboarddetail.do?bbsSn=299707&locale=EN"
    },
    "eArrivalCard": {
      "title": "韓國 e-Arrival Card（電子入境卡）",
      "notes": "免費官方電子申報，可於抵達韓國前 3 天內填寫。適合 K-ETA 豁免且沒有有效 K-ETA 的旅客；已有有效 K-ETA 者免填。",
      "officialUrl": "https://www.e-arrivalcard.go.kr/",
      "hotelAddress": "Urban Groove Hotel, Busan",
      "purpose": "Tour（觀光）"
    },
    "qcode": {
      "title": "Q-CODE（電子檢疫申報）",
      "notes": "是否需要 Q-CODE 取決於 KDCA 當期檢疫管理地區與個人旅遊史。適用時可於抵達前 7 天內輸入；請在出發前依官方最新公告再次確認。",
      "officialUrl": "https://qcode.kdca.go.kr/qco/guide.do"
    },
    "ses": {
      "title": "SES 正式註冊",
      "notes": "本次於金海機場預留時間辦理韓國 SES 正式註冊；完成後，未來持同一本有效護照入境韓國時，可依當時適用資格使用自動化通關。"
    },
    "customs": {
      "title": "海關申報",
      "dutyFreeLimit": "USD 800",
      "alcohol": "最多 2 瓶，合計 ≤ 2 公升，合計價值 ≤ USD 400（19 歲以上）",
      "tobacco": "200 支香菸或同等官定菸草限額（19 歲以上）",
      "perfume": "100 ml",
      "cash": "攜帶超過 USD 10,000 等值現金或有價票券須申報",
      "meatAndAnimalProducts": "為最安全起見，請勿攜帶肉類或動物製品入境；若攜帶，務必申報並配合檢疫。",
      "plants": "新鮮蔬果、種子、活植物及帶土植物可能須申報或受限；最安全做法為不攜帶；若攜帶，務必申報。",
      "medication": "請確認成分而非僅憑品牌名稱判斷；含管制麻醉或向精神藥物成分者須事先取得 MFDS 核准；建議攜帶處方箋與藥物成分說明。",
      "greenChannel": "無應申報物品時走「無申報通道（Nothing to Declare / 녹색）」，無需填寫紙本申報單。"
    }
  },
  "flights": {
    "outbound": {
      "airline": "釜山航空 Air Busan",
      "flightNo": "BX572",
      "date": "2026-11-13",
      "departureTime": "13:25",
      "departureAirport": "桃園國際機場 (TPE)",
      "arrivalTime": "17:00",
      "arrivalAirport": "金海國際機場 (PUS)",
      "baggage": "含託運行李 15kg"
    },
    "return": {
      "airline": "大韓航空 Korean Air",
      "flightNo": "KE2085",
      "date": "2026-11-17",
      "departureTime": "14:50",
      "departureAirport": "金海國際機場 (PUS)",
      "arrivalTime": "16:30",
      "arrivalAirport": "桃園國際機場 (TPE)",
      "baggage": "含託運行李 23kg"
    }
  },
  "hotel": {
    "nameTW": "城市律動飯店",
    "nameEN": "Urban Groove Hotel",
    "nameKR": "서면 어반그루브 호텔",
    "country": "韓國",
    "stayPeriod": "11/13 ～ 11/17 (共 4 晚)",
    "checkInDate": "2026/11/13",
    "checkOutDate": "2026/11/17",
    "location": "凡內谷站 6 號出口步行約 3 分鐘",
    "address": "18 Hwangnyeong-daero 17beon-gil, Busanjin-gu, Busan 47353",
    "phone": "+82 507-1384-5553",
    "naverMap": "https://map.naver.com/p/entry/place/13479629",
    "kakaoMap": "https://map.kakao.com/?id=21160751",
    "desc": "位於凡內谷站 6 號出口附近，前往西面商圈用餐與購物方便。"
  },
  "reservations": [
    {
      "id": "bx572",
      "name": "BX572",
      "category": "航班",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "2026/11/13 · TPE 13:25 → PUS 17:00"
    },
    {
      "id": "ke2085",
      "name": "KE2085",
      "category": "航班",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "2026/11/17 · PUS 14:50 → TPE 16:30"
    },
    {
      "id": "hotel",
      "name": "城市律動飯店",
      "category": "住宿",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "2026/11/13 → 2026/11/17 · 住宿資料不等於訂單憑證"
    },
    {
      "id": "ktx-korail",
      "name": "KTX / KORAIL",
      "category": "交通",
      "status": "尚未預訂",
      "credentialStatus": "憑證尚未上傳",
      "details": "釜山 → 慶州"
    },
    {
      "id": "sky-capsule",
      "name": "Sky Capsule 天空膠囊列車",
      "category": "交通",
      "status": "尚未預訂",
      "credentialStatus": "憑證尚未上傳",
      "details": "尾浦 → 青沙浦"
    },
    {
      "id": "hanbok",
      "name": "慶州 Hanbok 韓服體驗",
      "category": "體驗",
      "status": "已預訂",
      "credentialStatus": "憑證尚未上傳",
      "details": "預訂狀態已確認；目前沒有可檢視憑證"
    },
    {
      "id": "klook",
      "name": "Klook",
      "category": "平台",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "尚無可信購買資料"
    },
    {
      "id": "kkday",
      "name": "KKday",
      "category": "平台",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "尚無可信購買資料"
    },
    {
      "id": "visit-busan-pass",
      "name": "Visit Busan Pass",
      "category": "觀光通票",
      "status": "資訊不足",
      "credentialStatus": "憑證尚未上傳",
      "details": "BIG3 Mobile · 45,000 KRW 方案資訊；尚無購買證據"
    }
  ],
  "credentials": [
    {
      "id": "passport",
      "name": "中華民國護照",
      "icon": "🪪",
      "status": "尚未上傳",
      "viewState": "無可檢視"
    },
    {
      "id": "keta",
      "name": "K-ETA",
      "icon": "📄",
      "status": "本次免申請（豁免至 2026/12/31）",
      "viewState": "無可檢視"
    },
    {
      "id": "e-arrival-card",
      "name": "e-Arrival Card",
      "icon": "📝",
      "status": "尚未申報",
      "viewState": "無可檢視"
    },
    {
      "id": "q-code",
      "name": "Q-CODE",
      "icon": "🧬",
      "status": "尚未上傳",
      "viewState": "無可檢視"
    },
    {
      "id": "insurance",
      "name": "海外旅行平安保險單",
      "icon": "🏥",
      "status": "尚未上傳",
      "viewState": "無可檢視"
    },
    {
      "id": "hanbok",
      "name": "Hanbok 韓服體驗",
      "icon": "👘",
      "status": "已預訂・憑證尚未上傳",
      "viewState": "無可檢視"
    }
  ],
  "subway": {
    "hub": "西面站 (119 / 219)：1 號線與 2 號線十字交會樞紐",
    "line1Orange": [
      {
        "station": "釜山站 (113)",
        "tag": "KTX 高鐵往慶州"
      },
      {
        "station": "南浦站 (111)",
        "tag": "影島大橋 / BIFF 廣場 / 轉乘至松島與白淺灘"
      },
      {
        "station": "札嘎其站 (110)",
        "tag": "傳統海鮮市場"
      }
    ],
    "line2Green": [
      {
        "station": "沙上站 (227)",
        "tag": "轉金海輕軌往金海機場"
      },
      {
        "station": "Centum City (206)",
        "tag": "新世界百貨 / Spa Land 汗蒸幕"
      },
      {
        "station": "廣安站 (209)",
        "tag": "廣安里海水浴場 / 無人機秀"
      },
      {
        "station": "海雲台站 (204)",
        "tag": "海灘與傳統市場"
      },
      {
        "station": "中洞站 (202)",
        "tag": "藍線公園尾浦搭乘區"
      }
    ],
    "rules": [
      "進錯方向：5 分鐘內同站刷進免費出站，或按閘門 Help 鈴。",
      "轉乘認色：站內轉乘依照地面的綠色（2號線）或橘色（1號線）箭頭行走。",
      "轉乘優惠：30 分鐘內地鐵轉乘市區公車享折扣（上下車皆需感應 T-money）。"
    ]
  },
  "transport": {
    "kakaoT": {
      "name": "Kakao T 叫車攻略",
      "desc": "綁定海外信用卡或選擇「General Taxi」現場刷 WOWPASS；長輩同行或跨海大橋首選。"
    },
    "ktx": {
      "name": "KTX 高鐵跨城（釜山 ➔ 慶州）",
      "desc": "提前 1 個月搶票，西面搭 1 號線至釜山站搭乘高鐵（僅需 30 分鐘直達慶州站），出站轉 Kakao T 直達皇理團路（約 1.5 萬韓元）。"
    },
    "skyCapsule": {
      "name": "海雲台天空膠囊列車 (Sky Capsule)",
      "desc": "提前 2～3 週預約，必選「尾浦 ➔ 青沙浦」靠海側第一排，行駛於高架軌道盡覽童話窗景。"
    }
  },
  "itinerary": {
    "11/13": [
      {
        "time": "13:25",
        "title": "BX572 桃園 (TPE) ➔ 金海 (PUS)",
        "desc": "釜山航空 Air Busan BX572 於 13:25 自桃園國際機場 (TPE) 起飛，預計 17:00 抵達金海國際機場 (PUS)。",
        "tr": "✈️ 飛機",
        "map": "https://map.naver.com/p/search/%EA%B9%80%ED%95%B4%EA%B5%AD%EC%A0%9C%EA%B3%B5%ED%95%AD"
      },
      {
        "time": "17:00 後",
        "title": "PUS 抵達 ✕ 入境、行李與連線設定",
        "desc": "抵達後依序完成入境審查、領取行李與網路／連線設定，再前往 Urban Groove Hotel。",
        "tr": "🚕 有行李建議計程車",
        "route": "PUS ➔ Urban Groove Hotel｜有大行李時以計程車為主。",
        "destinationKr": "어반그루브호텔 부산",
        "map": "https://map.naver.com/p/search/%EA%B9%80%ED%95%B4%EA%B5%AD%EC%A0%9C%EA%B3%B5%ED%95%AD"
      },
      {
        "time": "約 19:00",
        "title": "Urban Groove Hotel（城市律動飯店）Check-in",
        "desc": "依實際入境與交通時間抵達位於凡內谷站 6 號出口附近的 Urban Groove Hotel，卸下大行李。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
      },
      {
        "time": "晚間",
        "title": "西面街頭小吃／逛街",
        "desc": "Check-in 後前往西面，以街頭小吃、輕鬆逛街與隨興晚餐為主，不安排固定餐廳。",
        "tr": "🚇 凡內谷 1 號線 ➔ 西面（1 站）",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ 西面｜搭地鐵 1 號線往西面，僅 1 站。",
        "destinationKr": "서면역",
        "map": "https://map.naver.com/p/search/%EC%84%9C%EB%A9%B4%EC%97%AD"
      },
      {
        "time": "晚餐後（條件式）",
        "title": "🍇 E-Mart Munhyeon（이마트 문현점）｜有餘力才去",
        "desc": "第一晚補充水果、飲料與零食；僅在航班、入境時間與體力都允許時前往。若延誤或疲累就直接略過，不影響行程。",
        "tr": "📍 依西面當下位置走最實用短路線",
        "route": "西面 ➔ E-Mart Munhyeon｜依當下位置採用最實用短路線；不硬填未驗證分鐘數。",
        "destinationKr": "이마트 문현점",
        "map": "https://map.naver.com/p/search/%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EB%AC%B8%ED%98%84%EC%A0%90"
      },
      {
        "time": "採買後／可直接略過採買",
        "title": "返回 Urban Groove Hotel",
        "desc": "E-Mart Munhyeon 後步行或採用短程在地路線返回飯店；若略過採買，則由西面直接回飯店休息。",
        "tr": "🚶 步行／短程在地路線",
        "route": "E-Mart Munhyeon ➔ Urban Groove Hotel／凡內谷站 6 號出口｜依現場採步行或短程在地路線。",
        "destinationKr": "어반그루브호텔 부산",
        "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
      }
    ],
    "11/14": [
      {
        "time": "約 09:00",
        "title": "Urban Groove Hotel ➔ 海雲台",
        "desc": "由飯店前往海雲台，預留週六轉乘與步行緩衝。",
        "tr": "🚇 凡內谷 L1 ➔ 西面轉 L2 ➔ 海雲台",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ 海雲台｜凡內谷搭 1 號線至西面，轉 2 號線往海雲台方向。",
        "destinationKr": "해운대역",
        "map": "https://map.naver.com/p/search/%ED%95%B4%EC%9A%B4%EB%8C%80"
      },
      {
        "time": "約 10:00",
        "title": "OPS Haeundae 麵包店",
        "desc": "Day 2 官方麵包站：OPS Haeundae，地址 31 Jungdong 1-ro；採買後再前往尾浦。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/OPS%20Haeundae%2031%20Jungdong%201-ro"
      },
      {
        "time": "約 10:20（條件式｜楓況好＋時間足夠才去）",
        "title": "🍂 秋色加點｜Dalmaji／Haewoljeong 上段短程下坡散步",
        "desc": "只有楓況良好且 Sky Capsule 報到前有充足緩衝才啟用：OPS 後搭計程車上坡至 Dalmaji／Haewoljeong 上段，再安排約 20～30 分鐘下坡秋色散步前往尾浦。不得影響依預訂時段／待確認的 Sky Capsule 報到。",
        "tr": "🚕 上坡計程車＋🚶 約 20～30 分鐘下坡",
        "route": "OPS ➔ Dalmaji／Haewoljeong 上段 ➔ Mipo｜只搭計程車上坡，再往尾浦方向短程下坡；不從尾浦步行上坡。",
        "destinationKr": "해월정",
        "map": "https://map.naver.com/p/search/%ED%95%B4%EC%9B%94%EC%A0%95"
      },
      {
        "time": "約 10:35",
        "title": "OPS Haeundae ➔ 尾浦（Mipo）",
        "desc": "未啟用秋色加點時由 OPS 直接前往尾浦；依實際預訂時段／待確認的時段完成報到。",
        "tr": "🚶 步行 / 🚕 計程車",
        "route": "OPS Haeundae ➔ Mipo｜未啟用 Dalmaji 條件行程時，依報到緩衝選擇步行或計程車。",
        "destinationKr": "미포정거장",
        "map": "https://map.naver.com/p/search/%ED%95%B4%EC%9A%B4%EB%8C%80%EB%B8%94%EB%A3%A8%EB%9D%BC%EC%9D%B8%ED%8C%8C%ED%81%AC%20%EB%AF%B8%ED%8F%AC%EC%A0%95%EA%B1%B0%EC%9E%A5"
      },
      {
        "time": "約 11:00（依預訂時段）",
        "title": "Sky Capsule：尾浦（Mipo）➔ 青沙浦（Cheongsapo）",
        "desc": "行駛於高架軌道上的彩色復古車廂；目前尚未預訂，須於出發前完成購票並確認實際登車時段。",
        "tr": "🚡 膠囊列車",
        "route": "Mipo ➔ Cheongsapo｜Sky Capsule；確切時間依實際訂妥時段，目前待確認。",
        "destinationKr": "청사포정거장",
        "map": "https://map.naver.com/p/search/%ED%95%B4%EC%9A%B4%EB%8C%80%EB%B8%94%EB%A3%A8%EB%9D%BC%EC%9D%B8%ED%8C%8C%ED%81%AC%20%EB%AF%B8%ED%8F%AC%EC%A0%95%EA%B1%B0%EC%9E%A5"
      },
      {
        "time": "13:00",
        "title": "青沙浦 Suminine 烤貝 ✕ 海鮮拉麵（수민이네）",
        "desc": "Sky Capsule 抵達青沙浦後，散步紅白燈塔與海景平交道，再前往 Suminine（118 Cheongsapo-ro 58beon-gil）品嚐炭火烤貝、扇貝與海鮮拉麵。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EC%88%98%EB%AF%BC%EC%9D%B4%EB%84%A4"
      },
      {
        "time": "14:30",
        "title": "新世界百貨 Spa Land 五星級汗蒸幕",
        "desc": "由青沙浦搭 Kakao T／計程車前往 Centum City；約 14:30～17:15／17:30 體驗溫泉、汗蒸幕、羊角毛巾、甜米釀與烤蛋。",
        "tr": "🚕 Kakao T / 計程車",
        "route": "Suminine／Cheongsapo ➔ Spa Land（Centum City）｜建議計程車。",
        "destinationKr": "스파랜드 신세계백화점 센텀시티점",
        "map": "https://map.naver.com/p/search/%EC%8A%A4%ED%8C%8C%EB%9E%9C%EB%93%9C%20%EC%8B%A0%EC%84%B8%EA%B3%84%EB%B0%B1%ED%99%94%EC%A0%90%20%EC%84%BC%ED%85%80%EC%8B%9C%ED%8B%B0%EC%A0%90"
      },
      {
        "time": "約 17:30",
        "title": "SCENTICA Gwangan（센티카 광안）",
        "desc": "Spa Land 後直接前往 SCENTICA Gwangan，地址 부산 수영구 광안로 25，再順路前往廣安里；不繞行田浦分店。",
        "tr": "🚇 地鐵 / 🚕 計程車",
        "route": "Spa Land／Centum City ➔ SCENTICA Gwangan｜Centum City 搭 2 號線至 Gwangan，再步行前往。",
        "destinationKr": "센티카 광안",
        "map": "https://map.naver.com/p/search/%EC%84%BC%ED%8B%B0%EC%B9%B4%20%EA%B4%91%EC%95%88"
      },
      {
        "time": "約 18:30",
        "title": "廣安里（Gwangalli）海景散步",
        "desc": "由 SCENTICA Gwangan 前往廣安里海水浴場，欣賞廣安大橋夜景並確認當晚官方活動資訊。",
        "tr": "🚶 步行 / 🚕 計程車",
        "route": "SCENTICA Gwangan ➔ Gwangalli｜步行前往；累時可搭短程計程車。",
        "destinationKr": "광안리해수욕장",
        "map": "https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC%ED%95%B4%EC%88%98%EC%9A%95%EC%9E%A5"
      },
      {
        "time": "約 19:00（暫定）",
        "title": "廣安里夜景 ✕ M Drone Light Show（場次待官方確認）",
        "desc": "前往廣安里欣賞廣安大橋夜景與每週六 M Drone Light Show；2026 年 11 月確切演出場次於出發前依官方公告再次確認。本行程不宣稱為釜山煙火節。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC%ED%95%B4%EC%88%98%EC%9A%95%EC%9E%A5"
      },
      {
        "time": "活動後",
        "title": "返回 Urban Groove Hotel",
        "desc": "Drone Show 行程結束後返回飯店，依散場人流與週六交通彈性調整；疲累時直接搭計程車。",
        "tr": "🚇 Gwangan L2 ➔ 西面轉 L1 ➔ 凡內谷／🚕",
        "route": "Gwangalli ➔ Urban Groove Hotel／凡內谷站 6 號出口｜Gwangan 搭 2 號線至西面，轉 1 號線至凡內谷；疲累時改搭計程車。",
        "destinationKr": "어반그루브호텔 부산",
        "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
      },
      {
        "time": "回飯店後",
        "title": "計畫體驗｜韓式外送炸雞 ✕ 炸醬麵飯店宵夜",
        "desc": "回到 Urban Groove Hotel 休息洗澡後再叫韓式外送，計畫享用半半炸雞（후라이드 치킨 原味＋양념 치킨 甜辣）、炸醬麵（짜장면）、醃蘿蔔（치킨무）與飲料；店家與供應狀況當晚確認，並非已預訂。",
        "tr": "🏨 飯店內用餐",
        "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
      }
    ],
    "11/15": [
      {
        "time": "約 09:00（依實際交通）",
        "title": "Urban Groove Hotel ➔ Busan Station ➔ Gyeongju",
        "desc": "由凡內谷搭地鐵 1 號線直達 Busan Station，再依實際訂妥的 KTX 前往慶州；目前不硬填尚未預訂的車次或班次。抵達後搭計程車前往水鏡舍。",
        "tr": "🚄 KTX 規劃 + 🚕 計程車",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ Busan Station：1 號線直達；Busan ➔ Gyeongju：KTX 待實際訂票；Gyeongju Station ➔ 水鏡舍：建議計程車。",
        "destinationKr": "경주역",
        "map": "https://map.naver.com/p/search/%EB%B6%80%EC%82%B0%EC%97%AD"
      },
      {
        "time": "約 11:45",
        "title": "午餐：水鏡舍（수경사）",
        "desc": "Day 3 固定午餐為水鏡舍／수경사，用餐後銜接 Klook 一日韓服行程。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC"
      },
      {
        "time": "約 12:45（依現場）",
        "title": "Klook 慶州一日韓服",
        "desc": "使用目前的 Klook 一日韓服方案；未預訂前不硬填領取時刻，最晚須於 18:50 前完成歸還。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EA%B2%BD%EC%A3%BC%20%ED%95%9C%EB%B3%B5%20%EB%8C%80%EC%97%AC"
      },
      {
        "time": "約 13:30",
        "title": "大陵苑 Hanbok 快速拍照",
        "desc": "大陵苑作為韓服路線的通過式拍照點，不安排長時間參觀。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EB%8C%80%EB%A6%89%EC%9B%90"
      },
      {
        "time": "約 14:10",
        "title": "瞻星臺（Cheomseongdae）Hanbok 快速拍照",
        "desc": "瞻星臺同樣以通過式韓服照片為主，將主要拍攝時間保留給雞林與月精橋。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EC%B2%A8%EC%84%B1%EB%8C%80"
      },
      {
        "time": "約 14:35",
        "title": "雞林（Gyerim）Hanbok 主拍",
        "desc": "雞林是本日韓服主要拍攝重點之一，保留林間步行與取景時間。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EA%B2%BD%EC%A3%BC%20%EA%B3%84%EB%A6%BC"
      },
      {
        "time": "約 15:15",
        "title": "月精橋（Woljeonggyo）Hanbok 主拍",
        "desc": "月精橋為另一個主要韓服拍攝重點，依現場光線彈性安排橋景與河畔照片。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EC%9B%94%EC%A0%95%EA%B5%90"
      },
      {
        "time": "約 16:15～18:40",
        "title": "皇理團路（Hwangnidan-gil）散步與購物",
        "desc": "保留約 2～2.5 小時慢慢逛：小物、伴手禮、麵包／零食、街拍、慢郵筒／寄給未來自己的明信片與自由購物；不指定未驗證店名。依租借店位置安排最晚 18:50 前歸還 Klook 一日韓服。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%ED%99%A9%EB%A6%AC%EB%8B%A8%EA%B8%B8"
      },
      {
        "time": "韓服歸還後",
        "title": "Hwangnamppang Main Store（皇南餅總店）",
        "desc": "Day 3 官方麵包站，於皇理團路行程後前往 Hwangnamppang Main Store 採買。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%ED%99%A9%EB%82%A8%EB%B9%B5%20%EB%B3%B8%EC%A0%90"
      },
      {
        "time": "晚餐",
        "title": "Park Yongja Gyeongju Myeongdong Jjolmyeon",
        "desc": "東宮與月池前的固定晚餐，享用朴容子慶州明洞辣拌麵。",
        "tr": "🚶 步行 / 🚕 計程車",
        "route": "Hwangnamppang Main Store ➔ Park Yongja Jjolmyeon：以市區步行為主；晚餐後若時間緊，搭計程車前往 Donggung & Wolji。",
        "destinationKr": "박용자경주명동쫄면",
        "map": "https://map.naver.com/p/search/%EB%B0%95%EC%9A%A9%EC%9E%90%20%EA%B2%BD%EC%A3%BC%EB%AA%85%EB%8F%99%EC%AB%84%EB%A9%B4"
      },
      {
        "time": "晚餐後",
        "title": "東宮與月池（Donggung & Wolji）夜景",
        "desc": "以東宮與月池夜景收尾，之後依實際訂妥的 KTX／交通返回釜山，不硬填未預訂車次。",
        "tr": "🚶 步行 + 🚕 計程車 + 🚄 KTX",
        "route": "Donggung & Wolji ➔ Gyeongju Station：計程車；Gyeongju ➔ Busan：依實際訂妥 KTX；Busan Station ➔ 凡內谷：1 號線直達。",
        "destinationKr": "동궁과 월지",
        "map": "https://map.naver.com/p/search/%EB%8F%99%EA%B6%81%EA%B3%BC%20%EC%9B%94%EC%A7%80"
      }
    ],
    "11/16": [
      {
        "time": "約 09:30",
        "title": "Urban Groove Hotel ➔ 松島",
        "desc": "由飯店前往松島海上纜車搭乘處；有行程時間壓力時建議直接搭計程車。",
        "tr": "🚕 建議計程車／🚇 1 號線至南浦再接在地交通",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ Songdo｜建議計程車；大眾運輸備案為凡內谷搭 1 號線至 Nampo，再接在地交通。",
        "destinationKr": "송도해상케이블카",
        "map": "https://map.naver.com/p/search/%EC%86%A1%EB%8F%84%ED%95%B4%EC%83%81%EC%BC%80%EC%9D%B4%EB%B8%94%EC%B9%B4"
      },
      {
        "time": "約 10:30",
        "title": "Songdo Marine Cable Car｜Crystal Cruise 來回票",
        "desc": "搭乘透明水晶車廂往返松島灣；票券為 Crystal Cruise round trip（來回），不是單程票。",
        "tr": "🚕 計程車 + 🚡 水晶纜車",
        "route": "Songdo Bay side ➔ Crystal Cruise ROUND TRIP ➔ 返回 Songdo Bay side，再繼續後續行程。",
        "destinationKr": "송도해상케이블카",
        "map": "https://map.naver.com/p/search/%EC%86%A1%EB%8F%84%ED%95%B4%EC%83%81%EC%BC%80%EC%9D%B4%EB%B8%94%EC%B9%B4"
      },
      {
        "time": "約 12:30",
        "title": "Huinnyeoul／白淺灘文化村區域",
        "desc": "Songdo 後前往 Huinnyeoul／White Pebble Culture Village，從村內巷道散步並避開封閉的海岸步道。",
        "tr": "🚌 公車 / 🚕 計程車",
        "route": "Songdo Bay side ➔ Huinnyeoul｜建議計程車。",
        "destinationKr": "흰여울문화마을",
        "map": "https://map.naver.com/p/search/%ED%9D%B0%EC%97%AC%EC%9A%B8%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84"
      },
      {
        "time": "約 13:00",
        "title": "午餐：Huinnyeoul Jeomppang（흰여울점빵）",
        "desc": "在 121 Huinnyeoul-gil 的既定午餐站享用海景鋁鍋拉麵與韓式吐司。",
        "tr": "🚶 白淺灘區域內步行",
        "route": "Huinnyeoul 村內 ➔ Huinnyeoul Jeomppang｜區域內步行。",
        "destinationKr": "흰여울점빵",
        "map": "https://map.naver.com/p/search/%ED%9D%B0%EC%97%AC%EC%9A%B8%EC%A0%90%EB%B9%B5"
      },
      {
        "time": "約 15:30",
        "title": "Footbath Cafe View 2（족욕카페뷰 2호점）",
        "desc": "Huinnyeoul 與午餐後前往 2 號店，安排海景精油足浴與休息。",
        "tr": "🚶 步行",
        "route": "Huinnyeoul／午餐 ➔ Footbath Cafe View 2｜區域內步行。",
        "destinationKr": "족욕카페뷰 2호점",
        "map": "https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B0%202%ED%98%B8%EC%A0%90"
      },
      {
        "time": "傍晚",
        "title": "南浦晚餐｜MAIN：Tonshou Nampo",
        "desc": "主方案為 Tonshou Nampo；若候位或營業狀況不適合，PLAN B 改吃南浦蔘雞湯。全程留在南浦，不跨城前往海雲台。",
        "tr": "🚕 計程車 / 🚶 步行",
        "route": "Footbath Cafe View 2 ➔ Tonshou Nampo｜建議計程車；抵達南浦後以步行串聯晚餐、B&C 與購物。",
        "destinationKr": "톤쇼우 남포점",
        "map": "https://map.naver.com/p/search/%ED%86%A4%EC%87%BC%EC%9A%B0%20%EB%82%A8%ED%8F%AC"
      },
      {
        "time": "晚餐後",
        "title": "B&C Gwangbok 麵包店",
        "desc": "Day 4 官方麵包站，隨南浦購物動線前往 B&C Gwangbok 採買。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/B%26C%20%EA%B4%91%EB%B3%B5%EC%A0%90"
      },
      {
        "time": "晚間",
        "title": "南浦洞最後購物",
        "desc": "完成本次南浦洞最後採買後前往地鐵站。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EB%82%A8%ED%8F%AC%EB%8F%99"
      },
      {
        "time": "購物後",
        "title": "地鐵 1 號線返回凡內谷／Urban Groove Hotel",
        "desc": "由南浦搭地鐵 1 號線往凡內谷站方向，返回 Urban Groove Hotel。",
        "tr": "🚇 地鐵 1 號線",
        "route": "Nampo ➔ Urban Groove Hotel／凡內谷站 6 號出口｜搭 1 號線直達凡內谷。",
        "destinationKr": "범내골역",
        "map": "https://map.naver.com/p/search/%EB%B2%94%EB%82%B4%EA%B3%A8%EC%97%AD"
      }
    ],
    "11/17": [
      {
        "time": "08:45 出發／09:00～09:50",
        "title": "Urban Groove Hotel ➔ Your Type Jeonpo（유어타입 전포）早餐",
        "desc": "行李已於前一晚完成整理；Day 5 正式早餐安排 Your Type Jeonpo，不以豬肉湯飯取代。",
        "tr": "🚶 步行",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ Your Type Jeonpo｜步行。",
        "destinationKr": "유어타입 전포",
        "map": "https://map.naver.com/p/search/Your%20Type%20Jeonpo"
      },
      {
        "time": "10:00～10:40",
        "title": "Your Type ➔ E-Mart Munhyeon（이마트 문현점）最後採買",
        "desc": "早餐後直接前往 E-Mart Munhyeon 完成最後補貨，不再插入額外西面購物迴圈。",
        "tr": "🚶 步行",
        "route": "Your Type Jeonpo ➔ E-Mart Munhyeon｜步行或短程在地路線。",
        "destinationKr": "이마트 문현점",
        "map": "https://map.naver.com/p/search/%EC%9D%B4%EB%A7%88%ED%8A%B8%20%EB%AC%B8%ED%98%84%EC%A0%90"
      },
      {
        "time": "10:40～11:05",
        "title": "返回 Urban Groove Hotel ✕ 取行李、完成退房",
        "desc": "10:40～10:55 由 E-Mart Munhyeon 返回飯店，10:55～11:05 領取行李、最後房間確認並完成 checkout；官方最晚退房時間為 12:00，本行程刻意提早離開。",
        "tr": "🚶 步行",
        "route": "E-Mart Munhyeon ➔ Urban Groove Hotel／凡內谷站 6 號出口｜步行。",
        "destinationKr": "어반그루브호텔 부산",
        "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
      },
      {
        "time": "約 11:05",
        "title": "Urban Groove Hotel ➔ 金海機場 (PUS)",
        "desc": "約 11:05 由 Urban Groove Hotel 搭計程車直達金海國際機場，不增加帶行李的地鐵轉乘。",
        "tr": "🚕 計程車直達",
        "route": "Urban Groove Hotel／凡內谷站 6 號出口 ➔ PUS｜攜帶行李直接搭計程車。",
        "destinationKr": "김해국제공항",
        "map": "https://map.naver.com/p/search/%EA%B9%80%ED%95%B4%EA%B5%AD%EC%A0%9C%EA%B3%B5%ED%95%AD"
      },
      {
        "time": "約 11:30～11:45",
        "title": "抵達 PUS ✕ KE2085 機場手續",
        "desc": "辦理 KE2085 報到與行李託運、退稅、韓國 SES 正式註冊，再依序完成安全檢查與出境審查。",
        "tr": "🚶 機場步行",
        "map": "https://map.naver.com/p/search/%EA%B9%80%ED%95%B4%EA%B5%AD%EC%A0%9C%EA%B3%B5%ED%95%AD"
      },
      {
        "time": "14:50",
        "title": "KE2085 自金海機場起飛",
        "desc": "大韓航空 KE2085 預計 14:50 自 PUS 出發前往桃園。",
        "tr": "✈️ 飛機",
        "map": "https://map.naver.com/p/search/%EA%B9%80%ED%95%B4%EA%B5%AD%EC%A0%9C%EA%B3%B5%ED%95%AD"
      },
      {
        "time": "16:30",
        "title": "KE2085 抵達桃園機場 (TPE)",
        "desc": "預計 16:30 抵達桃園國際機場，依實際航班與入境狀況為準。",
        "tr": "🛬 抵達",
        "map": ""
      }
    ]
  },
  "rainPlans": {
    "day2": {
      "trigger": "膠囊列車遇強風大雨停駛 / 廣安里 M Drone Light Show 取消",
      "proposals": [
        {
          "title": "室內備案 1：BUSAN X the SKY 100樓景觀展望台",
          "desc": "若天空膠囊列車因強風大雨停駛，改前往海雲台 LCT 100 樓全玻璃室內景觀台俯瞰雨中海景與全世界最高星巴克。"
        },
        {
          "title": "室內備案 2：Spa Land 汗蒸幕（延長室內停留）",
          "desc": "直接延長新世界 Spa Land 汗蒸幕室內放鬆時光，享受 18 種溫泉池與芬蘭桑拿房，在豪華躺椅區喝甜米釀避雨。"
        },
        {
          "title": "室內備案 3：廣安里海景室內景觀餐廳",
          "desc": "若廣安里 M Drone Light Show 因天候或官方場次調整而取消，可改選沿海室內景觀餐廳，隔著落地窗欣賞廣安大橋雨夜景色。"
        }
      ]
    },
    "day3": {
      "trigger": "慶州戶外大陵苑雨勢過大 / 無法戶外漫步",
      "proposals": [
        {
          "title": "室內備案 1：室內韓服體驗",
          "desc": "租借高級韓服後於室內韓屋造景空間拍攝精緻韓服照片，雨天也能完整體驗傳統新羅之美。"
        },
        {
          "title": "室內備案 2：皇理團路韓屋咖啡廳",
          "desc": "漫步至皇理團路特色韓屋咖啡廳，在溫暖室內品嚐熱柚子茶與傳統甜品，靜賞韓屋庭園雨景。"
        },
        {
          "title": "室內備案 3：國立慶州博物館 (免費室內首選)",
          "desc": "國寶級新羅金冠、精緻金飾腰帶與聖德大王神鐘皆在室內展出，館藏豐富且全程免淋雨。"
        },
        {
          "title": "室內備案 4：慶州東宮園 (Donggungwon)",
          "desc": "大型室內溫室植物園與恆溫鳥園，全透明溫室內恆溫舒適，漫步熱帶植物與古羅馬風造景。"
        }
      ]
    },
    "day4": {
      "trigger": "松島纜車或白淺灘懸崖風雨過大",
      "proposals": [
        {
          "title": "室內備案 1：影島 ARTE MUSEUM BUSAN (沈浸式光影藝術館)",
          "desc": "超大型沉浸式數位光影藝術展，包含巨浪、花海與星空投影，頂級室內光影藝術饗宴。"
        },
        {
          "title": "室內備案 2：Footbath Cafe View 2號店 (照常進行)",
          "desc": "大面落地窗海景精油足湯本身即為絕佳室內享受，雨天泡熱水看海景更顯愜意。"
        },
        {
          "title": "室內備案 3：南浦晚餐與室內購物",
          "desc": "Footbath Cafe View 2 後照常前往南浦；晚餐以 Tonshou Nampo 為主、南浦蔘雞湯為 Plan B，再依天候調整 B&C 與購物時間。"
        }
      ]
    },
    "phrases": [
      {
        "kr": "실례지만, 오늘 비/바람 때문에 정상 운행하나요?",
        "tw": "不好意思，請問今天因為下雨/強風有正常營運嗎？"
      },
      {
        "kr": "기사님, 영도 아르떼뮤지엄 부산으로 가주세요.",
        "tw": "司機先生，請載我們去影島 ARTE MUSEUM BUSAN。"
      },
      {
        "kr": "기사님, 국립경주박물관으로 가주세요.",
        "tw": "司機先生，請載我們去國立慶州博物館。"
      }
    ]
  },
  "food": [
    {
      "id": "cf2",
      "name": "Suminine（수민이네）",
      "category": "Day 2 午餐｜青沙浦烤貝＋海鮮拉麵",
      "sop": "炭火烤貝與扇貝搭配現煮海鮮拉麵",
      "desc": "位於 118 Cheongsapo-ro 58beon-gil 的青沙浦海鮮午餐。",
      "map": "https://map.naver.com/p/search/%EC%88%98%EB%AF%BC%EC%9D%B4%EB%84%A4"
    },
    {
      "id": "cf3",
      "name": "韓式外送炸雞 ✕ 炸醬麵飯店宵夜",
      "category": "Day 2 計畫體驗｜Urban Groove Hotel",
      "sop": "半半炸雞（原味＋甜辣）＋炸醬麵＋醃蘿蔔＋飲料",
      "desc": "返回飯店後依當晚實際供應選擇外送店家；這是規劃體驗，並非已預訂。",
      "map": "https://map.naver.com/p/search/Urban%20Groove%20Hotel%20%EB%B6%80%EC%82%B0"
    },
    {
      "id": "cf4",
      "name": "Gwangalli Eonyang Bulgogi Busanjip（광안리 언양불고기 부산집）",
      "category": "Day 2 備選晚餐｜廣安里言陽烤肉",
      "sop": "僅在 Drone Show 延誤／取消、提前飢餓或外送計畫改變時採用",
      "desc": "地址 32 Namcheonbada-ro；屬廣安里現場備選，不是固定主行程晚餐。",
      "map": "https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC%20%EC%96%B8%EC%96%91%EB%B6%88%EA%B3%A0%EA%B8%B0%20%EB%B6%80%EC%82%B0%EC%A7%91"
    },
    {
      "id": "cf5",
      "name": "水鏡舍（수경사）",
      "category": "Day 3 固定午餐｜慶州",
      "sop": "抵達慶州後先用午餐，再銜接 Klook 一日韓服行程",
      "desc": "2026-09-21 最終凍結指定的 Day 3 午餐。",
      "map": "https://map.naver.com/p/search/%EC%88%98%EA%B2%BD%EC%82%AC%20%EA%B2%BD%EC%A3%BC"
    },
    {
      "id": "cf6",
      "name": "Huinnyeoul Jeomppang（흰여울점빵）",
      "category": "Day 4 午餐｜海景鋁鍋拉麵＋韓式吐司",
      "sop": "在白淺灘散步途中安排簡單拉麵與吐司",
      "desc": "地址 121 Huinnyeoul-gil；刻意保留為輕鬆的海景小吃午餐。",
      "map": "https://map.naver.com/p/search/%ED%9D%B0%EC%97%AC%EC%9A%B8%EC%A0%90%EB%B9%B5"
    },
    {
      "id": "cf7",
      "name": "Footbath Cafe View 2（족욕카페뷰 2호점）",
      "category": "Day 4 下午｜海景足浴咖啡",
      "sop": "足浴休息並搭配飲品，保留夕陽觀景時間",
      "desc": "Day 4 下午的恢復行程，降低連續步行疲勞。",
      "map": "https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B0%202%ED%98%B8%EC%A0%90"
    },
    {
      "id": "cf8",
      "name": "Tonshou Nampo",
      "category": "Day 4 晚餐 MAIN｜南浦豬排",
      "sop": "Footbath Cafe View 2 後前往南浦用餐，再銜接 B&C Gwangbok 與最後購物",
      "desc": "Day 4 主方案；留在南浦動線，不前往海雲台。",
      "map": "https://map.naver.com/p/search/%ED%86%A4%EC%87%BC%EC%9A%B0%20%EB%82%A8%ED%8F%AC"
    },
    {
      "id": "cf9",
      "name": "Your Type Jeonpo",
      "category": "Day 5 早餐｜田浦",
      "sop": "早餐後前往 E-Mart，回飯店取行李並於 12:00 前退房",
      "desc": "離釜前的正式早餐，不以豬肉湯飯取代。",
      "map": "https://map.naver.com/p/search/Your%20Type%20Jeonpo"
    },
    {
      "id": "cf10",
      "name": "新世界 Spa Land 汗蒸幕點心",
      "category": "Day 2 體驗｜甜米釀＋烤蛋",
      "sop": "溫泉與汗蒸幕休息時享用冰甜米釀與烤蛋",
      "desc": "保留為 Spa Land 行程內的點心體驗。",
      "map": "https://map.naver.com/p/search/%EC%8A%A4%ED%8C%8C%EB%9E%9C%EB%93%9C%20%EC%8B%A0%EC%84%B8%EA%B3%84%EB%B0%B1%ED%99%94%EC%A0%90%20%EC%84%BC%ED%85%80%EC%8B%9C%ED%8B%B0%EC%A0%90"
    },
    {
      "id": "cf11",
      "name": "Park Yongja Gyeongju Myeongdong Jjolmyeon",
      "category": "Day 3 晚餐｜慶州明洞辣拌麵",
      "sop": "Hwangnamppang Main Store 後用餐，再前往東宮與月池",
      "desc": "Day 3 固定晚餐，安排在東宮與月池夜景之前。",
      "map": "https://map.naver.com/p/search/%EB%B0%95%EC%9A%A9%EC%9E%90%20%EA%B2%BD%EC%A3%BC%EB%AA%85%EB%8F%99%EC%AB%84%EB%A9%B4"
    },
    {
      "id": "cf12",
      "name": "南浦蔘雞湯",
      "category": "Day 4 晚餐 PLAN B｜南浦",
      "sop": "僅在 Tonshou Nampo 候位或營業狀況不適合時採用",
      "desc": "南浦區內的備選晚餐，不造成跨城移動。",
      "map": "https://map.naver.com/p/search/%EB%82%A8%ED%8F%AC%EB%8F%99%20%EC%82%BC%EA%B3%84%ED%83%95"
    }
  ],
  "convenienceStore": {
    "cu": [
      {
        "name": "延世大學生乳包 (연세우유 생크림빵)",
        "desc": "超商甜點天花板，爆漿口感不甜膩"
      },
      {
        "name": "全州拌飯三角飯糰 (전주비빔 삼각김밥)",
        "desc": "麻油香氣十足，內餡飽滿微辣"
      },
      {
        "name": "HEYROO 起司泡麵 (헤이루 치즈라면)",
        "desc": "濃郁起司湯頭，CU 獨家招牌泡麵"
      },
      {
        "name": "德米安香蕉牛奶 (바나나우유)",
        "desc": "經典減糖/原味香蕉牛奶必喝"
      },
      {
        "name": "餅乾沾花生醬 (초코/피넛 딥핑스낵)",
        "desc": "濃郁沾醬脆餅，涮嘴小點心"
      }
    ],
    "gs25": [
      {
        "name": "束草紅雪蟹膏醬 (속초홍게딱지장)",
        "desc": "拌白飯與海苔的神仙級美味"
      },
      {
        "name": "共和春炸醬麵 (공화춘 짜장면)",
        "desc": "韓國百年老店聯名，醬汁極濃郁"
      },
      {
        "name": "奶油生乳瑞士捲 (모찌롤)",
        "desc": "Q彈蛋糕體裹滿鮮奶油"
      },
      {
        "name": "養樂多冰沙冰塊杯 (야쿠르트 슬러시)",
        "desc": "夏秋解渴超人氣冰品"
      },
      {
        "name": "惠子便當 (혜자로운 집밥 도시락)",
        "desc": "CP 值極高的韓式家常豐盛便當"
      }
    ],
    "sevenEleven": [
      {
        "name": "東遠金槍魚拉麵 (동원참치라면)",
        "desc": "附整包真鮪魚塊的豪華泡麵"
      },
      {
        "name": "感洞卵半熟蛋 (감동란)",
        "desc": "鹹香蛋黃膏狀半熟蛋，超商之神"
      },
      {
        "name": "寶可夢造型麵包 (포켓몬빵)",
        "desc": "附贈隨機可愛貼紙的童趣麵包"
      },
      {
        "name": "三角咖啡牛奶包 (서울우유 삼각커피)",
        "desc": "首爾牛奶經典三角袋裝咖啡牛奶"
      },
      {
        "name": "鮮奶起司蛋糕 (우유치즈케익)",
        "desc": "綿密濃郁起司香氣小蛋糕"
      }
    ],
    "emart24": [
      {
        "name": "民生辣炒年糕脆條 (민생라면/스낵)",
        "desc": "超平價辣甜酥脆零嘴"
      },
      {
        "name": "巨無霸三角飯糰 (빅삼각김밥)",
        "desc": "份量加倍飽足感十足"
      },
      {
        "name": "I'm e 大蒜扁可頌 (크룽지)",
        "desc": "酥脆可頌壓扁大蒜奶油香氣"
      },
      {
        "name": "松露油洋芋片 (트러플 감자칩)",
        "desc": "開袋濃郁黑松露香氣"
      },
      {
        "name": "榛果美式咖啡袋裝 (파우치 커피)",
        "desc": "倒進冰塊杯的平價好咖啡"
      }
    ],
    "combos": [
      {
        "name": "蟹膏拌飯神仙組合",
        "formula": "GS25 蟹膏 ＋ 白飯 ＋ 麻油海苔酥",
        "desc": "熱騰騰白飯拌入整盒蟹膏與海苔碎，濃郁海味入口即化。"
      },
      {
        "name": "經典馬克定食 Mark Meal",
        "formula": "辣炒年糕 ＋ 辣雞麵 ＋ 起司 ＋ 熱狗",
        "desc": "年糕與辣雞麵微波後鋪上起司與熱狗，牽絲香辣濃郁。"
      },
      {
        "name": "活力元氣早餐",
        "formula": "全州拌飯飯糰 ＋ 感洞卵 ＋ 香蕉牛奶",
        "desc": "開啟一天旅程的黃金營養速食組合。"
      },
      {
        "name": "奢華午後輕食",
        "formula": "延世生乳包 ＋ 黑咖啡",
        "desc": "爆漿生乳包搭配無糖黑咖啡，絕配不甜膩。"
      }
    ]

  },

  "shopping": {
    "beautyMakeup": [
      {
        "id": "sm1",
        "name": "CLIO Kill Cover 氣墊粉餅",
        "kr": "클리오 킬커버 쿠션",
        "spot": "Olive Young / 西面",
        "desc": "遮瑕持久度高，秋冬服貼不卡粉"
      },
      {
        "id": "sm2",
        "name": "fwee 唇頰兩用布丁膏",
        "kr": "퓌 푸딩팟",
        "spot": "Olive Young / 西面",
        "desc": "軟糯泥狀質地，霧面暈染超自然"
      },
      {
        "id": "sm3",
        "name": "rom&nd 果汁/琉璃光澤唇釉",
        "kr": "롬앤 쥬시 래스팅 틴트",
        "spot": "Olive Young",
        "desc": "水光成膜快，修飾唇紋顯氣色"
      },
      {
        "id": "sm4",
        "name": "Too Cool For School 三色修容餅",
        "kr": "투쿨포스쿨 쉐딩",
        "spot": "Olive Young",
        "desc": "粉質細緻，亞洲膚色修容首選"
      },
      {
        "id": "sm5",
        "name": "Dasique 九宮格眼影盤",
        "kr": "데이지크 섀도우 팔레트",
        "spot": "Olive Young",
        "desc": "秋冬奶茶與楓葉色調，亮片細膩服貼"
      },
      {
        "id": "sm6",
        "name": "Wakemake 16色眼影盤",
        "kr": "웨이크메이크 팔레트",
        "spot": "Olive Young",
        "desc": "專業調色盤，一盤搞定眼妝與眉粉"
      },
      {
        "id": "sm7",
        "name": "Espoir 絲絨保濕粉底液",
        "kr": "에스쁘아 파운데이션",
        "spot": "Olive Young",
        "desc": "薄透服貼，秋冬乾燥氣候底妝必備"
      },
      {
        "id": "sm8",
        "name": "3CE 霧面絲絨唇釉",
        "kr": "3CE 벨벳 립틴트",
        "spot": "Olive Young / 西面",
        "desc": "絲絨霧感，顯色飽滿不拔乾"
      },
      {
        "id": "sm9",
        "name": "BANILA CO 零感肌卸妝膏",
        "kr": "바닐라코 클렌징밤",
        "spot": "Olive Young",
        "desc": "溫和乳化卸除全臉頑固彩妝"
      },
      {
        "id": "sm10",
        "name": "SCENTICA 香水店",
        "spot": "光安里",
        "image": {
          "thumb": "assets/images/scentica-gwangan-thumb.webp",
          "full": "assets/images/scentica-gwangan.webp",
          "alt": "SCENTICA 光安旗艦店外觀",
          "credit": "SCENTICA 官方門市圖片",
          "source": "https://www.scentica.co.kr/brand/store.html"
        },
        "nearby": { "city": "Busan", "type": "🧴 香氛", "address": "부산 수영구 광안로 25", "naver": "https://map.naver.com/p/entry/place/200396586" },
        "desc": "SCENTICA 光安旗艦店（센티카 광안），香水與生活香氛。地址：부산 수영구 광안로 25。"
      },
      {
        "id": "sm11",
        "name": "OLIVE YOUNG 南浦洞店",
        "spot": "南浦洞",
        "image": {
          "thumb": "assets/images/olive-young-nampo-thumb.webp",
          "full": "assets/images/olive-young-nampo.webp",
          "alt": "OLIVE YOUNG 釜山南浦店外觀",
          "credit": "韓國觀光公社 VISITKOREA 店家圖片",
          "source": "https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=148157"
        },
        "nearby": { "city": "Busan", "type": "💄 Olive Young", "address": "부산광역시 중구 광복로 64-1" },
        "desc": "釜山南浦店（올리브영 부산남포점），美妝與保養品。地址：부산광역시 중구 광복로 64-1。"
      }
    ],
    "medicineSkincare": [
      {
        "id": "sk1",
        "name": "東國製藥 Madecassol 積雪草軟膏",
        "kr": "마데카솔 연고",
        "spot": "街邊藥局 (凡內谷/西面)",
        "desc": "草本積雪草萬用修護軟膏"
      },
      {
        "id": "sk2",
        "name": "Olive Young Care Plus 隱形痘痘貼",
        "kr": "케어플러스 패치",
        "spot": "Olive Young",
        "desc": "薄透服貼吸附力強，回購率第一"
      },
      {
        "id": "sk3",
        "name": "韓方清涼消炎止痛貼布",
        "kr": "한방 소염진통 파스",
        "spot": "街邊藥局",
        "desc": "肌肉痠痛必備，溫熱/清涼長效"
      },
      {
        "id": "sk4",
        "name": "傷口防水液體 OK 繃",
        "kr": "방수 액체반창고",
        "spot": "街邊藥局",
        "desc": "塗抹快速成膜，碰水防痛"
      },
      {
        "id": "sk5",
        "name": "Noblesse 喉嚨舒緩噴霧",
        "kr": "목 스프레이",
        "spot": "街邊藥局",
        "desc": "乾冷天氣咽喉乾癢緩解必備"
      },
      {
        "id": "sk6",
        "name": "Torriden 5D 玻尿酸保濕精華",
        "kr": "토리든 수분세럼",
        "spot": "Olive Young",
        "desc": "極速補水清爽不黏，妝前打底必備"
      },
      {
        "id": "sk7",
        "name": "Anua 77% 魚腥草舒緩棉片",
        "kr": "아누아 어성초 토너패드",
        "spot": "Olive Young",
        "desc": "快速鎮定泛紅穩定膚況"
      },
      {
        "id": "sk8",
        "name": "VT 老虎積雪草微針精華 100/300",
        "kr": "VT 리들샷",
        "spot": "Olive Young",
        "desc": "微針煥膚加強後續保養吸收"
      },
      {
        "id": "sk9",
        "name": "ROUND LAB 白樺樹保濕防曬乳",
        "kr": "자작나무 수분선크림",
        "spot": "Olive Young",
        "desc": "潤澤水感不泛白，不起屑"
      }
    ],
    "souvenirClothingCulture": [
      {
        "id": "sc1",
        "name": "三珍魚餅（Samjin Amook）真空禮盒",
        "kr": "삼진어묵 선물세트",
        "spot": "釜山站 / 樂天超市",
        "desc": "釜山代表名產，多種口味即食或煮湯"
      },
      {
        "id": "sc2",
        "name": "HBAF 調味杏仁果系列",
        "kr": "HBAF 아몬드",
        "spot": "樂天超市 / 西面",
        "desc": "蜂蜜奶油、烤玉米、大蒜麵包口味"
      },
      {
        "id": "sc3",
        "name": "傳統麻油低鈉海苔酥禮盒",
        "kr": "들기름 김자반 선물세트",
        "spot": "樂天超市",
        "desc": "香酥脆口拌飯必備"
      },
      {
        "id": "sc4",
        "name": "Market O 巧克力布朗尼禮盒",
        "kr": "마켓오 브라우니",
        "spot": "樂天超市",
        "desc": "濃郁巧克力蛋糕獨立包裝分送"
      },
      {
        "id": "sc5",
        "name": "傳統手工藥果（Yakgwa）禮盒",
        "kr": "전통 수제약과",
        "spot": "慶州 / 樂天超市",
        "desc": "微甜蜂蜜肉桂香傳統宮廷點心"
      },
      {
        "id": "sc6",
        "name": "Mardi Mercredi / Marithé 衛衣",
        "kr": "브랜드 맨투맨 티셔츠",
        "spot": "NC百貨 / 西面商圈",
        "desc": "韓系人氣小雛菊與字體刺繡衛衣"
      },
      {
        "id": "sc7",
        "name": "羊羔毛防風保暖外套 (Fleece)",
        "kr": "양털 후리스 자켓",
        "spot": "西面地下街 / NC百貨",
        "desc": "海邊防風拍照必備"
      },
      {
        "id": "sc8",
        "name": "釜山限定海鷗 Boogi 文創吊飾",
        "kr": "부산 부기 키링/굿즈",
        "spot": "甘川洞 / 鑽石塔 / 藍線公園",
        "desc": "釜山城市吉祥物可愛鑰匙圈"
      },
      {
        "id": "sc9",
        "name": "影島白淺灘貝殼手工香氛皂",
        "kr": "영도 조개 수제비누",
        "spot": "白淺灘文創小店",
        "desc": "海洋香調純手工精緻貝殼皂"
      }
    ]
  },
  "destinations": {
    "gyeongju": {
      "spots": [
        "皇理團路古街",
        "大陵苑 (天馬塚)",
        "月精橋",
        "東宮與月池 (雁鴨池)"
      ],
      "souvenirs": [
        "慶州十元麵包 (牽絲莫札瑞拉起司)",
        "皇南餅 (綿密紅豆沙)",
        "新羅金冠文創品"
      ],
      "tips": "大陵苑全區已免門票（天馬塚內部展館 3,000 韓元）；花路韓服精緻變身漫步金黃銀杏林。"
    },
    "huinnyeoul": {
      "spots": [
        "白淺灘文化村",
        "海岸隧道",
        "看海吃現煮拉麵",
        "Footbath Cafe View 2號店"
      ],
      "souvenirs": [
        "白淺灘藍白手繪明信片",
        "海浪貓咪壓克力吊飾",
        "海洋風手工貝殼香氛皂"
      ],
      "taxiCard": "기사님, 부산항대교랑 광안대교 지나서 해운대로 가주세요. (司機先生，請幫我們行經「釜山港大橋」與「廣安大橋」走跨海路線去海雲台)。"
    }
  },
  "postcard": {
    "taiwanAirmailPostage": "500 韓元 (海外航空明信片標準郵資)",
    "addressFormat": {
      "country": "TAIWAN (R.O.C.) —— 務必以大寫英文書寫",
      "address": "其餘詳細地址寫繁體中文即可"
    },
    "locations": [
      {
        "name": "甘川洞文化村（未來郵筒）",
        "desc": "文創小店加購海外郵資，投入指定月份郵筒一年後寄達。"
      },
      {
        "name": "釜山鑽石塔展望台",
        "desc": "禮品部夜景限定明信片與紀念章，專人代寄。"
      },
      {
        "name": "海雲台藍線公園（尾浦/青沙浦）",
        "desc": "彩色膠囊列車插畫明信片，確認具備 International Airmail 代寄。"
      },
      {
        "name": "南浦洞釜山中央郵局 (부산중앙우체국)",
        "desc": "臨櫃說「Taiwan, Airmail」，購票貼妥投入紅色國際投遞口。"
      }
    ]
  },
  "phrases": [
    {
      "kr": "따로따로 계산해 주세요.",
      "en": "Separate checks, please.",
      "tw": "請幫我們分開結帳。"
    },
    {
      "kr": "택스 리펀(Tax Refund) 영수증 주세요.",
      "en": "Tax refund receipt, please.",
      "tw": "請給我退稅單。"
    },
    {
      "kr": "고수 빼주세요.",
      "en": "No coriander, please.",
      "tw": "請不要加香菜。"
    },
    {
      "kr": "덜 맵게 해주세요.",
      "en": "Less spicy, please.",
      "tw": "請做微辣（少辣一點）。"
    },
    {
      "kr": "화장실이 어디예요?",
      "en": "Where is the restroom?",
      "fr": "Où sont les toilettes?",
      "tw": "請問洗手間在哪裡？"
    },
    {
      "kr": "속이 안 좋아요.",
      "en": "I feel sick.",
      "tw": "我肚子/身體不舒服。"
    },
    {
      "kr": "두痛약 주세요.",
      "en": "Headache medicine, please.",
      "tw": "請給我頭痛藥。"
    }
  ],
  "memory": {
    "prompts": [
      {
        "day": "DAY 1",
        "label": "DAY 1 西面烤肉之夜",
        "size": "5.4 × 8.6 cm"
      },
      {
        "day": "DAY 2",
        "label": "DAY 2 天空膠囊列車窗景",
        "size": "5.4 × 8.6 cm"
      },
      {
        "day": "DAY 3",
        "label": "DAY 3 慶州大陵苑韓服銀杏",
        "size": "5.4 × 8.6 cm"
      },
      {
        "day": "DAY 4",
        "label": "DAY 4 影島白淺灘海景足浴",
        "size": "5.4 × 8.6 cm"
      },
      {
        "day": "DAY 5",
        "label": "DAY 5 西面最後掃貨大合照",
        "size": "5.4 × 8.6 cm"
      },
      {
        "day": "SPECIAL",
        "label": "Special Memory 最美回憶",
        "size": "5.4 × 8.6 cm"
      }
    ]
  },
  "journal": {
    "notes": "隨風漫步，在金黃銀杏與蔚藍海線之間，收藏屬於我們的秋日吉光片羽。",
    "scrapbooking": "供黏貼咖啡廳杯套、店家貼紙、糖果包裝紙、大陵苑金黃銀杏落葉標本。"
  },
  "airportArrival": {
    "source": "2026韓國釜山入境規定與Visit Busan Pass全攻略指南.xlsm",
    "sourceDate": "2026-08-31",
    "sequence": [
      "1. 檢疫/健康申報（依當期規定）",
      "2. 入境審查：護照 + e-Arrival Card 電子申報（資料已在系統中）",
      "3. 行李提領",
      "4. 海關通關：無應申報物品走綠色通道，無需填寫紙本申報單",
      "5. 入境大廳：領取 SIM 卡/開通網卡、安排交通"
    ],
    "transport": {
      "lightRailMetro": "金海輕軌（AREX）→ 沙上站轉地鐵 2 號線往西面：最省錢推薦方案",
      "limousine2026": {
        "seomyeonBujeonLine": {
          "name": "西面 / 釜田路線（성인 기준）",
          "adultFare": 6000
        },
        "haeundaeGijangLine": {
          "name": "海雲台 / 機張路線",
          "adultFare": 9500
        }
      }
    }
  },
  "visitBusanPass": {
    "source": "2026韓國釜山入境規定與Visit Busan Pass全攻略指南.xlsm",
    "sourceDate": "2026-08-31",
    "note": "實體 Card Pass 自 2026-02-10 起暫停銷售（另行通知恢復）；購買前請重新確認目前販售狀態。Mobile Pass 使用 App / My Page 即時 QR；截圖 / PDF / 列印 QR 無效。Mobile Pass 無交通卡功能。",
    "plans": {
      "h24": {
        "name": "24H PASS",
        "priceKRW": 55000,
        "type": "時效型",
        "validity": "首次使用景點啟用後 24 小時內有效"
      },
      "h48": {
        "name": "48H PASS",
        "priceKRW": 85000,
        "type": "時效型",
        "validity": "首次使用景點啟用後 48 小時內有效"
      },
      "big3": {
        "name": "BIG3 Mobile",
        "priceKRW": 45000,
        "quota": "A 類景點 1 個 + B 類景點 2 個",
        "validity": "首次啟用後 180 天內可使用剩餘次數",
        "recommended": true,
        "recommendationNote": "本次 5D4N 行程景點分散於不同天，適合數量型而非時效型 PASS。"
      },
      "big5": {
        "name": "BIG5",
        "priceKRW": 65000,
        "quota": "A 類景點 2 個 + B 類景點 3 個",
        "validity": "首次啟用後 180 天內可使用剩餘次數",
        "note": "僅在確定會使用 2A+3B 時才考慮升級。"
      }
    },
    "attractions": {
      "groupA": [
        {
          "name": "BUSAN X the SKY（100樓景觀台）",
          "group": "A",
          "adultRefPriceKRW": 29000
        },
        {
          "name": "Spa Land（新世界汗蒸幕）",
          "group": "A",
          "adultRefPriceKRW": 26000,
          "note": "PASS 含 4 小時入場；延長時間或內部付費服務另計"
        }
      ],
      "groupB": [
        {
          "name": "松島海上水晶纜車（Crystal Cruise 來回）",
          "group": "B"
        },
        {
          "name": "ARTE MUSEUM BUSAN（沈浸式光影藝術館）",
          "group": "B",
          "note": "Day4 雨天備案首選"
        },
        {
          "name": "海雲台海灘列車（Haeundae Beach Train）",
          "group": "B",
          "note": "Sky Capsule 天空膠囊列車不含在 PASS 效益內"
        },
        {
          "name": "釜山鑽石塔展望台（Busan Tower）",
          "group": "B"
        },
        {
          "name": "松島龍宮吊橋（Songdo Yonggung Suspension Bridge）",
          "group": "B",
          "note": "票值偏低，不建議僅為省錢而列入 BIG3/BIG5 兌換"
        }
      ]
    },
    "importantWarnings": [
      "BUSAN X the SKY 與 Spa Land 均為 A 類：BIG3 僅能兌換其中一個 A 類景點，另一個須自費購票。",
      "Mobile Pass 截圖/PDF/列印 QR 碼無效，必須使用 App 即時 QR。",
      "不應為「讓 PASS 回本」而改變或增加行程景點。",
      "實體 Card Pass 自 2026-02-10 起暫停銷售，出發前需確認是否恢復。"
    ],
    "big3Example": {
      "slotA": "Spa Land（汗蒸幕）",
      "slotB1": "松島海上水晶纜車",
      "slotB2Options": ["ARTE MUSEUM BUSAN（雨天備案）", "海雲台海灘列車", "釜山鑽石塔"],
      "rainCaseNote": "若 Day2 實際使用 BUSAN X the SKY，則 X the SKY 與 Spa Land 同為 A 類，BIG3 僅能兌換其中之一，另一個必須自費。"
    }
  },
  "stamps": {
    "tickets": [
      "KTX 慶州高鐵車票",
      "天空膠囊列車實體乘車券"
    ],
    "stamps": [
      "1. 金海國際機場紀念章",
      "2. 釜山地鐵特色戳章",
      "3. 釜山鑽石塔展望台章",
      "4. 青沙浦紅白雙子燈塔紀念章"
    ]
  }
};

  // Backward compatibility alias references (pointing to canonical convenienceStore)
  TRAVEL_CONTENT_V45.convenienceStores = TRAVEL_CONTENT_V45.convenienceStore;
  TRAVEL_CONTENT_V45.convenienceCombos = TRAVEL_CONTENT_V45.convenienceStore.combos;

  // Canonical 7 Voice SOS phrases fallback (used when offline/cold-start before Firebase listener resolves)
  const CANONICAL_VOICE_FALLBACK = [
    { key: 'voice_1', tw: '你好 / 謝謝', kr: '안녕하세요 / 감사합니다', title: '你好 / 謝謝', korean: '안녕하세요 / 감사합니다', icon: 'fa-handshake' },
    { key: 'voice_2', tw: '多少錢？', kr: '얼마예요?', title: '多少錢？', korean: '얼마예요?', icon: 'fa-won-sign' },
    { key: 'voice_3', tw: '我要結帳', kr: '계산해 주세요', title: '我要結帳', korean: '계산해 주세요', icon: 'fa-credit-card' },
    { key: 'voice_4', tw: '請給我菜單', kr: '메뉴판 주세요', title: '請給我菜單', korean: '메뉴판 주세요', icon: 'fa-book-open' },
    { key: 'voice_5', tw: '太辣了', kr: '너무 매워요', title: '太辣了', korean: '너무 매워요', icon: 'fa-pepper-hot' },
    { key: 'voice_6', tw: '洗手間在哪？', kr: '화장실이 어디예요?', title: '洗手間在哪？', korean: '화장실이 어디예요?', icon: 'fa-restroom' },
    { key: 'voice_7', tw: '飲品不加糖、蜂蜜與煉乳', kr: '설탕, 꿀, 연유는 아예 빼주세요.', title: '飲品不加糖、蜂蜜與煉乳', korean: '설탕, 꿀, 연유는 아예 빼주세요.', icon: 'fa-mug-hot', custom: true }
  ];
  TRAVEL_CONTENT_V45.voicePhrases = CANONICAL_VOICE_FALLBACK;

  if (typeof globalThis !== 'undefined') {
    globalThis.TRAVEL_CONTENT_V45 = TRAVEL_CONTENT_V45;
    globalThis.CANONICAL_VOICE_FALLBACK = CANONICAL_VOICE_FALLBACK;
  }
  if (typeof window !== 'undefined') {
    window.TRAVEL_CONTENT_V45 = TRAVEL_CONTENT_V45;
    window.CANONICAL_VOICE_FALLBACK = CANONICAL_VOICE_FALLBACK;
  }

})();

