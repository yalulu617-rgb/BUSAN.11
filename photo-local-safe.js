/* BUSAN.11 Photo-local-safety patch. Local review only, NOT deployed.
 * Purpose: preserve selected original photo before any remote upload;
 * extract EXIF capture time/GPS (when supplied), show pending photos locally,
 * distinguish device storage from remote sync. Never clears user data.
 * Load after js/app.js and services/utils.js, in addition to restaurant-save-guard.js.
 */
(function (w, d) {
  'use strict';
  const NAME = 'busan11_photo_local_v1';
  const STORE = 'pendingPhotos';
  const BYTES_LIMIT = 1024 * 1024;
  const urlById = new Map();
  let refreshGeneration = 0;
  const htmlSafe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!w.indexedDB) { reject(new Error('此瀏覽器沒有本機照片儲存功能')); return; }
      const request = w.indexedDB.open(NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath:'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('開啟照片資料庫失敗'));
      request.onblocked = () => reject(new Error('照片資料庫正在被其他分頁使用'));
    });
  }
  async function tx(mode, act) {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode), request = act(t.objectStore(STORE));
        let result;
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('照片讀寫失敗'));
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error || new Error('照片存檔失敗'));
        t.onabort = () => reject(t.error || new Error('照片存檔取消'));
      });
    } finally { db.close(); }
  }
  const put = record => tx('readwrite', store => store.put(record));
  const all = () => tx('readonly', store => store.getAll());
  const remove = id => tx('readwrite', store => store.delete(id));

  // Minimal bounded JPEG EXIF/TIFF reader; no library, network, or geocoder.
  // Capture date and GPS come from original photo, BEFORE Canvas removes EXIF.
  async function readExif(file) {
    const out = {capturedAt:null, latitude:null, longitude:null, locationStatus:'missing'};
    if (!file || !(/image\/jpeg/i.test(file.type) || /\.jpe?g$/i.test(file.name || ''))) return out;
    const buf = await file.slice(0, BYTES_LIMIT).arrayBuffer();
    const view = new DataView(buf); const n = view.byteLength;
    if (n < 4 || view.getUint16(0) !== 0xffd8) return out;
    let pos=2;
    while (pos + 4 <= n && view.getUint8(pos) === 0xff) {
      const marker = view.getUint8(pos+1);
      if (marker === 0xda || marker === 0xd9) break;
      const len=view.getUint16(pos+2);
      if (len < 2 || pos+2+len > n) break;
      if (marker === 0xe1 && len >= 8 &&
          String.fromCharCode(...new Uint8Array(buf,pos+4,6)) === 'Exif\0\0') {
        const base=pos+10, max=pos+2+len;
        if (base+8 > max) break;
        const order=view.getUint16(base), le=order===0x4949;
        if (!le && order!==0x4d4d) break;
        const u16=p => { if(p<base||p+2>max) throw Error('EXIF bounds'); return view.getUint16(p,le); };
        const u32=p => { if(p<base||p+4>max) throw Error('EXIF bounds'); return view.getUint32(p,le); };
        if (u16(base+2)!==42) break;
        const readEntries = offset => {
          const at=base+offset;
          if (at<base+8 || at+2>max) return new Map();
          const ct=u16(at); if(ct>256 || at+2+ct*12+4>max)return new Map();
          const entries=new Map();
          for(let i=0;i<ct;i++){
            const p=at+2+i*12, tag=u16(p), type=u16(p+2), count=u32(p+4), offsetOrValue=u32(p+8);
            entries.set(tag,{p,type,count,offset:offsetOrValue});
          }
          return entries;
        };
        const valueBytes = entry => {
          if(!entry) return null;
          const width=({1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8})[entry.type];
          if(!width || entry.count<1 || entry.count>2048)return null;
          const size=width*entry.count;
          const at=size<=4?entry.p+8:base+entry.offset;
          if(at<base || at+size>max)return null;
          return {at,size};
        };
        const ascii=entry=>{const r=valueBytes(entry);if(!r)return null;
          return Array.from(new Uint8Array(buf,r.at,r.size)).map(x=>String.fromCharCode(x)).join('').replace(/\0.*$/,'').trim();};
        const rational=(entry,i)=>{const r=valueBytes(entry);if(!r||entry.type!==5||i>=entry.count)return NaN;
          const num=u32(r.at+i*8),den=u32(r.at+i*8+4);return den?num/den:NaN;};
        try {
          const main=readEntries(u32(base+4));
          const extEntry=main.get(0x8769);
          const exif=extEntry&&extEntry.type===4?readEntries(extEntry.offset):new Map();
          const dt=ascii(exif.get(0x9003)) || ascii(main.get(0x0132));
          if(dt && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(dt)){
            out.capturedAt=dt.slice(0,4)+'-'+dt.slice(5,7)+'-'+dt.slice(8,10)+'T'+dt.slice(11);
          }
          const gpsEntry=main.get(0x8825);
          const gps=gpsEntry&&gpsEntry.type===4?readEntries(gpsEntry.offset):new Map();
          const coord=(tag,refTag,allow)=>{
            const e=gps.get(tag),ref=ascii(gps.get(refTag))?.toUpperCase();
            if(!e||e.type!==5||e.count!==3||!allow.includes(ref)) return null;
            const parts=[rational(e,0),rational(e,1),rational(e,2)];
            if(!parts.every(Number.isFinite)||parts[1]>=60||parts[2]>=60)return null;
            const v=parts[0]+parts[1]/60+parts[2]/3600;
            return v*(ref===allow[1]?-1:1);
          };
          const latitude=coord(2,1,['N','S']),longitude=coord(4,3,['E','W']);
          if(latitude!==null&&longitude!==null&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180){
            out.latitude=Number(latitude.toFixed(6));out.longitude=Number(longitude.toFixed(6));out.locationStatus='gps';
          }
        }catch(exifError){console.warn('[PhotoLocal] Invalid EXIF data; photo still preserved',exifError.message);}
        break;
      }
      pos+=2+len;
    }
    return out;
  }

  const message=(msg,kind='info')=>{const el=d.getElementById('photoUploadStatus');if(el)el.textContent=msg;
    if(typeof w.showToast==='function')w.showToast(msg,kind);};
  const localRow=record=>{
    if(!urlById.has(record.id)) urlById.set(record.id,w.URL.createObjectURL(record.blob));
    return {key:record.id,url:urlById.get(record.id),date:record.metadata.capturedAt?.slice(0,10) || '拍攝日期待補',
      capturedAt:record.metadata.capturedAt,latitude:record.metadata.latitude,longitude:record.metadata.longitude,
      localOnly:true,pendingSync:true};
  };
  const upstreamRender=w.renderMemoryAlbum;
  async function refreshAlbum(){
    if(typeof upstreamRender!=='function')return;
    const seq=++refreshGeneration;
    let stored;
    try{stored=await all();}catch(e){console.warn('[PhotoLocal] Cannot read local photos',e);return;}
    if(seq!==refreshGeneration)return;
    const remote=(Array.isArray(w.photoList)?w.photoList:[]).filter(x=>!x.localOnly);
    w.photoList=remote.concat(stored.map(localRow));
    upstreamRender();
    const localCount=stored.length;
    const label=d.getElementById('photoLocalCount');
    if(label){
      label.textContent=localCount?`📱 ${localCount} 張照片只保存在此裝置；尚未同步雙人相簿。`:' ';
      if(localCount){
        const retry=d.createElement('button');retry.type='button';retry.id='photoRetrySync';retry.textContent='重試同步';
        retry.style.cssText='margin-left:8px;min-height:36px;padding:4px 12px;border-radius:10px;border:1px solid #c9a26b;background:#fff4de;color:#7a4a1c;font-weight:800;';
        retry.addEventListener('click',()=>{void w.retryPendingPhotos();});
        label.appendChild(retry);
      }
    }
  }
  w.renderMemoryAlbum=function(){void refreshAlbum();};
  const upstreamDelete=w.deleteCurrentPhoto;
  w.deleteCurrentPhoto=async function(){
    const id=w.currentLightboxKey;
    if(!String(id||'').startsWith('local_photo_'))return upstreamDelete?.apply(this,arguments);
    if(!w.confirm('確認刪除此裝置上的照片？此操作不可還原。'))return;
    try{await remove(id); const url=urlById.get(id); if(url)w.URL.revokeObjectURL(url);urlById.delete(id);
      w.photoList=(w.photoList||[]).filter(x=>x.key!==id);w.closeLightbox?.();await refreshAlbum();message('已刪除此裝置照片','success');}
    catch(e){message('本機照片刪除失敗；原資料保留','error');}
  };

  // Upload one locally stored original. Local bytes are removed ONLY after the remote record is confirmed.
  // `syncing` guards against a double tap creating duplicate remote rows for the same local id.
  const syncing=new Set();
  async function syncEntry(entry){
    if(syncing.has(entry.id))return false;
    syncing.add(entry.id);
    try{
      if(w.navigator.onLine===false || !w.NetworkEngine?._db)return false;
      // Send a compressed image to ImgBB without exposing original EXIF payload.
      const compressed=await w.compressImage(entry.blob);
      const uploaded=await w.NetworkEngine.uploadImage(compressed);
      if(uploaded?.success!==true || !uploaded?.data?.url)return false;
      const result=await w.NetworkEngine.firebasePush(w.DB_PHOTOS,{
        url:uploaded.data.url,date:entry.metadata.capturedAt?.slice(0,10)||'',
        capturedAt:entry.metadata.capturedAt||null,location:entry.metadata.locationStatus==='gps' ?
          {latitude:entry.metadata.latitude,longitude:entry.metadata.longitude}:null,
        timestamp:Date.now()
      });
      if(result?.success===true && typeof result.data?.key==='string' && result.data.key){
        w.photoList=Array.isArray(w.photoList)?w.photoList:[];
        if(!w.photoList.some(x=>x.key===result.data.key))w.photoList.push({key:result.data.key,url:uploaded.data.url,
          date:entry.metadata.capturedAt?.slice(0,10)||'拍攝日期待補',
          capturedAt:entry.metadata.capturedAt,latitude:entry.metadata.latitude,longitude:entry.metadata.longitude,
          city:entry.metadata.locationStatus==='gps' ? entry.metadata.latitude+', '+entry.metadata.longitude : '無定位'});
        await remove(entry.id);const url=urlById.get(entry.id);if(url)w.URL.revokeObjectURL(url);
        urlById.delete(entry.id);
        return true;
      }
    }catch(e){console.warn('[PhotoLocal] Upload failed; original still locally stored',e);}
    finally{syncing.delete(entry.id);}
    return false;
  }
  w.retryPendingPhotos=async function(){
    let stored;
    try{stored=await all();}catch(e){message('本機照片讀取失敗；原資料保留','error');return;}
    if(!stored.length){message('沒有待同步照片','info');return;}
    let ok=0;
    for(const entry of stored){if(await syncEntry(entry))ok++;}
    await refreshAlbum();
    const left=stored.length-ok;
    message(left?`已同步 ${ok} 張；仍有 ${left} 張只保存在此裝置`:`✅ ${ok} 張已同步雙人相簿`,left?'warning':'success');
  };

  w.uploadMultipleToImgBB=async function(files){
    const selected=Array.from(files||[]);
    if(!selected.length)return;
    let localSaved=0,cloudSaved=0,failed=0;
    for(const file of selected){
      let entry;
      try{
        if(!file.type.startsWith('image/'))throw Error('不是圖片');
        const metadata=await readExif(file);
        if(!metadata.capturedAt && Number.isFinite(file.lastModified))metadata.fileModifiedAt=new Date(file.lastModified).toISOString();
        const id='local_photo_'+w.crypto.randomUUID().replace(/-/g,'');
        entry={id,blob:file,filename:file.name,metadata,createdAt:Date.now()};
        // First guarantee the original bytes survive reload while ImgBB/Firebase may fail.
        await put(entry);localSaved++;
      }catch(e){failed++;console.error('[PhotoLocal] Local save failed',e);continue;}
      if(await syncEntry(entry))cloudSaved++;
    }
    await refreshAlbum();
    const pending=localSaved-cloudSaved;
    if(failed)message(`⚠️ 已在此裝置保存 ${localSaved}/${selected.length} 張；${failed} 張未保存，請勿關閉原始照片。`,'error');
    else if(pending)message(`📱 已保存 ${localSaved}/${selected.length} 張；其中 ${pending} 張僅在此裝置，尚未同步。`,'warning');
    else message(`✅ ${cloudSaved}/${selected.length} 張已同步雙人相簿。`,'success');
    const picker=d.getElementById('photoImgUpload');if(picker)picker.value='';
  };
  w.PhotoLocalSafety={readExif,refreshAlbum,getPending:all};
  const initialize=()=>{
    const status=d.getElementById('photoUploadStatus');
    if(status && !d.getElementById('photoLocalCount')){
      const label=d.createElement('div');label.id='photoLocalCount';label.setAttribute('role','status');
      label.style.cssText='font-size:.78rem;color:#845232;font-weight:700;margin:8px 0;';
      status.insertAdjacentElement('afterend',label);
    }
    void refreshAlbum();
  };
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true}); else initialize();
})(window,document);
