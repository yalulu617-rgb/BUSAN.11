/* BUSAN.11 owner restaurant persistence hotfix. Revision 2026-11-09.
 * Load after components/renderers.js and js/app.js in index.html.
 * Leaves all existing Firebase and encrypted private-ledger data unchanged.
 * Ensures local outbox retention, idempotent writes, and detailed sync error display.
 */
(function (w, d) {
  'use strict';
  const OUTBOX_KEY = 'busan_v46_guide_pending_v1';
  const DRAFT_KEY = 'busan_v46_guide_draft_v1';
  const PHOTO_FIELDS = ['gdType', 'gdTitle', 'gdDesc', 'gdLink', 'tempGuideImg', 'gdEditKey'];
  const isValidKey = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(s);
  const toast = (msg, status) => typeof w.showToast === 'function' && w.showToast(msg, status);

  function formatErrorDetail(err) {
    if (!navigator.onLine) return '離線無網路';
    const s = String(err || '');
    if (s.includes('PERMISSION_DENIED') || s.includes('401')) return '未登入或權限不足';
    if (s.includes('403')) return '資料庫拒絕寫入 (403)';
    return s ? `連線問題: ${s}` : '待連線同步';
  }

  function storageGet(key, fallback) {
    const response = w.StorageEngine.get(key, fallback);
    if (!response || response.success !== true) throw new Error('Local storage could not be read');
    return response.data;
  }
  function storageSet(key, value) {
    const result = w.StorageEngine.set(key, value);
    if (!result || result.success !== true) throw new Error('Local storage could not be saved');
  }
  const readPending = () => {
    const entries = storageGet(OUTBOX_KEY, []);
    return Array.isArray(entries) ? entries.filter(r => r && isValidKey(r.key) && r.payload && typeof r.payload === 'object') : [];
  };
  const writePending = list => storageSet(OUTBOX_KEY, list);
  const uniqueKey = () => {
    const random = w.crypto?.getRandomValues?.(new Uint32Array(2));
    if (!random) throw new Error('Secure randomness unavailable');
    return 'owner_' + Date.now().toString(36) + '_' + Array.from(random, n => n.toString(36)).join('_');
  };
  const fields = () => Object.fromEntries(PHOTO_FIELDS.map(id => [id, d.getElementById(id)?.value || '']));
  function saveDraft() {
    try { storageSet(DRAFT_KEY, fields()); }
    catch (e) { console.warn('[GuideHotfix] Cannot cache draft', e); }
  }
  function restoreDraft() {
    try {
      const draft = storageGet(DRAFT_KEY, null);
      if (!draft || typeof draft !== 'object') return;
      if (d.getElementById('gdTitle')?.value?.trim()) return;
      for (const id of PHOTO_FIELDS) {
        const el = d.getElementById(id);
        if (el && typeof draft[id] === 'string') el.value = draft[id];
      }
    } catch (e) { console.warn('[GuideHotfix] Cannot restore draft', e); }
  }
  const pendingRow = record => ({
    ...record.payload,
    key: record.key,
    pendingSync: true,
    ownerCreated: true
  });
  function overlayPending() {
    let pending;
    try { pending = readPending(); }
    catch (e) { console.error('[GuideHotfix] Pending records inaccessible', e); return; }
    const combined = Array.isArray(w.guideData) ? w.guideData.slice() : [];
    for (const record of pending) {
      const index = combined.findIndex(row => row.key === record.key);
      if (index < 0) combined.push(pendingRow(record));
      else combined[index] = { ...combined[index], ...pendingRow(record) };
    }
    w.guideData = combined;
  }
  function renderSafe() {
    overlayPending();
    if (typeof w.renderGuideContent === 'function') w.renderGuideContent();
    updateSyncStatus();
  }
  function updateSyncStatus() {
    const bar = d.getElementById('guidePendingSyncBar');
    if (!bar) return;
    const button = d.getElementById('retryGuideSync');
    try {
      const pendingList = readPending();
      const count = pendingList.length;
      bar.hidden = count === 0;
      if (button) button.hidden = count === 0;
      if (count) {
        const lastErr = pendingList.find(p => p.lastError)?.lastError;
        const errText = lastErr ? ` (${lastErr})` : '';
        bar.textContent = `📌 ${count} 筆餐廳／景點已保存在此裝置，尚未同步到雙人帳本${errText}。`;
      } else {
        bar.textContent = '';
      }
    } catch (_) {
      bar.hidden = false;
      if (button) button.hidden = true;
      bar.textContent = '本機暫存無法讀取；請勿清除網站資料。';
    }
  }
  function initUI() {
    if (!d.getElementById('guidePendingSyncBar')) {
      const card = d.getElementById('addGuideCard');
      if (card) {
        const bar = d.createElement('p');
        bar.id = 'guidePendingSyncBar';
        bar.style.cssText = 'font-size:.82rem;line-height:1.5;color:#a14f30;font-weight:700;';
        bar.setAttribute('role', 'status');
        const button = d.createElement('button');
        button.id = 'retryGuideSync';
        button.type = 'button';
        button.textContent = '重新同步本機收藏';
        button.className = 'btn-search';
        button.onclick = () => w.retryPendingGuideSync();
        card.appendChild(bar);
        card.appendChild(button);
      }
    }
    for (const id of PHOTO_FIELDS) {
      const el = d.getElementById(id);
      if (el) { el.addEventListener('input', saveDraft); el.addEventListener('change', saveDraft); }
    }
    restoreDraft();
    updateSyncStatus();
    overlayPending();
  }
  const originalRender = w.renderGuideContent;
  if (typeof originalRender === 'function') {
    w.renderGuideContent = function () {
      overlayPending();
      const result = originalRender.apply(this, arguments);
      updateSyncStatus();
      return result;
    };
  }
  const originalFilter = w.filterGuideContent;
  if (typeof originalFilter === 'function') {
    w.filterGuideContent = function () {
      overlayPending();
      return originalFilter.apply(this, arguments);
    };
  }
  const originalEdit = w.editGuide;
  if (typeof originalEdit === 'function') {
    w.editGuide = function () { overlayPending(); return originalEdit.apply(this, arguments); };
  }

  w.addGuideItem = async function () {
    const data = fields();
    const title = data.gdTitle.trim();
    if (!title) { toast('請填入餐廳／景點名稱', 'warning'); return; }
    const payload = {
      type: data.gdType || '打卡景點', title, desc: data.gdDesc.trim(),
      link: data.gdLink.trim(), img: data.tempGuideImg,
      ownerCreated: true, updatedAt: Date.now()
    };
    let pending, key, mode;
    try {
      pending = readPending();
      key = data.gdEditKey;
      mode = key ? 'update' : 'create';
      if (!key) key = uniqueKey();
      if (!isValidKey(key)) throw new Error('Invalid record identifier');
      const entry = { key, mode, payload, queuedAt: Date.now() };
      pending = pending.filter(x => x.key !== key);
      pending.push(entry);
      writePending(pending);
    } catch (e) {
      console.error('[GuideHotfix] Cannot safely store this restaurant', e);
      toast('本機空間無法保存餐廳，表單仍保留，請勿關閉此頁', 'error');
      return;
    }

    let saved = { success: false, error: 'offline' };
    try {
      if (w.NetworkEngine?._db && navigator.onLine !== false) {
        const path = `${w.DB_GUIDE}/${key}`;
        saved = mode === 'update'
          ? await w.NetworkEngine.firebaseUpdate(path, payload)
          : await w.NetworkEngine.firebaseWrite(path, { ...payload, ts: Date.now() });
      }
    } catch (e) {
      saved = { success: false, error: e.message };
    }
    if (saved?.success === true) {
      try {
        writePending(readPending().filter(x => x.key !== key));
        w.guideData = Array.isArray(w.guideData) ? w.guideData : [];
        const index = w.guideData.findIndex(x => x.key === key);
        const row = { ...payload, key };
        if (index >= 0) w.guideData[index] = row;
        else w.guideData.push(row);
        w.StorageEngine.set('busan_v36_guide', w.guideData);
        toast('✅ 餐廳已同步到雙人收藏', 'success');
      } catch (e) {
        console.warn('[GuideHotfix] Server saved but outbox cleanup deferred', e);
        toast('已寫入雙人收藏，本機同步標記待更新', 'info');
      }
    } else {
      const errDetail = formatErrorDetail(saved?.error);
      const pendingNow = readPending();
      const found = pendingNow.find(x => x.key === key);
      if (found) { found.lastError = errDetail; writePending(pendingNow); }
      console.warn('[GuideHotfix] Firebase write declined; local record retained', saved?.error);
      toast(`此裝置已保留餐廳，尚未同步 (${errDetail})`, 'warning');
    }
    renderSafe();
    if (typeof w.setFoodTabMode === 'function' && payload.type === '必吃美食') {
      w.currentGuideTab = '必吃美食';
      w.setFoodTabMode('my');
    }
    const reset = w.cancelGuideEdit;
    if (typeof reset === 'function') reset();
    try { w.StorageEngine.remove(DRAFT_KEY); } catch (_) {}
  };

  w.retryPendingGuideSync = async function () {
    let pending;
    try { pending = readPending(); }
    catch (e) { toast('本機資料讀取失敗，請勿清除網站資料', 'error'); return; }
    if (!pending.length) { return; }
    if (!w.NetworkEngine?._db || navigator.onLine === false) {
      updateSyncStatus();
      return;
    }
    let ok = 0;
    for (const entry of pending) {
      let response;
      try {
        const path = `${w.DB_GUIDE}/${entry.key}`;
        response = entry.mode === 'update'
          ? await w.NetworkEngine.firebaseUpdate(path, entry.payload)
          : await w.NetworkEngine.firebaseWrite(path, entry.payload);
      } catch (e) { response = { success: false, error: e.message }; }
      if (response?.success !== true) {
        entry.lastError = formatErrorDetail(response?.error);
        continue;
      }
      try { writePending(readPending().filter(x => x.key !== entry.key)); ok++; }
      catch (e) { console.warn('[GuideHotfix] Sync ack received, local cleanup deferred', e); }
    }
    renderSafe();
    const left = readPending().length;
    if (ok > 0) {
      toast(left ? `已同步 ${ok} 筆，仍有 ${left} 筆待同步` : `✅ 已同步 ${ok} 筆餐廳／景點`, left ? 'warning' : 'success');
    }
  };

  const oldDelete = w.deleteGuide;
  if (typeof oldDelete === 'function') {
    w.deleteGuide = function (key) {
      let pending;
      try { pending = readPending(); }
      catch (_) { toast('本機資料暫時無法讀取', 'error'); return; }
      const entry = pending.find(x => x.key === key);
      if (entry) {
        if (!confirm(entry.mode === 'update' ? '放棄這筆尚未同步的修改？' : '刪除這筆僅保存在本機的收藏？')) return;
        try { writePending(pending.filter(x => x.key !== key)); }
        catch (e) { toast('刪除失敗，原紀錄仍保留', 'error'); return; }
        w.guideData = (w.guideData || []).filter(x => x.key !== key || entry.mode === 'update');
        renderSafe();
        return;
      }
      return oldDelete.apply(this, arguments);
    };
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', initUI, { once: true });
  else initUI();
})(window, document);
