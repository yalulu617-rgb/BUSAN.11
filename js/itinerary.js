// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Itinerary Service (Timeline Renderers)
// ─────────────────────────────────────────────────────────────────────────

window.renderItinerary = function() {
    const list = document.getElementById('itineraryList');
    if (!list) return;
    list.innerHTML = '';
    
    let filtered = itineraryData.filter(i => i.day === currentFilterDay);
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;">本日尚無行程規劃，請點擊下方按鈕新增！</p>';
        return;
    }
    
    // Sort itinerary by time
    filtered.sort((a, b) => a.time.localeCompare(b.time));
    
    filtered.forEach(i => {
        let mapBtn = i.map ? `<a href="${i.map}" target="_blank" class="map-tag" style="background:#03C75A; color:white;"><i class="fa-solid fa-map-location-dot"></i> 一鍵導航</a>` : '';
        list.innerHTML += `
            <div class="iti-row fade-scale-in" style="position:relative;">
                <div class="iti-time">${i.time}</div>
                <div class="iti-desc">
                    <span style="font-weight:900; color:var(--text-color);">${i.desc}</span><br>
                    <span class="traffic-tag"><i class="fa-solid fa-car-side"></i> 交通: ${i.tr || '步行'}</span>
                    <div style="display:flex; gap:6px; margin-top:4px;">
                        ${mapBtn}
                    </div>
                </div>
                <div style="position:absolute; top:0; right:0; display:flex; gap:4px;">
                    <button class="btn-edit" onclick="editItinerary('${i.key}')" style="background:#f39c12; color:white; border:none; border-radius:6px; padding:2px 6px; font-size:0.65rem; cursor:pointer;"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteItinerary('${i.key}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
};

window.filterItineraryDay = function(day, btn) {
    window.currentFilterDay = day;
    document.querySelectorAll('#itiTabsUI .day-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderItinerary();
};
