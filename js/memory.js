// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Memory Service (Memory Album & Search Filters)
// ─────────────────────────────────────────────────────────────────────────

(function() {
    window.renderMemoryAlbum = function() {
        const grid = document.getElementById('photoGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        let filtered = [...window.photoList || []];
        const searchInput = document.getElementById('memorySearchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            const query = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(p => p.date.includes(query) || (p.city && p.city.toLowerCase().includes(query)));
        }
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="grid-column: span 2; text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;">尚無照片，開始批次上傳吧！</p>';
            return;
        }
        
        filtered.forEach(p => {
            grid.innerHTML += `
                <div class="polaroid fade-scale-in" onclick="openLightbox('${p.url}', '${p.key}')">
                    <img src="${p.url}" loading="lazy">
                    <div style="font-size:0.65rem; color:#7f8c8d; font-weight:900; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
                        <span>📅 ${p.date}</span>
                        <span>📸 ${p.city || '釜山'}</span>
                    </div>
                </div>
            `;
        });
    };
})();
