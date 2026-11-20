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

    // Date albums are display-only: keep all photo keys, original URLs,
    // EXIF/GPS, Firebase records and upload workflows unchanged.
    const TRIP_ALBUM_DAYS = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'];
    const shortDayLabel = day => {
        if (day === 'all') return '全部照片';
        if (day === 'other') return '其他日期／待分類';
        const index = TRIP_ALBUM_DAYS.indexOf(day);
        const names = ['五', '六', '日', '一', '二'];
        return 'Day ' + (index + 1) + ' · ' + day.slice(5).replace('-', '/') + '（' + names[index] + '）';
    };
    const photoDay = photo => {
        for (const value of [photo?.capturedAt, photo?.date]) {
            const raw = String(value || '').trim();
            const full = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(raw);
            const short = /^(\d{1,2})[-/](\d{1,2})(?:$|\D)/.exec(raw);
            const year = full ? Number(full[1]) : short ? 2026 : NaN;
            const month = full ? Number(full[2]) : short ? Number(short[1]) : NaN;
            const day = full ? Number(full[3]) : short ? Number(short[2]) : NaN;
            if (Number.isFinite(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                const valid = new Date(year, month - 1, day);
                if (valid.getFullYear() === year && valid.getMonth() === month - 1 && valid.getDate() === day)
                    return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            }
        }
        return 'other';
    };
    window.selectMemoryAlbumDay = function(day) {
        if (!['all', 'other', ...TRIP_ALBUM_DAYS].includes(day)) return;
        window.memoryAlbumDay = day;
        window.renderMemoryAlbum();
    };

    window.renderMemoryAlbum = function() {
        const grid = document.getElementById('albumContainer');
        if (!grid) return;
        grid.classList.add('memory-photo-grid');
        grid.innerHTML = '';

        // Use original capture chronology, never upload timestamps.
        const captureTime = photo => {
            const captured = Date.parse(String(photo?.capturedAt || ''));
            if (Number.isFinite(captured)) return captured;
            const day = photoDay(photo);
            return day === 'other' ? Number.NEGATIVE_INFINITY : Date.parse(day + 'T12:00:00');
        };
        const photos = (Array.isArray(window.photoList) ? window.photoList : [])
            .filter(p => p && p.key && p.url)
            .slice().sort((a, b) => captureTime(b) - captureTime(a));
        const counts = new Map([...TRIP_ALBUM_DAYS, 'other'].map(day => [day, 0]));
        photos.forEach(p => {
            const day = photoDay(p);
            const folder = counts.has(day) ? day : 'other';
            counts.set(folder, counts.get(folder) + 1);
        });

        // On first real photo load, show the latest populated travel day instead
        // of dumping the entire multi-day album into one long scroll.
        if (!window.memoryAlbumDay && photos.length) {
            window.memoryAlbumDay = [...TRIP_ALBUM_DAYS].reverse().find(day => counts.get(day) > 0)
                || (counts.get('other') ? 'other' : 'all');
        }
        if (window.memoryAlbumDay === 'other' && !counts.get('other')) window.memoryAlbumDay = 'all';
        const selectedDay = window.memoryAlbumDay || 'all';
        const nav = document.getElementById('memoryDayTabs');
        if (nav) {
            const options = [
                ...TRIP_ALBUM_DAYS.map(day => ({ day, label: shortDayLabel(day), count: counts.get(day) })),
                ...(counts.get('other') ? [{ day: 'other', label: shortDayLabel('other'), count: counts.get('other') }] : []),
                { day: 'all', label: '全部照片', count: photos.length }
            ];
            const escapeText = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            nav.innerHTML = options.map(({ day, label, count }) =>
                '<button type="button" class="memory-day-chip" data-memory-day="' + day + '" aria-pressed="' + (selectedDay === day) +
                '" onclick="selectMemoryAlbumDay(\'' + day + '\')">' +
                '<span class="memory-day-chip-label">' + escapeText(label) + '</span>' +
                '<span class="memory-day-chip-count">' + count + ' 張</span></button>'
            ).join('');
        }

        const searchInput = document.getElementById('memorySearchInput');
        const query = String(searchInput?.value || '').trim().toLowerCase();
        let filtered = photos;
        if (query) {
            filtered = filtered.filter(p => {
                const day = photoDay(p);
                const shortDate = day === 'other' ? '' : day.slice(5).replace('-', '/');
                return [p.date, p.capturedAt, p.placeName, p.city, day, shortDate]
                    .some(value => String(value || '').toLowerCase().includes(query));
            });
        }
        if (selectedDay !== 'all') {
            filtered = filtered.filter(p => {
                const day = photoDay(p);
                return selectedDay === 'other' ? !TRIP_ALBUM_DAYS.includes(day) : day === selectedDay;
            });
        }

        // Lightbox navigates only the visible date/search subset.
        window.memoryVisiblePhotos = filtered.map(p => ({ key: p.key, url: p.url }));
        const summary = document.getElementById('memoryAlbumSummary');
        if (summary) summary.textContent = shortDayLabel(selectedDay) + ' · ' + filtered.length + ' 張照片';

        if (!filtered.length) {
            const message = !photos.length ? '📸 還沒有旅行照片，已上傳的照片會自動按照拍攝日期分相簿。'
                : query ? '找不到符合搜尋條件的照片。可以清除搜尋或切換日期。'
                : '這一天目前沒有照片，請選擇其他日期。';
            grid.innerHTML = '<div class="memory-empty-state">' + message + '</div>';
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

        let previousFolder = '';
        filtered.forEach(p => {
            if (selectedDay === 'all') {
                const rawDay = photoDay(p);
                const folder = TRIP_ALBUM_DAYS.includes(rawDay) ? rawDay : 'other';
                if (folder !== previousFolder) {
                    previousFolder = folder;
                    const count = filtered.filter(item => {
                        const itemDay = photoDay(item);
                        return (TRIP_ALBUM_DAYS.includes(itemDay) ? itemDay : 'other') === folder;
                    }).length;
                    grid.innerHTML += '<h4 class="memory-album-group-heading">' +
                        shortDayLabel(folder) + ' · ' + count + ' 張</h4>';
                }
            }
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
