// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Itinerary Module (Timeline render + CRUD)
// Responsibilities: render, filter, save, edit, delete, vlog export
// ─────────────────────────────────────────────────────────────────────────

(function() {
    let editingItiKey = null;

    // ── alias: index.html calls filterIti(day), not filterItineraryDay ────────
    window.filterIti = function (day) {
        filterItineraryDay(day, null);
    };

    // ── Save (create or update) ───────────────────────────────────────────────
    window.saveItinerary = async function () {
        const dayEl      = document.getElementById('itiDay');
        const timeEl     = document.getElementById('itiTime');
        const descEl     = document.getElementById('itiDesc');
        const trafficEl  = document.getElementById('itiTraffic');
        const mapEl      = document.getElementById('itiMap');
        const saveBtn    = document.getElementById('btnSaveIti');
        const cancelBtn  = document.getElementById('btnCancelIti');

        const desc = descEl?.value?.trim();
        if (!desc) { showToast('請填入行程內容', 'warning'); return; }

        const data = {
            day  : dayEl?.value  || getV37SelectedDate(),
            time : timeEl?.value || '00:00',
            desc,
            tr   : trafficEl?.value?.trim() || '步行',
            map  : mapEl?.value?.trim()     || ''
        };

        if (editingItiKey) {
            await NetworkEngine.firebaseUpdate(`${DB_ITI}/${editingItiKey}`, data);
            editingItiKey = null;
            if (saveBtn)   saveBtn.innerText          = '💾 儲存';
            if (cancelBtn) cancelBtn.style.display    = 'none';
        } else {
            await NetworkEngine.firebasePush(DB_ITI, data);
        }
        if (descEl) descEl.value = '';
        if (mapEl)  mapEl.value  = '';
        showToast('✅ 行程已儲存', 'success');
    };

    // ── Edit: populate form from existing item ────────────────────────────────
    window.editItinerary = function (key) {
        const item = (window.itineraryData || []).find(i => i.key === key);
        if (!item) return;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('itiDay',      item.day);
        set('itiTime',     item.time);
        set('itiDesc',     item.desc);
        set('itiTraffic',  item.tr);
        set('itiMap',      item.map);
        editingItiKey = key;
        const saveBtn   = document.getElementById('btnSaveIti');
        const cancelBtn = document.getElementById('btnCancelIti');
        if (saveBtn)   saveBtn.innerText       = '💾 更新';
        if (cancelBtn) cancelBtn.style.display = 'block';
    };

    // ── Cancel edit ───────────────────────────────────────────────────────────
    window.cancelEditIti = function () {
        editingItiKey = null;
        const clear = ['itiDesc', 'itiMap'];
        clear.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const saveBtn   = document.getElementById('btnSaveIti');
        const cancelBtn = document.getElementById('btnCancelIti');
        if (saveBtn)   saveBtn.innerText       = '💾 儲存';
        if (cancelBtn) cancelBtn.style.display = 'none';
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    window.deleteItinerary = async function (key) {
        if (!confirm('確認刪除此行程？')) return;
        await NetworkEngine.firebaseRemove(`${DB_ITI}/${key}`);
    };

    // ── Vlog export ───────────────────────────────────────────────────────────
    window.exportForVlog = function () {
        const day   = window.currentFilterDay;
        const items = (window.itineraryData || [])
            .filter(i => i.day === day)
            .sort((a, b) => a.time.localeCompare(b.time));
        let script = `【${day} VLOG 腳本】\n\n`;
        items.forEach(i => { script += `${i.time}  ${i.desc}\n  交通：${i.tr || '步行'}\n\n`; });
        navigator.clipboard.writeText(script)
            .then(() => showToast('📋 Vlog 腳本已複製！', 'success'))
            .catch(() => showToast('複製失敗，請手動選取', 'error'));
    };

    window.renderItinerary = function() {
        const list = document.getElementById('itiContent');
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
        document.querySelectorAll('#itinerary .day-tabs .day-tab').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderItinerary();
    };
})();
