// BUSAN.11: read-only audit and recovery for photos uploaded BEFORE local
// original retention existed. Works on existing Firebase photoList, never writes
// cloud records, re-uploads, or stores private photo bytes outside this device.
// Cross-origin servers may prevent JavaScript from reading valid image bytes.
(function (root, doc) {
  'use strict';
  const MAX_BATCH_PHOTOS = 45;
  const MAX_BATCH_BYTES = 90 * 1024 * 1024;
  const MAX_FILE_BYTES = 32 * 1024 * 1024;
  const MAX_PROBES = 5;
  const PROBE_TIMEOUT_MS = 12000;
  let session = null;
  let running = false;
  const el = id => doc.getElementById(id);
  const status = message => {
    const target = el('cloudRescueStatus');
    if (target) target.textContent = message;
  };
  const safeUrl = value => {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol !== 'https:') return false;
      return ['i.ibb.co', 'ibb.co', 'image.ibb.co', 'imgbb.com', 'www.imgbb.com'].includes(url.hostname.toLowerCase());
    } catch (_) { return false; }
  };
  function rows() {
    const input = Array.isArray(root.photoList) ? root.photoList : [];
    const unique = new Set();
    return input.filter(photo => {
      if (!photo || photo.localOnly || !photo.key || !photo.url || unique.has(photo.key)) return false;
      unique.add(photo.key);
      return true;
    }).map(photo => ({
      key: String(photo.key),
      url: String(photo.url),
      date: String(photo.capturedAt || photo.date || ''),
      filename: String(photo.filename || '')
    })).sort((a, b) => a.key.localeCompare(b.key));
  }
  function refreshCount() {
    const label = el('cloudRescueCount');
    if (label) label.textContent = '目前相簿已載入 ' + rows().length + ' 筆雲端照片紀錄（並非已備份張數）';
  }
  function classifyDecoded(photo, width, height) {
    const health = root.PhotoHostHealth?.inspect(photo.url, {
      naturalWidth: width, naturalHeight: height
    }) || { status: width && height ? 'ok' : 'unavailable' };
    return health.status === 'ok' ? 'displayable' :
      health.status === 'suspect' ? 'suspected-error-image' : 'image-unavailable';
  }
  async function probe(photo) {
    if (!safeUrl(photo.url)) return { ...photo, status: 'unsupported-link', width: 0, height: 0 };
    return new Promise(resolve => {
      const image = new Image();
      let settled = false;
      let timer;
      const finish = (result, width = 0, height = 0) => {
        if (settled) return;
        settled = true;
        root.clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
        resolve({ ...photo, status: result, width, height });
      };
      image.onload = () => finish(classifyDecoded(photo, image.naturalWidth, image.naturalHeight),
        image.naturalWidth, image.naturalHeight);
      image.onerror = () => finish('image-unavailable');
      timer = root.setTimeout(() => finish('timeout-unconfirmed'), PROBE_TIMEOUT_MS);
      image.src = photo.url;
    });
  }
  function summary() {
    const list = session?.audit || [];
    const counts = {};
    for (const row of list) counts[row.status] = (counts[row.status] || 0) + 1;
    const downloaded = list.filter(row => row.downloadStatus === 'bytes-fetched').length;
    return { total: list.length, counts, downloaded,
      attempted: list.filter(row => row.downloadStatus).length,
      nextCursor: session?.cursor || 0,
      remainingCandidates: session ? session.candidates.length - session.cursor : 0
    };
  }
  async function scan() {
    const photos = rows();
    if (!photos.length) {
      status('現在還沒有載入雲端照片清單。請保留原始資料；不會要求重新上傳。');
      return false;
    }
    session = { audit: new Array(photos.length), candidates: [], cursor: 0, startedAt: Date.now() };
    let index = 0, completed = 0;
    await Promise.all(Array.from({ length: Math.min(MAX_PROBES, photos.length) }, async () => {
      while (index < photos.length) {
        const i = index++;
        session.audit[i] = await probe(photos[i]);
        completed++;
        if (completed % 10 === 0 || completed === photos.length) {
          status('正在檢查舊照片圖片來源：' + completed + ' / ' + photos.length + '；不會更動 Firebase。');
        }
      }
    }));
    session.candidates = session.audit.filter(photo => photo.status === 'displayable');
    const tally = summary();
    status('已盤點 ' + tally.total + ' 筆：可顯示 ' + (tally.counts.displayable || 0) +
      '、疑似錯圖 ' + (tally.counts['suspected-error-image'] || 0) +
      '、無法顯示 ' + (tally.counts['image-unavailable'] || 0) +
      '、其他未確認 ' + ((tally.counts['timeout-unconfirmed'] || 0) + (tally.counts['unsupported-link'] || 0)) +
      '。可顯示不代表已備份，接著嘗試取回圖片檔案。');
    if (el('cloudRescueReport')) el('cloudRescueReport').hidden = false;
    return true;
  }
  function signature(bytes) {
    if (bytes.length < 12) return '';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
    const ascii = (a, b) => String.fromCharCode(...bytes.slice(a, b));
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
    if (ascii(4, 8) === 'ftyp' && /avif|avis/.test(ascii(8, 16))) return 'avif';
    return '';
  }
  async function downloadOne(photo) {
    try {
      if (!safeUrl(photo.url)) throw new Error('非 ImgBB 圖片來源');
      const response = await root.fetch(photo.url, {
        mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error'
      });
      if (!response.ok || response.type === 'opaque') throw new Error('HTTP ' + response.status);
      const headerSize = Number(response.headers?.get('content-length') || 0);
      if (headerSize > MAX_FILE_BYTES) throw new Error('圖片超過單張安全下載上限');
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_FILE_BYTES) throw new Error('圖片大小異常或超過上限');
      const buffer = await blob.arrayBuffer();
      const format = signature(new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 24)));
      if (!format) throw new Error('伺服器未回傳可辨識圖片檔，可能是錯誤頁');
      const safeKey = photo.key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70);
      photo.downloadStatus = 'bytes-fetched';
      photo.bytes = buffer.byteLength;
      return { id: photo.key, cloudKey: photo.key, filename: safeKey + '.' + format,
        blob: buffer, hostedUrl: photo.url, metadata: { capturedAt: photo.date },
        synced: true };
    } catch (error) {
      // A CORS-blocked fetch does NOT prove the remote image was deleted.
      photo.downloadStatus = 'unreadable-from-browser';
      photo.downloadReason = error instanceof TypeError ?
        '瀏覽器跨網域限制或網路錯誤，不能判定圖檔遺失' :
        String(error?.message || '讀取失敗').slice(0, 180);
      return null;
    }
  }
  function saveDownload(blob, filename) {
    const url = root.URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    doc.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(() => root.URL.revokeObjectURL(url), 60000);
  }
  function downloadReport() {
    if (!session) { status('尚未完成盤點，沒有可下載的救援報告。'); return; }
    const report = { kind: 'BUSAN.11-cloud-rescue-audit', createdAt: new Date().toISOString(),
      warning: '只有 ZIP 內實際檔案才是圖片備份；網址清單不是照片備份。CORS 失敗也不等於原圖消失。',
      ...summary(), photos: session.audit.map(p => ({
        key: p.key, url: p.url, date: p.date, status: p.status,
        imageWidth: p.width, imageHeight: p.height,
        downloadStatus: p.downloadStatus || 'not-attempted',
        downloadReason: p.downloadReason || null, downloadedBytes: p.bytes || 0
      })) };
    saveDownload(new Blob([JSON.stringify(report, null, 2)], { type:'application/json' }),
      'BUSAN11_existing_photo_audit_' + new Date().toISOString().slice(0, 10) + '.json');
    status('已提出盤點報告下載。報告只是清單，不是照片備份；請勿公開分享網址。');
  }
  async function downloadNext() {
    if (running || !session) return;
    running = true;
    const nextButton = el('cloudRescueNext');
    if (nextButton) nextButton.disabled = true;
    try {
      const start = session.cursor;
      const total = session.candidates.length;
      let bytes = 0;
      const archived = [];
      let attempted = 0;
      while (session.cursor < total && attempted < MAX_BATCH_PHOTOS) {
        const photo = session.candidates[session.cursor];
        const record = await downloadOne(photo);
        session.cursor++;
        attempted++;
        if (record) {
          archived.push(record);
          bytes += record.blob.byteLength;
          // Never mark a file as downloaded unless included in the ZIP.
          // A final file may cross the soft limit by at most MAX_FILE_BYTES.
          if (bytes >= MAX_BATCH_BYTES) break;
        }
        if (attempted % 5 === 0 || session.cursor === total) {
          status('嘗試取回可顯示照片檔案：' + session.cursor + ' / ' + total +
            '；目前本包實際取得 ' + archived.length + ' 張。');
        }
      }
      if (archived.length) {
        const zipBuilder = root.PhotoLocalSafety?.createCloudPhotosZip;
        if (typeof zipBuilder !== 'function') throw new Error('ZIP 產生器尚未載入，沒有下載不完整備份');
        const zip = await zipBuilder(archived);
        const part = String(Math.ceil(start / MAX_BATCH_PHOTOS) + 1).padStart(2, '0');
        saveDownload(zip, 'BUSAN11_existing_cloud_photo_recovery_part' + part + '.zip');
      }
      const totals = summary();
      status('已檢查 ' + totals.total + ' 筆雲端紀錄；實際取得圖片位元組 ' +
        totals.downloaded + ' 張。' + (archived.length ?
          '本次已提出 ' + archived.length + ' 張 ZIP 下載（請確認瀏覽器已保存）。' :
          '本次沒有可封裝的圖片，可能受跨網域限制；不能推論照片已遺失。') +
        (totals.remainingCandidates ? ' 還有 ' + totals.remainingCandidates + ' 張可嘗試下一包。' :
          ' 本輪下載嘗試已結束；可匯出盤點報告。'));
      if (el('cloudRescueNext')) el('cloudRescueNext').hidden = totals.remainingCandidates === 0;
      if (el('cloudRescueReport')) el('cloudRescueReport').hidden = false;
    } catch (error) {
      status('雲端照片備份未完成：' + String(error?.message || error) +
        '。既有雲端照片與 Firebase 紀錄都未修改。');
    } finally {
      running = false;
      if (nextButton) nextButton.disabled = false;
    }
  }
  async function start() {
    if (running) return;
    running = true;
    const button = el('cloudRescueStart');
    if (button) button.disabled = true;
    if (el('cloudRescueNext')) el('cloudRescueNext').hidden = true;
    try {
      if (await scan()) {
        running = false;
        await downloadNext();
      }
    } catch (error) {
      status('盤點未完成：' + String(error?.message || error) +
        '。沒有刪除或更動任何雲端紀錄。');
    } finally {
      running = false;
      if (button) button.disabled = false;
    }
  }
  root.CloudPhotoRescue = Object.freeze({ start, downloadNext, downloadReport, refreshCount, getSummary: summary });
  if (doc.readyState === 'loading')
    doc.addEventListener('DOMContentLoaded', refreshCount, { once:true });
  else refreshCount();
})(window, document);
