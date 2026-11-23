// BUSAN.11 — Verify existing-photo ZIP files AFTER the browser has saved them.
// Read-only: no Firebase/ImgBB writes, no uploads, no external requests.
// A URL or a download click is NOT proof that a photo was backed up.
(function(root, doc) {
  'use strict';
  const MAX_ARCHIVES = 30;
  const MAX_ARCHIVE_BYTES = 350 * 1024 * 1024;
  const MAX_PHOTOS_PER_ARCHIVE = 55;
  let busy = false;
  let verified = new Map();
  let archives = [];
  let issues = [];

  const el = id => doc.getElementById(id);
  const msg = text => { const node = el('cloudRescueVerifyStatus'); if (node) node.textContent = text; };
  const photoIndex = () => {
    const all = Array.isArray(root.photoList) ? root.photoList : [];
    const index = new Map();
    for (const row of all) {
      if (!row || row.localOnly || !row.key || !row.url) continue;
      const key = String(row.key);
      if (!index.has(key)) index.set(key, { key, url: String(row.url),
        capturedAt: String(row.capturedAt || row.date || '') });
    }
    return index;
  };
  const hex = bytes => [...new Uint8Array(bytes)]
    .map(byte => byte.toString(16).padStart(2,'0')).join('');
  const crcTable = Array.from({ length: 256 }, (_, i) => {
    let n = i;
    for (let bit = 0; bit < 8; bit++)
      n = (n & 1) ? (0xedb88320 ^ (n >>> 1)) : (n >>> 1);
    return n >>> 0;
  });
  function crc32(bytes) {
    let n = 0xffffffff;
    for (const value of bytes) n = crcTable[(n ^ value) & 0xff] ^ (n >>> 8);
    return (n ^ 0xffffffff) >>> 0;
  }
  function summary() {
    const expected = photoIndex();
    const matching = [...verified.keys()].filter(key => expected.has(key)).length;
    const missing = [...expected.values()].filter(row => !verified.has(row.key));
    return {
      total: expected.size, verified: matching, missing: missing.length,
      archives: archives.length, issues: issues.length,
      complete: expected.size > 0 && missing.length === 0 && issues.length === 0,
      missingRecords: missing.map(row => ({key: row.key, capturedAt: row.capturedAt}))
    };
  }
  function render() {
    const result = summary();
    msg('雲端照片紀錄 ' + result.total + ' 張；已從 ZIP 解開並校驗 ' +
      result.verified + ' 張；尚未核對到 ' + result.missing +
      ' 張；檢查 ' + result.archives + ' 包。' +
      (result.issues ? ' 異常 ' + result.issues + ' 項，請保留原始 ZIP。' : '') +
      (result.complete ? ' ✅ 目前已載入的照片紀錄全部在所選 ZIP 中找到可校驗的圖片檔。請把 ZIP 複製到另一個安全位置。' :
        ' ⚠️ 尚不能認定所有照片都有完整備份。'));
    const details = el('cloudRescueVerifyIssues');
    if (!details) return;
    details.replaceChildren();
    const warningItems = issues.slice(0, 12);
    const missingItems = result.missingRecords.slice(0, 12);
    if (!warningItems.length && !missingItems.length) return;
    for (const text of warningItems) {
      const item = doc.createElement('p');
      item.textContent = '⚠️ ' + text;
      details.appendChild(item);
    }
    for (const row of missingItems) {
      const item = doc.createElement('p');
      item.textContent = '尚未找到備份：' + row.key +
        (row.capturedAt ? ' (' + row.capturedAt.slice(0, 10) + ')' : '');
      details.appendChild(item);
    }
    if (issues.length > 12 || result.missing > 12) {
      const item = doc.createElement('p');
      item.textContent = '其餘未顯示 ' +
        (Math.max(0, issues.length - 12) + Math.max(0, result.missing - 12)) +
        ' 項；請保留完整 ZIP，避免誤判。';
      details.appendChild(item);
    }
  }
  function issue(fileName, reason) {
    issues.push(String(fileName || '未知備份包').slice(0, 100) + '：' +
      String(reason || '無法驗證').slice(0, 200));
  }
  async function inspectOne(file, expected) {
    const name = String(file?.name || 'unknown.zip');
    if (!file || !/\.zip$/i.test(name) || !file.size || file.size > MAX_ARCHIVE_BYTES)
      throw new Error('不是有效的 ZIP，或檔案超過 350MB');
    const service = root.PhotoLocalSafety;
    if (!service?.parseZipDirectory || !service?.extractZipEntry)
      throw new Error('ZIP 解壓與驗證功能尚未載入');
    const entries = await service.parseZipDirectory(file, { includeBackupManifest: true });
    const manifestEntry = entries.find(row => row.filename === 'backup-manifest.json');
    if (!manifestEntry) throw new Error('找不到 ZIP 內的 backup-manifest.json');
    const manifestFile = await service.extractZipEntry(file, manifestEntry);
    const manifest = JSON.parse(await manifestFile.text());
    if (!['cloud-hosted', 'device-original'].includes(manifest?.source) ||
        !Array.isArray(manifest.photos) || !manifest.photos.length ||
        manifest.photos.length > MAX_PHOTOS_PER_ARCHIVE)
      throw new Error('備份來源不明、缺少照片清單，或單包超過安全上限');
    const directory = new Map(entries.filter(x => x.filename !== 'backup-manifest.json')
      .map(row => [row.filename, row]));
    if (directory.size !== manifest.photos.length)
      throw new Error('ZIP 圖片數量與備份清單不一致');
    const thisArchive = new Map();
    for (const photo of manifest.photos) {
      const key = String(photo.cloudKey || '');
      const filename = String(photo.archiveFilename || '');
      if (!key || !expected.has(key)) throw new Error('有照片無法與目前相簿的 Firebase 紀錄配對');
      if (!filename.startsWith('photos/') || !directory.has(filename))
        throw new Error('照片清單對應的圖片檔不存在');
      if (thisArchive.has(key)) throw new Error('同一包內的照片編號重複');
      if (photo.hostedUrl && photo.hostedUrl !== expected.get(key).url)
        throw new Error('照片編號相同，但圖片網址與目前相簿不同');
      const entry = directory.get(filename);
      const image = await service.extractZipEntry(file, entry);
      const bytes = new Uint8Array(await image.arrayBuffer());
      if (!bytes.byteLength || crc32(bytes) !== entry.crc32)
        throw new Error('圖片 ' + key + ' 的 ZIP CRC32 不符或內容為空');
      const digest = hex(await root.crypto.subtle.digest('SHA-256', bytes));
      if (manifest.source === 'cloud-hosted' &&
          (!/^[a-f0-9]{64}$/i.test(String(photo.sha256 || '')) ||
           digest !== String(photo.sha256).toLowerCase()))
        throw new Error('圖片 ' + key + ' 的 SHA-256 不符或缺失');
      if (photo.sha256 && digest !== String(photo.sha256).toLowerCase())
        throw new Error('圖片 ' + key + ' 與備份清單不一致');
      thisArchive.set(key, { digest, zipName: name, source: manifest.source });
      // Yield to avoid freezing the Galaxy mobile browser on large photo sets.
      await new Promise(resolve => root.setTimeout(resolve, 0));
    }
    return thisArchive;
  }
  async function verify(fileList) {
    if (busy) return summary();
    const files = Array.from(fileList || []);
    if (!files.length) return summary();
    if (files.length > MAX_ARCHIVES) { msg('一次最多選擇 30 包 ZIP。'); return summary(); }
    const expected = photoIndex();
    if (!expected.size) {
      msg('相簿照片紀錄尚未載入，無法安全配對備份；請確認已進入原本的回憶錄。');
      return summary();
    }
    busy = true;
    const input = el('cloudRescueVerifyFiles');
    if (input) input.disabled = true;
    try {
      for (const file of files) {
        msg('正在本機驗證 ' + file.name + '：逐張解壓並比對 CRC32／SHA-256，不會上傳照片。');
        try {
          const matches = await inspectOne(file, expected);
          for (const [key, value] of matches) {
            const previous = verified.get(key);
            if (previous && previous.digest !== value.digest)
              issue(file.name, '重複照片 ' + key + ' 在不同 ZIP 中內容不一致');
            else verified.set(key, value);
          }
          archives.push(file.name);
        } catch(error) {
          issue(file.name, error?.message || error);
        }
        render();
      }
    } finally {
      busy = false;
      if (input) { input.disabled = false; input.value = ''; }
      render();
    }
    return summary();
  }
  function reset() {
    if (busy) return;
    verified = new Map(); archives = []; issues = [];
    render();
  }
  root.CloudPhotoBackupVerifier = Object.freeze({ verify, reset, summary, render });
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', render, { once:true });
  else render();
})(window, document);
