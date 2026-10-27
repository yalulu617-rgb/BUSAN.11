// BUSAN.11 V46: pure, read-only day-by-day trip companion.
// Never infer actual arrival or completed stops from a clock or GPS.
(function(target) {
  'use strict';
  const DAYS=['2026-11-13','2026-11-14','2026-11-15','2026-11-16','2026-11-17'];
  const parseClock = item => {
    const m=String(item?.time||'').match(/(\d{1,2}):(\d\d)/);
    if(!m) return null;
    const h=Number(m[1]),min=Number(m[2]);
    return h<24&&min<60?h*60+min:null;
  };
  const seoulMinutes=now=>{
    const parts=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(now);
    const number=type=>Number(parts.find(x=>x.type===type)?.value);
    return number('hour')*60+number('minute');
  };
  const validNaver=value=>{
    if(typeof value!=='string')return null;
    try{
      const url=new URL(value);
      if(!['naver.me','map.naver.com'].includes(url.hostname))return null;
      // Some authoritative registry records retain an older http://naver.me
      // shortlink. Upgrade only that known trusted host to HTTPS.
      if(url.protocol==='http:')url.protocol='https:';
      return url.protocol==='https:'?url.href:null;
    }catch{return null;}
  };
  const dayFromIso=iso=>DAYS.includes(iso)?iso.slice(5).replace('-','/'):null;
  const rowsFor=(items,day)=>Array.isArray(items)?items
    .filter(row=>row&&row.day===day&&typeof row.desc==='string'&&row.desc.trim())
    .map((row,initial)=>({row,initial,minutes:parseClock(row)}))
    .sort((a,b)=>a.minutes===null&&b.minutes===null?a.initial-b.initial:
      a.minutes===null?1:b.minutes===null?-1:
      a.minutes-b.minutes||a.initial-b.initial).map(x=>x.row):[];
  function createModel(input={}) {
    const iso=input.iso,day=dayFromIso(iso);
    if(!day)return {available:false,day:null,stops:[],index:0,count:0};
    const items=rowsFor(input.itinerary,day);
    const today=input.today;
    const live=today===iso;
    const now=input.now instanceof Date?input.now:new Date(input.now||Date.now());
    const manual=Number.isInteger(input.manualIndex) &&
      input.manualIndex>=0 && input.manualIndex<=items.length?input.manualIndex:null;
    let suggested=0;
    if(live && items.length){
      const minute=seoulMinutes(now);
      // The next scheduled time is a suggestion, NOT confirmation that
      // previous stops were reached. Untimed entries remain selectable manually.
      const i=items.findIndex(row=>{
        const t=parseClock(row);
        return t!==null && t>=minute;
      });
      suggested=i<0?items.length-1:i;
    }
    const index=manual===null?suggested:manual;
    const row=items[index]||null;
    const originalOrdinal=Number(String(row?.key||'').match(/^rec_d\d+_(\d+)$/)?.[1])||0;
    const curated=input.mapKeys?.[day]||{};
    // Explicit null means the registry's original mapKey points to an origin
    // rather than this stop. Never navigate to the wrong end of a transfer.
    const mapKey=Object.prototype.hasOwnProperty.call(curated,originalOrdinal)
      ? curated[originalOrdinal] : (row?.mapKey||'');
    const registry=input.registry||{};
    const naver=validNaver(registry[mapKey]?.naver)||validNaver(row?.map);
    const rawTitle=row?.desc||'';
    const title=rawTitle.includes(' - ')?rawTitle.split(' - ')[0]:rawTitle;
    return {
      available:items.length>0,day,iso,live,
      count:items.length,index,finished:index>=items.length,
      title:title||'今日行程已看完',time:row?.time||'',
      transport:row?.tr||'',
      // Explicit null means the app must show itinerary instead of inventing a link.
      naver:row?naver:null,
      basis:manual!==null?'manual':live?'time':'preview',
      note:manual!==null?'已依你手動選擇的站點顯示（此裝置）':
        live?'依韓國時間提供行程建議，並非已抵達／已完成':
        '行程預覽：可手動切換站點，不代表今日位置',
      nextTitle:items[index+1]?.desc?.split(' - ')[0]||null
    };
  }
  target.V46TripCompanion=Object.freeze({createModel,dayFromIso,validNaver});
})(typeof window !== 'undefined' ? window : globalThis);
