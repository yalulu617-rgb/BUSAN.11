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
  const BYTES_LIMIT = 4 * 1024 * 1024;
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

  function parseCoordinateStr(str, isLon, explicitRef) {
    if (!str) return null;
    let s = String(str).trim();
    // Clean special characters: degree, minute, second symbols, quotes, etc.
    s = s.replace(/[°ºddeg]/gi, ' ')
         .replace(/['′min]/gi, ' ')
         .replace(/["″sec]/gi, ' ')
         .replace(/\s+/g, ' ')
         .trim();

    // Extract trailing or leading direction letter if present
    let ref = (explicitRef || '').trim().toUpperCase();
    const dirMatch = /([NSEW])$/i.exec(s) || /^([NSEW])/i.exec(s);
    if (dirMatch) {
      ref = dirMatch[1].toUpperCase();
      s = s.replace(/^[NSEW]\s*/i, '').replace(/\s*[NSEW]$/i, '').trim();
    }

    const parsePart = p => {
      if (!p) return 0;
      if (p.includes('/')) {
        const parts = p.split('/').map(Number);
        return parts[1] ? parts[0] / parts[1] : 0;
      }
      return parseFloat(p) || 0;
    };

    // 1. Plain decimal format: "35.179038" or "+35.179038" or "-35.179038"
    if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) {
      let val = parseFloat(s);
      if (ref === 'S' || ref === 'W') val = -Math.abs(val);
      else if (ref === 'N' || ref === 'E') val = Math.abs(val);
      const max = isLon ? 180 : 90;
      if (Number.isFinite(val) && Math.abs(val) <= max && Math.abs(val) > 0.000001) {
        return Number(val.toFixed(6));
      }
    }

    // 2. Comma or space separated parts: "35,10.7423" or "35 10.7423" or "35, 10, 44.536" or "35/1, 10/1, 4453/100"
    const tokens = s.split(/[,;\s]+/).filter(Boolean);
    if (tokens.length >= 2 && tokens.length <= 3) {
      const deg = parsePart(tokens[0]);
      const min = parsePart(tokens[1]);
      const sec = tokens.length === 3 ? parsePart(tokens[2]) : 0;
      let val = deg + min / 60 + sec / 3600;
      if (ref === 'S' || ref === 'W') val = -Math.abs(val);
      else if (ref === 'N' || ref === 'E') val = Math.abs(val);
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

  // HEIC/HEIF stores Exif as an ISO-BMFF item, rather than a JPEG APP1 segment.
  // Locate the Exif item (iinf/infe) and its extent (iloc), then reuse the
  // existing bounded JPEG/TIFF parser. Nothing is uploaded to inspect metadata.
  async function readHeifExif(file) {
    const out = {
      capturedAt: null,
      latitude: null,
      longitude: null,
      locationStatus: 'missing',
      shareGps: true,
      missingReason: 'HEIC 檔案中沒有可讀取的 GPS 資訊',
      diagnostic: null
    };
    const header = await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer();
    const v = new DataView(header), n = v.byteLength;
    const u16 = p => v.getUint16(p), u32 = p => v.getUint32(p);
    const str = (p,l) => String.fromCharCode(...new Uint8Array(header,p,l));
    const boxes = (start,end) => {
      const list = [];
      for (let p=start; p+8<=end;) {
        let sz=u32(p), head=8;
        if (sz===1) {if(p+16>end) break; sz=Number(v.getBigUint64(p+8));head=16;}
        else if(sz===0) sz=end-p;
        if (!Number.isSafeInteger(sz)||sz<head||p+sz>end) break;
        list.push({type:str(p+4,4),start:p+head,end:p+sz});
        p+=sz;
      }
      return list;
    };
    const meta=boxes(0,n).find(b=>b.type==='meta');
    if (!meta || meta.start+4>meta.end) {
      out.diagnostic = {
        fileName: file.name || 'unnamed',
        fileType: file.type || 'image/heic',
        fileSize: file.size || 0,
        fileSizeKB: Math.round((file.size || 0) / 1024),
        formatDetected: 'HEIC/HEIF',
        hasExifHeader: false,
        hasXmpHeader: false,
        hasGpsFields: false,
        hasCaptureTime: false,
        locationStatus: 'missing',
        statusLabel: '無定位資訊',
        detailReason: 'HEIC 檔案缺少 meta box'
      };
      return out;
    }
    const children=boxes(meta.start+4,meta.end);
    const iinf=children.find(b=>b.type==='iinf');
    const iloc=children.find(b=>b.type==='iloc');
    if (!iinf || !iloc) {
      out.diagnostic = {
        fileName: file.name || 'unnamed',
        fileType: file.type || 'image/heic',
        fileSize: file.size || 0,
        fileSizeKB: Math.round((file.size || 0) / 1024),
        formatDetected: 'HEIC/HEIF',
        hasExifHeader: false,
        hasXmpHeader: false,
        hasGpsFields: false,
        hasCaptureTime: false,
        locationStatus: 'missing',
        statusLabel: '無定位資訊',
        detailReason: 'HEIC 檔案缺少 iinf 或 iloc 中繼資料'
      };
      return out;
    }
    const inf=boxes(iinf.start+6,iinf.end);
    let exifId=null;
    for (const b of inf) {
      if(b.type!=='infe'||b.start+8>b.end)continue;
      const version=v.getUint8(b.start);
      if((version===0||version===1) && b.start+12<=b.end) {
        if(str(b.start+8,Math.min(4,b.end-(b.start+8)))==='Exif') exifId=u16(b.start+4);
      } else if(version===2 && b.start+12<=b.end && str(b.start+8,4)==='Exif') {
        exifId=u16(b.start+4);
      } else if(version===3 && b.start+14<=b.end && str(b.start+10,4)==='Exif') {
        exifId=u32(b.start+4);
      }
    }
    if (exifId===null) {
      out.diagnostic = {
        fileName: file.name || 'unnamed',
        fileType: file.type || 'image/heic',
        fileSize: file.size || 0,
        fileSizeKB: Math.round((file.size || 0) / 1024),
        formatDetected: 'HEIC/HEIF',
        hasExifHeader: false,
        hasXmpHeader: false,
        hasGpsFields: false,
        hasCaptureTime: false,
        locationStatus: 'missing',
        statusLabel: '無定位資訊',
        detailReason: 'HEIC 項目列表中無 Exif 類型項目'
      };
      return out;
    }
    let p=iloc.start,version=v.getUint8(p);p+=4;
    if(p+2>iloc.end)return out;
    const sizes=u16(p);p+=2;
    const os=sizes>>12, ls=(sizes>>8)&15, bs=(sizes>>4)&15, ix=(version===1||version===2)?sizes&15:0;
    const number = (size) => {
      if(size>8 || p+size>iloc.end)throw Error('HEIF iloc bounds');
      let x=0;for(let i=0;i<size;i++)x=x*256+v.getUint8(p++);
      if(!Number.isSafeInteger(x))throw Error('HEIF offset too large');
      return x;
    };
    try {
      const count=number(version<2?2:4);
      if(count>65536)return out;
      for(let i=0;i<count;i++){
        const id=number(version<2?2:4);
        let method=0;
        if(version===1||version===2)method=number(2)&15;
        number(2); // data_reference_index
        const base=number(bs), extents=number(2);
        if(extents>4096)return out;
        for(let j=0;j<extents;j++){
          if(ix)number(ix);
          const off=number(os), len=number(ls);
          if(id!==exifId||j!==0||!len||len>8*1024*1024)continue;
          let location=base+off;
          if(method===1){
            const idat=children.find(b=>b.type==='idat');
            if(!idat)continue;
            location=idat.start+location;
          }else if(method!==0)continue;
          if(location<0||location+len>file.size)continue;
          const raw=new Uint8Array(await file.slice(location,location+len).arrayBuffer());
          if(raw.length<12)continue;

          // Locate TIFF header dynamically (II\x2a\x00 or MM\x00\x2a) within first 64 bytes
          let tiffAt = -1;
          for (let t = 0; t <= Math.min(64, raw.length - 8); t++) {
            const b0 = raw[t], b1 = raw[t+1], b2 = raw[t+2], b3 = raw[t+3];
            if ((b0 === 0x49 && b1 === 0x49 && b2 === 0x2a && b3 === 0x00) ||
                (b0 === 0x4d && b1 === 0x4d && b2 === 0x00 && b3 === 0x2a)) {
              tiffAt = t;
              break;
            }
          }
          if (tiffAt === -1 && raw.length >= 8) {
            const declaredOffset = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getUint32(0, false);
            if (declaredOffset >= 0 && declaredOffset + 4 + 8 <= raw.length) {
              tiffAt = 4 + declaredOffset;
            }
          }
          if (tiffAt === -1 || tiffAt + 8 > raw.length) continue;

          const tiff=raw.slice(tiffAt,Math.min(raw.length,tiffAt+65000));
          const payload=new Uint8Array(6+tiff.length);
          payload.set([69,120,105,102,0,0]);payload.set(tiff,6);
          const jpeg=new Uint8Array(payload.length+8);
          jpeg.set([255,216,255,225,(payload.length+2)>>8,(payload.length+2)&255],0);
          jpeg.set(payload,6);jpeg.set([255,217],6+payload.length);
          const parsed=await readExif(new File([jpeg],'heif-exif.jpg',{type:'image/jpeg'}));
          if(parsed.locationStatus==='gps'||parsed.capturedAt) {
            parsed.diagnostic = {
              fileName: file.name || 'unnamed',
              fileType: file.type || 'image/heic',
              fileSize: file.size || 0,
              fileSizeKB: Math.round((file.size || 0) / 1024),
              formatDetected: 'HEIC/HEIF',
              hasExifHeader: true,
              hasXmpHeader: false,
              hasGpsFields: parsed.latitude !== null && parsed.longitude !== null,
              hasCaptureTime: Boolean(parsed.capturedAt),
              locationStatus: parsed.locationStatus,
              statusLabel: parsed.locationStatus === 'gps' ? '已讀取到 GPS 定位' : '無定位資訊',
              detailReason: parsed.locationStatus === 'gps' ? 'HEIC Exif 座標解析成功' : (parsed.missingReason || 'HEIC Exif 中未包含 GPS 座標')
            };
            return parsed;
          }
        }
      }
    }catch(e){console.warn('[PhotoLocal] HEIF metadata parsing:',e.message);}

    // Fallback: bounded scan for embedded TIFF Exif header in the first 8MB
    try {
      const u8 = new Uint8Array(header);
      const nBytes = u8.length;
      for (let i = 0; i <= nBytes - 16; i++) {
        const b0 = u8[i], b1 = u8[i+1], b2 = u8[i+2], b3 = u8[i+3];
        let le = false;
        if (b0 === 0x49 && b1 === 0x49 && b2 === 0x2a && b3 === 0x00) le = true;
        else if (b0 === 0x4d && b1 === 0x4d && b2 === 0x00 && b3 === 0x2a) le = false;
        else continue;

        const ifd0 = v.getUint32(i + 4, le);
        if (ifd0 >= 8 && ifd0 < 65536 && i + ifd0 + 2 <= nBytes) {
          const numEntries = v.getUint16(i + ifd0, le);
          if (numEntries > 0 && numEntries < 256) {
            const tiff = u8.slice(i, Math.min(nBytes, i + 65536));
            const payload = new Uint8Array(6 + tiff.length);
            payload.set([69, 120, 105, 102, 0, 0]); payload.set(tiff, 6);
            const jpeg = new Uint8Array(payload.length + 8);
            jpeg.set([255, 216, 255, 225, (payload.length + 2) >> 8, (payload.length + 2) & 255], 0);
            jpeg.set(payload, 6); jpeg.set([255, 217], 6 + payload.length);
            const parsed = await readExif(new File([jpeg], 'heif-fallback.jpg', { type: 'image/jpeg' }));
            if (parsed.locationStatus === 'gps' || parsed.capturedAt) {
              parsed.diagnostic = {
                fileName: file.name || 'unnamed',
                fileType: file.type || 'image/heic',
                fileSize: file.size || 0,
                fileSizeKB: Math.round((file.size || 0) / 1024),
                formatDetected: 'HEIC/HEIF',
                hasExifHeader: true,
                hasXmpHeader: false,
                hasGpsFields: parsed.latitude !== null && parsed.longitude !== null,
                hasCaptureTime: Boolean(parsed.capturedAt),
                locationStatus: parsed.locationStatus,
                statusLabel: parsed.locationStatus === 'gps' ? '已讀取到 GPS 定位' : '無定位資訊',
                detailReason: parsed.locationStatus === 'gps' ? 'HEIC TIFF 掃描還原成功' : (parsed.missingReason || 'HEIC 中未包含 GPS 座標')
              };
              return parsed;
            }
          }
        }
      }
    } catch(e) { console.warn('[PhotoLocal] HEIF TIFF scan fallback:', e.message); }

    out.diagnostic = {
      fileName: file.name || 'unnamed',
      fileType: file.type || 'image/heic',
      fileSize: file.size || 0,
      fileSizeKB: Math.round((file.size || 0) / 1024),
      formatDetected: 'HEIC/HEIF',
      hasExifHeader: exifId !== null,
      hasXmpHeader: false,
      hasGpsFields: false,
      hasCaptureTime: Boolean(out.capturedAt),
      locationStatus: 'missing',
      statusLabel: '無定位資訊',
      detailReason: out.missingReason || 'HEIC 檔案未包含 GPS 座標'
    };

    return out;
  }

  async function readExif(file) {
    const out = {capturedAt:null, latitude:null, longitude:null, locationStatus:'missing', shareGps:true, missingReason:null};
    if (!file) {
      out.missingReason = '無有效相片檔案';
      return out;
    }
    const isJpeg = /image\/jpeg/i.test(file.type) || /\.jpe?g$/i.test(file.name || '');
    if (!isJpeg) {
      const isHeic = /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '');
      if (isHeic) return readHeifExif(file);
      out.missingReason = '此圖片格式不支援 EXIF GPS 讀取';
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
    let hadXmpHeader = false;
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
          hadXmpHeader = true;
          try {
            const xmpBytes = new Uint8Array(buf, pos + 4 + 29, len - 2 - 29);
            const xmpStr = new TextDecoder('utf-8', {fatal:false}).decode(xmpBytes);
            if (!out.capturedAt) {
              const dtMatch = /(?:exif:DateTimeOriginal|photoshop:DateCreated|xmp:CreateDate|tiff:DateTime)=["']([^"']+)["']|<(?:exif:DateTimeOriginal|photoshop:DateCreated|xmp:CreateDate|tiff:DateTime)>([^<]+)<\//i.exec(xmpStr);
              if (dtMatch) {
                const normXmpDt = normalizeCapturedAt(dtMatch[1] || dtMatch[2]);
                if (normXmpDt) out.capturedAt = normXmpDt;
              }
            }
            if (out.latitude === null || out.longitude === null) {
              const latMatch = /(?:exif:)?GPSLatitude=["']([^"']+)["']|<(?:exif:)?GPSLatitude>([^<]+)<\/(?:exif:)?GPSLatitude>/i.exec(xmpStr);
              const lonMatch = /(?:exif:)?GPSLongitude=["']([^"']+)["']|<(?:exif:)?GPSLongitude>([^<]+)<\/(?:exif:)?GPSLongitude>/i.exec(xmpStr);
              const latRefMatch = /(?:exif:)?GPSLatitudeRef=["']([^"']+)["']|<(?:exif:)?GPSLatitudeRef>([^<]+)<\/(?:exif:)?GPSLatitudeRef>/i.exec(xmpStr);
              const lonRefMatch = /(?:exif:)?GPSLongitudeRef=["']([^"']+)["']|<(?:exif:)?GPSLongitudeRef>([^<]+)<\/(?:exif:)?GPSLongitudeRef>/i.exec(xmpStr);

              const latRef = (latRefMatch ? (latRefMatch[1] || latRefMatch[2]) : '').trim();
              const lonRef = (lonRefMatch ? (lonRefMatch[1] || lonRefMatch[2]) : '').trim();

              if (latMatch && lonMatch) {
                const xLat = parseCoordinateStr(latMatch[1] || latMatch[2], false, latRef);
                const xLon = parseCoordinateStr(lonMatch[1] || lonMatch[2], true, lonRef);
                if (xLat !== null && xLon !== null) {
                  out.latitude = xLat;
                  out.longitude = xLon;
                }
              }

              if (out.latitude === null || out.longitude === null) {
                const posMatch = /(?:exif:)?GPSPosition=["']([^"']+)["']|<(?:exif:)?GPSPosition>([^<]+)<\/(?:exif:)?GPSPosition>/i.exec(xmpStr);
                if (posMatch) {
                  const posStr = (posMatch[1] || posMatch[2] || '').trim();
                  const parts = posStr.split(/\s*,\s*|\s+/);
                  if (parts.length >= 2) {
                    const pLat = parseCoordinateStr(parts[0], false);
                    const pLon = parseCoordinateStr(parts[1], true);
                    if (pLat !== null && pLon !== null) {
                      out.latitude = pLat;
                      out.longitude = pLon;
                    }
                  }
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
      if (hadExifHeader && hadXmpHeader) {
        out.missingReason = '照片包含 EXIF 與 XMP 但無 GPS 欄位（可能拍攝時相機未開啟位置標籤或受隱私保護）';
      } else if (hadExifHeader) {
        out.missingReason = '照片包含 EXIF 但未包含 GPS 座標（可能拍攝時未開啟定位、通訊軟體壓縮轉發抹除或相機設定隱私保護）';
      } else if (hadXmpHeader) {
        out.missingReason = '照片僅有 XMP 描述但無 GPS 座標';
      } else {
        out.missingReason = '照片無 EXIF 資訊（可能經通訊軟體或社群轉發已抹除中繼資料）';
      }
    }

    out.diagnostic = {
      fileName: file.name || 'unnamed',
      fileType: file.type || 'image/jpeg',
      fileSize: file.size || 0,
      fileSizeKB: Math.round((file.size || 0) / 1024),
      formatDetected: 'JPEG',
      hasExifHeader: hadExifHeader,
      hasXmpHeader: hadXmpHeader,
      hasGpsFields: out.latitude !== null && out.longitude !== null,
      hasCaptureTime: Boolean(out.capturedAt),
      locationStatus: out.locationStatus,
      statusLabel: out.locationStatus === 'gps' ? '已讀取到 GPS 定位' : '無定位資訊',
      detailReason: out.missingReason || 'JPEG EXIF/XMP 座標解析成功'
    };

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

  // Null/empty input means "no GPS", NOT (0,0). Also reject partial/invalid pairs.
  function manualCoordinate(raw, max) {
    if (raw === null || raw === undefined || typeof raw === 'boolean' ||
        (typeof raw === 'string' && raw.trim() === '')) return null;
    const n = Number(raw);
    return Number.isFinite(n) && Math.abs(n) <= max ? Number(n.toFixed(6)) : null;
  }
  const coordinateProvided = raw => raw !== null && raw !== undefined &&
    typeof raw !== 'boolean' && !(typeof raw === 'string' && raw.trim() === '');

  w.updatePhotoLocation = async function(key, locData) {
    if (!key) return { success: false, error: '缺少照片識別碼' };
    locData = locData || {};
    const placeName = String(locData.placeName || '').trim() || null;
    const address = String(locData.address || '').trim() || null;
    const latProvided = coordinateProvided(locData.latitude);
    const lngProvided = coordinateProvided(locData.longitude);
    if (latProvided !== lngProvided) return { success: false, error: '經緯度必須同時填寫，或同時留空' };
    const lat = manualCoordinate(locData.latitude, 90);
    const lng = manualCoordinate(locData.longitude, 180);
    if (latProvided && (lat === null || lng === null)) return { success: false, error: '經緯度不正確' };
    if (lat === 0 && lng === 0) return { success: false, error: '0,0 不是有效的拍攝定位，請填寫實際座標或只填地點名稱' };
    if (!placeName && !address && lat === null) return { success: false, error: '請至少輸入地點名稱、地址或經緯度' };
    const cityName = placeName || address || (lat !== null ? `${lat}, ${lng}` : '自訂地點');

    if (String(key).startsWith('local_photo_')) {
      try {
        const stored = await all();
        const entry = stored.find(x => x.id === key);
        if (!entry) return { success: false, error: '找不到本機照片；原資料保留' };
        entry.metadata = entry.metadata || {};
        entry.metadata.placeName = placeName;
        entry.metadata.address = address;
        entry.metadata.city = cityName;
        entry.metadata.latitude = lat;
        entry.metadata.longitude = lng;
        entry.metadata.locationStatus = lat !== null ? 'gps' : 'missing';
        entry.metadata.missingReason = null;
        await put(entry);
      } catch (err) {
        console.warn('[PhotoLocal] Local update error:', err);
        return { success: false, error: '本機地點更新失敗；原照片保留' };
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
        updatedAt: Date.now(),
        // Explicitly clear stale coordinates if user removes both GPS fields.
        location: lat !== null ? { latitude: lat, longitude: lng } : null,
        latitude: lat,
        longitude: lng
      };
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
      item.latitude = lat;
      item.longitude = lng;
      item.location = lat !== null ? { latitude: lat, longitude: lng } : null;
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
    if ((latStr === '') !== (lngStr === '')) {
      if (errEl) { errEl.textContent = '經緯度必須同時填寫，或同時留空'; errEl.style.display = 'block'; }
      return;
    }
    if (latStr !== '') {
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
      if (lat === 0 && lng === 0) {
        if (errEl) { errEl.textContent = '0,0 不是有效的拍攝定位，請填寫實際座標或只填地點名稱'; errEl.style.display = 'block'; }
        return;
      }
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

  w.batchUpdatePhotoLocation = async function(keys, locData) {
    if (!Array.isArray(keys) || keys.length === 0) {
      return { success: false, error: '未選取任何照片' };
    }
    locData = locData || {};
    const placeName = String(locData.placeName || '').trim() || null;
    const address = String(locData.address || '').trim() || null;
    const latProvided = coordinateProvided(locData.latitude);
    const lngProvided = coordinateProvided(locData.longitude);
    if (latProvided !== lngProvided) return { success: false, error: '經緯度必須同時填寫，或同時留空' };
    const lat = manualCoordinate(locData.latitude, 90);
    const lng = manualCoordinate(locData.longitude, 180);
    if (latProvided && (lat === null || lng === null)) return { success: false, error: '經緯度不正確' };
    if (lat === 0 && lng === 0) return { success: false, error: '0,0 不是有效的拍攝定位，請填寫實際座標或只填地點名稱' };
    if (!placeName && !address && lat === null) return { success: false, error: '請至少輸入地點名稱、地址或經緯度' };
    const cityName = placeName || address || (lat !== null ? `${lat}, ${lng}` : '自訂地點');

    let updatedCount = 0;
    const errors = [];

    for (const key of keys) {
      const res = await w.updatePhotoLocation(key, {
        placeName,
        address,
        latitude: lat,
        longitude: lng,
        city: cityName
      });
      if (res && res.success) {
        updatedCount++;
      } else {
        errors.push(`${key}: ${res?.error || '更新失敗'}`);
      }
    }

    if (typeof w.renderMemoryAlbum === 'function') w.renderMemoryAlbum();
    return {
      success: updatedCount > 0,
      updatedCount,
      failedCount: keys.length - updatedCount,
      errors
    };
  };

  w.openBatchLocationModal = function(selectedKeys) {
    if (!Array.isArray(selectedKeys) || selectedKeys.length === 0) {
      message('請先勾選欲設定地點的照片', 'warning');
      return;
    }
    w.batchSelectedKeys = selectedKeys;
    const modal = d.getElementById('photoBatchLocationModal');
    if (!modal) return;
    const countEl = d.getElementById('batchLocCount');
    if (countEl) countEl.textContent = `已選取 ${selectedKeys.length} 張照片`;
    const nameInput = d.getElementById('batchLocNameInput');
    const addrInput = d.getElementById('batchLocAddressInput');
    const latInput = d.getElementById('batchLocLatInput');
    const lngInput = d.getElementById('batchLocLngInput');
    const errEl = d.getElementById('batchLocError');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    if (nameInput) nameInput.value = '';
    if (addrInput) addrInput.value = '';
    if (latInput) latInput.value = '';
    if (lngInput) lngInput.value = '';
    modal.style.display = 'flex';
  };

  w.closeBatchLocationModal = function() {
    const modal = d.getElementById('photoBatchLocationModal');
    if (modal) modal.style.display = 'none';
  };

  w.applyBatchPreset = function(name, address, lat, lng) {
    const nameInput = d.getElementById('batchLocNameInput');
    const addrInput = d.getElementById('batchLocAddressInput');
    const latInput = d.getElementById('batchLocLatInput');
    const lngInput = d.getElementById('batchLocLngInput');
    if (nameInput) nameInput.value = name || '';
    if (addrInput) addrInput.value = address || '';
    if (latInput) latInput.value = (lat !== null && lat !== undefined) ? lat : '';
    if (lngInput) lngInput.value = (lng !== null && lng !== undefined) ? lng : '';
  };

  w.saveBatchLocation = async function() {
    const keys = w.batchSelectedKeys;
    if (!Array.isArray(keys) || keys.length === 0) return;
    const nameInput = d.getElementById('batchLocNameInput');
    const addrInput = d.getElementById('batchLocAddressInput');
    const latInput = d.getElementById('batchLocLatInput');
    const lngInput = d.getElementById('batchLocLngInput');
    const errEl = d.getElementById('batchLocError');
    const btn = d.getElementById('saveBatchLocBtn');

    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    const placeName = (nameInput?.value || '').trim();
    const address = (addrInput?.value || '').trim();
    const latStr = (latInput?.value || '').trim();
    const lngStr = (lngInput?.value || '').trim();

    let lat = null, lng = null;
    if ((latStr === '') !== (lngStr === '')) {
      if (errEl) { errEl.textContent = '經緯度必須同時填寫，或同時留空'; errEl.style.display = 'block'; }
      return;
    }
    if (latStr !== '') {
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
      if (lat === 0 && lng === 0) {
        if (errEl) { errEl.textContent = '0,0 不是有效座標，請輸入實際座標或只填地點名稱'; errEl.style.display = 'block'; }
        return;
      }
    }

    if (!placeName && !address && lat === null) {
      if (errEl) { errEl.textContent = '請至少輸入地點名稱、地址或經緯度'; errEl.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '批次套用中...'; }
    try {
      const res = await w.batchUpdatePhotoLocation(keys, {
        placeName,
        address,
        latitude: lat,
        longitude: lng
      });
      if (res && res.success) {
        w.closeBatchLocationModal();
        if (typeof w.exitBatchMode === 'function') w.exitBatchMode();
        message(`✅ 已成功為 ${res.updatedCount} 張照片更新拍攝地點！`, 'success');
      } else {
        const msg = res?.error || '批次設定失敗，原照片保留';
        if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
        message(msg, 'error');
      }
    } catch(err) {
      const msg = err.message || '批次設定出錯，原照片保留';
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
      message(msg, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '一鍵套用至選取照片'; }
    }
  };

  w.openPhotoDiagnosticModal = function(diagnostics) {
    const list = diagnostics || w.latestPhotoDiagnostics || [];
    const modal = d.getElementById('photoDiagnosticModal');
    if (!modal) return;
    const body = d.getElementById('photoDiagBody');
    if (body) {
      if (!list.length) {
        body.innerHTML = `
          <div style="text-align:center; padding:20px; color:#7f8c8d; font-size:0.85rem;">
            <p>目前尚無最近上傳的 GPS 診斷紀錄。</p>
            <p style="font-size:0.75rem; color:#95a5a6; margin-top:6px;">從下方選取照片後，系統將自動進行 EXIF/XMP 安全預檢並記錄診斷。</p>
          </div>
        `;
      } else {
        let html = `
          <div style="background:#f8f9fa; border-radius:12px; padding:12px; margin-bottom:12px; font-size:0.78rem; line-height:1.6; color:#2c3e50;">
            <div style="font-weight:900; margin-bottom:4px; color:#2980b9;">
              <i class="fa-solid fa-circle-info"></i> Android 相簿選取器隱私保護機制說明
            </div>
            <div>Android 系統相簿（Photo Picker）在傳送照片給網頁瀏覽器時，為了隱私會主動過濾並抹除 GPS 座標。這就是為什麼手機本機相簿中看得到定位，但上傳純網頁時卻顯示無定位。</div>
            <div style="margin-top:4px; font-weight:800; color:#27ae60;">
              💡 解決方案：改用「從我的檔案選原始照片」（內部儲存空間 → DCIM → Camera），或在相簿使用「📍 批次補地點」一鍵套用。
            </div>
          </div>
          <div style="font-size:0.8rem; font-weight:900; margin-bottom:8px; color:#34495e;">
            📋 最近預檢診斷清單（共 ${list.length} 張，嚴格保護隱私，不顯示實際座標）：
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; max-height:280px; overflow-y:auto; padding-right:4px;">
        `;
        list.forEach((diag, idx) => {
          const hasGps = diag.hasGpsFields;
          const statusBg = hasGps ? '#e8f8f5' : '#fef9e7';
          const statusBorder = hasGps ? '#27ae60' : '#f39c12';
          const statusColor = hasGps ? '#1e8449' : '#b9770e';
          const statusIcon = hasGps ? 'fa-circle-check' : 'fa-circle-exclamation';
          html += `
            <div style="background:${statusBg}; border:1px solid ${statusBorder}; border-radius:10px; padding:10px; font-size:0.74rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-weight:900;">
                <span style="color:#2c3e50; word-break:break-all;">#${idx+1} ${htmlSafe(diag.fileName)}</span>
                <span style="color:${statusColor}; white-space:nowrap; margin-left:8px;">
                  <i class="fa-solid ${statusIcon}"></i> ${htmlSafe(diag.statusLabel)}
                </span>
              </div>
              <div style="display:flex; gap:12px; margin-top:4px; color:#555; flex-wrap:wrap;">
                <span>格式：<b>${htmlSafe(diag.formatDetected)}</b> (${diag.fileSizeKB} KB)</span>
                <span>EXIF：<b>${diag.hasExifHeader ? '✅ 存在' : '❌ 無'}</b></span>
                <span>XMP：<b>${diag.hasXmpHeader ? '✅ 存在' : '❌ 無'}</b></span>
                <span>拍攝時間：<b>${diag.hasCaptureTime ? '✅ 已識別' : '❌ 無'}</b></span>
              </div>
              <div style="margin-top:4px; color:#7f8c8d; font-size:0.7rem;">
                診斷細節：${htmlSafe(diag.detailReason)}
              </div>
            </div>
          `;
        });
        html += `</div>`;
        body.innerHTML = html;
      }
    }
    modal.style.display = 'flex';
  };

  w.closePhotoDiagnosticModal = function() {
    const modal = d.getElementById('photoDiagnosticModal');
    if (modal) modal.style.display = 'none';
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

  // Check all original-file metadata BEFORE uploading anything. Android Photo Picker
  // can redact EXIF GPS even when Gallery Details displays a location.
  // Give the owner a chance to switch to the Files picker without creating duplicates.
  w.uploadMultipleToImgBB=async function(files){
    const selected=Array.from(files||[]);
    if(!selected.length)return;
    const resetPickers=()=>{
      for(const id of ['photoImgUpload','photoOriginalFileUpload']){
        const el=d.getElementById(id);if(el)el.value='';
      }
    };
    let localSaved=0,cloudSaved=0,failed=0,gpsFound=0,gpsMissing=0;
    const ready=[];
    message('正在檢查 '+selected.length+' 張原始照片的日期與 GPS…');
    for(const file of selected){
      if(!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|hei[cf])$/i.test(file.name || '')) {
        failed++;continue;
      }
      try{
        const metadata=await readExif(file);
        if(!metadata.capturedAt && Number.isFinite(file.lastModified))
          metadata.fileModifiedAt=new Date(file.lastModified).toISOString();
        if(metadata.locationStatus==='gps')gpsFound++;else gpsMissing++;
        ready.push({file,metadata});
      }catch(e){
        failed++;
        console.warn('[PhotoLocal] Photo metadata precheck failed, file not uploaded:',e);
      }
    }

    // Save diagnostic results safely without disclosing coordinates
    w.latestPhotoDiagnostics = ready.map(r => r.metadata?.diagnostic).filter(Boolean);

    if(gpsMissing){
      const ok=w.confirm(
        '這次選取 '+selected.length+' 張照片，已讀到 GPS '+gpsFound+' 張，未讀到 GPS '+gpsMissing+' 張。\n\n'+
        'Android 相簿選取器可能隱藏原始 GPS。若不想讓照片變成「無定位」，請按「取消」，改用「從我的檔案選原始照片」重新選取。\n\n'+
        '仍要上傳這批照片嗎？'
      );
      if(!ok){
        message('已取消上傳；原始照片與既有雲端資料均未更動。請改由「我的檔案」選原檔。','warning');
        resetPickers();return;
      }
    }
    for(const {file,metadata} of ready){
      let entry;
      try{
        const id='local_photo_'+w.crypto.randomUUID().replace(/-/g,'');
        entry={id,blob:file,filename:file.name,metadata,createdAt:Date.now()};
        await put(entry);localSaved++;
      }catch(e){
        failed++;console.error('[PhotoLocal] Local save failed',e);continue;
      }
      if(await syncEntry(entry))cloudSaved++;
    }
    await refreshAlbum();
    const pending=localSaved-cloudSaved;
    if(failed)message('⚠️ 已在此裝置保存 '+localSaved+'/'+selected.length+' 張；'+failed+' 張未保存。請保留原始照片。','error');
    else if(pending)message('📱 已保存 '+localSaved+'/'+selected.length+' 張；'+pending+' 張待同步；自動定位 '+gpsFound+' 張，未讀到 GPS '+gpsMissing+' 張。','warning');
    else message('✅ '+cloudSaved+'/'+selected.length+' 張已同步雙人相簿；自動定位 '+gpsFound+' 張，未讀到 GPS '+gpsMissing+' 張。','success');
    resetPickers();
  };

  // =========================================================================
  // =========================================================================
  // S25 原始照片 ZIP 批次匯入與既有照片 GPS 恢復安全機制 (V46.4.4)
  // =========================================================================
  const MAX_ZIP_UNCOMP_TOTAL = 500 * 1024 * 1024; // 累計解壓上限 500MB
  const MAX_ZIP_SINGLE_ENTRY = 80 * 1024 * 1024;  // 單張解壓上限 80MB
  let latestZipInspection = null;

  async function parseZipDirectory(blob) {
    const size = blob.size;
    if (size < 22) throw new Error("ZIP 檔案過小或格式不符");
    const readLen = Math.min(size, 65557);
    const tailBuf = await blob.slice(size - readLen).arrayBuffer();
    const dv = new DataView(tailBuf);
    let eocdOffset = -1;
    for (let i = tailBuf.byteLength - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) throw new Error("ZIP 格式不正確或結尾標記損壞");
    const totalEntries = dv.getUint16(eocdOffset + 10, true);
    const cdSize = dv.getUint32(eocdOffset + 12, true);
    const cdOffset = dv.getUint32(eocdOffset + 16, true);

    if (cdOffset + cdSize > size) throw new Error("ZIP 目錄結構損毀");

    const cdBuf = await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer();
    const cdView = new DataView(cdBuf);
    let p = 0;
    const entries = [];
    const textDec = new TextDecoder("utf-8");
    let totalDeclaredUncomp = 0;

    while (p + 46 <= cdSize) {
      if (cdView.getUint32(p, true) !== 0x02014b50) break;
      const method = cdView.getUint16(p + 10, true);
      const compSize = cdView.getUint32(p + 20, true);
      const uncompSize = cdView.getUint32(p + 24, true);
      const nameLen = cdView.getUint16(p + 28, true);
      const extraLen = cdView.getUint16(p + 30, true);
      const commentLen = cdView.getUint16(p + 32, true);
      const localOffset = cdView.getUint32(p + 42, true);

      if (p + 46 + nameLen > cdSize) break;
      const nameBytes = new Uint8Array(cdBuf, p + 46, nameLen);
      const filename = textDec.decode(nameBytes);

      // Zip-Slip security check: prevent directory traversal
      const safe = !filename.includes("..") && !filename.startsWith("/") && !filename.startsWith("\\\\");
      if (safe && !filename.endsWith("/") && /\.(jpe?g|png|webp|hei[cf])$/i.test(filename)) {
        totalDeclaredUncomp += uncompSize;
        if (totalDeclaredUncomp > MAX_ZIP_UNCOMP_TOTAL) {
          throw new Error("ZIP 累計解壓大小超過安全上限 500MB，防止記憶體耗盡");
        }
        entries.push({ filename, method, compSize, uncompSize, localOffset });
      }
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  async function extractZipEntry(blob, entry) {
    if (entry.uncompSize > MAX_ZIP_SINGLE_ENTRY) {
      throw new Error("單張照片解壓大小超過 80MB 上限");
    }
    const headerBuf = await blob.slice(entry.localOffset, entry.localOffset + 30).arrayBuffer();
    const hView = new DataView(headerBuf);
    if (hView.getUint32(0, true) !== 0x04034b50) throw new Error("無法讀取本機照片標頭");
    const nameLen = hView.getUint16(26, true);
    const extraLen = hView.getUint16(28, true);
    const dataStart = entry.localOffset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + entry.compSize;
    const compressedBlob = blob.slice(dataStart, dataEnd);

    let uncompBlob;
    if (entry.method === 0) {
      uncompBlob = compressedBlob;
    } else if (entry.method === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("此裝置瀏覽器不支援本機解壓縮串流 (DecompressionStream)");
      }
      const stream = compressedBlob.stream().pipeThrough(new DecompressionStream("deflate-raw"));
      const resp = new Response(stream);
      uncompBlob = await resp.blob();
    } else {
      throw new Error("不支援的壓縮格式代碼: " + entry.method);
    }

    if (uncompBlob.size > MAX_ZIP_SINGLE_ENTRY) {
      throw new Error("解壓後實際大小超過 80MB 上限 (宣告不實)");
    }

    const lowerName = entry.filename.toLowerCase();
    const mime = (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) ? "image/jpeg" :
                 (lowerName.endsWith(".png") ? "image/png" :
                 (lowerName.endsWith(".webp") ? "image/webp" : "image/heic"));
    const baseName = entry.filename.split("/").pop().split("\\").pop();
    return new File([uncompBlob], baseName, { type: mime });
  }

  w.openPhotoZipModal = function(inspection) {
    latestZipInspection = inspection;
    const modal = d.getElementById("photoZipModal");
    if (!modal) return;
    const body = d.getElementById("photoZipBody");
    if (body) {
      const { totalCount, gpsCount, missingGpsCount, timeCount, matchedCloudCount, ambiguousCount } = inspection;
      const ambiguousNotice = ambiguousCount > 0 ?
        '<div style="background:#fef9e7; border-radius:8px; padding:6px 10px; margin-top:6px; font-size:0.75rem; color:#b7791f; font-weight:700;">⚠️ 另有 ' + ambiguousCount + ' 張同秒或多重相符照片，為確保資料絕對正確已嚴格跳過（拒絕猜測配對）。</div>' : '';
      const missingGpsWarning = missingGpsCount > 0 ?
        '<div style="background:#fdf2e9; border-radius:8px; padding:6px 10px; margin-top:6px; font-size:0.75rem; color:#c0392b; font-weight:700;">⚠️ 本批有 ' + missingGpsCount + ' 張無 GPS 定位。匯入時會進行防護確認。</div>' : '';
      body.innerHTML = '<div style="background:#e8f4fd; border-radius:12px; padding:12px; margin-bottom:12px; font-size:0.78rem; line-height:1.6; color:#1b4f72;">' +
        '<div style="font-weight:900; margin-bottom:4px; color:#2980b9;"><i class="fa-solid fa-file-zipper"></i> ZIP 檔案本機串流預檢完成</div>' +
        '<div>採用分批串流解壓與 EXIF/XMP 解析，記憶體已即時釋放。未經 Android 相簿轉發，保留相機真實定位。</div></div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; font-size:0.82rem;">' +
        '<div style="background:#f8f9fa; border-radius:10px; padding:8px 10px;">📦 總相片數：<b>' + totalCount + '</b> 張</div>' +
        '<div style="background:#e8f8f5; border-radius:10px; padding:8px 10px; color:#27ae60;">📍 找到 GPS：<b>' + gpsCount + '</b> 張</div>' +
        '<div style="background:#fef9e7; border-radius:10px; padding:8px 10px; color:#d35400;">⏰ 拍攝時間：<b>' + timeCount + '</b> 張</div>' +
        '<div style="background:#eaf2f8; border-radius:10px; padding:8px 10px; color:#2980b9;">🔄 唯一相符：<b>' + matchedCloudCount + '</b> 張</div></div>' +
        ambiguousNotice + missingGpsWarning +
        '<div style="font-size:0.75rem; color:#7f8c8d; line-height:1.5; margin-top:8px;">' +
        '• <b>📥 批次匯入為新照片</b>：逐張從本機 ZIP 解壓並串流上傳至相簿。<br>' +
        '• <b>🔄 比對並補齊既有照片 GPS</b>：僅針對「唯一 1-to-1 配對」的雲端無定位照片補齊 GPS，<b>零圖檔重複上傳</b>。</div>';
    }
    const btnRecover = d.getElementById("btnZipRecoverExisting");
    if (btnRecover) {
      btnRecover.disabled = inspection.matchedCloudCount === 0;
      btnRecover.textContent = inspection.matchedCloudCount > 0 ?
        ("🔄 比對並補齊既有照片 GPS (唯一相符 " + inspection.matchedCloudCount + " 張)") :
        "🔄 比對並補齊既有照片 GPS (無唯一相符照片)";
    }
    modal.style.display = "flex";
  };

  w.closePhotoZipModal = function() {
    const modal = d.getElementById("photoZipModal");
    if (modal) modal.style.display = "none";
    const input = d.getElementById("photoZipUpload");
    if (input) input.value = "";
  };

  w.handlePhotoZipUpload = async function(files) {
    const file = files && files[0];
    if (!file) return;
    const input = d.getElementById("photoZipUpload");
    message("正在讀取 ZIP 壓縮包結構…");
    try {
      const entries = await parseZipDirectory(file);
      if (!entries.length) {
        message("ZIP 壓縮包中未找到任何支援的照片檔案 (JPEG/PNG/HEIC)", "warning");
        if (input) input.value = "";
        return;
      }
      message("正在分批解壓預檢 " + entries.length + " 張照片拍攝資訊…");
      let gpsCount = 0, timeCount = 0;
      const summaryList = [];

      // Memory-safe inspection: read EXIF then let File be garbage-collected
      for (let i = 0; i < entries.length; i++) {
        const ent = entries[i];
        if (i > 0 && i % 3 === 0) {
          message("分批預檢中 (" + (i + 1) + "/" + entries.length + ")…");
          await new Promise(r => setTimeout(r, 10)); // Memory yield
        }
        try {
          const photoFile = await extractZipEntry(file, ent);
          const meta = await readExif(photoFile);
          if (meta.locationStatus === "gps") gpsCount++;
          if (meta.capturedAt) timeCount++;
          summaryList.push({
            entryIndex: i,
            filename: ent.filename,
            baseName: photoFile.name,
            fileSize: photoFile.size,
            metadata: meta
          });
        } catch (e) {
          console.warn("[PhotoZip] Pre-inspecting " + ent.filename + " failed:", e);
        }
      }

      if (!summaryList.length) {
        message("ZIP 內照片解壓失敗，請確認檔案格式", "error");
        if (input) input.value = "";
        return;
      }

      // Strict 1-to-1 Identity Matching (Prevent Wrong Pairing Risk)
      const cloudList = Array.isArray(w.photoList) ? w.photoList : [];
      const matchedPairs = [];
      let ambiguousCount = 0;

      for (const item of summaryList) {
        if (item.metadata?.locationStatus !== "gps") continue;
        const captured = item.metadata.capturedAt;
        if (!captured) continue;
        const itemBaseName = (item.baseName || "").toLowerCase();

        // Candidates in cloud missing GPS
        const candidates = cloudList.filter(cp => {
          if (cp.localOnly) return false;
          // NEVER overwrite existing GPS
          if (cp.latitude !== null && cp.latitude !== undefined && cp.longitude !== null && cp.longitude !== undefined) {
            return false;
          }
          // 1. Exact capture timestamp match
          if (cp.capturedAt && cp.capturedAt === captured) return true;
          // 2. Exact filename match if available
          if (cp.filename && itemBaseName && cp.filename.toLowerCase() === itemBaseName) return true;
          return false;
        });

        // Strict Rule: ONLY allow 1-to-1 match. If multiple cloud photos match the same second,
        // or multiple zip photos match the same cloud photo, reject guessing and skip!
        if (candidates.length === 1) {
          const cand = candidates[0];
          // Check if this cloud photo was already paired with another zip photo
          const alreadyPaired = matchedPairs.some(p => p.cloudPhoto.key === cand.key);
          if (!alreadyPaired) {
            matchedPairs.push({ cloudPhoto: cand, newMeta: item.metadata, zipSummary: item });
          } else {
            // Multiple zip photos claim the same cloud photo -> ambiguous!
            ambiguousCount++;
          }
        } else if (candidates.length > 1) {
          // Ambiguous: multiple cloud photos at the exact same second
          ambiguousCount++;
        }
      }

      const inspection = {
        zipBlob: file,
        entries,
        totalCount: summaryList.length,
        gpsCount,
        missingGpsCount: summaryList.length - gpsCount,
        timeCount,
        summaryList,
        matchedPairs,
        matchedCloudCount: matchedPairs.length,
        ambiguousCount
      };

      message("ZIP 預檢完成：共 " + summaryList.length + " 張，" + gpsCount + " 張含 GPS 定位。", "success");
      w.openPhotoZipModal(inspection);
    } catch (err) {
      console.error("[PhotoZip] Parse error:", err);
      message("讀取 ZIP 壓縮包失敗：" + (err.message || err), "error");
      if (input) input.value = "";
    }
  };

  w.executeZipImportNew = async function() {
    if (!latestZipInspection || !latestZipInspection.summaryList || !latestZipInspection.zipBlob) {
      message("無可匯入的解壓照片", "error");
      return;
    }
    const { zipBlob, entries, summaryList, missingGpsCount, totalCount, gpsCount } = latestZipInspection;

    // Prevent Unintended No-GPS Photo Upload: Prompt & allow user cancellation
    if (missingGpsCount > 0) {
      const ok = w.confirm(
        "⚠️ 這批 ZIP 照片中，有 " + missingGpsCount + " 張「沒有 GPS 定位」（共 " + totalCount + " 張，含定位 " + gpsCount + " 張）。\n\n" +
        "若不想將無定位照片上傳至相簿，請按「取消」。\n\n" +
        "確定仍要匯入這批照片嗎？"
      );
      if (!ok) {
        message("已取消匯入；未上傳任何照片，雲端資料完整保留。", "warning");
        w.closePhotoZipModal();
        return;
      }
    }

    w.closePhotoZipModal();
    message("開始分批解壓匯入 " + summaryList.length + " 張照片…");

    let localSaved = 0, cloudSaved = 0, failed = 0, gpsFound = 0, gpsMissing = 0, skippedDuplicate = 0;
    const existingList = Array.isArray(w.photoList) ? w.photoList : [];

    // Extract and process one photo at a time to keep RAM bounded
    for (let i = 0; i < summaryList.length; i++) {
      const sumItem = summaryList[i];
      const ent = entries[sumItem.entryIndex];
      if (!ent) continue;

      // Deduplication check: if photo with exact capturedAt and filename already exists in album, skip duplicate
      const isDup = existingList.some(ep => {
        if (ep.localOnly) return false;
        if (sumItem.metadata.capturedAt && ep.capturedAt === sumItem.metadata.capturedAt) {
          if (ep.filename && sumItem.baseName && ep.filename.toLowerCase() === sumItem.baseName.toLowerCase()) return true;
          if (!ep.filename) return true;
        }
        return false;
      });
      if (isDup) {
        skippedDuplicate++;
        continue;
      }

      let photoFile = null;
      try {
        photoFile = await extractZipEntry(zipBlob, ent);
      } catch (ex) {
        failed++;
        console.warn("[PhotoZip] Re-extracting " + ent.filename + " failed:", ex);
        continue;
      }

      if (sumItem.metadata?.locationStatus === "gps") gpsFound++; else gpsMissing++;
      try {
        const id = "local_photo_" + w.crypto.randomUUID().replace(/-/g, "");
        const entry = {
          id,
          blob: photoFile,
          filename: photoFile.name,
          metadata: sumItem.metadata,
          createdAt: Date.now()
        };
        await put(entry);
        localSaved++;
        if (await syncEntry(entry)) cloudSaved++;
      } catch (e) {
        failed++;
        console.error("[PhotoZip] Import entry save failed:", e);
      }
      photoFile = null; // explicit GC help
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 40)); // Memory yield
    }

    await refreshAlbum();
    const pending = localSaved - cloudSaved;
    let resMsg = "✅ 已匯入 " + cloudSaved + "/" + summaryList.length + " 張（定位 " + gpsFound + " 張）";
    if (skippedDuplicate > 0) resMsg += "；已略過 " + skippedDuplicate + " 張重複照片";
    if (pending > 0) resMsg += "；" + pending + " 張待背景同步";
    if (failed > 0) resMsg += "；" + failed + " 張失敗（原圖未受損）";
    message(resMsg, failed > 0 ? "warning" : "success");
  };

  w.executeZipRecoverExisting = async function() {
    if (!latestZipInspection || !latestZipInspection.matchedPairs) {
      message("無可補齊的雲端照片比對資料", "error");
      return;
    }
    const { matchedPairs } = latestZipInspection;
    if (!matchedPairs.length) {
      message("目前無唯一確定的雲端照片可補齊 GPS", "warning");
      return;
    }
    w.closePhotoZipModal();
    message("正在為 " + matchedPairs.length + " 張唯一相符的既有雲端照片補齊 GPS…");

    let updatedCount = 0;
    const errors = [];

    for (const { cloudPhoto, newMeta } of matchedPairs) {
      const cityName = newMeta.placeName || (newMeta.latitude !== null ? (newMeta.latitude + ", " + newMeta.longitude) : "自訂地點");
      const res = await w.updatePhotoLocation(cloudPhoto.key, {
        placeName: newMeta.placeName || null,
        address: newMeta.address || null,
        latitude: newMeta.latitude,
        longitude: newMeta.longitude,
        city: cityName
      });
      if (res && res.success) {
        updatedCount++;
      } else {
        errors.push(cloudPhoto.key + ": " + (res?.error || "更新失敗"));
      }
      await new Promise(r => setTimeout(r, 20));
    }

    if (typeof w.renderMemoryAlbum === "function") w.renderMemoryAlbum();
    if (updatedCount > 0) {
      message("✅ 成功為 " + updatedCount + " 張既有雲端照片恢復 GPS 定位！零圖檔重複上傳。", "success");
    } else {
      message("既有照片 GPS 恢復失敗：" + (errors[0] || "未知錯誤"), "error");
    }
  };
  w.PhotoLocalSafety={
    readExif,
    refreshAlbum,
    getPending:all,
    updateLocation:w.updatePhotoLocation,
    batchUpdateLocation:w.batchUpdatePhotoLocation,
    getDiagnostics:() => (w.latestPhotoDiagnostics || []),
    parseZipDirectory,
    extractZipEntry,
    handlePhotoZipUpload:w.handlePhotoZipUpload,
    executeZipImportNew:w.executeZipImportNew,
    executeZipRecoverExisting:w.executeZipRecoverExisting
  };

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
