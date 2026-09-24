// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Itinerary Module (Timeline render + CRUD)
// Responsibilities: render, filter, save, edit, delete, vlog export
// ─────────────────────────────────────────────────────────────────────────

(function() {
    let editingItiKey = null;

    const itinerarySignature = item => [item.day, item.time, item.desc, item.tr || '', item.mapKey || item.map || ''].join('\u001f');

    const authoritativeMapLinks = mapKey => {
        if (!mapKey) return {};
        return (window.AUTHORITATIVE_MAPS_V45 || {})[mapKey] || {};
    };

    const renderMapActions = links => `
        ${links.naver ? `<a href="${links.naver}" target="_blank" rel="noopener" class="map-tag" style="background:#03C75A; color:white;"><i class="fa-solid fa-location-arrow"></i> NAVER</a>` : ''}
        ${links.kakao ? `<a href="${links.kakao}" target="_blank" rel="noopener" class="map-tag" style="background:#FEE500; color:#3C1E1E;"><i class="fa-solid fa-route"></i> Kakao</a>` : ''}
        ${links.google ? `<a href="${links.google}" target="_blank" rel="noopener" class="map-tag" style="background:#4285F4; color:white;"><i class="fa-solid fa-map"></i> Google</a>` : ''}
    `;
    const itineraryStartMinutes = item => {
        const match = String(item?.time || '').match(/(\d{1,2}):(\d{2})/);
        if (!match) return null;
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        return hours <= 23 && minutes <= 59 ? (hours * 60) + minutes : null;
    };
    const sortItineraryChronologically = items => items
        .map((item, index) => ({ item, index, start: itineraryStartMinutes(item) }))
        .sort((a, b) => {
            if (a.start === null && b.start === null) return a.index - b.index;
            if (a.start === null) return 1;
            if (b.start === null) return -1;
            return (a.start - b.start) || (a.index - b.index);
        })
        .map(entry => entry.item);
    const conflictsWithCanonicalTruth = item => {
        const text = `${item?.desc || ''} ${item?.tr || ''}`;
        const time = String(item?.time || '').trim();
        if (item?.day === '11/13') {
            const staleArrivalTime = time === '16:30' || time === '17:30';
            const claimsPusArrival = /(抵達|到達|arrival)/i.test(text) && /(金海|PUS)/i.test(text);
            const mislabelsHotel = /(西面站飯店|西面飯店)/i.test(text);
            const staleDay1Dinner = /(Matchandeul|맛찬들|味讚王)/i.test(text);
            return (staleArrivalTime && claimsPusArrival) || mislabelsHotel || staleDay1Dinner;
        }
        if (item?.day === '11/16') {
            const claimsHaemok = /(Haemok|해목|海木)/i.test(text);
            return claimsHaemok;
        }
        if (item?.day === '11/17') {
            const staleDepartureTime = time === '16:30';
            const explicitFlightDeparture = /(登機|起飛|boarding)/i.test(text)
                || (/(出發|departure)/i.test(text) && /(KE2085|金海|PUS)/i.test(text));
            const staleLastDayPlan = /(Zimcarry|짐캐리|Pohang Dwaeji Gukbap|포항돼지국밥|浦項豬肉湯飯|行李暫寄飯店|西面商圈最後)/i.test(text);
            return (staleDepartureTime && explicitFlightDeparture) || staleLastDayPlan;
        }
        if (item?.day === '11/14') {
            const claimsGwangalli = /(廣安里|Gwangalli|광안리)/i.test(text);
            const claimsDrone = /(無人機|drone)/i.test(text);
            const claimsFireworks = /(煙火|fireworks?)/i.test(text);
            const staleScenticaBranch = /SCENTICA Jeonpo/i.test(text);
            return (claimsGwangalli && claimsDrone && claimsFireworks) || staleScenticaBranch;
        }
        if (item?.day === '11/15') {
            const staleDay3Stop = /(Solsot|솔솥|Byeolchaeban|별채반|Bulguksa|불국사|Beomeosa|범어사)/i.test(text);
            return staleDay3Stop;
        }
        return false;
    };
    window.mergeCanonicalItinerary = function(customRows) {
        const canonical = Array.isArray(window.RECOMMENDED_ITINERARY) ? window.RECOMMENDED_ITINERARY : [];
        const canonicalSignatures = new Set(canonical.map(itinerarySignature));
        const custom = (Array.isArray(customRows) ? customRows : []).filter(item =>
            item && !String(item.key || '').startsWith('rec_') && !canonicalSignatures.has(itinerarySignature(item))
        );
        window.customItineraryData = custom;
        return canonical.concat(custom.filter(item => !conflictsWithCanonicalTruth(item)));
    };

    // ── alias: index.html calls filterIti(day), not filterItineraryDay ────────
    window.filterIti = function (day) {
        window.hasSelectedItineraryDay = true;
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
        const items = sortItineraryChronologically(
            (window.itineraryData || []).filter(i => i.day === day)
        );
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
                    const mapLinks = authoritativeMapLinks(prop.mapKey);
                    let taxiPhrase = '';
                    if (prop.title.includes('BUSAN X the SKY')) {
                        taxiPhrase = '기사님, 해운대 엘시티 엑스더스카이(BUSAN X the SKY)로 가주세요.';
                    } else if (prop.title.includes('Spa Land')) {
                        taxiPhrase = '기사님, 신세계 센텀시티 스파랜드로 가주세요.';
                    } else if (prop.title.includes('ARTE MUSEUM')) {
                        taxiPhrase = '기사님, 영도 아르떼뮤지엄 부산으로 가주세요.';
                    } else if (prop.title.includes('國立慶州博物館') || prop.title.includes('국립경주박물관') || prop.title.includes('博物館')) {
                        taxiPhrase = '기사님, 국립경주박物관으로 가주세요.';
                    } else if (prop.title.includes('東宮園') || prop.title.includes('Donggungwon')) {
                        taxiPhrase = '기사님, 경주 동궁원으로 가주세요.';
                    } else if (prop.title.includes('韓屋') || prop.title.includes('皇理團路')) {
                        taxiPhrase = '기사님, 경주 황리단길로 가주세요.';
                    } else if (prop.title.includes('廣安里') || prop.title.includes('海景')) {
                        taxiPhrase = '기사님, 광안리 해변 식당으로 가주세요.';
                    } else if (prop.title.includes('Footbath') || prop.title.includes('足浴') || prop.title.includes('View 2')) {
                        taxiPhrase = '기사님, 영도 흰여울마을 족욕카페뷰 2호점으로 가주세요.';
                    }


                    const taxiBtn = taxiPhrase ? `<button class="v45-taxi-btn" onclick="showTaxiCard('${taxiPhrase}', '${prop.title}')"><i class="fa-solid fa-taxi"></i> 🚕 計程車指路卡</button>` : '';

                    proposalsHtml += `
                        <div class="v45-rain-proposal-card fade-scale-in">
                            <div style="font-weight:900; font-size:0.95rem; color:#2980b9; margin-bottom:4px;">${prop.title}</div>
                            <p style="font-size:0.8rem; color:#555; line-height:1.5; margin:0 0 8px 0;">${prop.desc}</p>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                ${renderMapActions(mapLinks)}
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
                            <button class="v38-mini-btn" aria-label="播放韓語交通用語" style="background:var(--dora); color:#fff; border:none;"><i class="fa-solid fa-volume-high" aria-hidden="true"></i></button>
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
                            本日（${currentDay === '11/13' ? 'Day 1 抵達／西面街頭小吃／條件式 E-Mart Munhyeon' : 'Day 5 早餐／E-Mart Munhyeon／飯店取行李／機場'}）以室內、短程步行與交通移動為主，請依雨勢與體力彈性調整。
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
        
        // Sort by the first real HH:MM in display strings such as "約 12:15～13:30".
        filtered = sortItineraryChronologically(filtered);
        
        filtered.forEach(i => {
            const customMapLinks = typeof getMapLinks === 'function' ? getMapLinks(i.destinationKr || i.desc) : {};
            const mapLinks = i.mapKey
                ? authoritativeMapLinks(i.mapKey)
                : { ...customMapLinks, naver: i.map || customMapLinks.naver || '' };
            const transportMaps = renderMapActions(mapLinks);
            const transportDetail = i.route ? `
                <details class="iti-transport-detail" style="margin-top:7px; max-width:100%; overflow:hidden;">
                    <summary style="cursor:pointer; font-weight:900; font-size:0.76rem; color:var(--primary); padding:7px 9px; border:1px solid var(--border-color); border-radius:10px; background:rgba(0,0,0,0.02);">🚇 怎麼去</summary>
                    <div style="padding:8px 4px 2px; font-size:0.74rem; line-height:1.55; color:var(--text-color); overflow-wrap:anywhere;">
                        <div>${i.route}</div>
                        ${i.destinationKr ? `<div style="margin-top:4px; color:#6b7280;">🇰🇷 ${i.destinationKr}</div>` : ''}
                        <div class="iti-map-actions" style="display:flex; gap:5px; flex-wrap:wrap; margin-top:7px; max-width:100%;">${transportMaps}</div>
                    </div>
                </details>
            ` : `<div class="iti-map-actions" style="display:flex; gap:5px; flex-wrap:wrap; margin-top:5px; max-width:100%;">${transportMaps}</div>`;
            list.innerHTML += `
                <div class="iti-row fade-scale-in" style="position:relative; min-width:0; overflow:hidden;">
                    <div class="iti-time">${i.time}</div>
                    <div class="iti-desc" style="min-width:0; overflow-wrap:anywhere;">
                        <span style="font-weight:900; color:var(--text-color);">${i.desc}</span><br>
                        <span class="traffic-tag"><i class="fa-solid fa-car-side"></i> 交通: ${i.tr || '步行'}</span>
                        ${transportDetail}
                    </div>
                    <div class="iti-row-actions" style="display:${String(i.key || '').startsWith('rec_') ? 'none' : 'flex'}; gap:4px; flex-shrink:0;">
                        <button class="btn-edit" aria-label="編輯行程" onclick="editItinerary('${i.key}')" style="background:#f39c12; color:white; border:none; border-radius:6px; padding:2px 6px; font-size:0.65rem; cursor:pointer;"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                        <button class="btn-delete" aria-label="刪除行程" onclick="deleteItinerary('${i.key}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                    </div>
                </div>
            `;
        });
    };

    window.filterItineraryDay = function(day, btn) {
        window.currentFilterDay = day;
        document.querySelectorAll('#itinerary .day-tabs .day-tab').forEach(b => {
            const matchesDay = (b.getAttribute('onclick') || '').includes(`'${day}'`);
            b.classList.toggle('active', btn ? b === btn : matchesDay);
        });
        renderItinerary();
    };

    // Canonical itinerary is always present; cached rows contribute custom additions only.
    const cachedItinerary = StorageEngine.get('busan_v36_itinerary');
    const cachedRows = cachedItinerary?.success && Array.isArray(cachedItinerary.data) ? cachedItinerary.data : [];
    window.itineraryData = window.mergeCanonicalItinerary(cachedRows);
    StorageEngine.set('busan_v36_itinerary', window.customItineraryData);
})();
