/* BUSAN.11 Photo-local-safety patch. Revision 2026-11-09.
 * Purpose: preserve selected original photo before any remote upload;
 * extract EXIF capture time/GPS (when supplied), show pending photos locally,
 * distinguish device storage from remote sync. Never clears user data.
 * Guarantees idempotent stable Firebase path to prevent duplicate photos on retry.
 * Protects GPS privacy by stripping metadata before public image host upload.
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

  function parseCoordinateStr(str, isLon) {
    if (!str) return null;
    const s = String(str).trim();
    const mDec = /^([+-]?\d+(?:\.\d+)?)\s*([NSEW])?$/i.exec(s);
    if (mDec) {
      let val = parseFloat(mDec[1]);
      const ref = (mDec[2] || '').toUpperCase();
      if (ref === 'S' || ref === 'W') val = -Math.abs(val);
      else if (ref === 'N' || ref === 'E') val = Math.abs(val);
      const max = isLon ? 180 : 90;
      if (Number.isFinite(val) && Math.abs(val) <= max && Math.abs(val) > 0.000001) {
        return Number(val.toFixed(6));
      }
    }
    const mDms = /^(\d+(?:\.\d+)?|\d+\/\d+)[,\s]+(\d+(?:\.\d+)?|\d+\/\d+)(?:[,\s]+(\d+(?:\.\d+)?|\d+\/\d+))?\s*([NSEW])?$/i.exec(s);
    if (mDms) {
      const parsePart = p => {
        if (!p) return 0;
        if (p.includes('/')) {
          const [num, den] = p.split('/').map(Number);
          return den ? num / den : 0;
        }
        return parseFloat(p) || 0;
      };
      const deg = parsePart(mDms[1]);
      const min = parsePart(mDms[2]);
      const sec = parsePart(mDms[3]);
      let val = deg + min / 60 + sec / 3600;
      const ref = (mDms[4] || '').toUpperCase();
      if (ref === 'S' || ref === 'W') val = -Math.abs(val);
      const max = isLon ? 180 : 90;
      if (Number.isFinite(val) && Math.abs(val) <= max && Math.abs(val) > 0.000001) {
        return Number(val.toFixed(6));
      }
    }
    return null;
  }

  function normalizeCapturedAt(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    const m1 = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s);
    if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}T${m1[4]}:${m1[5]}:${m1[6]}`;
    const m2 = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}`;
    const m3 = /^(\d{4})[-:](\d{2})[-:](\d{2})[ T](\d{2}):(\d{2})$/.exec(s);
    if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}T${m3[4]}:${m3[5]}:00`;
    return null;
  }

  // Enhanced bounded JPEG EXIF & XMP reader; no external library, network, or geocoder.
  // Capture date and GPS come from original photo, BEFORE Canvas compression.
  async function readExif(file) {
    const out = {capturedAt:null, latitude:null, longitude:null, locationStatus:'missing', shareGps:true, missingReason:null};
    if (!file) {
      out.missingReason = '無有效相片檔案';
      return out;
    }
    const isJpeg = /image\/jpeg/i.test(file.type) || /\.jpe?g$/i.test(file.name || '');
    if (!isJpeg) {
      const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '');
      out.missingReason = isHeic
        ? 'HEIC/HEIF 格式相片暫不支援直接解析 EXIF 定位，可手動補充拍攝地點'
        : '此圖片格式不含 EXIF GPS 資訊，可手動補充拍攝地點';
      return out;
    }
    let buf;
    try {
      buf = await file.slice(0, BYTES_LIMIT).arrayBuffer();
    } catch (e) {
      out.missingReason = '讀取相片二進位資料失敗';
      return out;
    }
    const view = new DataView(buf); const n = view.byteLength;
    if (n < 4 || view.getUint16(0) !== 0xffd8) {
      out.missingReason = '不是標準 JPEG 格式或檔案已損毀';
      return out;
    }
    let hadExifHeader = false;
    let pos = 2;
    while (pos + 4 <= n && view.getUint8(pos) === 0xff) {
      const marker = view.getUint8(pos+1);
      if (marker === 0xda || marker === 0xd9) break;
      const len = view.getUint16(pos+2);
      if (len < 2 || pos+2+len > n) break;

      // 1. EXIF APP1
      if (marker === 0xe1 && len >= 8 &&
          String.fromCharCode(...new Uint8Array(buf,pos+4,6)) === 'Exif\0\0') {
        hadExifHeader = true;
        const base = pos + 10, max = pos + 2 + len;
        if (base + 8 <= max) {
          const order = view.getUint16(base), le = order === 0x4949;
          if (le || order === 0x4d4d) {
            const u16 = p => { if(p<base||p+2>max) throw Error('EXIF bounds'); return view.getUint16(p,le); };
            const u32 = p => { if(p<base||p+4>max) throw Error('EXIF bounds'); return view.getUint32(p,le); };
            if (u16(base+2) === 42) {
              const readEntries = offset => {
                const at = base + offset;
                if (at < base + 8 || at + 2 > max) return new Map();
                const ct = u16(at); if (ct > 256 || at + 2 + ct * 12 + 4 > max) return new Map();
                const entries = new Map();
                for (let i = 0; i < ct; i++) {
                  const p = at + 2 + i * 12, tag = u16(p), type = u16(p+2), count = u32(p+4), offsetOrValue = u32(p+8);
                  entries.set(tag, {p, type, count, offset: offsetOrValue});
                }
                return entries;
              };
              const valueBytes = entry => {
                if (!entry) return null;
                const width = ({1:1, 2:1, 3:2, 4:4, 5:8, 7:1, 9:4, 10:8})[entry.type];
                if (!width || entry.count < 1 || entry.count > 2048) return null;
                const size = width * entry.count;
                const at = size <= 4 ? entry.p + 8 : base + entry.offset;
                if (at < base || at + size > max) return null;
                return {at, size};
              };
              const ascii = entry => {
                const r = valueBytes(entry); if (!r) return null;
                return Array.from(new Uint8Array(buf, r.at, r.size)).map(x => String.fromCharCode(x)).join('').replace(/\0.*$/, '').trim();
              };
              const rational = (entry, i) => {
                const r = valueBytes(entry); if (!r || entry.type !== 5 || i >= entry.count) return NaN;
                const num = u32(r.at + i * 8), den = u32(r.at + i * 8 + 4); return den ? num / den : NaN;
              };
              try {
                const main = readEntries(u32(base + 4));
                const extEntry = main.get(0x8769);
                const exif = extEntry && extEntry.type === 4 ? readEntries(extEntry.offset) : new Map();
                const rawDt = ascii(exif.get(0x9003)) || ascii(exif.get(0x9004)) || ascii(main.get(0x0132));
                const normDt = normalizeCapturedAt(rawDt);
                if (normDt) out.capturedAt = normDt;

                const gpsEntry = main.get(0x8825);
                const gps = gpsEntry && gpsEntry.type === 4 ? readEntries(gpsEntry.offset) : new Map();
                const coord = (tag, refTag, allow) => {
                  const e = gps.get(tag), ref = ascii(gps.get(refTag))?.toUpperCase();
                  if (!e || e.type !== 5 || e.count !== 3 || !allow.includes(ref)) return null;
                  const parts = [rational(e,0), rational(e,1), rational(e,2)];
                  if (!parts.every(Number.isFinite) || parts[1] >= 60 || parts[2] >= 60) return null;
                  const v = parts[0] + parts[1]/60 + parts[2]/3600;
                  return v * (ref === allow[1] ? -1 : 1);
                };
                const latitude = coord(2, 1, ['N', 'S']);
                const longitude = coord(4, 3, ['E', 'W']);
                if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (Math.abs(latitude) > 0.0001 || Math.abs(longitude) > 0.0001)) {
                  out.latitude = Number(latitude.toFixed(6));
                  out.longitude = Number(longitude.toFixed(6));
                }
              } catch (exifError) {
                console.warn('[PhotoLocal] EXIF parsing notice:', exifError.message);
              }
            }
          }
        }
      }

      // 2. XMP APP1 (Adobe / Samsung / Google Photos)
      if (marker === 0xe1 && len >= 32) {
        const xmpSig = String.fromCharCode(...new Uint8Array(buf, pos+4, 29));
        if (xmpSig.startsWith('http://ns.adobe.com/xap/1.0/')) {
          try {
            const xmpBytes = new Uint8Array(buf, pos + 4 + 29, len - 2 - 29);
            const xmpStr = new TextDecoder('utf-8', {fatal:false}).decode(xmpBytes);
            if (!out.capturedAt) {
              const dtMatch = /(?:exif:DateTimeOriginal|photoshop:DateCreated|xmp:CreateDate)=["']([^"']+)["']|<(?:exif:DateTimeOriginal|photoshop:DateCreated|xmp:CreateDate)>([^<]+)<\//i.exec(xmpStr);
              if (dtMatch) {
                const normXmpDt = normalizeCapturedAt(dtMatch[1] || dtMatch[2]);
                if (normXmpDt) out.capturedAt = normXmpDt;
              }
            }
            if (out.latitude === null || out.longitude === null) {
              const latMatch = /exif:GPSLatitude=["']([^"']+)["']|<exif:GPSLatitude>([^<]+)<\/exif:GPSLatitude>/i.exec(xmpStr);
              const lonMatch = /exif:GPSLongitude=["']([^"']+)["']|<exif:GPSLongitude>([^<]+)<\/exif:GPSLongitude>/i.exec(xmpStr);
              if (latMatch && lonMatch) {
                const xLat = parseCoordinateStr(latMatch[1] || latMatch[2], false);
                const xLon = parseCoordinateStr(lonMatch[1] || lonMatch[2], true);
                if (xLat !== null && xLon !== null) {
                  out.latitude = xLat;
                  out.longitude = xLon;
                }
              }
            }
          } catch (xmpErr) {
            console.warn('[PhotoLocal] XMP parsing notice:', xmpErr.message);
          }
        }
      }

      pos += 2 + len;
    }

    if (out.latitude !== null && out.longitude !== null) {
      out.locationStatus = 'gps';
      out.missingReason = null;
    } else {
      out.locationStatus = 'missing';
      out.missingReason = hadExifHeader
        ? '照片未包含 GPS 座標（可能拍攝時未開啟定位、通訊軟體壓縮轉發抹除或相機設定隱私保護）'
        : '照片無 EXIF 資訊（可能經通訊軟體或社群轉發已抹除中繼資料）';
    }

    return out;
  }

  const message=(msg,kind='info')=>{const el=d.getElementById('photoUploadStatus');if(el)el.textContent=msg;
    if(typeof w.showToast==='function')w.showToast(msg,kind);};
  const localRow=record=>{
    if(!urlById.has(record.id)) urlById.set(record.id,w.URL.createObjectURL(record.blob));
    const meta = record.metadata || {};
    return {
      key: record.id,
      url: urlById.get(record.id),
      date: meta.capturedAt?.slice(0,10) || '拍攝日期待補',
      capturedAt: meta.capturedAt || null,
      latitude: meta.latitude || null,
      longitude: meta.longitude || null,
      location: (meta.latitude && meta.longitude) ? { latitude: meta.latitude, longitude: meta.longitude } : null,
      placeName: meta.placeName || null,
      address: meta.address || null,
      city: meta.placeName || null,
      missingReason: meta.missingReason || null,
      localOnly: true,
      pendingSync: true
    };
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
      const lastErr = stored.find(x => x.lastError)?.lastError;
      const errNotice = lastErr ? ` (${lastErr})` : '';
      label.textContent=localCount?`📱 ${localCount} 張照片只保存在此裝置；尚未同步雙人相簿${errNotice}。`:' ';
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
  // Uses stable Firebase path (photo_<id>) so retries are strictly idempotent.
  const syncing=new Set();
  async function syncEntry(entry){
    if(syncing.has(entry.id))return false;
    syncing.add(entry.id);
    try{
      if(w.navigator.onLine===false || !w.NetworkEngine?._db)return false;
      const stableKey = entry.cloudKey || ('photo_' + entry.id.replace(/[^a-zA-Z0-9_-]/g, '_'));
      entry.cloudKey = stableKey;

      // 1. Image hosting: Reuse existing hostedUrl if previously uploaded
      let hostedUrl = entry.hostedUrl;
      if (!hostedUrl) {
        // Send a compressed image to ImgBB without exposing original EXIF payload.
        const compressed = await w.compressImage(entry.blob);
        const uploaded = await w.NetworkEngine.uploadImage(compressed);
        if (uploaded?.success !== true || !uploaded?.data?.url) {
          entry.lastError = uploaded?.error || '圖片上傳至相簿主機失敗';
          await put(entry);
          return false;
        }
        hostedUrl = uploaded.data.url;
        entry.hostedUrl = hostedUrl;
        await put(entry); // persist hosted URL so retries never re-upload image bytes
      }

      // 2. Synchronize record to Firebase with deterministic stable key
      const photoPayload = {
        url: hostedUrl,
        date: entry.metadata.capturedAt?.slice(0,10) || '',
        capturedAt: entry.metadata.capturedAt || null,
        city: (entry.metadata.locationStatus === 'gps' && entry.metadata.shareGps !== false) ?
          `${entry.metadata.latitude}, ${entry.metadata.longitude}` : (entry.metadata.placeName || '無定位'),
        location: (entry.metadata.locationStatus === 'gps' && entry.metadata.shareGps !== false) ?
          { latitude: entry.metadata.latitude, longitude: entry.metadata.longitude } : null,
        latitude: (entry.metadata.locationStatus === 'gps' && entry.metadata.shareGps !== false) ?
          entry.metadata.latitude : null,
        longitude: (entry.metadata.locationStatus === 'gps' && entry.metadata.shareGps !== false) ?
          entry.metadata.longitude : null,
        placeName: entry.metadata.placeName || null,
        address: entry.metadata.address || null,
        missingReason: entry.metadata.locationStatus !== 'gps' ? (entry.metadata.missingReason || '無 EXIF GPS 資訊') : null,
        timestamp: Date.now()
      };

      const result = await w.NetworkEngine.firebaseWrite(`${w.DB_PHOTOS}/${stableKey}`, photoPayload);
      if (result?.success === true || (result === undefined && !result?.error)) {
        w.photoList = Array.isArray(w.photoList) ? w.photoList : [];
        if (!w.photoList.some(x => x.key === stableKey)) {
          w.photoList.push({
            key: stableKey,
            url: hostedUrl,
            date: entry.metadata.capturedAt?.slice(0,10) || '拍攝日期待補',
            capturedAt: entry.metadata.capturedAt || null,
            latitude: entry.metadata.latitude || null,
            longitude: entry.metadata.longitude || null,
            location: (entry.metadata.latitude && entry.metadata.longitude) ? { latitude: entry.metadata.latitude, longitude: entry.metadata.longitude } : null,
            city: entry.metadata.locationStatus === 'gps' ? `${entry.metadata.latitude}, ${entry.metadata.longitude}` : (entry.metadata.placeName || '無定位'),
            placeName: entry.metadata.placeName || null,
            address: entry.metadata.address || null,
            missingReason: entry.metadata.missingReason || null
          });
        }
        await remove(entry.id);
        const url = urlById.get(entry.id);
        if (url) w.URL.revokeObjectURL(url);
        urlById.delete(entry.id);
        return true;
      } else {
        const errText = String(result?.error || '');
        if (errText.includes('PERMISSION_DENIED') || errText.includes('401')) {
          entry.lastError = '資料庫未授權 (請先登入同步帳號)';
        } else {
          entry.lastError = result?.error || '雲端資料庫寫入被拒';
        }
        await put(entry);
        return false;
      }
    } catch(e) {
      console.warn('[PhotoLocal] Upload failed; original still locally stored', e);
      entry.lastError = e.message || '連線錯誤';
      try { await put(entry); } catch (_) {}
    }
    finally { syncing.delete(entry.id); }
    return false;
  }

  w.updatePhotoLocation = async function(key, locData) {
    if (!key) return { success: false, error: '缺少照片識別碼' };
    const placeName = (locData.placeName || '').trim() || null;
    const address = (locData.address || '').trim() || null;
    const lat = Number.isFinite(Number(locData.latitude)) ? Number(Number(locData.latitude).toFixed(6)) : null;
    const lng = Number.isFinite(Number(locData.longitude)) ? Number(Number(locData.longitude).toFixed(6)) : null;
    const cityName = placeName || address || (lat !== null && lng !== null ? `${lat}, ${lng}` : '自訂地點');

    if (String(key).startsWith('local_photo_')) {
      try {
        const stored = await all();
        const entry = stored.find(x => x.id === key);
        if (entry) {
          entry.metadata = entry.metadata || {};
          entry.metadata.placeName = placeName;
          entry.metadata.address = address;
          entry.metadata.city = cityName;
          if (lat !== null && lng !== null) {
            entry.metadata.latitude = lat;
            entry.metadata.longitude = lng;
            entry.metadata.locationStatus = 'gps';
          }
          entry.metadata.missingReason = null;
          await put(entry);
        }
      } catch (err) {
        console.warn('[PhotoLocal] Local update error:', err);
      }
    } else {
      if (!w.NetworkEngine?._db) {
        return { success: false, error: '資料庫未連線或尚未登入' };
      }
      const updatePayload = {
        city: cityName,
        placeName: placeName,
        address: address,
        manualLocation: true,
        updatedAt: Date.now()
      };
      if (lat !== null && lng !== null) {
        updatePayload.location = { latitude: lat, longitude: lng };
        updatePayload.latitude = lat;
        updatePayload.longitude = lng;
      }
      let res;
      if (typeof w.NetworkEngine.firebaseUpdate === 'function') {
        res = await w.NetworkEngine.firebaseUpdate(`${w.DB_PHOTOS}/${key}`, updatePayload);
      } else {
        await w.NetworkEngine._db.ref(`${w.DB_PHOTOS}/${key}`).update(updatePayload);
        res = { success: true };
      }
      if (res && res.success !== true) {
        return { success: false, error: res?.error || '更新雲端照片地點失敗，原照片保留' };
      }
    }

    w.photoList = Array.isArray(w.photoList) ? w.photoList : [];
    const item = w.photoList.find(x => x.key === key);
    if (item) {
      item.city = cityName;
      item.placeName = placeName;
      item.address = address;
      if (lat !== null && lng !== null) {
        item.latitude = lat;
        item.longitude = lng;
        item.location = { latitude: lat, longitude: lng };
      }
      item.manualLocation = true;
    }

    if (typeof w.renderMemoryAlbum === 'function') w.renderMemoryAlbum();
    if (typeof w.renderLightboxDetails === 'function') w.renderLightboxDetails(key);
    return { success: true };
  };

  w.openPhotoLocationModal = function(key) {
    w.editingPhotoKey = key;
    const photo = (w.photoList || []).find(p => p.key === key);
    const modal = d.getElementById('photoLocationModal');
    if (!modal) return;
    const nameInput = d.getElementById('photoLocNameInput');
    const addrInput = d.getElementById('photoLocAddressInput');
    const latInput = d.getElementById('photoLocLatInput');
    const lngInput = d.getElementById('photoLocLngInput');
    const errEl = d.getElementById('photoLocError');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    if (nameInput) nameInput.value = photo?.placeName || (photo?.city && photo?.city !== '無定位' && !photo?.city.includes(',') ? photo.city : '') || '';
    if (addrInput) addrInput.value = photo?.address || '';
    const lat = photo?.location?.latitude ?? photo?.latitude ?? '';
    const lng = photo?.location?.longitude ?? photo?.longitude ?? '';
    if (latInput) latInput.value = (lat !== null && lat !== undefined && lat !== '') ? lat : '';
    if (lngInput) lngInput.value = (lng !== null && lng !== undefined && lng !== '') ? lng : '';
    modal.style.display = 'flex';
  };

  w.closePhotoLocationModal = function() {
    const modal = d.getElementById('photoLocationModal');
    if (modal) modal.style.display = 'none';
    w.editingPhotoKey = null;
  };

  w.savePhotoLocation = async function() {
    const key = w.editingPhotoKey;
    if (!key) return;
    const nameInput = d.getElementById('photoLocNameInput');
    const addrInput = d.getElementById('photoLocAddressInput');
    const latInput = d.getElementById('photoLocLatInput');
    const lngInput = d.getElementById('photoLocLngInput');
    const errEl = d.getElementById('photoLocError');
    const btn = d.getElementById('savePhotoLocBtn');

    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    const placeName = (nameInput?.value || '').trim();
    const address = (addrInput?.value || '').trim();
    const latStr = (latInput?.value || '').trim();
    const lngStr = (lngInput?.value || '').trim();

    let lat = null, lng = null;
    if (latStr !== '' || lngStr !== '') {
      const nLat = Number(latStr), nLng = Number(lngStr);
      if (!Number.isFinite(nLat) || nLat < -90 || nLat > 90) {
        if (errEl) { errEl.textContent = '請輸入有效緯度 (-90 到 90)'; errEl.style.display = 'block'; }
        return;
      }
      if (!Number.isFinite(nLng) || nLng < -180 || nLng > 180) {
        if (errEl) { errEl.textContent = '請輸入有效經度 (-180 到 180)'; errEl.style.display = 'block'; }
        return;
      }
      lat = Number(nLat.toFixed(6));
      lng = Number(nLng.toFixed(6));
    }

    if (!placeName && !address && lat === null) {
      if (errEl) { errEl.textContent = '請至少輸入地點名稱、地址或經緯度'; errEl.style.display = 'block'; }
      return;
    }

    const cityName = placeName || address || (lat !== null ? `${lat}, ${lng}` : '自訂地點');
    if (btn) { btn.disabled = true; btn.textContent = '儲存中...'; }

    try {
      const res = await w.updatePhotoLocation(key, {
        placeName,
        address,
        latitude: lat,
        longitude: lng,
        city: cityName
      });
      if (res && res.success) {
        w.closePhotoLocationModal();
        message('已成功更新拍攝地點！', 'success');
      } else {
        const msg = res?.error || '儲存地點失敗，原照片保留';
        if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
        message(msg, 'error');
      }
    } catch(err) {
      console.error('[PhotoLocation] Save error:', err);
      const msg = err.message || '儲存地點失敗，原照片保留';
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
      message(msg, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '儲存地點'; }
    }
  };

  w.retryPendingPhotos=async function(){
    let stored;
    try{stored=await all();}catch(e){message('本機照片讀取失敗；原資料保留','error');return;}
    if(!stored.length){return;}
    let ok=0;
    for(const entry of stored){if(await syncEntry(entry))ok++;}
    await refreshAlbum();
    const left=stored.length-ok;
    if (ok > 0) {
      message(left?`已同步 ${ok} 張；仍有 ${left} 張待同步`:`✅ ${ok} 張已同步雙人相簿`,left?'warning':'success');
    }
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
  w.PhotoLocalSafety={readExif,refreshAlbum,getPending:all,updateLocation:w.updatePhotoLocation};
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
