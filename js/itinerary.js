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

        try {
            if (editingItiKey) {
                await NetworkEngine.firebaseUpdate(`${DB_ITI}/${editingItiKey}`, data);
                editingItiKey = null;
                if (saveBtn)   saveBtn.innerText          = '💾 儲存';
                if (cancelBtn) cancelBtn.style.display    = 'none';
            } else {
                await NetworkEngine.firebasePush(DB_ITI, data);
            }
        } catch (e) {
            console.error('[Itinerary] save failed:', e);
            showToast('行程儲存失敗，請稍後重試', 'error');
            return;
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
        try {
            await NetworkEngine.firebaseRemove(`${DB_ITI}/${key}`);
        } catch (e) {
            console.error('[Itinerary] delete failed:', e);
            showToast('刪除行程失敗', 'error');
        }
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

    window.currentWeatherMode = window.currentWeatherMode || 'sun';

    window.setItineraryWeatherMode = function(mode) {
        window.currentWeatherMode = mode;
        const sunBtn = document.getElementById('btnItiSun');
        const rainBtn = document.getElementById('btnItiRain');
        if (sunBtn) sunBtn.classList.toggle('active', mode === 'sun');
        if (rainBtn) rainBtn.classList.toggle('active', mode === 'rain');
        renderItinerary();
    };

    window.showTaxiCard = function(koreanText, title) {
        if (typeof openFlashcard === 'function') {
            openFlashcard(title || '計程車指路卡', koreanText);
        } else {
            alert(`【計程車指路卡】\n${title}\n\n${koreanText}`);
        }
    };

    window.renderItinerary = function() {
        const list = document.getElementById('itiContent');
        if (!list) return;
        list.innerHTML = '';
        
        const currentDay = window.currentFilterDay || '11/13';
        const isRain = window.currentWeatherMode === 'rain';

        // Update active class on weather toggle buttons
        const sunBtn = document.getElementById('btnItiSun');
        const rainBtn = document.getElementById('btnItiRain');
        if (sunBtn) sunBtn.classList.toggle('active', !isRain);
        if (rainBtn) rainBtn.classList.toggle('active', isRain);

        // Canonical content reference
        const canonical = (typeof window !== 'undefined' && window.TRAVEL_CONTENT_V45) || (typeof globalThis !== 'undefined' && globalThis.TRAVEL_CONTENT_V45) || {};
        const rainPlans = canonical.rainPlans || {};
        const dayToRainKey = { '11/14': 'day2', '11/15': 'day3', '11/16': 'day4' };
        const rainKey = dayToRainKey[currentDay];

        if (isRain) {
            if (rainKey && rainPlans[rainKey]) {
                const plan = rainPlans[rainKey];
                let proposalsHtml = '';
                (plan.proposals || []).forEach((prop, pIdx) => {
                    // Match Naver Map links for rain destinations if available
                    let mapUrl = 'https://map.naver.com';
                    let taxiPhrase = '';
                    if (prop.title.includes('BUSAN X the SKY')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/13479633';
                        taxiPhrase = '기사님, 해운대 엘시티 엑스더스카이(BUSAN X the SKY)로 가주세요.';
                    } else if (prop.title.includes('Spa Land')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/13479633';
                        taxiPhrase = '기사님, 신세계 센텀시티 스파랜드로 가주세요.';
                    } else if (prop.title.includes('ARTE MUSEUM')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/13491823';
                        taxiPhrase = '기사님, 영도 아르떼뮤지엄 부산으로 가주세요.';
                    } else if (prop.title.includes('國立慶州博物館') || prop.title.includes('국립경주박물관') || prop.title.includes('博物館')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/11627885';
                        taxiPhrase = '기사님, 국립경주박物관으로 가주세요.';
                    } else if (prop.title.includes('東宮園') || prop.title.includes('Donggungwon')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/13491807';
                        taxiPhrase = '기사님, 경주 동궁원으로 가주세요.';
                    } else if (prop.title.includes('韓屋') || prop.title.includes('皇理團路')) {
                        mapUrl = 'https://map.naver.com/p/search/%ED%99%A9%EB%A6%AC%EB%8B%A8%EA%B8%B8';
                        taxiPhrase = '기사님, 경주 황리단길로 가주세요.';
                    } else if (prop.title.includes('廣安里') || prop.title.includes('海景')) {
                        mapUrl = 'https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC%20%EC%8B%9D%EB%8B%B9';
                        taxiPhrase = '기사님, 광안리 해변 식당으로 가주세요.';
                    } else if (prop.title.includes('Footbath') || prop.title.includes('足浴') || prop.title.includes('View 2')) {
                        mapUrl = 'https://map.naver.com/p/search/%EC%A1%B1%EC%9A%95%EC%B9%B4%ED%8E%98%EB%B7%B02%ED%98%B8%EC%A0%90';
                        taxiPhrase = '기사님, 영도 흰여울마을 족욕카페뷰 2호점으로 가주세요.';
                    } else if (prop.title.includes('海木') || prop.title.includes('鰻魚')) {
                        mapUrl = 'https://map.naver.com/p/entry/place/11571731';
                        taxiPhrase = '기사님, 해운대 해목 장어덮밥집으로 가주세요.';
                    }


                    const taxiBtn = taxiPhrase ? `<button class="v45-taxi-btn" onclick="showTaxiCard('${taxiPhrase}', '${prop.title}')"><i class="fa-solid fa-taxi"></i> 🚕 計程車指路卡</button>` : '';

                    proposalsHtml += `
                        <div class="v45-rain-proposal-card fade-scale-in">
                            <div style="font-weight:900; font-size:0.95rem; color:#2980b9; margin-bottom:4px;">${prop.title}</div>
                            <p style="font-size:0.8rem; color:#555; line-height:1.5; margin:0 0 8px 0;">${prop.desc}</p>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <a href="${mapUrl}" target="_blank" class="map-tag" style="background:#03C75A; color:white; font-size:0.72rem; padding:4px 8px;"><i class="fa-solid fa-map-location-dot"></i> 一鍵導航</a>
                                ${taxiBtn}
                            </div>
                        </div>
                    `;
                });

                // Rain phrases helper
                let phrasesHtml = '';
                (rainPlans.phrases || []).forEach(ph => {
                    phrasesHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:12px; margin-bottom:6px; border:1px solid #e1e8ed; cursor:pointer;" onclick="openFlashcard('${ph.tw}', '${ph.kr}')">
                            <div style="flex:1;">
                                <div style="font-weight:900; font-size:0.85rem; color:#2c3e50;">${ph.tw}</div>
                                <div style="font-size:0.75rem; color:#7f8c8d;">${ph.kr}</div>
                            </div>
                            <button class="v38-mini-btn" style="background:var(--dora); color:#fff; border:none;"><i class="fa-solid fa-volume-high"></i></button>
                        </div>
                    `;
                });

                list.innerHTML = `
                    <div class="v45-rain-banner fade-scale-in">
                        <div style="font-size:0.95rem; font-weight:900; display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-cloud-showers-heavy"></i> ☔ ${currentDay} 雨天應變備案
                        </div>
                        <div style="font-size:0.78rem; opacity:0.9; margin-top:4px;">
                            <strong>觸發條件：</strong>${plan.trigger}
                        </div>
                    </div>
                    <div style="margin-bottom:15px;">
                        <h4 style="margin:0 0 8px 0; font-size:0.88rem; color:var(--text-color); font-weight:900;"><i class="fa-solid fa-shield-heart" style="color:#3498db;"></i> 精選室內備案行程 (免淋雨/全室內)</h4>
                        ${proposalsHtml}
                    </div>
                    <div style="background:rgba(235, 245, 251, 0.9); padding:12px; border-radius:16px; border:1px solid #bce8f1;">
                        <h4 style="margin:0 0 8px 0; font-size:0.82rem; color:#2980b9; font-weight:900;"><i class="fa-solid fa-comments"></i> ☔ 雨天詢問與溝通實用句</h4>
                        ${phrasesHtml}
                    </div>
                `;
                return;
            } else {
                list.innerHTML = `
                    <div class="v45-rain-banner fade-scale-in">
                        <div style="font-size:0.95rem; font-weight:900;"><i class="fa-solid fa-umbrella"></i> ${currentDay} 氣候備案提示</div>
                        <p style="font-size:0.8rem; margin:6px 0 0 0; line-height:1.5;">
                            本日（${currentDay === '11/13' ? 'Day 1 機場抵達 / 西面商圈' : 'Day 5 樂天超市 / 機場賦歸'}）主要在室內地鐵站、商場或交通樞紐進行，天候影響極低，請依原定手帳行程安心漫遊！
                        </p>
                    </div>
                `;
                return;
            }
        }
        
        let filtered = (window.itineraryData || []).filter(i => i.day === currentDay);
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

    // Seed/Load itineraryData from cache, fallback to RECOMMENDED_ITINERARY if empty
    const cachedItinerary = StorageEngine.get('busan_v36_itinerary');
    if (!cachedItinerary || !cachedItinerary.success || !Array.isArray(cachedItinerary.data) || cachedItinerary.data.length === 0) {
        window.itineraryData = window.RECOMMENDED_ITINERARY || [];
        StorageEngine.set('busan_v36_itinerary', window.itineraryData);
    } else {
        window.itineraryData = cachedItinerary.data;
    }
})();
