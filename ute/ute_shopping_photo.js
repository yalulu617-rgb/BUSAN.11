// Shopping photo Engine: resized device-only images backed by IndexedDB.
(function (target) {
  const DB_NAME = 'busan-shopping-photos';
  const STORE = 'photos';
  const MAX_FULL = 1200;
  const MAX_THUMB = 320;

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!target.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = target.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open photo storage'));
    });
  }

  async function transact(mode, operation) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = operation(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Photo storage operation failed'));
        transaction.onabort = () => reject(transaction.error || new Error('Photo storage transaction aborted'));
      });
    } finally {
      db.close();
    }
  }

  async function decode(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('請選擇圖片檔案');
    if (typeof target.createImageBitmap === 'function') {
      try { return await target.createImageBitmap(file, { imageOrientation: 'from-image' }); }
      catch { return target.createImageBitmap(file); }
    }
    const url = target.URL.createObjectURL(file);
    try {
      const image = new target.Image();
      image.decoding = 'async';
      image.src = url;
      await image.decode();
      return image;
    } finally {
      target.URL.revokeObjectURL(url);
    }
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  async function resize(image, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = await canvasBlob(canvas, 'image/webp', 0.78);
    if (!blob || blob.type !== 'image/webp') blob = await canvasBlob(canvas, 'image/jpeg', 0.8);
    if (!blob) throw new Error('圖片壓縮失敗');
    return blob;
  }

  function newKey() {
    return 'shop-photo-' + (target.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  const getStoredRecord = key => key ? transact('readonly', store => store.get(key)) : Promise.resolve(null);

  async function safeStoredRecord(record) {
    if (!record) return null;
    if (record.thumbBuffer instanceof ArrayBuffer && record.fullBuffer instanceof ArrayBuffer) {
      return {
        key: record.key,
        thumbBuffer: record.thumbBuffer,
        thumbType: record.thumbType,
        fullBuffer: record.fullBuffer,
        fullType: record.fullType,
        draft: record.draft,
        updatedAt: record.updatedAt
      };
    }
    if (record.thumb instanceof Blob && record.full instanceof Blob) {
      return {
        key: record.key,
        thumbBuffer: await record.thumb.arrayBuffer(),
        thumbType: record.thumb.type,
        fullBuffer: await record.full.arrayBuffer(),
        fullType: record.full.type,
        draft: record.draft,
        updatedAt: record.updatedAt
      };
    }
    return null;
  }

  async function save(file, existingKey) {
    const image = await decode(file);
    try {
      const [thumb, full] = await Promise.all([resize(image, MAX_THUMB), resize(image, MAX_FULL)]);
      const [thumbBuffer, fullBuffer] = await Promise.all([thumb.arrayBuffer(), full.arrayBuffer()]);
      const record = {
        key: existingKey || newKey(),
        thumbBuffer,
        thumbType: thumb.type,
        fullBuffer,
        fullType: full.type,
        draft: true,
        updatedAt: Date.now()
      };
      await transact('readwrite', store => store.put(record));
      return record.key;
    } finally {
      image.close?.();
    }
  }

  async function get(key) {
    const stored = await getStoredRecord(key);
    if (stored?.thumb instanceof Blob && stored?.full instanceof Blob) return stored;
    if (!(stored?.thumbBuffer instanceof ArrayBuffer) || !(stored?.fullBuffer instanceof ArrayBuffer)) return null;
    return {
      key: stored.key,
      thumb: new Blob([stored.thumbBuffer], { type: stored.thumbType || 'application/octet-stream' }),
      full: new Blob([stored.fullBuffer], { type: stored.fullType || 'application/octet-stream' }),
      draft: stored.draft,
      updatedAt: stored.updatedAt
    };
  }
  const remove = key => key ? transact('readwrite', store => store.delete(key)) : Promise.resolve();

  async function attach(key, alt) {
    const record = await safeStoredRecord(await getStoredRecord(key));
    if (!record) return null;
    record.draft = false;
    record.updatedAt = Date.now();
    await transact('readwrite', store => store.put(record));
    return { storage: 'indexeddb', key, alt: alt || '個人購物項目照片' };
  }

  function setBusy(busy) {
    const add = document.getElementById('addShopItemBtn');
    if (add) add.disabled = busy;
    document.querySelectorAll('[data-shop-photo-input]').forEach(input => { input.disabled = busy; });
  }

  async function select(file) {
    if (!file) return;
    const ref = document.getElementById('tempShopPhoto');
    const status = document.getElementById('shopPhotoStatus');
    setBusy(true);
    if (status) status.textContent = '正在縮小照片…';
    try {
      const key = await save(file, ref?.value || '');
      if (ref) ref.value = key;
      if (status) status.textContent = `✓ 已準備照片：${file.name || '相機照片'}`;
    } catch (error) {
      if (status) status.textContent = `無法使用照片：${error.message}`;
    } finally {
      setBusy(false);
    }
  }

  function clearSelection() {
    const ref = document.getElementById('tempShopPhoto');
    const status = document.getElementById('shopPhotoStatus');
    if (ref) ref.value = '';
    if (status) status.textContent = '';
    document.querySelectorAll('[data-shop-photo-input]').forEach(input => { input.value = ''; });
  }

  function init() {
    document.querySelectorAll('[data-shop-photo-input]').forEach(input => {
      input.addEventListener('change', () => select(input.files?.[0]));
    });
  }

  target.ShoppingPhotoEngine = { save, get, remove, attach, select, clearSelection };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
