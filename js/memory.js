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
        
        // Original capture time / GPS only; never substitute upload time or a default city.
        const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const timeOf = p => {
            const m = /T(\d{2}:\d{2})/.exec(String(p.capturedAt || ''));
            return m ? m[1] : '';
        };
        const fmtPt = (a, b) => (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) && a !== null && b !== null && a !== '' && b !== '')
            ? `${Number(a).toFixed(5)}, ${Number(b).toFixed(5)}` : '';
        const placeOf = p => p.city || fmtPt(p.location?.latitude, p.location?.longitude) || fmtPt(p.latitude, p.longitude) || '無定位';
        filtered.forEach(p => {
            const time = timeOf(p);
            grid.innerHTML += `
                <div class="polaroid fade-scale-in" onclick="openLightbox('${p.url}', '${p.key}')">
                    <img src="${p.url}" loading="lazy">
                    <div style="font-size:0.65rem; color:#7f8c8d; font-weight:900; margin-top:6px; display:flex; justify-content:space-between; align-items:center; gap:4px; flex-wrap:wrap;">
                        <span>📅 ${esc(p.date || '日期待補')}${time ? ' ' + esc(time) : ''}</span>
                        <span>📸 ${esc(placeOf(p))}</span>
                    </div>
                    ${p.pendingSync ? '<div style="font-size:0.62rem;color:#a0522d;font-weight:900;margin-top:3px;">📱 僅此裝置，待同步</div>' : ''}
                </div>
            `;
        });
    };
})();
