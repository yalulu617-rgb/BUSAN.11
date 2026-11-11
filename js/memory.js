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
    // Reject missing/blank/out-of-range/legacy accidental (0,0) coordinates.
    // Preserve valid equator and prime-meridian points with one zero component.
    const validCoordinates = (rawLat, rawLng) => {
        if ([rawLat, rawLng].some(v => v === null || v === undefined || String(v).trim() === '')) return null;
        const lat = Number(rawLat), lng = Number(rawLng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
        return { lat, lng };
    };
    const coordinatesOf = p =>
        validCoordinates(p.location?.latitude, p.location?.longitude) ||
        validCoordinates(p.latitude, p.longitude);
    const fmtPoint = (a, b) => {
        const c = validCoordinates(a, b);
        return c ? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : '';
    };
    window.batchMode = false;
    window.selectedBatchPhotoKeys = new Set();

    window.toggleBatchLocationMode = function(forceState) {
        window.batchMode = (typeof forceState === 'boolean') ? forceState : !window.batchMode;
        if (!window.batchMode) {
            window.selectedBatchPhotoKeys.clear();
        }
        const bar = document.getElementById('batchActionBar');
        if (bar) {
            bar.style.display = window.batchMode ? 'flex' : 'none';
        }
        const text = document.getElementById('batchSelectedText');
        if (text) {
            text.textContent = `已選取 ${window.selectedBatchPhotoKeys.size} 張`;
        }
        window.renderMemoryAlbum();
    };

    window.exitBatchMode = function() {
        window.toggleBatchLocationMode(false);
    };

    window.togglePhotoSelection = function(key, isSelected) {
        if (isSelected) {
            window.selectedBatchPhotoKeys.add(key);
        } else {
            window.selectedBatchPhotoKeys.delete(key);
        }
        const text = document.getElementById('batchSelectedText');
        if (text) {
            text.textContent = `已選取 ${window.selectedBatchPhotoKeys.size} 張`;
        }
    };

    window.selectAllNoGpsPhotos = function() {
        const list = Array.isArray(window.photoList) ? window.photoList : [];
        list.forEach(p => {
            const hasGps = p.location?.latitude && p.location?.longitude;
            const hasPlace = p.placeName || (p.city && p.city !== '無定位');
            if (!hasGps && (!hasPlace || p.city === '無定位')) {
                window.selectedBatchPhotoKeys.add(p.key);
            }
        });
        const text = document.getElementById('batchSelectedText');
        if (text) {
            text.textContent = `已選取 ${window.selectedBatchPhotoKeys.size} 張`;
        }
        window.renderMemoryAlbum();
    };

    window.applyBatchLocationToSelected = function() {
        const keys = Array.from(window.selectedBatchPhotoKeys);
        if (!keys.length) {
            if (typeof window.showToast === 'function') window.showToast('請先勾選欲設定地點的照片', 'warning');
            else alert('請先勾選欲設定地點的照片');
            return;
        }
        if (typeof window.openBatchLocationModal === 'function') {
            window.openBatchLocationModal(keys);
        }
    };

    window.renderMemoryAlbum = function() {
        const grid = document.getElementById('albumContainer');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        let filtered = [...window.photoList || []];
        const searchInput = document.getElementById('memorySearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(p => String(p.date || '').toLowerCase().includes(query) || String(p.placeName || p.city || '').toLowerCase().includes(query));
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = "<div class='empty-state' style='grid-column: span 2; text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;'>📸 尚無拍立得照片，點擊下方按鈕上傳第一張旅行回憶吧！</div>";
            return;
        }
        
        // Original capture time / GPS only; never substitute upload time or a default city.
        const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const timeOf = p => {
            const m = /T(\d{2}:\d{2})/.exec(String(p.capturedAt || ''));
            return m ? m[1] : '';
        };
        const fmtPt = fmtPoint;
        const coordsOf = coordinatesOf;
        const isCoordStr = s => /^[+-]?\d+(?:\.\d+)?[,\s]+[+-]?\d+(?:\.\d+)?$/.test(String(s || '').trim());
        const placeOf = p => p.placeName || (p.city && p.city !== '無定位' && !isCoordStr(p.city) ? p.city : null) || fmtPt(p.location?.latitude, p.location?.longitude) || fmtPt(p.latitude, p.longitude) || '無定位';
        const mapsUrlOf = p => {
            const c = coordsOf(p);
            if (c) return `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;
            const q = p.address || p.placeName || (p.city && p.city !== '無定位' && !isCoordStr(p.city) ? p.city : null);
            if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
            return null;
        };

        filtered.forEach(p => {
            const time = timeOf(p);
            const place = placeOf(p);
            const mapsUrl = mapsUrlOf(p);
            const hasLocation = (place !== '無定位');
            grid.innerHTML += `
                ${window.batchMode ?
                    `<div class="polaroid fade-scale-in ${window.selectedBatchPhotoKeys.has(p.key) ? 'batch-selected' : ''}" style="${window.selectedBatchPhotoKeys.has(p.key) ? 'outline:3px solid #27ae60; background:#f0fff4;' : ''}" onclick="window.togglePhotoSelection('${esc(p.key)}', !window.selectedBatchPhotoKeys.has('${esc(p.key)}')); window.renderMemoryAlbum();">
                        <div style="position:absolute; top:8px; right:8px; z-index:5;" onclick="event.stopPropagation()">
                            <input type="checkbox" class="batch-photo-checkbox" ${window.selectedBatchPhotoKeys.has(p.key) ? 'checked' : ''} onchange="window.togglePhotoSelection('${esc(p.key)}', this.checked); window.renderMemoryAlbum();" style="width:18px; height:18px; accent-color:#27ae60; cursor:pointer;">
                        </div>` :
                    `<div class="polaroid fade-scale-in" onclick="openLightbox('${esc(p.url)}', '${esc(p.key)}')">`
                }
                    <img src="${esc(p.url)}" loading="lazy" alt="拍立得照片">
                    <div style="font-size:0.65rem; color:#7f8c8d; font-weight:900; margin-top:6px; display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
                        <span>📅 ${esc(p.date || '日期待補')}${time ? ' ' + esc(time) : ''}</span>
                        <span>📸 ${esc(place)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; gap:4px;">
                        ${mapsUrl ? `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size:0.62rem; color:#2980b9; font-weight:900; text-decoration:none;"><i class="fa-solid fa-map-location-dot"></i> 地圖</a>` : '<span></span>'}
                        <button type="button" class="btn-edit-loc" onclick="event.stopPropagation(); if(typeof window.openPhotoLocationModal==='function')window.openPhotoLocationModal('${esc(p.key)}')" style="font-size:0.62rem; padding:2px 8px; border-radius:6px; border:1px solid #c9a26b; background:#fff8ee; color:#7a4a1c; font-weight:900; cursor:pointer;">
                            📍 ${hasLocation ? '改地點' : '補地點'}
                        </button>
                    </div>
                    ${p.pendingSync ? '<div style="font-size:0.62rem;color:#a0522d;font-weight:900;margin-top:3px;">📱 僅此裝置，待同步</div>' : ''}
                </div>
            `;
        });
    };

    window.renderLightboxDetails = function(key) {
        const details = document.getElementById('lightbox-details');
        if (!details) return;
        const photo = (window.photoList || []).find(p => p.key === key);
        if (!photo) { details.innerHTML = ''; return; }
        
        const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const timeMatch = /T(\d{2}:\d{2})/.exec(String(photo.capturedAt || ''));
        const time = timeMatch ? timeMatch[1] : '';
        const dateText = photo.date ? `${photo.date}${time ? ' ' + time : ''}` : (photo.capturedAt ? photo.capturedAt.replace('T', ' ') : '日期待補');
        
        const fmtPt = fmtPoint;
        const isCoordStr = s => /^[+-]?\d+(?:\.\d+)?[,\s]+[+-]?\d+(?:\.\d+)?$/.test(String(s || '').trim());
        const place = photo.placeName || (photo.city && photo.city !== '無定位' && !isCoordStr(photo.city) ? photo.city : null) || fmtPt(photo.location?.latitude, photo.location?.longitude) || fmtPt(photo.latitude, photo.longitude) || '無定位';
        const isMissing = (place === '無定位');
        
        const coords = coordinatesOf(photo);
        let mapsUrl = null;
        if (coords) {
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
        } else if (photo.address || (photo.placeName && photo.placeName !== '無定位')) {
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(photo.address || photo.placeName)}`;
        }
        
        const missingReasonText = isMissing ? (photo.missingReason || '無 EXIF GPS 資訊（可能經通訊軟體壓縮轉發抹除）') : '';
        
        details.innerHTML = `
            <div style="font-weight:900; font-size:0.85rem; margin-bottom:4px; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">
                <span>📅 ${esc(dateText)}</span>
                <span>📍 ${esc(place)}</span>
                ${mapsUrl ? `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="color:#5dade2; font-size:0.8rem; text-decoration:underline; margin-left:6px;"><i class="fa-solid fa-map-location-dot"></i> Google Maps</a>` : ''}
            </div>
            ${isMissing ? `<div style="font-size:0.72rem; color:#f39c12; margin-bottom:4px;">⚠️ ${esc(missingReasonText)}</div>` : ''}
            <div style="display:flex; justify-content:center; gap:8px; margin-top:6px;">
                <button type="button" class="btn-lb" style="background:#2980b9; border:none; padding:6px 14px; font-size:0.78rem; border-radius:10px; cursor:pointer;" onclick="if(typeof window.openPhotoLocationModal==='function')window.openPhotoLocationModal('${esc(photo.key)}')">
                    <i class="fa-solid fa-location-dot"></i> 📍 補充／修改拍攝地點
                </button>
            </div>
        `;
    };
})();
