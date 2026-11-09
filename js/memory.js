// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Memory Module (Photo Album + Photo CRUD)
// Responsibilities: album render, photo delete, photo download
// ─────────────────────────────────────────────────────────────────────────

// ── Photo CRUD ────────────────────────────────────────────────────────────
window.deleteCurrentPhoto = async function () {
    if (!window.currentLightboxKey) { showToast('無法識別照片', 'warning'); return; }
    if (!confirm('確認刪除此照片？此操作不可還原。')) return;
    try {
        if (String(window.currentLightboxKey).startsWith('local_')) {
            await PhotoExif.removeLocal(window.currentLightboxKey);
            closeLightbox();
            showToast('本機照片已刪除', 'success');
            return;
        }
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
        
        let filtered = [...(window.photoList || []), ...(window.localPhotoList || [])];
        const searchInput = document.getElementById('memorySearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(p => String(p.date || '').toLowerCase().includes(query) || String(p.city || '').toLowerCase().includes(query));
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = "<div class='empty-state' style='grid-column: span 2; text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;'>📸 尚無拍立得照片，點擊下方按鈕上傳第一張旅行回憶吧！</div>";
            return;
        }
        
        const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        filtered.forEach(p => {
            const meta = p.localOnly ? p : (window.photoCaptureMeta || {})[p.key] || {};
            const captureDate = meta.captureDate || meta.dateTime || '';
            const gps = meta.gps;
            const location = gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon)
                ? '📍 ' + gps.lat.toFixed(5) + ', ' + gps.lon.toFixed(5)
                : '📍 原檔無可讀 GPS 或尚未檢查';
            const badge = p.localOnly ? '🔒 僅在本機（未同步）' : '☁️ 共享相簿';
            grid.innerHTML += `
                <div class="polaroid fade-scale-in" onclick="openLightbox('${p.url}', '${p.key}')">
                    <img src="${p.url}" loading="lazy">
                    <div style="font-size:0.65rem; color:#7f8c8d; font-weight:900; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                        <span>📅 ${esc(captureDate || p.date || '日期未知')}</span>
                        <span>${esc(badge)}</span>
                    </div>
                    <div style="font-size:.62rem;color:#607783;margin-top:5px;font-weight:800;">${esc(location)}</div>
                </div>
            `;
        });
    };
})();
