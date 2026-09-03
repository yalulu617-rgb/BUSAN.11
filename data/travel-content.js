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
    "subtitle": "5D4N 雙城浪漫漫遊・韓服銀杏 ✕ 彩色膠囊列車 ✕ 廣安煙火節",
    "bucketList": [
      "1. 吃味讚王專人代烤 3.5cm 極厚熟成豬五花",
      "2. 搭海雲台彩色天空膠囊列車看海",
      "3. 新世界 Spa Land 汗蒸幕折羊角頭喝甜米釀",
      "4. 廣安里沙灘看 M 無人機光影秀與夜空煙火",
      "5. 穿精緻韓服漫步慶州大陵苑金黃銀杏林",
      "6. 捕捉月精橋朱紅迴廊唯美夕陽水影",
      "7. 探訪東宮與月池古新羅宮殿金碧璀璨夜景",
      "8. 搭松島透明水晶纜車漫步海中龍宮步道",
      "9. 在白淺灘文化村面海喝咖啡泡景觀足浴",
      "10. 品嚐米其林必比登推薦海木炭火鰻魚飯三吃"
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
        "name": "機台申辦 (Issue)",
        "desc": "西面站機台點選繁體中文，掃描護照並存入台幣千元鈔完成發卡。"
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
    "sourceDate": "2026-08-31",
    "passport": {
      "title": "護照 / 入境資格",
      "notes": "台灣旅客持有效中華民國護照可免簽證入境韓國，短期觀光最長 90 天。護照效期涵蓋整趟旅程即可；若接近到期，建議提前換新以降低航空公司通關疑慮。"
    },
    "keta": {
      "title": "K-ETA（電子旅行許可）",
      "exemptionEndDate": "2026-12-31",
      "notes": "台灣護照持有人目前受 K-ETA 豁免，豁免期至 2026-12-31 KST。豁免期間無需申辦 K-ETA。豁免不代表免除入境申報義務——仍需完成 e-Arrival Card 申報。"
    },
    "eArrivalCard": {
      "title": "韓國 e-Arrival Card（電子入境卡）",
      "notes": "2026 年標準入境申報方式。免費官方電子申報，最早可於抵達前 3 天填寫。若填寫後逾 72 小時未入境，須重新申報。資料傳送至系統後，入境審查時通常無需出示 QR Code 或紙本列印。",
      "hotelAddress": "Urban Groove Hotel Seomyeon, Busan",
      "purpose": "Tour（觀光）"
    },
    "qcode": {
      "title": "Q-CODE（電子檢疫申報）",
      "notes": "Q-CODE 是否必填取決於 KDCA 當前公告的防疫優先管理地區名單及個人健康狀況。2026 年 Q3（截至 2026-08-31）：台灣未列入優先管理地區。本次旅行為 2026 年 11 月（Q4）：Q4 名單尚未公布。【重要】：出發前須重新確認 2026 Q4 KDCA 最新公告，以確認 Q-CODE 是否適用。"
    },
    "ses": {
      "title": "SES 自動化出境通關",
      "notes": "持短期觀光簽證且年滿 17 歲之外國旅客，若入境審查時已完成指紋與臉部生物特徵採集，可於現場判斷後使用 SES 自動通道出境，無需事先至特定櫃台登記。"
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
    "nameEN": "Urban Groove Hotel Seomyeon",
    "nameKR": "서면 어반그루브 호텔",
    "stayPeriod": "11/13 ～ 11/17 (共 4 晚)",
    "location": "西面商圈 / 凡內谷站 6 號出口步行約 3 分鐘",
    "address": "18 Hwangnyeong-daero 17beon-gil, Busanjin-gu, Busan 47353",
    "naverMap": "https://map.naver.com/p/entry/place/13479629",
    "kakaoMap": "https://map.kakao.com/?id=21160751",
    "desc": "地鐵 1 號線與 2 號線交會西面核心樞紐，周邊超商與美食林立。"
  },
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
    "zimcarry": {
      "name": "Zimcarry 智慧行李托運",
      "desc": "西面地鐵站據點交付行李，直接運送至金海機場 2 樓出境大廳，最後一天空手逛街無負擔。"
    },
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
        "time": "17:00",
        "title": "金海機場 (PUS) 入境",
        "desc": "順利通關領行李，開通網卡，搭金海輕軌至沙上站轉 2 號線（或搭 Kakao T 約 1.8 萬韓元）直達西面。",
        "tr": "🚇 輕軌+地鐵 / 🚕 計程車",
        "map": "https://map.naver.com/p/entry/place/11585098"
      },
      {
        "time": "17:30",
        "title": "西面飯店 Check-in",
        "desc": "城市律動飯店 (Urban Groove Hotel) 卸下大行李，換上輕便服裝。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/13479629"
      },
      {
        "time": "18:30",
        "title": "晚餐：味讚王鹽烤肉（西面店）",
        "desc": "超人氣 3.5cm 極厚熟成豬五花！店員專人代烤至金黃酥脆，肉汁飽滿，包生菜＋醃芥末葉＋烤泡菜一口悶！",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/11571731"
      },
      {
        "time": "20:00",
        "title": "西面地下街 ✕ 超商巡禮",
        "desc": "西面站機台辦理 WOWPASS 存入台幣千元鈔換匯；逛地下街服飾，超商採買香蕉牛奶與洋芋片。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/1057416399"
      }
    ],
    "11/14": [
      {
        "time": "10:00",
        "title": "西面出發",
        "desc": "搭地鐵 2 號線至中洞站 7 號出口步行至尾浦站。",
        "tr": "🚇 地鐵 2 號線",
        "map": ""
      },
      {
        "time": "11:00",
        "title": "海雲台天空膠囊列車（尾浦 ➔ 青沙浦）",
        "desc": "行駛於高架軌道上的彩色復古車廂，享受靠海側第一排童話窗景。",
        "tr": "🚡 膠囊列車",
        "map": "https://map.naver.com/p/entry/place/1335043818"
      },
      {
        "time": "13:00",
        "title": "青沙浦海鮮烤貝午餐",
        "desc": "漫步灌籃高手海景平交道打卡、紅白雙子燈塔美拍，品嚐炭烤扇貝與海鮮拉麵。",
        "tr": "🚶 步行",
        "map": ""
      },
      {
        "time": "14:30",
        "title": "新世界百貨 Spa Land 五星級汗蒸幕",
        "desc": "搭 2 號線至 Centum City 站直通。體驗天然溫泉足湯、折羊角毛巾頭、喝冰甜米釀配煙燻烤蛋。",
        "tr": "🚇 地鐵 2 號線",
        "map": "https://map.naver.com/p/entry/place/13479633"
      },
      {
        "time": "19:00",
        "title": "廣安里海水浴場 ✕ M 無人機煙火秀",
        "desc": "【秋冬施放時間校正】：10 月至隔年 2 月秋冬場次調整為 19:00 與 20:00！面對廣安大橋璀璨燈光享用晚餐，欣賞夜空數百架無人機光影秀與煙火。",
        "tr": "🚇 地鐵 2 號線",
        "map": "https://map.naver.com/p/entry/place/13491414"
      }
    ],
    "11/15": [
      {
        "time": "09:30",
        "title": "西面出發 ➔ 釜山站搭 KTX 直奔慶州",
        "desc": "搭 1 號線至釜山站轉乘高鐵（僅需 30 分鐘直達慶州站），出站轉 Kakao T 直達皇理團路。",
        "tr": "🚄 KTX 高鐵 (30分) + 🚕 計程車",
        "map": ""
      },
      {
        "time": "12:00",
        "title": "午餐：Solsot (솔솥) 人氣韓式釜飯",
        "desc": "必點牛排釜飯與鮑魚釜飯，挖出主食後將高湯注入熱石鍋悶出香濃鍋巴水。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/11571731"
      },
      {
        "time": "13:30",
        "title": "花路韓服變身 ✕ 大陵苑外拍",
        "desc": "挑選精緻高階宮廷韓服與編髮。【門票防呆提醒】：大陵苑園區已全面免門票（天馬塚內部展館若需參觀另購 3,000 韓元），漫步在金黃銀杏林道與巨大古墳群拍仙氣大片！",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/13491807"
      },
      {
        "time": "16:00",
        "title": "月精橋夕照漫步",
        "desc": "朱紅木造迴廊映照金色夕陽與溪流水影。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/13479633"
      },
      {
        "time": "19:00",
        "title": "東宮與月池（雁鴨池）夢幻夜景",
        "desc": "古新羅宮殿在璀璨夜間照明下倒映於池水中；沿途品嚐牽絲莫札瑞拉起司「慶州十元麵包」與「皇南餅」後搭車返釜山。",
        "tr": "🚶 步行 + 🚄 KTX",
        "map": "https://map.naver.com/p/entry/place/13491823"
      }
    ],
    "11/16": [
      {
        "time": "10:45",
        "title": "松島海上纜車（水晶車廂）➔ 龍宮雲端步道",
        "desc": "南浦站轉 Kakao T 直達灣頂站。搭乘透明車廂跨越海灣俯瞰碧海，漫步延伸至海中的雲端步道。",
        "tr": "🚕 計程車 + 🚡 水晶纜車",
        "map": "https://map.naver.com/p/entry/place/36735520"
      },
      {
        "time": "13:00",
        "title": "影島白淺灘文化村 ✕ 看海吃拉麵",
        "desc": "韓國版聖托里尼彩繪階梯聚落，品嚐看海現煮拉麵，穿梭海岸隧道與彩繪壁畫拍照。",
        "tr": "🚌 公車 / 🚕 計程車",
        "map": "https://map.naver.com/p/entry/place/1057416399"
      },
      {
        "time": "16:00",
        "title": "Footbath Cafe View 2號店（海景精油足湯）",
        "desc": "面朝大片海景落地窗泡溫熱香氛精油足浴，舒緩走了四天的雙腿疲勞，邊喝咖啡邊看外海大船與夕陽！",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B02%ED%98%B8%EC%A0%90"
      },
      {
        "time": "18:30",
        "title": "豪華晚餐：海木炭火鰻魚飯（해목 海雲台店）",
        "desc": "【跨海計程車司機溝通卡】：기사님, 부산항대교랑 광안대교 지나서 해운대로 가주세요.（走釜山港大橋迴旋引道與廣安大橋夜景線直達海雲台）。米其林必比登推薦炭火鰻魚飯三吃。",
        "tr": "🚕 計程車 (跨雙大橋)",
        "map": "https://map.naver.com/p/entry/place/11571731"
      }
    ],
    "11/17": [
      {
        "time": "09:30",
        "title": "退房 ✕ Zimcarry 行李直寄機場",
        "desc": "在西面地鐵站 Zimcarry 據點交付行李，直接運送至金海機場出境大廳，兩手空空逛街免拉行李！",
        "tr": "🚶 步行",
        "map": ""
      },
      {
        "time": "10:00",
        "title": "西面商圈最後衝刺掃貨",
        "desc": "衝刺樂天超市與免稅店採買海苔、辛拉麵黑版、布朗尼；Olive Young 補齊美妝保養品。",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/1057416399"
      },
      {
        "time": "12:00",
        "title": "午餐：東萊蔘雞湯（西面店）",
        "desc": "整隻鮮嫩童子雞塞滿糯米、人蔘與紅棗，熬煮成奶白色濃郁高湯，元氣滿滿回血！",
        "tr": "🚶 步行",
        "map": "https://map.naver.com/p/entry/place/13491807"
      },
      {
        "time": "12:30",
        "title": "啟程前往金海機場 (PUS)",
        "desc": "搭地鐵 2 號線轉輕軌或叫車前往金海國際機場。",
        "tr": "🚇 地鐵+輕軌 / 🚕 計程車",
        "map": "https://map.naver.com/p/entry/place/11585098"
      },
      {
        "time": "13:00",
        "title": "機場 Zimcarry 領行李 ➔ 退稅 ➔ 登機",
        "desc": "於國際線 2 樓出境大廳 Zimcarry 櫃檯領回行李箱，將採買戰利品收好。海關機台刷退稅單領現金；大韓航空 KE2085 (14:50 起飛) 託運登機返台。",
        "tr": "✈️ 飛機 (KE2085 14:50)",
        "map": ""
      }
    ]
  },
  "rainPlans": {
    "day2": {
      "trigger": "膠囊列車遇強風大雨停駛 / 廣安無人機或煙火活動取消",
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
          "desc": "若廣安里無人機或煙火活動因天候取消，晚餐改選沿海高樓室內景觀餐廳，隔著大落地窗邊吃海鮮火鍋邊看廣安大橋雨夜霓虹。"
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
          "title": "室內備案 3：海木炭火鰻魚飯 (照常進行)",
          "desc": "晚餐日式炭火鰻魚飯為預約室內名店，完全不受天候影響。"
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
      "id": "cf1",
      "name": "味讚王鹽烤肉（西面店）",
      "category": "極厚熟成豬五花",
      "sop": "1. 鹽巴原味 ➔ 2. 醃芥末葉＋特調醬 ➔ 3. 烤泡菜＋生菜包肉一口悶",
      "desc": "超人氣 3.5cm 極厚熟成豬五花，店員專人代烤至外酥內嫩。",
      "map": "https://map.naver.com/p/entry/place/11571731"
    },
    {
      "id": "cf2",
      "name": "海木炭火鰻魚飯（海雲台店）",
      "category": "炭火鰻魚飯三吃",
      "sop": "1. 1/4 品嚐原汁原味 ➔ 2. 1/4 拌入芥末、海苔絲與青蔥 ➔ 3. 1/4 淋上特製高湯做成茶泡飯 ➔ 4. 1/4 依個人最愛方式享用",
      "desc": "米其林必比登推薦奢華炭火鰻魚重。",
      "map": "https://map.naver.com/p/entry/place/11571731"
    },
    {
      "id": "cf3",
      "name": "新世界 Spa Land 汗蒸幕",
      "category": "汗蒸幕經典點心",
      "sop": "1. 泡完溫泉折好羊角毛巾頭 ➔ 2. 點冰涼甜米釀 (Sikhye) ＋ 煙燻烤蛋 ➔ 3. 烤蛋在額頭輕敲碎殼享用",
      "desc": "五星級汗蒸幕必吃經典組合。",
      "map": "https://map.naver.com/p/entry/place/13479633"
    },
    {
      "id": "cf4",
      "name": "Solsot 韓式釜飯（慶州店）",
      "category": "牛排 / 鮑魚韓式釜飯",
      "sop": "1. 將主食在熱石鍋內均勻拌開 ➔ 2. 盛入小碗食用 ➔ 3. 將桌上高湯注入石鍋蓋上木蓋，悶出金黃香濃鍋巴湯",
      "desc": "皇理團路人氣韓屋釜飯名店。",
      "map": "https://map.naver.com/p/entry/place/11571731"
    },
    {
      "id": "cf5",
      "name": "東萊蔘雞湯（西面店）",
      "category": "元氣傳統蔘雞湯",
      "sop": "鮮嫩童子雞塞滿糯米、人蔘、紅棗與大蒜熬成奶白色濃郁高湯",
      "desc": "最後一天收心元氣大補給。",
      "map": "https://map.naver.com/p/entry/place/13491807"
    },
    {
      "id": "cf6",
      "name": "青沙浦平交道烤貝",
      "category": "炭烤扇貝與海鮮拉麵",
      "sop": "邊看紅白燈塔海景邊享用新鮮扇貝與現煮海鮮拉麵",
      "desc": "膠囊列車青沙浦站下車即達。",
      "map": ""
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
        "desc": "SCENTICA 光安旗艦店（센티카 광안），香水與生活香氛。地址：부산 수영구 광안로 25。"
      },
      {
        "id": "sm11",
        "name": "OLIVE YOUNG 南浦洞店",
        "spot": "南浦洞",
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

