// ��������������������������������������������������������������������������������������������������������������������������������������������������
// Compatibility Adapter: Recommended Guides & Radars Static Databases
(function() {
  const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this);

  function getCanonical() {
    return target.TRAVEL_CONTENT_V45 || {};
  }

  const c = getCanonical();

  // ���� RECOMMENDED_FOOD derived from canonical food ��������������������������������������������������
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
      { id: 'rf1', category: '璆萄����鞊砌���', name: '�唾��钅厭�方�嚗�正�Ｗ�嚗�', desc: '頞�犖瘞� 3.5cm 璆萄����鞊砌��梧�摨堒摱撠�犖隞���喳��亙�憳押��', map: 'https://map.naver.com/p/entry/place/11571731' },
      { id: 'rf2', category: '�剔�敿駁�憌臭���', name: '瘚瑟銁�剔�敿駁�憌荔�瘚琿𤩅�啣�嚗�', desc: '蝐喳��堒�瘥𠉛蒈�刻㵽憟Ｚ虾�剔�敿駁��溻��', map: 'https://map.naver.com/p/entry/place/11571731' },
      { id: 'rf3', category: '瘙𡑒𡢄撟閧��賊�敹�', name: '�唬��� Spa Land 瘙𡑒𡢄撟�', desc: '鈭娍�蝝𡁏��詨�敹��蝬枏�蝯��嚗𡁜��𦦵掖���滨��餌��卝��', map: 'https://map.naver.com/p/entry/place/13479633' },
      { id: 'rf4', category: '�𥟇�/擙煾��枏��𣈯ㄞ', name: 'Solsot �枏��𣈯ㄞ嚗��撌𧼮�嚗�', desc: '����䁅楝鈭箸除�枏��𣈯ㄞ�滚�嚗屸�皝舀��粹�瞈��撌湔僖��', map: 'https://map.naver.com/p/entry/place/11571731' },
      { id: 'rf5', category: '��除�喟絞�㗛�皝�', name: '�梯��㗛�皝荔�镼輸𢒰摨梹�', desc: '擙桀咿蝡亙��𧼮�皛輻陳蝐喋��犖�䁅�蝝���祆�瞈��擃䀹僖��', map: 'https://map.naver.com/p/entry/place/13491807' },
      { id: 'rf6', category: '�剔������絲擙格�暻�', name: '�埝�瘚血像鈭日��方�', desc: '�惩��𡑒��埝�瘚衣�銝贝��喲�嚗屸��讠�憛娍絲�舫�鈭怎鍂�圈悅�����', map: '' }
    ];
  }

  // ���� RECOMMENDED_SHOPPING derived from canonical 27 shopping catalog ����������
  if (c.shopping && c.shopping.beautyMakeup && c.shopping.medicineSkincare && c.shopping.souvenirClothingCulture) {
    const allShop = [
      ...c.shopping.beautyMakeup.map(s => ({ ...s, category: '蝢𤾸�敶拙�' })),
      ...c.shopping.medicineSkincare.map(s => ({ ...s, category: '�怨𠯫靽嗪�' })),
      ...c.shopping.souvenirClothingCulture.map(s => ({ ...s, category: '隡湔���肟' }))
    ];
    target.RECOMMENDED_SHOPPING = allShop.map((s, idx) => ({
      id: s.id || ('rs' + (idx + 1)),
      category: s.category + (s.spot ? ' (' + s.spot + ')' : ''),
      name: s.name + (s.kr ? ' (' + s.kr + ')' : ''),
      desc: s.desc
    }));
  } else {
    target.RECOMMENDED_SHOPPING = [
      { id: 'rs1', category: '蝢𤾸�敶拙� (Olive Young)', name: 'CLIO Kill Cover 瘞��蝎厰� (�渠收�� �科誘貒� 勴𥔱�)', desc: '�桃����摨阡�嚗𣬚��祆�鞎潔��∠�' },
      { id: 'rs2', category: '蝢𤾸�敶拙� (Olive Young)', name: 'fwee ��糂�拍鍂撣���� (�� �賈𨫣��)', desc: '頠毺陳瘜亦�鞈芸𧑐嚗屸𧊅�Ｘ��栞��芰�' },
      { id: 'rs3', category: '蝢𤾸�敶拙� (Olive Young)', name: 'rom&nd �𨀣�/�厩��㗇黎��� (諢科袿 鴠科� �䁯擪�� �渣䂻)', desc: '瘞游��鞱�敹恬�靽桅ˇ���憿舀除��' },
      { id: 'rs4', category: '�怨𠯫靽嗪� (�亙�)', name: '�勗�鋆質𠯫 Madecassol 蝛漤䪸�㕑��� (諤�㫲儦渥� �國�)', desc: '�㗇𧋦蝛漤䪸�㕑𨯬�其耨霅瑁���' },
      { id: 'rs5', category: '�怨𠯫靽嗪� (Olive Young)', name: 'Olive Young Care Plus �勗耦�条�鞎� (儤��渣��科擪 �到�)', desc: '���𤩺�鞎澆𢙺���撘瘀��噼頃��洵銝�' },
      { id: 'rs6', category: '�怨𠯫靽嗪� (Olive Young)', name: 'Torriden 5D �餃倏�訾�瞈閧移�� (�𧙖收�� �䁪��賈獏)', desc: '璆菟�蠘�瘞湔��賭�暺𧶏�憒嘥��枏�敹��' },
      { id: 'rs7', category: '隡湔���肟 (璅�予頞��)', name: '銝厩�擳𡁻�嚗𠄎amjin Amook嚗厩�蝛箇旨�� (�潰��渠炸 �𧙖狩�貲䂻)', desc: '�𨅯控隞�”�滨𤩎嚗��蝔桀藁�喳朖憌���格僖' },
      { id: 'rs8', category: '隡湔���肟 (璅�予頞��)', name: 'HBAF 隤踹㭠�譍��𦦵頂�� (HBAF ��狀��)', desc: '���憟嗆硃����厩掖��之�𣈯熊��藁��' },
      { id: 'rs9', category: '隡湔���肟 (��肟撠誩�)', name: '敶勗雀�賣滓�䁅�畾潭�撌仿�瘞𤤿� (��� 魽國� �䁯�赬��)', desc: '瘚瑟�擐躰矽蝝娍�撌亦移蝺餉�畾潛�' }
    ];
  }

  // ���� SMART_NEARBY_DATABASE (supplemental operational map metadata) ����������������
  target.SMART_NEARBY_DATABASE = {
    Busan: [
      { type: '�� �圈閠', name: '�∪�靚瑕𧑐�萇� (6�笔枂��)', dist: 100, rate: 4.5, status: '��平銝�', naver: 'https://map.naver.com/p/entry/place/13479629', kakao: 'https://map.kakao.com/?id=21160751', google: 'https://maps.app.goo.gl/beameom' },
      { type: '�� CU', name: 'CU �∪�靚瑞�摨�', dist: 50, rate: 4.2, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_beom' },
      { type: '�蘨 GS25', name: 'GS25 �∪�靚瑚葉憭桀�', dist: 80, rate: 4.1, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_beom' },
      { type: '�� Olive Young', name: 'Olive Young 镼輸𢒰銝剖亢摨�', dist: 780, rate: 4.6, status: '10:00 - 22:30', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_seom' },
      { type: '�𡢢 Daiso', name: '憭批肟 Daiso 镼輸𢒰摨�', dist: 850, rate: 4.4, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_seom' },
      { type: '�� 蝢𡡞�', name: '�唾��钅厭�方� 镼輸𢒰摨�', dist: 950, rate: 4.8, status: '11:30 - 23:00', naver: 'https://map.naver.com/p/entry/place/11571731', kakao: 'https://map.kakao.com/?id=7937320', google: 'https://maps.app.goo.gl/chan_seom' },
      { type: '�� 蝢𡡞�', name: '瘚瑟銁�剔�敿駁�憌� 瘚琿𤩅�啣�', dist: 4500, rate: 4.8, status: '11:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/11571731', kakao: 'https://map.kakao.com/?id=7937320', google: 'https://maps.app.goo.gl/haemok' },
      { type: '�� �硋衮', name: 'Compose Coffee �∪�靚瑕�', dist: 150, rate: 4.3, status: '08:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/compose_beom' },
      { type: '�� �亙�', name: '�∪�靚瑚葉憭株𠯫撅�', dist: 140, rate: 4.0, status: '09:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_beom' },
      { type: '�蘨 ATM', name: '�𨅯控��銵� ATM (�圈閠蝡坔�)', dist: 110, rate: 4.0, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_beom' },
      { type: '�蘂 �恍堺', name: '�𨅯控憭批飛�恍堺 (�亥那銝剖�)', dist: 3500, rate: 4.3, status: '24撠𤩺��亥那', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_univ' }
    ],
    Gyeongju: [
      { type: '�� �圈閠', name: '�嗅��怨�蝡� (Bus Stop)', dist: 300, rate: 4.2, status: '��平銝�', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/gj_station' },
      { type: '�� CU', name: 'CU �嗅����摨�', dist: 150, rate: 4.3, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_gj' },
      { type: '�蘨 GS25', name: 'GS25 �嗅�憭折险摨�', dist: 200, rate: 4.2, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_gj' },
      { type: '�� Olive Young', name: 'Olive Young �嗅���陻摨�', dist: 850, rate: 4.5, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/1057416399', kakao: 'https://map.kakao.com/?id=24785465', google: 'https://maps.app.goo.gl/oy_gj' },
      { type: '�𡢢 Daiso', name: '憭批肟 Daiso �嗅�摨�', dist: 980, rate: 4.3, status: '10:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/36735520', kakao: 'https://map.kakao.com/?id=26848030', google: 'https://maps.app.goo.gl/daiso_gj' },
      { type: '�� 蝢𡡞�', name: 'Solsot �𣈯ㄞ �嗅�摨�', dist: 180, rate: 4.7, status: '11:30 - 21:00', naver: 'https://map.naver.com/p/entry/place/11571731', kakao: 'https://map.kakao.com/?id=7937320', google: 'https://maps.app.goo.gl/rice_gj' },
      { type: '�� 蝢𡡞�', name: '�嗅����暻萄� (����䁅楝)', dist: 200, rate: 4.6, status: '10:00 - 21:00', naver: 'https://map.naver.com/p/entry/place/13491414', kakao: 'https://map.kakao.com/?id=7940176', google: 'https://maps.app.goo.gl/10won_gj' },
      { type: '�� �硋衮', name: '�笔毀�� �嗅�憭折险�穃�', dist: 350, rate: 4.5, status: '08:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13479633', kakao: 'https://map.kakao.com/?id=21160752', google: 'https://maps.app.goo.gl/star_gj' },
      { type: '�� �亙�', name: '�嗅�銝剖亢�亙�', dist: 650, rate: 4.1, status: '09:00 - 22:00', naver: 'https://map.naver.com/p/entry/place/13491807', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/ph_gj' },
      { type: '�蘨 ATM', name: '�圈���銵� ATM (憭折险�烐�)', dist: 220, rate: 4.0, status: '24撠𤩺���平', naver: 'https://map.naver.com/p/entry/place/11571617', kakao: 'https://map.kakao.com/?id=7874945', google: 'https://maps.app.goo.gl/atm_gj' },
      { type: '�蘂 �恍堺', name: '�嗅��勗�憭批飛�恍堺 (�亥那銝剖�)', dist: 2800, rate: 4.4, status: '24撠𤩺��亥那', naver: 'https://map.naver.com/p/entry/place/13491823', kakao: 'https://map.kakao.com/?id=7937367', google: 'https://maps.app.goo.gl/hosp_gj' }
    ]
  };

  // ���� RECOMMENDED_ITINERARY derived from canonical itinerary ������������������������������
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
        tr: item.tr || '�𠎠 甇亥�',
        map: item.map || ''
      });
    });
  });

  target.RECOMMENDED_ITINERARY = derivedIti.length > 0 ? derivedIti : [
    { key: 'rec_d1_1', day: '11/13', time: '17:00', desc: '�烐絲璈笔聦 (PUS) �亙� - ��⏚�𡁻��䁅��𠬍��钅�𡁶雯�∴��剝�瘚瑁�頠諹秐瘝嗘�蝡躰� 2 �毺�嚗���� Kakao T 蝝� 1.8 �祇�����湧�镼輸𢒰��', tr: '�� 頛閗�+�圈閠 / �� 閮��頠�', map: 'https://map.naver.com/p/entry/place/11585098' },
    { key: 'rec_d1_2', day: '11/13', time: '17:30', desc: '镼輸𢒰憌臬� Check-in - �𤾸�敺见�憌臬� (Urban Groove Hotel) �訾�憭扯��𠬍��𥕢�頛蓥噶�滩���', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13479629' },
    { key: 'rec_d1_3', day: '11/13', time: '18:30', desc: '�𡁻�嚗𡁜㭠霈𡁶�暽賜��㚁�镼輸𢒰摨梹� - 頞�犖瘞� 3.5cm 璆萄����鞊砌��梧�摨堒摱撠�犖隞���喲�暺������㗇�憌賣遛嚗���蠘�嚗钅��交錰�㚁��斗部�靝����嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/11571731' },
    { key: 'rec_d1_4', day: '11/13', time: '20:00', desc: '镼輸𢒰�唬�銵� �� 頞��撌∠旨 - 镼輸𢒰蝡蹱��啗齒�� WOWPASS 摮睃��啣馳����娍��荔��𥕦𧑐銝贝��漤ˇ嚗諹���繧鞎琿��厩�憟嗉�瘣贝�����', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/1057416399' },

    { key: 'rec_d2_1', day: '11/14', time: '10:00', desc: '镼輸𢒰�箇䔄 - �剖𧑐�� 2 �毺��喃葉瘣䂿� 7 �笔枂��郊銵諹秐撠暹策蝡踺��', tr: '�� �圈閠 2 �毺�', map: '' },
    { key: 'rec_d2_2', day: '11/14', time: '11:00', desc: '瘚琿𤩅�啣予蝛箄��𠰴�頠𠺪�撠暹策 �� �埝�瘚佗� - 銵屸��潮��嗉��㮖���蔗�脣儔�方�撱��鈭怠��䭾絲�渡洵銝��垍咱閰梁��胯��', tr: '�黾 �惩��𡑒�', map: 'https://map.naver.com/p/entry/place/1335043818' },
    { key: 'rec_d2_3', day: '11/14', time: '13:00', desc: '�埝�瘚行絲擙桃�鞎嘥�擗� - 瞍急郊�𣬚�擃䀹�瘚瑟艶撟喃漱�𤘪��～����賡�摮鞟�憛𠉛��㵪�����剔������絲擙格�暻萸��', tr: '�𠎠 甇亥�', map: '' },
    { key: 'rec_d2_4', day: '11/14', time: '14:30', desc: '�唬��𣬚蓡鞎� Spa Land 鈭娍�蝝𡁏��詨� - �� 2 �毺��� Centum City 蝡嗵凒�𠾼���撽堒予�嗆澈瘜㕑雲皝胯���蝢𡃏�瘥𥕦溝�准����啁�蝐喲��滨��餌��卝��', tr: '�� �圈閠 2 �毺�', map: 'https://map.naver.com/p/entry/place/13479633' },
    { key: 'rec_d2_5', day: '11/14', time: '19:00', desc: '撱���峕絲瘞湔絕�� �� M �∩犖璈毺��怎� - �鞟��祆鴌�暹��𤘪嵗甇��𡢅�10 ��秐�𥪜僑 2 ����砍聦甈∟矽�渡� 19:00 �� 20:00嚗�𢒰撠滚誨摰匧之璈讠��函��劐澈�冽�擗琜�甈��憭𦦵征�貊蓡�嗥�鈭箸��匧蔣蝘�����怒��', tr: '�� �圈閠 2 �毺�', map: 'https://map.naver.com/p/entry/place/13491414' },

    { key: 'rec_d3_1', day: '11/15', time: '09:30', desc: '镼輸𢒰�箇䔄 �� �𨅯控蝡蹱𨰹 KTX �游��嗅� - �� 1 �毺��喲�撅梁�頧劐�擃㗛閠嚗���� 30 ����湧��嗅�蝡辷�嚗�枂蝡躰� Kakao T �湧�����䁅楝��', tr: '�� KTX 擃㗛閠 (30��) + �� 閮��頠�', map: '' },
    { key: 'rec_d3_2', day: '11/15', time: '12:00', desc: '���嚗锭olsot (�䇹�) 鈭箸除�枏��𣈯ㄞ - 敹���𥟇��𣈯ㄞ���擳𡁻�憌荔��硋枂銝駁�敺��擃䀹僖瘜典��梁𨺗�𧢲��粹�瞈��撌湔偌��', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/11571731' },
    { key: 'rec_d3_3', day: '11/15', time: '13:30', desc: '�梯楝�𤘪�霈𡃏澈 �� 憭折险�穃��� - �煾�蝎曄溶擃㗛�摰桀遠�𤘪���楊擃柴���鞾�蟡券俈����鉝�𡢅�憭折险�穃���撌脣��Ｗ���蟡剁�憭拚收憛𡁜��典�擗刻𥅾������西頃 3,000 �枏�嚗㚁�瞍急郊�券�暺���𤩺��栞�撌典之�文４蝢斗�隞蹱除憭抒�嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13491807' },
    { key: 'rec_d3_4', day: '11/15', time: '16:00', desc: '��移璈见��扳憤甇� - �梁��券�㰘艘撱𦠜��折��脣��質�皞芣�瘞游蔣��', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13479633' },
    { key: 'rec_d3_5', day: '11/15', time: '19:00', desc: '�勗悅���瘙𩤃���捶瘙𩤃�憭Ｗ劂憭𨀣艶 - �斗鰵蝢�悅畾踹銁���典��梶��𦒘��埝��潭�瘞港葉嚗𥟇窒�𥪜��鞟鸊蝯脰緒�剔��㕑絲�詻�峕�撌𧼮���熊���滩��𣬚��烾��滚��剛�餈娪�撅晞��', tr: '�𠎠 甇亥� + �� KTX', map: 'https://map.naver.com/p/entry/place/13491823' },

    { key: 'rec_d4_1', day: '11/16', time: '10:45', desc: '�曉雀瘚瑚�蝥𡏭�嚗�偌�嗉�撱���� 樴滚悅�脩垢甇仿� - �埈策蝡躰� Kakao T �湧����蝡踺��𨰹銋㗛�𤩺�頠𠰴�頝刻�瘚瑞�靽舐纎蝣扳絲嚗峕憤甇亙辣隡貉秐瘚瑚葉��𤩅蝡舀郊�瓐��', tr: '�� 閮��頠� + �黾 瘞湔榊蝥𡏭�', map: 'https://map.naver.com/p/entry/place/36735520' },
    { key: 'rec_d4_2', day: '11/16', time: '13:00', desc: '敶勗雀�賣滓�䀹��𡝗� �� �𧢲絲���暻� - �枏�����㗛�撠澆蔗蝜芷�璇航��踝�����𧢲絲�曄��厰熊嚗𣬚忽璇剜絲撗賊银�栞�敶拍鼓憯�𧞄�滨���', tr: '�� �祈� / �� 閮��頠�', map: 'https://map.naver.com/p/entry/place/1057416399' },
    { key: 'rec_d4_3', day: '11/16', time: '16:00', desc: 'Footbath Cafe View 2�笔�嚗�絲�舐移瘝寡雲皝荔� - �Ｘ�憭抒�瘚瑟艶�賢𧑐蝒埈部皞怎�擐蹱�蝎暹硃頞單絕嚗諹�蝺抵粥鈭��憭拍��躰��脣�嚗屸��嘥��⊿��见�瘚瑕之�寡�憭閖蒾嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B02%ED%98%B8%EC%A0%90' },
    { key: 'rec_d4_4', day: '11/16', time: '18:30', desc: '鞊芾虾�𡁻�嚗𡁏絲�函��恍偵擳𡁻ㄞ嚗�㟲諈� 瘚琿𤩅�啣�嚗� - �鞱楊瘚瑁�蝔贝��豢�皞嗪�𡁜㨃�𡢅�篣域���, 賱��堅𨯙��窱韒� 窵𡢾���窱� 鴔��䁯� �渥𠂔��諢� 穈�鴥潰���.嚗�粥�𨅯控皜臬之璈贝艘�见��栞�撱��憭扳�憭𨀣艶蝺𡁶凒�娍絲�脣蝱嚗剹��掖�嗆�敹���餅綫�衣��恍偵擳𡁻ㄞ銝匧���', tr: '�� 閮��頠� (頝券�憭扳�)', map: 'https://map.naver.com/p/entry/place/11571731' },

    { key: 'rec_d5_1', day: '11/17', time: '09:30', desc: '���� �� Zimcarry 銵峕��游�璈笔聦 - �刻正�Ｗ𧑐�萇� Zimcarry �𡁻�鈭支�銵峕�嚗𣬚凒�仿���秐�烐絲璈笔聦�箏�憭批輒嚗���讠征蝛粹�𥡝��齿�銵峕�嚗�', tr: '�𠎠 甇亥�', map: '' },
    { key: 'rec_d5_2', day: '11/17', time: '10:00', desc: '镼輸𢒰�����敺諹��箸�鞎� - 銵嘥�璅�予頞�����蝔���∟眺瘚瑁�����厰熊暺𤑳�����堒側嚗𢏗live Young 鋆𣈯�蝢𤾸�靽嗪�����', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/1057416399' },
    { key: 'rec_d5_3', day: '11/17', time: '12:00', desc: '���嚗𡁏𨭬�𡃏��墧僖嚗�正�Ｗ�嚗� - �湧塀擙桀咿蝡亙��𧼮�皛輻陳蝐喋��犖�䁅�蝝��嚗𣬚��格�憟嗥蒾�脫����皝荔���除皛踵遛�噼�嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13491807' },
    { key: 'rec_d5_4', day: '11/17', time: '12:30', desc: '�毺��滚��烐絲璈笔聦 (PUS) - �剖𧑐�� 2 �毺�頧㕑�頠峕��怨��滚��烐絲�钅�璈笔聦��', tr: '�� �圈閠+頛閗� / �� 閮��頠�', map: 'https://map.naver.com/p/entry/place/11585098' },
    { key: 'rec_d5_5', day: '11/17', time: '13:00', desc: '璈笔聦 Zimcarry �䁅��� �� ��蝔� �� �餅� - �澆��𤤿� 2 璅枏枂憓�之撱� Zimcarry 瑹�狗�睃�銵峕�蝞梧�撠�繧鞎瑟��拙��嗅末��絲�𨀣��啣���蝔�鱓�条𣶹�𡢅�憭折��芰征 KE2085 (14:50 韏琿�) 閮烾��餅�餈𥪜蝱��', tr: '��� 憌𥟇� (KE2085 14:50)', map: '' }
  ];
})();
/*

    { key: 'rec_d3_1', day: '11/15', time: '09:30', desc: '镼輸𢒰�箇䔄 �� �𨅯控蝡蹱𨰹 KTX �游��嗅� - �� 1 �毺��喲�撅梁�頧劐�擃㗛閠嚗���� 30 ����湧��嗅�蝡辷�嚗�枂蝡躰� Kakao T �湧�����䁅楝��', tr: '�� KTX 擃㗛閠 (30��) + �� 閮��頠�', map: '' },
    { key: 'rec_d3_2', day: '11/15', time: '12:00', desc: '���嚗锭olsot (�䇹�) 鈭箸除�枏��𣈯ㄞ - 敹���𥟇��𣈯ㄞ���擳𡁻�憌荔��硋枂銝駁�敺��擃䀹僖瘜典��梁𨺗�𧢲��粹�瞈��撌湔偌��', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/11571731' },
    { key: 'rec_d3_3', day: '11/15', time: '13:30', desc: '�梯楝�𤘪�霈𡃏澈 �� 憭折险�穃��� - �煾�蝎曄溶擃㗛�摰桀遠�𤘪���楊擃柴���鞾�蟡券俈����鉝�𡢅�憭折险�穃���撌脣��Ｗ���蟡剁�憭拚收憛𡁜��典�擗刻𥅾������西頃 3,000 �枏�嚗㚁�瞍急郊�券�暺���𤩺��栞�撌典之�文４蝢斗�隞蹱除憭抒�嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13491807' },
    { key: 'rec_d3_4', day: '11/15', time: '16:00', desc: '��移璈见��扳憤甇� - �梁��券�㰘艘撱𦠜��折��脣��質�皞芣�瘞游蔣��', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13479633' },
    { key: 'rec_d3_5', day: '11/15', time: '19:00', desc: '�勗悅���瘙𩤃���捶瘙𩤃�憭Ｗ劂憭𨀣艶 - �斗鰵蝢�悅畾踹銁���典��梶��𦒘��埝��潭�瘞港葉嚗𥟇窒�𥪜��鞟鸊蝯脰緒�剔��㕑絲�詻�峕�撌𧼮���熊���滩��𣬚��烾��滚��剛�餈娪�撅晞��', tr: '�𠎠 甇亥� + �� KTX', map: 'https://map.naver.com/p/entry/place/13491823' },

    { key: 'rec_d4_1', day: '11/16', time: '10:45', desc: '�曉雀瘚瑚�蝥𡏭�嚗�偌�嗉�撱���� 樴滚悅�脩垢甇仿� - �埈策蝡躰� Kakao T �湧����蝡踺��𨰹銋㗛�𤩺�頠𠰴�頝刻�瘚瑞�靽舐纎蝣扳絲嚗峕憤甇亙辣隡貉秐瘚瑚葉��𤩅蝡舀郊�瓐��', tr: '�� 閮��頠� + �黾 瘞湔榊蝥𡏭�', map: 'https://map.naver.com/p/entry/place/36735520' },
    { key: 'rec_d4_2', day: '11/16', time: '13:00', desc: '敶勗雀�賣滓�䀹��𡝗� �� �𧢲絲���暻� - �枏�����㗛�撠澆蔗蝜芷�璇航��踝�����𧢲絲�曄��厰熊嚗𣬚忽璇剜絲撗賊银�栞�敶拍鼓憯�𧞄�滨���', tr: '�� �祈� / �� 閮��頠�', map: 'https://map.naver.com/p/entry/place/1057416399' },
    { key: 'rec_d4_3', day: '11/16', time: '16:00', desc: 'Footbath Cafe View 2�笔�嚗�絲�舐移瘝寡雲皝荔� - �Ｘ�憭抒�瘚瑟艶�賢𧑐蝒埈部皞怎�擐蹱�蝎暹硃頞單絕嚗諹�蝺抵粥鈭��憭拍��躰��脣�嚗屸��嘥��⊿��见�瘚瑕之�寡�憭閖蒾嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B02%ED%98%B8%EC%A0%90' },
    { key: 'rec_d4_4', day: '11/16', time: '18:30', desc: '鞊芾虾�𡁻�嚗𡁏絲�函��恍偵擳𡁻ㄞ嚗�㟲諈� 瘚琿𤩅�啣�嚗� - �鞱楊瘚瑁�蝔贝��豢�皞嗪�𡁜㨃�𡢅�篣域���, 賱��堅𨯙��窱韒� 窵𡢾���窱� 鴔��䁯� �渥𠂔��諢� 穈�鴥潰���.嚗�粥�𨅯控皜臬之璈贝艘�见��栞�撱��憭扳�憭𨀣艶蝺𡁶凒�娍絲�脣蝱嚗剹��掖�嗆�敹���餅綫�衣��恍偵擳𡁻ㄞ銝匧���', tr: '�� 閮��頠� (頝券�憭扳�)', map: 'https://map.naver.com/p/entry/place/11571731' },

    { key: 'rec_d5_1', day: '11/17', time: '09:30', desc: '���� �� Zimcarry 銵峕��游�璈笔聦 - �刻正�Ｗ𧑐�萇� Zimcarry �𡁻�鈭支�銵峕�嚗𣬚凒�仿���秐�烐絲璈笔聦�箏�憭批輒嚗���讠征蝛粹�𥡝��齿�銵峕�嚗�', tr: '�𠎠 甇亥�', map: '' },
    { key: 'rec_d5_2', day: '11/17', time: '10:00', desc: '镼輸𢒰�����敺諹��箸�鞎� - 銵嘥�璅�予頞�����蝔���∟眺瘚瑁�����厰熊暺𤑳�����堒側嚗𢏗live Young 鋆𣈯�蝢𤾸�靽嗪�����', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/1057416399' },
    { key: 'rec_d5_3', day: '11/17', time: '12:00', desc: '���嚗𡁏𨭬�𡃏��墧僖嚗�正�Ｗ�嚗� - �湧塀擙桀咿蝡亙��𧼮�皛輻陳蝐喋��犖�䁅�蝝��嚗𣬚��格�憟嗥蒾�脫����皝荔���除皛踵遛�噼�嚗�', tr: '�𠎠 甇亥�', map: 'https://map.naver.com/p/entry/place/13491807' },
    { key: 'rec_d5_4', day: '11/17', time: '12:30', desc: '�毺��滚��烐絲璈笔聦 (PUS) - �剖𧑐�� 2 �毺�頧㕑�頠峕��怨��滚��烐絲�钅�璈笔聦��', tr: '�� �圈閠+頛閗� / �� 閮��頠�', map: 'https://map.naver.com/p/entry/place/11585098' },
    { key: 'rec_d5_5', day: '11/17', time: '13:00', desc: '璈笔聦 Zimcarry �䁅��� �� ��蝔� �� �餅� - �澆��𤤿� 2 璅枏枂憓�之撱� Zimcarry 瑹�狗�睃�銵峕�蝞梧�撠�繧鞎瑟��拙��嗅末��絲�𨀣��啣���蝔�鱓�条𣶹�𡢅�憭折��芰征 KE2085 (14:50 韏琿�) 閮烾��餅�餈𥪜蝱��', tr: '��� 憌𥟇� (KE2085 14:50)', map: '' }
  ];
})(); */

