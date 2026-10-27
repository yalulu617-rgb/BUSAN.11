// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Memory Module (Photo Album + Photo CRUD)
// Responsibilities: album render, photo delete, photo download
// ─────────────────────────────────────────────────────────────────────────

// ── Photo CRUD ────────────────────────────────────────────────────────────
window.deleteCurrentPhoto = async function () {
    if (!window.currentLightboxKey) { showToast('無法識別照片', 'warning'); return; }
    if (!confirm('確認刪除此照片？此操作不可還原。')) return;
    try {
        const result = await NetworkEngine.firebaseRemove(`${DB_PHOTOS}/${window.currentLightboxKey}`);
        // NetworkEngine returns {success:false} rather than throwing on
        // Firebase failures. Keep the lightbox and record until confirmed.
        if (!result || result.success !== true) {
            throw new Error(result?.error || '照片刪除未完成');
        }
    } catch (e) {
        console.error('[Memory] deleteCurrentPhoto failed:', e);
        showToast('刪除照片失敗；原照片仍保留，請檢查連線後重試', 'error');
        return;
    }
    closeLightbox();
    showToast('照片已刪除', 'success');
};

window.downloadImage = function () {
    const url = window.currentLightboxUrl;
    if (!url) { showToast('無圖片可下載', 'warning'); return; }
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `busan_photo_${Date.now()}.jpg`;
    a.target   = '_blank';
    a.click();
};



(function() {
    window.renderMemoryAlbum = function() {
        const grid = document.getElementById('albumContainer');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        let filtered = [...window.photoList || []];
        const searchInput = document.getElementById('memorySearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(p => String(p.date || '').toLowerCase().includes(query) || String(p.city || '').toLowerCase().includes(query));
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = "<div class='empty-state' style='grid-column: span 2; text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;'>📸 尚無拍立得照片，點擊下方按鈕上傳第一張旅行回憶吧！</div>";
            return;
        }
        
        filtered.forEach(p => {
            const card = document.createElement('div');
            card.className = 'polaroid fade-scale-in';
            const opener = document.createElement('button');
            opener.type = 'button';
            opener.setAttribute('aria-label', '放大旅行照片');
            opener.style.cssText = 'display:block;width:100%;border:0;background:none;padding:0;cursor:pointer;';
            opener.onclick = () => openLightbox(p.url, p.key);
            const img = document.createElement('img');
            img.src = p.url;
            img.alt = p.locationLabel ? '旅行照片：' + p.locationLabel : '旅行回憶照片';
            img.loading = 'lazy';
            opener.appendChild(img);
            card.appendChild(opener);
            const tags = document.createElement('div');
            tags.style.cssText = 'font-size:.65rem;color:#596e7b;font-weight:900;margin-top:6px;display:flex;gap:5px;justify-content:space-between;flex-wrap:wrap';
            const itineraryDate = document.createElement('span');
            itineraryDate.textContent = '🗓️ 行程 ' + (p.date || '未分類');
            const city = document.createElement('span');
            city.textContent = p.city || '📍 地點未填寫';
            tags.append(itineraryDate, city);
            card.appendChild(tags);
            const info = document.createElement('p');
            info.style.cssText = 'font-size:.67rem;line-height:1.45;color:#607b8b;margin:5px 0';
            const time = typeof p.capturedAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(p.capturedAt)
                ? p.capturedAt.slice(0,16).replace('T',' ') + (p.captureUtcOffset ? ' ' + p.captureUtcOffset : '')
                : '拍攝時間未提供';
            const place = typeof p.locationLabel === 'string' && p.locationLabel.trim()
                ? p.locationLabel.trim()
                : (Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
                    ? p.latitude.toFixed(5) + ', ' + p.longitude.toFixed(5) : '地點未提供');
            info.textContent = '🕒 ' + time + '  ·  📍 ' + place;
            card.appendChild(info);
            if(Number.isFinite(p.latitude) && Number.isFinite(p.longitude)){
                const map = document.createElement('a');
                map.textContent = '地圖定位 ›';
                map.href = 'https://www.google.com/maps/search/?api=1&query=' +
                    encodeURIComponent(p.latitude + ',' + p.longitude);
                map.target = '_blank'; map.rel = 'noopener noreferrer';
                map.style.cssText = 'font-size:.68rem;color:#1b7197;display:inline-block;margin-right:10px';
                card.appendChild(map);
            }
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'memory-meta-edit';
            edit.textContent = '✎ 編輯時間／地點';
            edit.style.cssText = 'border:1px solid #d6c6a9;background:#fffaf0;border-radius:9px;padding:6px 8px;font-size:.68rem;color:#315b73;min-height:33px';
            edit.onclick = () => window.openPhotoMetadataEditor(p.key);
            card.appendChild(edit);
            grid.appendChild(card);
        });
    };
})();


// Photo metadata updates are optional and never rewrite the hosted image.
// Do not derive capture time from legacy upload timestamp.
window.openPhotoMetadataEditor = function(key) {
    const photo = (window.photoList || []).find(row => row?.key === key);
    const dialog = document.getElementById('photoMetadataDialog');
    if(!photo || !dialog || typeof dialog.showModal !== 'function') return false;
    document.getElementById('photoMetadataKey').value = key;
    document.getElementById('photoCapturedAt').value =
        typeof photo.capturedAt === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(photo.capturedAt)
          ? photo.capturedAt.slice(0,19) : '';
    document.getElementById('photoLocationLabel').value = photo.locationLabel || '';
    const hasGPS = Number.isFinite(photo.latitude) && Number.isFinite(photo.longitude);
    const keep = document.getElementById('photoKeepStoredGPS');
    keep.checked = hasGPS;
    keep.disabled = !hasGPS;
    document.getElementById('photoStoredGPSInfo').textContent = hasGPS
        ? '目前已存 GPS：' + photo.latitude.toFixed(5) + ', ' + photo.longitude.toFixed(5)
        : '這張照片沒有已儲存的 GPS。可填寫上方地點名稱。';
    dialog.showModal();
    return true;
};
window.closePhotoMetadataEditor = function() {
    document.getElementById('photoMetadataDialog')?.close();
};
window.savePhotoMetadataEditor = async function() {
    const key = document.getElementById('photoMetadataKey')?.value;
    const photo = (window.photoList || []).find(row => row?.key === key);
    if(!photo) return;
    const raw = (document.getElementById('photoCapturedAt')?.value || '').trim();
    const label = (document.getElementById('photoLocationLabel')?.value || '').trim().slice(0,100);
    let capturedAt = null;
    if(raw){
        const check = raw.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d))?$/);
        if(!check){showToast('日期格式有誤，照片資訊未更改','error');return;}
        // datetime-local omits :00 in many browsers. Number(undefined) is NaN;
        // parse the optional seconds separately before calendar validation.
        const [year,month,day,hour,minute] = check.slice(1,6).map(Number);
        const second = check[6] === undefined ? 0 : Number(check[6]);
        const parsed=new Date(Date.UTC(year,month-1,day,hour,minute,second));
        if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()!==month-1||
           parsed.getUTCDate()!==day||parsed.getUTCHours()!==hour||
           parsed.getUTCMinutes()!==minute||parsed.getUTCSeconds()!==second){
            showToast('日期或時間無效，照片資訊未更改','error');return;
        }
        capturedAt = raw.length===16?raw+':00':raw;
    }
    const keepGPS = document.getElementById('photoKeepStoredGPS')?.checked === true;
    const patch = {
        capturedAt,
        captureTimeSource: capturedAt === photo.capturedAt ? (photo.captureTimeSource || 'manual') : capturedAt ? 'manual' : null,
        captureUtcOffset: capturedAt === photo.capturedAt ? (photo.captureUtcOffset || null) : null,
        locationLabel: label || null,
        locationSource: label ? 'manual' : keepGPS && Number.isFinite(photo.latitude) ? (photo.locationSource || 'exif') : null,
        latitude: keepGPS && Number.isFinite(photo.latitude) ? photo.latitude : null,
        longitude: keepGPS && Number.isFinite(photo.longitude) ? photo.longitude : null
    };
    const capturedDay = capturedAt?.slice(0,10);
    if(capturedDay && capturedDay >= '2026-11-13' && capturedDay <= '2026-11-17'){
        patch.date=capturedDay.slice(5).replace('-','/');
    }
    const saveButton = document.getElementById('photoMetadataSaveBtn');
    if(saveButton)saveButton.disabled=true;
    try{
        const result = await NetworkEngine.firebaseUpdate(DB_PHOTOS + '/' + key, patch);
        if(result?.success!==true)throw new Error(result?.error || '照片資訊未儲存');
        // Firebase listener supplies authoritative follow-up; update immediate UI
        // to avoid showing the old metadata before the round-trip event fires.
        const after={...photo,...patch};
        window.photoList = window.photoList.map(row => row.key===key?after:row);
        if(typeof renderMemoryAlbum === 'function')renderMemoryAlbum();
        if(typeof triggerContextUpdate === 'function')triggerContextUpdate();
        window.closePhotoMetadataEditor();
        showToast('照片拍攝資訊已儲存','success');
    }catch(err){
        console.warn('[Memory] metadata save was rejected:',err);
        showToast('照片資訊未儲存；原資料仍保留','error');
    }finally{if(saveButton)saveButton.disabled=false;}
};
