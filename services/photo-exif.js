// OWNER photo metadata inspection and durable on-device fallback.
// No coordinates are sent to image hosts or Firebase by this module.
(function(target){
  'use strict';
  const DB='busan11-photo-local-v1', CACHE='photos', META='metadata';
  let localUrls=new Map();
  target.localPhotoList=target.localPhotoList||[];
  target.photoCaptureMeta=target.photoCaptureMeta||{};

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{
        if(!req.result.objectStoreNames.contains(CACHE))req.result.createObjectStore(CACHE,{keyPath:'key'});
        if(!req.result.objectStoreNames.contains(META))req.result.createObjectStore(META,{keyPath:'key'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('手機相簿儲存無法開啟'));
    });
  }
  async function transaction(store,mode,method,value){
    const db=await openDb();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode),r=tx.objectStore(store)[method](value);
      let item;
      r.onsuccess=()=>{item=r.result;};
      tx.oncomplete=()=>resolve(item);
      tx.onabort=()=>reject(tx.error||new Error('手機相簿儲存已取消'));
      tx.onerror=()=>reject(tx.error||new Error('手機相簿儲存失敗'));
    });}finally{db.close();}
  }
  function inspectExif(bytes){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    const len=bytes.length,empty={dateTime:null,gps:null,supported:true};
    if(len<4||view.getUint16(0,false)!==0xFFD8)return {...empty,supported:false};
    let pos=2,base=-1;
    while(pos+4<len){
      if(bytes[pos]!==0xff){pos++;continue;}
      while(bytes[pos]===0xff)pos++;
      const marker=bytes[pos++];
      if(marker===0xda||marker===0xd9)break;
      if(pos+2>len)break;
      const length=view.getUint16(pos,false);
      if(length<2||pos+length>len)break;
      const start=pos+2;
      if(marker===0xe1 && length>=10 && String.fromCharCode(...bytes.subarray(start,start+4))==='Exif' && bytes[start+4]===0 && bytes[start+5]===0){base=start+6;break;}
      pos+=length;
    }
    if(base<0||base+8>len)return empty;
    const little=bytes[base]===0x49&&bytes[base+1]===0x49;
    if(!little&&!(bytes[base]===0x4d&&bytes[base+1]===0x4d))return empty;
    const u16=i=>i>=base&&i+2<=len?view.getUint16(i,little):0;
    const u32=i=>i>=base&&i+4<=len?view.getUint32(i,little):0;
    if(u16(base+2)!==42)return empty;
    const ascii=(off,n)=>{
      if(off<base||off+n>len||n>128)return '';
      return String.fromCharCode(...bytes.subarray(off,off+n)).replace(/\0.*$/,'').trim();
    };
    function entries(offset){
      const start=base+offset;
      if(!offset||start<base||start+2>len)return {};
      const count=u16(start);
      if(count>256||start+2+count*12>len)return {};
      const found={};
      for(let i=0;i<count;i++){
        const p=start+2+12*i,tag=u16(p),type=u16(p+2),n=u32(p+4),val=u32(p+8);
        if(n>2048)continue;
        const size=({1:1,2:1,3:2,4:4,5:8,7:1,10:8})[type]||0;
        const bytesN=size*n,where=bytesN<=4?p+8:base+val;
        if(!size||where<base||where+bytesN>len)continue;
        found[tag]={type,n,p:where,val};
      }
      return found;
    }
    const first=entries(u32(base+4)),exif=entries(first[0x8769]?.val),gps=entries(first[0x8825]?.val);
    function strTag(table,tag){const x=table[tag];return x&&x.type===2?ascii(x.p,x.n):'';}
    const dateTime=strTag(exif,0x9003)||strTag(exif,0x9004)||strTag(first,0x0132)||null;
    function rationalAt(ptr){const den=u32(ptr+4);return den?u32(ptr)/den:null;}
    function coordinate(refTag,valueTag,neg){
      const ref=strTag(gps,refTag).toUpperCase(),v=gps[valueTag];
      if(!ref||!v||v.type!==5||v.n!==3)return null;
      const x=[0,8,16].map(n=>rationalAt(v.p+n));
      if(x.some(a=>a===null||!Number.isFinite(a)))return null;
      const sum=x[0]+x[1]/60+x[2]/3600;
      if(sum>(neg==='S'?90:180))return null;
      return ['S','W'].includes(ref)?-sum:sum;
    }
    const lat=coordinate(1,2,'S'),lon=coordinate(3,4,'W');
    return {dateTime,gps:lat!==null&&lon!==null?{lat,lon}:null,supported:true};
  }
  async function inspect(file){
    if(!file)throw new Error('請選擇原始照片');
    const mime=(file.type||'').toLowerCase();
    if(mime && !/image\/(jpeg|jpg)/.test(mime) && !/\.jpe?g$/i.test(file.name||''))
      return {dateTime:null,gps:null,supported:false,reason:'目前僅能解析原始 JPG/JPEG 的 EXIF；HEIC、截圖或轉傳檔可能沒有可讀 GPS'};
    const bytes=new Uint8Array(await file.slice(0,Math.min(file.size,512*1024)).arrayBuffer());
    return inspectExif(bytes);
  }
  function label(info){
    if(!info?.supported)return info?.reason||'不是可解析的 JPG 原始照片';
    const d=info.dateTime?'拍攝時間：'+info.dateTime:'拍攝時間：無 EXIF';
    const gps=info.gps?'GPS：'+info.gps.lat.toFixed(5)+', '+info.gps.lon.toFixed(5):'GPS：原檔沒有可讀定位';
    return d+'｜'+gps;
  }
  async function check(file){
    const node=document.getElementById('photoMetadataStatus');
    if(node)node.textContent='正在從照片原檔讀取 EXIF（不會上傳）…';
    try{const info=await inspect(file);if(node)node.textContent=label(info);return info;}
    catch(e){if(node)node.textContent='無法讀取原照片：'+e.message;return null;}
  }
  async function remember(key,info){
    if(!key||!info)return;
    const value={key,dateTime:info.dateTime||null,gps:info.gps||null};
    await transaction(META,'readwrite','put',value);
    target.photoCaptureMeta[key]=value;
  }
  async function restore(){
    const [photos,meta]=await Promise.all([transaction(CACHE,'readonly','getAll'),transaction(META,'readonly','getAll')]);
    for(const url of localUrls.values())URL.revokeObjectURL(url);
    localUrls.clear();
    target.photoCaptureMeta=Object.fromEntries((meta||[]).map(x=>[x.key,x]));
    target.localPhotoList=(photos||[]).map(p=>{
      const url=URL.createObjectURL(p.blob);localUrls.set(p.key,url);
      return{key:p.key,url,date:p.date,timestamp:p.timestamp,localOnly:true,name:p.name||'',captureDate:p.captureDate||'',gps:p.gps||null};
    });
    if(typeof target.renderMemoryAlbum==='function')target.renderMemoryAlbum();
    if(typeof target.triggerContextUpdate==='function')target.triggerContextUpdate();
  }
  async function saveLocal(file,info){
    if(!file||!file.size)throw new Error('照片檔案為空');
    if(file.size>30*1024*1024)throw new Error('本機單張照片不可超過30MB');
    const key='local_'+(target.crypto?.randomUUID?.()||String(Date.now())+'_'+Math.random().toString(16).slice(2));
    const captureDate=info?.dateTime||'';
    const day=captureDate&&/^\d{4}:\d\d:\d\d/.test(captureDate)?captureDate.slice(5,10).replace(':','/'):(typeof target.getV37SelectedDate==='function'?target.getV37SelectedDate():'');
    await transaction(CACHE,'readwrite','put',{key,blob:file,name:file.name||'',captureDate,gps:info?.gps||null,date:day,timestamp:Date.now()});
    await restore();
    return key;
  }
  async function removeLocal(key){await transaction(CACHE,'readwrite','delete',key);await restore();}
  target.PhotoExif=Object.freeze({inspect,check,remember,label,restore,saveLocal,removeLocal});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>restore().catch(e=>console.warn('[PhotoExif] local metadata unavailable',e)));
  else restore().catch(e=>console.warn('[PhotoExif] local metadata unavailable',e));
})(window);
