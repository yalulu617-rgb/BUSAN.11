// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: UI Components & DOM Renderers
// ─────────────────────────────────────────────────────────────────────────

// ── Helper: Smart Alert Message (called by renderV37HomeDashboard) ──
window.getSmartAlertMessage = function(ctx) {
    if (!ctx) return '載入中...';
    if (ctx.tripMode === 'before') {
        return '✅ K-ETA：本次免申請（至 2026/12/31）｜ 📝 e-Arrival Card 申報';
    }
    if (ctx.tripMode === 'after') return '🎉 旅行圓滿完成！';
    if (ctx.nextDestination) return `⏰ ${ctx.nextDestination.time} → ${ctx.nextDestination.desc.split(' ')[0]}`;
    return '✨ 今日行程已全部完成';
};

// ── Helper: Toggle city detail panel ──────────────────────────────────────
window.toggleCityDetailPanel = function () {
    const panel = document.getElementById('v37CityDetailPanel');
    if (!panel) return;
    panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
};

// ── Guide tab filter ───────────────────────────────────────────────────────
window.filterGuideContent = function (tab) {
    window.currentGuideTab = tab;
    const foodTabs = document.getElementById('foodSubTabs');
    if (foodTabs) {
        foodTabs.style.display = (tab === '必吃美食') ? 'flex' : 'none';
    }
    if (tab === '必吃美食') {
        const myFoodItems = (window.guideData || []).filter(g => g.type === '必吃美食');
        if (myFoodItems.length === 0) {
            setFoodTabMode('rec');
            return;
        }
    } else {
        setFoodTabMode('my');
    }
    if (typeof renderGuideContent === 'function') renderGuideContent();
};

// ── Shop CRUD (lives here — tightly coupled to renderShop) ────────────────
window.addShopItem = async function () {
    const textEl     = document.getElementById('newShop');
    const whereEl    = document.getElementById('shopWhere');
    const categoryEl = document.getElementById('shopCategory');
    const imgEl      = document.getElementById('tempShopImg');

    const text = textEl?.value?.trim();
    if (!text) { showToast('請填入商品名稱', 'warning'); return; }

    const newItem = {
        key: 'local_' + Date.now(),
        text,
        where    : whereEl?.value?.trim()  || '',
        category : categoryEl?.value       || '其他',
        img      : imgEl?.value            || '',
        checked  : false,
        owner    : window.deviceOwner,
        ts       : Date.now()
    };

    // Optimistically update local array and render
    window.shopList = window.shopList || [];
    window.shopList.push(newItem);
    StorageEngine.set('busan_v36_shopList', window.shopList);
    if (typeof renderShop === 'function') renderShop();

    try {
        await NetworkEngine.firebasePush(DB_SHOP, {
            text: newItem.text,
            where: newItem.where,
            category: newItem.category,
            img: newItem.img,
            checked: newItem.checked,
            owner: newItem.owner,
            ts: newItem.ts
        });
    } catch (e) {
        console.error('[Renderers] addShopItem failed:', e);
        showToast('已保存至本機，連線恢復時將同步至雲端', 'info');
        if (typeof addToOfflineQueue === 'function') {
            addToOfflineQueue('PUSH', DB_SHOP, {
                text: newItem.text,
                where: newItem.where,
                category: newItem.category,
                img: newItem.img,
                checked: newItem.checked,
                owner: newItem.owner,
                ts: newItem.ts
            });
        }
        return;
    }
    if (textEl)  textEl.value  = '';
    if (whereEl) whereEl.value = '';
    if (imgEl)   imgEl.value   = '';
    showToast('✅ 已加入購物清單', 'success');
};

window.toggleShop = async function (key, currentChecked) {
    // Optimistic local update
    window.shopList = (window.shopList || []).map(s => {
        if (s.key === key) s.checked = !currentChecked;
        return s;
    });
    StorageEngine.set('busan_v36_shopList', window.shopList);
    if (typeof renderShop === 'function') renderShop();

    try {
        await NetworkEngine.firebaseUpdate(`${DB_SHOP}/${key}`, { checked: !currentChecked });
    } catch (e) {
        console.error('[Renderers] toggleShop failed:', e);
        if (typeof addToOfflineQueue === 'function') {
            addToOfflineQueue('UPDATE', `${DB_SHOP}/${key}`, { checked: !currentChecked });
        }
    }
};

window.deleteShop = async function (key) {
    if (!confirm('確認刪除此購物項目？')) return;

    // Optimistic local update
    window.shopList = (window.shopList || []).filter(s => s.key !== key);
    StorageEngine.set('busan_v36_shopList', window.shopList);
    if (typeof renderShop === 'function') renderShop();

    try {
        await NetworkEngine.firebaseRemove(`${DB_SHOP}/${key}`);
    } catch (e) {
        console.error('[Renderers] deleteShop failed:', e);
        showToast('刪除購物項目失敗', 'error');
        if (typeof addToOfflineQueue === 'function') {
            addToOfflineQueue('REMOVE', `${DB_SHOP}/${key}`);
        }
    }
};

// ── Guide / Food CRUD (lives here — tightly coupled to renderGuideContent) ─
window.addGuideItem = async function () {
    const typeEl  = document.getElementById('gdType');
    const titleEl = document.getElementById('gdTitle');
    const descEl  = document.getElementById('gdDesc');
    const linkEl  = document.getElementById('gdLink');
    const imgEl   = document.getElementById('tempGuideImg');

    const title = titleEl?.value?.trim();
    if (!title) { showToast('請填入地標名稱', 'warning'); return; }

    try {
        await NetworkEngine.firebasePush(DB_GUIDE, {
            type  : typeEl?.value  || '打卡景點',
            title,
            desc  : descEl?.value?.trim() || '',
            link  : linkEl?.value?.trim() || '',
            img   : imgEl?.value          || '',
            ts    : Date.now()
        });
    } catch (e) {
        console.error('[Renderers] addGuideItem failed:', e);
        showToast('地標新增失敗', 'error');
        return;
    }
    if (titleEl) titleEl.value = '';
    if (descEl)  descEl.value  = '';
    if (linkEl)  linkEl.value  = '';
    if (imgEl)   imgEl.value   = '';
    showToast('✅ 地標已同步至雲端', 'success');
};

window.deleteGuide = async function (key) {
    if (!confirm('確認刪除此地標？')) return;
    try {
        await NetworkEngine.firebaseRemove(`${DB_GUIDE}/${key}`);
    } catch (e) {
        console.error('[Renderers] deleteGuide failed:', e);
        showToast('刪除地標失敗', 'error');
    }
};

// ── Voice Card CRUD (lives here — tightly coupled to renderVoiceList) ──────
window.addVoiceCard = async function () {
    const twEl = document.getElementById('newCardTw');
    const krEl = document.getElementById('newCardKr');
    const tw   = twEl?.value?.trim();
    const kr   = krEl?.value?.trim();
    if (!tw || !kr) { showToast('請填入中文與韓文', 'warning'); return; }
    try {
        await NetworkEngine.firebasePush(DB_VOICE, { tw, kr, title: tw, korean: kr, icon: 'fa-ear-listen', roman: '', ts: Date.now() });
    } catch (e) {
        console.error('[Renderers] addVoiceCard failed:', e);
        showToast('字卡新增失敗', 'error');
        return;
    }
    if (twEl) twEl.value = '';
    if (krEl) krEl.value = '';
    showToast('✅ 字卡已新增', 'success');
};

window.deleteVoice = async function (key) {
    if (!confirm('確認刪除此字卡？')) return;
    try {
        await NetworkEngine.firebaseRemove(`${DB_VOICE}/${key}`);
    } catch (e) {
        console.error('[Renderers] deleteVoice failed:', e);
        showToast('刪除字卡失敗', 'error');
    }
};

// ── Prep CRUD (lives here — tightly coupled to renderPrepList) ────────────
window.togglePrep = async function (key, currentDone) {
    // Optimistic local update
    window.prepData = (window.prepData || []).map(p => {
        if (p.key === key) p.done = !currentDone;
        return p;
    });
    StorageEngine.set('busan_v36_prepData', window.prepData);
    if (typeof renderPrepList === 'function') renderPrepList();

    try {
        await NetworkEngine.firebaseUpdate(`${DB_PREP}/${key}`, { done: !currentDone });
    } catch (e) {
        console.error('[Renderers] togglePrep failed:', e);
        if (typeof addToOfflineQueue === 'function') {
            addToOfflineQueue('UPDATE', `${DB_PREP}/${key}`, { done: !currentDone });
        }
    }
    triggerContextUpdate();
};

window.deletePrep = async function (key) {
    if (!confirm('確認刪除此準備事項？')) return;

    // Optimistic local update
    window.prepData = (window.prepData || []).filter(p => p.key !== key);
    StorageEngine.set('busan_v36_prepData', window.prepData);
    if (typeof renderPrepList === 'function') renderPrepList();

    try {
        await NetworkEngine.firebaseRemove(`${DB_PREP}/${key}`);
    } catch (e) {
        console.error('[Renderers] deletePrep failed:', e);
        showToast('刪除準備事項失敗', 'error');
        if (typeof addToOfflineQueue === 'function') {
            addToOfflineQueue('REMOVE', `${DB_PREP}/${key}`);
        }
    }
};




window.renderDateSimulator = function(v37SimulatedDate, city) {
    return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
            <span class="v38-badge" style="background:#8e8e93; font-size:0.65rem; font-weight:800; cursor:pointer;" onclick="toggleCityDetailPanel()">📍 ${city.nameTW}</span>
            <select id="v37DateSimulator" onchange="setV37SelectedDate(this.value)" style="padding: 4px 8px; border-radius: 10px; border: 1px solid var(--border-color); font-weight: 800; font-size: 0.72rem; background: var(--card-bg); color: var(--text-color); outline: none; cursor: pointer;">
                <option value="real" ${v37SimulatedDate==='real'?'selected':''}>🌐 真實日期 (自動)</option>
                <option value="11/10" ${v37SimulatedDate==='11/10'?'selected':''}>行前 (11/10)</option>
                <option value="11/13" ${v37SimulatedDate==='11/13'?'selected':''}>Day 1 (11/13)</option>
                <option value="11/14" ${v37SimulatedDate==='11/14'?'selected':''}>Day 2 (11/14)</option>
                <option value="11/15" ${v37SimulatedDate==='11/15'?'selected':''}>Day 3 (11/15)</option>
                <option value="11/16" ${v37SimulatedDate==='11/16'?'selected':''}>Day 4 (11/16)</option>
                <option value="11/17" ${v37SimulatedDate==='11/17'?'selected':''}>Day 5 (11/17)</option>
                <option value="11/20" ${v37SimulatedDate==='11/20'?'selected':''}>行後 (11/20)</option>
            </select>
        </div>
        
        <div id="v37CityDetailPanel" style="display:none; background: var(--card-bg); border-radius: 16px; padding: 12px; margin-bottom:12px; font-size:0.7rem; font-weight:700; color:var(--text-color); line-height:1.4; border: 1px solid var(--border-color); box-shadow: var(--shadow);">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px;">
                <div>🏥 <b>急救醫院：</b><br>${city.emergency.hospital}</div>
                <div>🚓 <b>派出聯絡：</b><br>${city.emergency.police}</div>
            </div>
            <div style="border-top:1px dashed var(--border-color); padding-top:4px; margin-bottom:6px;">
                🚌 <b>特色交通手段：</b><br>${city.transportation.desc}，${city.transportation.taxi}
            </div>
            <div style="border-top:1px dashed var(--border-color); padding-top:4px; display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div>🥞 <b>周邊早餐：</b><br>${city.recommendations.breakfast}</div>
                <div>💱 <b>換錢指引：</b><br>${city.recommendations.exchange}</div>
                <div>🏪 <b>最近 CU：</b>${city.recommendations.cu}</div>
                <div>🏪 <b>最近 GS25：</b>${city.recommendations.gs25}</div>
            </div>
        </div>
    `;
};

window.renderBeforeWidgets = function(ctx, city, smartAlert, v37SimulatedDate) {
    let countdownDays = 3;
    if (v37SimulatedDate === 'real') {
        const diffTime = new Date('2026-11-13T00:00:00') - new Date();
        countdownDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    let totalPreps = ctx.checklist.length || 10;
    let compPreps = totalPreps - ctx.uncompletedPreps.length;
    let percent = Math.min(100, Math.max(0, Math.round((compPreps / totalPreps) * 100)));
    const weather = (ctx && ctx.currentWeather) ? ctx.currentWeather : null;

    const formatWeatherTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    let weatherBoxHtml = '';
    if (weather && !weather.unavailable && weather.temp !== null && weather.temp !== undefined) {
        const timeStr = weather.timestamp ? formatWeatherTime(weather.timestamp) : '';
        const updateLabel = weather.isCached ? `最後更新：${timeStr}` : (timeStr ? `更新：${timeStr}` : '');
        const condStr = weather.conditionZH || (window.WeatherEngine ? WeatherEngine.localizeCondition(weather.condition) : weather.condition) || '多雲';
        weatherBoxHtml = `
            <div class="v45-home-weather-box" style="margin-top:8px; padding:6px 10px; background:rgba(255,255,255,0.08); border-radius:10px; border:1px solid rgba(255,255,255,0.12); font-size:0.75rem; color:#f1f2f6;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:900;"><i class="fa-solid fa-cloud-sun"></i> 釜山目前｜${weather.temp}°C｜${condStr}</span>
                    ${updateLabel ? `<span style="font-size:0.65rem; color:#bdc3c7;">${updateLabel}</span>` : ''}
                </div>
                <div style="font-size:0.68rem; color:#dfe4ea; margin-top:2px;">
                    📅 11/13~11/17 氣候預報：出發前 7–10 天提供詳細預報
                </div>
            </div>
        `;
    } else {
        weatherBoxHtml = `
            <div class="v45-home-weather-box" style="margin-top:8px; padding:6px 10px; background:rgba(255,255,255,0.08); border-radius:10px; border:1px solid rgba(255,255,255,0.12); font-size:0.75rem; color:#f1f2f6;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:#f5cd79;"><i class="fa-solid fa-triangle-exclamation"></i> ⚠️ 即時天氣暫時無法更新</span>
                    <span style="font-size:0.65rem; color:#bdc3c7;">出發倒數中</span>
                </div>
                <div style="font-size:0.68rem; color:#dfe4ea; margin-top:2px;">
                    📅 11/13~11/17 氣候預報：出發前 7–10 天提供詳細預報
                </div>
            </div>
        `;
    }
    
    let heroHtml = `
        <div class="v38-hero-card hero-card fade-scale-in" onclick="showV37Tab('itinerary')" style="background: linear-gradient(135deg, #1e272e, #2f3640); cursor:pointer;">
            <div class="v38-hero-title">DAY — 尚未出發</div>
            <div class="v38-hero-main">出發：${countdownDays} 天</div>
            <div class="v38-hero-sub">目的地：🇰🇷 ${city.nameTW}</div>

            <!-- 🌤️ Home Weather Context -->
            ${weatherBoxHtml}

            <!-- ✅ Entry Status & Prep Summary -->
            <div style="margin-top: 8px; font-size: 0.78rem; font-weight: 800; color: #2ecc71;">
                <i class="fa-solid fa-circle-check"></i> K-ETA：本次免申請（至 2026/12/31）
            </div>
            <div style="font-size: 0.72rem; font-weight: 700; color: #f5cd79; margin-top:2px;">
                📝 e-Arrival Card 電子申報 ｜ 🔄 Q-CODE：Q4出發前RECHECK
            </div>
            <div class="v38-progress-container" style="margin-top: 8px;">
                <div class="v38-progress-bar" style="width: ${percent}%;"></div>
            </div>
        </div>
    `;
    
    let prepItemsHtml = "";
    if (ctx.uncompletedPreps.length === 0) {
        prepItemsHtml = `<div style="font-size:0.75rem; color:#2ecc71; font-weight:800;"><i class="fa-solid fa-circle-check"></i> 行前準備已就緒！</div>`;
    } else {
        ctx.uncompletedPreps.slice(0, 3).forEach(p => {
            prepItemsHtml += `
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-color); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                    <span style="color:#e67e22; font-size:0.5rem;">●</span>
                    <span class="text-truncate">${p.text}</span>
                </div>
            `;
        });
    }
    
    let widget2Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-list-check"></i> 最近待辦</div>
            ${prepItemsHtml}
        </div>
    `;
    
    let widget3Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2; border-left: 4px solid var(--primary);">
            <div class="v38-widget-title" style="color:var(--primary);"><i class="fa-solid fa-robot"></i> 推薦提示</div>
            <p style="font-size:0.75rem; font-weight:700; color:var(--text-color); line-height:1.3; margin:0;" class="text-truncate">${ctx.aiSuggestions.split('\n')[0]}</p>
        </div>
    `;
    
    return { heroHtml, widget2Html, widget3Html };
};

window.renderDuringWidgets = function(ctx, dateStr, city, weather, smartAlert) {
    let dayNum = "DAY 1";
    if (dateStr === "11/13") dayNum = "DAY 1";
    if (dateStr === "11/14") dayNum = "DAY 2";
    if (dateStr === "11/15") dayNum = "DAY 3";
    if (dateStr === "11/16") dayNum = "DAY 4";
    if (dateStr === "11/17") dayNum = "DAY 5";
    
    let nextAttr = "今日行程已結束";
    let nextTimeStr = "";
    
    if (ctx.nextDestination) {
        nextAttr = ctx.nextDestination.desc.split(' ')[0];
        nextTimeStr = ctx.nextDestination.time;
    }
    
    const isRainDay = (dateStr === "11/14" || dateStr === "11/15" || dateStr === "11/16");
    const isRainActive = (window.currentWeatherMode === "rain");

    const formatWeatherTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    let weatherDuringHtml = '';
    if (weather && !weather.unavailable && weather.temp !== null && weather.temp !== undefined) {
        const timeStr = weather.timestamp ? formatWeatherTime(weather.timestamp) : '';
        const updateLabel = weather.isCached ? `最後更新：${timeStr}` : (timeStr ? `更新：${timeStr}` : '');
        const condStr = weather.conditionZH || (window.WeatherEngine ? WeatherEngine.localizeCondition(weather.condition) : weather.condition) || '多雲';
        weatherDuringHtml = `
            <div class="v45-home-weather-box" style="margin-top:6px; padding:6px 10px; background:rgba(255,255,255,0.08); border-radius:10px; border:1px solid rgba(255,255,255,0.12); font-size:0.75rem; color:#f1f2f6;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:900;">🌤️ ${city.nameTW}目前｜${weather.temp}°C｜${condStr}</span>
                    <span style="font-size:0.68rem; color:#dfe4ea;">體感 ${weather.feelsLike || weather.temp}°C ${updateLabel ? `(${updateLabel})` : ''}</span>
                </div>
                <div style="font-size:0.7rem; color:#dfe4ea; margin-top:2px; display:flex; justify-content:space-between;">
                    <span>🧥 ${ctx.currentOutfit || '防風外套+洋蔥穿法'}</span>
                    ${isRainDay ? `<span style="color:${isRainActive ? '#74b9ff' : '#f5cd79'}; font-weight:800;">${isRainActive ? '☔ 雨天備案中' : '☔ 建議查看雨天備案'}</span>` : ''}
                </div>
            </div>
        `;
    } else {
        weatherDuringHtml = `
            <div class="v45-home-weather-box" style="margin-top:6px; padding:6px 10px; background:rgba(255,255,255,0.08); border-radius:10px; border:1px solid rgba(255,255,255,0.12); font-size:0.75rem; color:#f1f2f6;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:800; color:#f5cd79;">🌤️ ${city.nameTW}｜⚠️ 即時天氣暫時無法更新</span>
                    <span style="font-size:0.65rem; color:#bdc3c7;">旅途中</span>
                </div>
                <div style="font-size:0.7rem; color:#dfe4ea; margin-top:2px; display:flex; justify-content:space-between;">
                    <span>🧥 ${ctx.currentOutfit || '防風外套+洋蔥穿法'}</span>
                    ${isRainDay ? `<span style="color:${isRainActive ? '#74b9ff' : '#f5cd79'}; font-weight:800;">${isRainActive ? '☔ 雨天備案中' : '☔ 建議查看雨天備案'}</span>` : ''}
                </div>
            </div>
        `;
    }

    let heroHtml = `
        <div class="v38-hero-card hero-card fade-scale-in" onclick="showV37Tab('itinerary')" style="background: linear-gradient(135deg, #1e272e, #353b48); cursor:pointer;">
            <div class="v38-hero-title">${dayNum} | 🇰🇷 ${city.nameTW}</div>
            <div class="v38-hero-main" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="text-truncate" style="max-width:180px;">${nextAttr}</span>
                <span style="font-size:1.3rem; color:#4cd964;">${(weather && !weather.unavailable && weather.temp !== null) ? weather.temp + '°C' : '--'}</span>
            </div>
            <div class="v38-hero-sub" style="margin-top:4px;"><i class="fa-solid fa-map-pin"></i> ${nextTimeStr ? nextTimeStr + ' 出發' : ''}</div>

            <!-- 🌤️ Weather Context & Rain Advisory (Suggestion only, user controlled) -->
            ${weatherDuringHtml}

            <div style="margin-top: 6px; font-size: 0.78rem; font-weight: 800; color: #ffcc00;" class="text-truncate"><i class="fa-solid fa-circle-exclamation"></i> ${smartAlert}</div>
        </div>
    `;
    
    let itiItemsHtml = "";
    if (ctx.todayItinerary.length === 0) {
        itiItemsHtml = `<p style="font-size:0.75rem; color:#8e8e93; margin:0;">今日無行程</p>`;
    } else {
        ctx.todayItinerary.slice(0, 3).forEach(i => {
            itiItemsHtml += `
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; margin-bottom:4px;">
                    <span style="color:var(--primary); font-weight:900; width:40px;">${i.time}</span>
                    <span style="color:var(--text-color); flex:1;" class="text-truncate">${i.desc.split(' ')[0]}</span>
                </div>
            `;
        });
    }
    
    let widget2Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-calendar-day"></i> 今天行程</div>
            ${itiItemsHtml}
        </div>
    `;
    
    let recSpot = "甘川文化村";
    let recSpotDesc = "小王子壁畫打卡必去";
    if (dateStr === "11/15") {
        recSpot = "東宮與月池";
        recSpotDesc = "慶州絕美夜楓打卡地";
    }
    
    let widget3Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2; border-left: 4px solid #ff9500;">
            <div class="v38-widget-title" style="color:#ff9500;"><i class="fa-solid fa-compass"></i> 附近推薦</div>
            <div style="font-size:0.78rem; font-weight:900; color:var(--text-color);" class="text-truncate">📍 ${recSpot}</div>
            <p style="font-size:0.7rem; font-weight:700; color:#666; margin:0; line-height:1.2;" class="text-truncate">${recSpotDesc}</p>
        </div>
    `;
    
    return { heroHtml, widget2Html, widget3Html };
};

window.renderAfterWidgets = function(ctx, smartAlert) {
    let overallSpent = ctx.budget.overallSpent;
    
    let heroHtml = `
        <div class="v38-hero-card hero-card fade-scale-in" onclick="showV37Tab('split')" style="background: linear-gradient(135deg, #1e272e, #2d3436);">
            <div class="v38-hero-title">旅行完成 ✈️</div>
            <div class="v38-hero-main" style="font-size:1.6rem !important;">$${overallSpent.toLocaleString()} TWD</div>
            <div class="v38-hero-sub">旅行天數：5天 | 目的地: Busan</div>
            <div style="margin-top: 6px; font-size: 0.75rem; font-weight: 800; color: #ffcc00;" class="text-truncate">${smartAlert}</div>
        </div>
    `;
    
    let widget2Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-pen-fancy"></i> 心得手帳</div>
            <textarea id="v38ReviewText" class="input-box" style="height:35px; font-size:0.7rem; font-weight:normal; resize:none; padding:4px; border-radius:6px; margin-bottom:4px;" placeholder="寫下回顧或心得..."></textarea>
            <button class="btn-action" style="padding:2px; font-size:0.65rem; width:100%;" onclick="saveV38TravelReview()">💾 儲存</button>
        </div>
    `;
    
    let widget3Html = `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2; border-left: 4px solid #2ecc71;">
            <div class="v38-widget-title" style="color:#2ecc71;"><i class="fa-solid fa-wallet"></i> 旅行統計</div>
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-color); line-height: 1.3;">
                <div>公費分攤：$${ctx.budget.totalSharedTWD.toLocaleString()} TWD</div>
                <div>個人私帳：$${ctx.budget.totalPrivateTWD.toLocaleString()} TWD</div>
            </div>
        </div>
    `;
    
    return { heroHtml, widget2Html, widget3Html };
};

window.emergencyRescue = function() {
    const ctx = typeof getTripContext === 'function' ? getTripContext() : {};
    const city = (ctx && ctx.currentCity) ? ctx.currentCity : { nameTW: "釜山", emergency: { hospital: "釜山大學醫院 (+82-51-240-5114)", police: "釜山鎮警察署 (+82-51-890-9224)" } };
    alert(`🚨 【緊急救援與聯絡資訊】\n\n📍 目前城市：${city.nameTW}\n🏥 急救醫院：${city.emergency.hospital}\n🚓 派出聯絡：${city.emergency.police}\n📞 旅遊諮詢：1330\n🚨 報警：112\n🚑 急救/火災：119`);
};

window.renderQuickActions = function() {
    return `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-star"></i> 快速入口</div>
            <div class="v38-quick-actions">
                <button class="v38-action-btn" onclick="showV37Tab('itinerary')">
                    <i class="fa-solid fa-calendar-day" style="color: #007aff;"></i>
                    <span>今日行程</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('split')">
                    <i class="fa-solid fa-coins" style="color: #ff9500;"></i>
                    <span>即時匯率</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('split'); setTimeout(() => document.getElementById('billName')?.focus(), 200);">
                    <i class="fa-solid fa-calculator" style="color: #2ecc71;"></i>
                    <span>快速記帳</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('more');">
                    <i class="fa-solid fa-life-ring" style="color: #ff3b30;"></i>
                    <span>緊急求助</span>
                </button>
            </div>
        </div>
    `;
};

window.renderCollections = function() {
    let favFoodCount = StorageEngine.get('fav_rec_food', []).data.length;
    let favShopCount = StorageEngine.get('fav_rec_shop', []).data.length;
    
    return `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-heart"></i> 收藏清單</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                <div style="background:rgba(255, 59, 85, 0.05); padding:6px; border-radius:10px; border:1px solid rgba(255,59,85,0.1); text-align:center; cursor:pointer;" onclick="showV37Tab('home'); openGuideFolder('美食景點'); setTimeout(()=>setFoodTabMode('my'),100);">
                    <div style="font-size:0.6rem; color:#ff3b30; font-weight:800;">🍜 美食收藏</div>
                    <div style="font-size:0.95rem; font-weight:900; color:#ff3b30; margin-top:2px;">${favFoodCount} 個</div>
                </div>
                <div style="background:rgba(0, 122, 255, 0.05); padding:6px; border-radius:10px; border:1px solid rgba(0,122,255,0.1); text-align:center; cursor:pointer;" onclick="showV37Tab('shop'); setTimeout(()=>setShopTabMode('rec'),100);">
                    <div style="font-size:0.6rem; color:#007aff; font-weight:800;">🛍️ 購物收藏</div>
                    <div style="font-size:0.95rem; font-weight:900; color:#007aff; margin-top:2px;">${favShopCount} 個</div>
                </div>
            </div>
        </div>
    `;
};

window.renderHomeNineGrid = function() {
    return `
        <div class="v45-home-nine-grid fade-scale-in">
            <div style="font-weight: 900; font-size: 0.95rem; color: var(--primary); margin-bottom: 10px; display:flex; align-items:center; gap:6px;">
                <i class="fa-solid fa-compass"></i> 全境旅遊功能導覽
            </div>
            <div class="v45-nine-grid">
                <!-- 1. 🗓️ 今日行程 -->
                <div class="v45-nine-card" onclick="showV37Tab('itinerary')">
                    <div class="v45-nine-icon"><i class="fa-solid fa-calendar-day" style="color:#3498db;"></i></div>
                    <div class="v45-nine-title">今日行程</div>
                    <div class="v45-nine-sub">5日手帳 / 備案</div>
                </div>

                <!-- 2. 🍽️ 景點美食 -->
                <div class="v45-nine-card" onclick="openGuideFolder('美食景點')">
                    <div class="v45-nine-icon"><i class="fa-solid fa-utensils" style="color:#e67e22;"></i></div>
                    <div class="v45-nine-title">景點美食</div>
                    <div class="v45-nine-sub">必吃名店/慶州</div>
                </div>

                <!-- 3. 🏪 韓國超商 -->
                <div class="v45-nine-card" onclick="showV37Tab('shop'); setTimeout(()=>setShopTabMode('convenience'),50);">
                    <div class="v45-nine-icon"><i class="fa-solid fa-store" style="color:#2ecc71;"></i></div>
                    <div class="v45-nine-title">韓國超商</div>
                    <div class="v45-nine-sub">6大入口/混搭</div>
                </div>

                <!-- 4. 🛍️ 快樂購 -->
                <div class="v45-nine-card" onclick="showV37Tab('shop'); setTimeout(()=>setShopTabMode('my'),50);">
                    <div class="v45-nine-icon"><i class="fa-solid fa-bag-shopping" style="color:#e84393;"></i></div>
                    <div class="v45-nine-title">快樂購</div>
                    <div class="v45-nine-sub">Olive Young/伴手禮</div>
                </div>

                <!-- 5. 🎟️ 票券住宿 -->
                <div class="v45-nine-card" onclick="showV37Tab('wallet'); setTimeout(()=>switchWalletTab('ticket'),50);">
                    <div class="v45-nine-icon"><i class="fa-solid fa-ticket" style="color:#9b59b6;"></i></div>
                    <div class="v45-nine-title">票券住宿</div>
                    <div class="v45-nine-sub">機票/飯店/憑證</div>
                </div>

                <!-- 6. 💰 旅行記帳 -->
                <div class="v45-nine-card" onclick="showV37Tab('split')">
                    <div class="v45-nine-icon"><i class="fa-solid fa-wallet" style="color:#f39c12;"></i></div>
                    <div class="v45-nine-title">旅行記帳</div>
                    <div class="v45-nine-sub">公費分攤/匯率</div>
                </div>

                <!-- 7. 🗣️ 翻譯 SOS -->
                <div class="v45-nine-card" onclick="showV37Tab('more')">
                    <div class="v45-nine-icon"><i class="fa-solid fa-language" style="color:#e74c3c;"></i></div>
                    <div class="v45-nine-title">翻譯 SOS</div>
                    <div class="v45-nine-sub">韓語字卡/救援</div>
                </div>

                <!-- 8. 🧳 行前準備 -->
                <div class="v45-nine-card" onclick="showV37Tab('wallet'); setTimeout(()=>switchWalletTab('doc'),50);">
                    <div class="v45-nine-icon"><i class="fa-solid fa-suitcase-rolling" style="color:#1abc9c;"></i></div>
                    <div class="v45-nine-title">行前準備</div>
                    <div class="v45-nine-sub">代辦清單/文件</div>
                </div>

                <!-- 9. 📸 旅行回憶 -->
                <div class="v45-nine-card" onclick="showV37Tab('photo')">
                    <div class="v45-nine-icon"><i class="fa-solid fa-camera-retro" style="color:#00cec9;"></i></div>
                    <div class="v45-nine-title">旅行回憶</div>
                    <div class="v45-nine-sub">拍立得相簿/Vlog</div>
                </div>
            </div>
        </div>
    `;
};

window.renderV37HomeDashboard = function() {
    const container = document.getElementById('v37HomeDashboard');
    if (!container) return;
    
    const ctx = getTripContext();
    if (!ctx || !ctx.currentDate) return;
    
    const dateStr = ctx.currentDate;
    const city = ctx.currentCity;
    const weather = ctx.currentWeather;
    const mode = ctx.tripMode;
    
    // Decomposed headers
    let simulatorHtml = renderDateSimulator(window.v37SimulatedDate, city);
    
    let heroHtml = "";
    let widget1Html = renderQuickActions();
    let widget2Html = ""; 
    let widget3Html = ""; 
    let widget4Html = renderCollections();
    
    const smartAlert = getSmartAlertMessage(ctx);
    
    let widgets;
    if (mode === 'before') {
        widgets = renderBeforeWidgets(ctx, city, smartAlert, v37SimulatedDate);
    } else if (mode === 'during') {
        widgets = renderDuringWidgets(ctx, dateStr, city, weather, smartAlert);
    } else if (mode === 'after') {
        widgets = renderAfterWidgets(ctx, smartAlert);
    }
    
    if (widgets) {
        heroHtml = widgets.heroHtml;
        widget2Html = widgets.widget2Html;
        widget3Html = widgets.widget3Html;
    }
    
    container.innerHTML = simulatorHtml + heroHtml + renderHomeNineGrid() + `
        <div class="v38-widget-row">
            ${widget1Html}
            ${widget2Html}
            ${widget3Html}
            ${widget4Html}
        </div>
    `;
};


window.renderSmartNearby = function() {
    const list = document.getElementById('walletNearbyList');
    if (!list) return;
    
    const ctx = getTripContext();
    if (!ctx || !ctx.currentCity) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900;">尚無城市資訊</p>';
        return;
    }
    
    const cityId = ctx.currentCity.id || 'Busan';
    
    fetchSmartNearbyPlaces(cityId).then(places => {
        list.innerHTML = '';
        places.forEach(p => {
            let googleBtn = p.google ? `<a href="${p.google}" target="_blank" class="v38-mini-btn" style="background:#4285F4; color:white; border:none; text-decoration:none;"><i class="fa-solid fa-map"></i> Google</a>` : '';
            let naverBtn = p.naver ? `<a href="${p.naver}" target="_blank" class="v38-mini-btn" style="background:#03C75A; color:white; border:none; text-decoration:none;"><i class="fa-solid fa-location-arrow"></i> NAVER</a>` : '';
            let kakaoBtn = p.kakao ? `<a href="${p.kakao}" target="_blank" class="v38-mini-btn" style="background:#FEE500; color:#3C1E1E; border:none; text-decoration:none;"><i class="fa-solid fa-route"></i> Kakao</a>` : '';
            
            list.innerHTML += `
                <div style="background:rgba(0,0,0,0.02); padding:10px; border-radius:12px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <span style="font-weight:900; font-size:0.85rem; color:var(--text-color);">${p.type} ${p.name}</span>
                        <div style="font-size:0.7rem; color:#7f8c8d; margin-top:2px;">
                            📍 距離：${p.dist}m | 評分：⭐${p.rate}
                        </div>
                    </div>
                    <div style="display:flex; gap:4px; align-items:center;">
                        ${naverBtn} ${kakaoBtn} ${googleBtn}
                    </div>
                </div>
            `;
        });
    }).catch(err => {
        list.innerHTML = '<p style="text-align:center; color:#e74c3c; font-size:0.8rem; font-weight:900;">加載雷達失敗</p>';
    });
};

window.filterShopOwner = function(owner) {
    window.currentShopOwner = owner;
    renderShop();
};

window.renderShop = function() {
    const list = document.getElementById('sList');
    const tabsUI = document.getElementById('shopTabsUI');
    if (!list) return;
    list.innerHTML = '';
    
    let displayList = window.shopList || [];
    if (displayList.length === 0) {
        const localData = StorageEngine.get('busan_v36_shopList');
        if (localData && localData.success && Array.isArray(localData.data) && localData.data.length > 0) {
            displayList = localData.data;
            window.shopList = displayList;
        }
    }
    
    // Inject owner tabs if shopTabsUI exists
    if (tabsUI) {
        const u1Active = window.currentShopOwner === 'user1' ? 'active' : '';
        const u2Active = window.currentShopOwner === 'user2' ? 'active' : '';
        tabsUI.innerHTML = `
            <button class="day-tab ${u1Active}" onclick="filterShopOwner('user1')">${window.u1?.avatar || '👩'} ${window.u1?.name || '溫'}</button>
            <button class="day-tab ${u2Active}" onclick="filterShopOwner('user2')">${window.u2?.avatar || '🦆'} ${window.u2?.name || '鴨'}</button>
        `;
    }
    
    // If the currently selected owner has 0 items, but the other owner has items, auto-select the owner with items
    if (displayList.length > 0) {
        const currentFiltered = displayList.filter(s => s.owner === (window.currentShopOwner || 'user1'));
        if (currentFiltered.length === 0) {
            const alternateOwner = displayList.find(s => s.owner)?.owner;
            if (alternateOwner) {
                window.currentShopOwner = alternateOwner;
                if (tabsUI) {
                    const u1Active = window.currentShopOwner === 'user1' ? 'active' : '';
                    const u2Active = window.currentShopOwner === 'user2' ? 'active' : '';
                    tabsUI.innerHTML = `
                        <button class="day-tab ${u1Active}" onclick="filterShopOwner('user1')">${window.u1?.avatar || '👩'} ${window.u1?.name || '溫'}</button>
                        <button class="day-tab ${u2Active}" onclick="filterShopOwner('user2')">${window.u2?.avatar || '🦆'} ${window.u2?.name || '鴨'}</button>
                    `;
                }
            }
        }
    }
    
    let filtered = displayList.filter(s => s.owner === (window.currentShopOwner || 'user1'));
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;">無購物項目，請於上方欄位新增！</p>';
        return;
    }
    
    filtered.forEach(s => {
        const isChecked = s.checked ? 'checked' : '';
        const itemImgHtml = s.img ? `<img src="${s.img}" class="item-img" onclick="openLightbox('${s.img}', '${s.key}')">` : '';
        list.innerHTML += `
            <div class="shop-item ${isChecked}" onclick="toggleShop('${s.key}', ${s.checked})">
                <div class="check-box"><i class="fa-solid fa-check"></i></div>
                ${itemImgHtml}
                <div style="flex:1;">
                    <span class="cat-tag">${s.category || '其他'}</span>
                    <div class="item-content" style="font-weight:900; font-size:1.02rem; color:var(--text-color);">${s.text}</div>
                    <div style="font-size:0.75rem; color:#7f8c8d; margin-top:2px;">📍 哪裡買: ${s.where || '未填寫'}</div>
                </div>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteShop('${s.key}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
};

window.currentShopMode = 'my';
window.currentConveniencePortal = null; // null = home screen (6 portal buttons)
window.currentConvenienceFilter = 'all';
window.currentRadarCategory = 'all';
window.currentRadarStore = 'all';

// ── SHOP TAB MODE SWITCHER ──────────────────────────────────────────────────
window.setShopTabMode = function(mode) {
    window.currentShopMode = mode;
    const btnMy = document.getElementById('btnShopMy');
    const btnConvenience = document.getElementById('btnShopConvenience');
    const btnRec = document.getElementById('btnShopRec');

    const myContainer = document.getElementById('shopMyContainer');
    const convenienceContainer = document.getElementById('shopConvenienceContainer');
    const recContainer = document.getElementById('shopRecContainer');
    const addBox = document.getElementById('addShopBox');
    const ownerTabs = document.getElementById('shopTabsUI');

    if (btnMy) btnMy.classList.toggle('active', mode === 'my');
    if (btnConvenience) btnConvenience.classList.toggle('active', mode === 'convenience');
    if (btnRec) btnRec.classList.toggle('active', mode === 'rec');

    if (myContainer) myContainer.style.display = (mode === 'my') ? 'block' : 'none';
    if (convenienceContainer) convenienceContainer.style.display = (mode === 'convenience') ? 'block' : 'none';
    if (recContainer) recContainer.style.display = (mode === 'rec') ? 'block' : 'none';

    if (addBox) addBox.style.display = (mode === 'my') ? 'block' : 'none';
    if (ownerTabs) ownerTabs.style.display = (mode === 'my') ? 'flex' : 'none';

    if (mode === 'my') {
        renderShop();
    } else if (mode === 'convenience') {
        window.currentConveniencePortal = null;
        renderConvenienceHome();
    } else if (mode === 'rec') {
        renderRecommendedShopping();
    }
};

// ── NAVIGATE INTO A PORTAL ──────────────────────────────────────────────────
window.enterConveniencePortal = function(portalId) {
    window.currentConveniencePortal = portalId;
    renderConvenienceStoreMatrix();
};

// ── BACK TO HOME SCREEN ─────────────────────────────────────────────────────
window.exitConveniencePortal = function() {
    window.currentConveniencePortal = null;
    renderConvenienceHome();
};

// ── PERSONAL STATE HELPERS ──────────────────────────────────────────────────
function _getConvState() {
    const raw = StorageEngine.get('busan_v45_convenience_state');
    if (raw && raw.success && raw.data && typeof raw.data === 'object' && Object.keys(raw.data).length > 0) {
        return raw.data;
    }
    const fallback = StorageEngine.get('busan_v45_convenience_user_state');
    if (fallback && fallback.success && fallback.data && typeof fallback.data === 'object') {
        StorageEngine.set('busan_v45_convenience_state', fallback.data);
        return fallback.data;
    }
    return (raw && raw.success && raw.data && typeof raw.data === 'object') ? raw.data : {};
}
function _setConvState(state) {
    StorageEngine.set('busan_v45_convenience_state', state);
}
function _getComboState() {
    const raw = StorageEngine.get('busan_v45_combo_state');
    return (raw && raw.success && raw.data) ? raw.data : {};
}
function _setComboState(state) {
    StorageEngine.set('busan_v45_combo_state', state);
}

const RADAR_CATEGORY_MAP = {
    drink: '飲料',
    dessert: '甜點',
    ramen: '泡麵',
    readyMeal: '熟食',
    snack: '零食',
    iceCream: '冰品',
    dailyGoods: '生活用品'
};

function _categoryLabel(catId) {
    return RADAR_CATEGORY_MAP[catId] || catId;
}

// ── BUILD ALL CANONICAL RADAR ITEMS ────────────────────────────────────────
function _buildRadarItems() {
    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const cs = canonical.convenienceStore || canonical.convenienceStores || {};
    const cuItems = (cs.cu || []).map((item, idx) => {
        const catId = _inferCategory(item);
        return { id: 'cu_' + (idx + 1), store: 'CU', categoryId: catId, category: _categoryLabel(catId), ...item };
    });
    const gsItems = (cs.gs25 || []).map((item, idx) => {
        const catId = _inferCategory(item);
        return { id: 'gs_' + (idx + 1), store: 'GS25', categoryId: catId, category: _categoryLabel(catId), ...item };
    });
    const sevenItems = (cs.sevenEleven || []).map((item, idx) => {
        const catId = _inferCategory(item);
        return { id: 'seven_' + (idx + 1), store: '7-Eleven', categoryId: catId, category: _categoryLabel(catId), ...item };
    });
    const emartItems = (cs.emart24 || []).map((item, idx) => {
        const catId = _inferCategory(item);
        return { id: 'emart_' + (idx + 1), store: 'Emart24', categoryId: catId, category: _categoryLabel(catId), ...item };
    });
    return [...cuItems, ...gsItems, ...sevenItems, ...emartItems];
}

function _inferCategory(item) {
    if (item.categoryId) return item.categoryId;
    const name = (item.name || '') + (item.desc || '');
    if (/麵|泡麵|拉麵/.test(name)) return 'ramen';
    if (/冰沙|冰棒|冰品|刨冰/.test(name)) return 'iceCream';
    if (/蛋糕|捲|甜|布丁|乳包|月餅|點心/.test(name)) return 'dessert';
    if (/牛奶|咖啡|飲|奶茶/.test(name)) return 'drink';
    if (/飯糰|便當|飯|三角|熟食/.test(name)) return 'readyMeal';
    if (/牙刷|濕紙巾|衛生紙|生活|日用|轉接頭|雨衣|傘/.test(name)) return 'dailyGoods';
    if (/零|脆|洋芋|餅|薯/.test(name)) return 'snack';
    return 'snack';
}

// ── TOGGLE ITEM WANT/BOUGHT STATE ───────────────────────────────────────────
window.toggleConvenienceItemState = function(itemId, type) {
    const state = _getConvState();
    if (!state[itemId]) state[itemId] = { want: false, bought: false };

    if (type === 'want') {
        state[itemId].want = !state[itemId].want;
        if (state[itemId].want && typeof showToast === 'function')
            showToast('❤️ 已加入想買清單', 'info');
    } else if (type === 'bought') {
        state[itemId].bought = !state[itemId].bought;
        if (state[itemId].bought && typeof showToast === 'function')
            showToast('✅ 戰利品入袋！', 'success');
    }
    _setConvState(state);
    renderConvenienceStoreMatrix();
};

// ── TOGGLE COMBO INGREDIENT ─────────────────────────────────────────────────
window.toggleComboIngredient = function(comboIdx, ingIdx) {
    const comboState = _getComboState();
    if (!comboState[comboIdx]) comboState[comboIdx] = { ingredients: {}, unlocked: false };
    if (!comboState[comboIdx].ingredients) comboState[comboIdx].ingredients = {};

    comboState[comboIdx].ingredients[ingIdx] = !comboState[comboIdx].ingredients[ingIdx];

    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const combos = canonical.convenienceStore?.combos || canonical.convenienceCombos || [];
    const combo = combos[comboIdx];

    if (combo && combo.formula) {
        const parts = combo.formula.split('＋').map(p => p.trim());
        const allChecked = parts.every((_, idx) => !!comboState[comboIdx].ingredients[idx]);
        if (allChecked) {
            comboState[comboIdx].unlocked = true;
            if (typeof showToast === 'function')
                showToast('🏆 恭喜解鎖神級混搭：' + combo.name + '！', 'success');
        }
    }
    _setComboState(comboState);
    renderConvenienceStoreMatrix();
};

// ── DIRECT UNLOCK/RELOCK COMBO ──────────────────────────────────────────────
window.unlockComboDirect = function(comboIdx) {
    const comboState = _getComboState();
    if (!comboState[comboIdx]) comboState[comboIdx] = { ingredients: {}, unlocked: false };
    comboState[comboIdx].unlocked = !comboState[comboIdx].unlocked;

    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const combos = canonical.convenienceStore?.combos || canonical.convenienceCombos || [];
    const combo = combos[comboIdx];

    if (comboState[comboIdx].unlocked && typeof showToast === 'function')
        showToast('🏆 恭喜解鎖：' + (combo ? combo.name : '神級混搭') + '！', 'success');

    _setComboState(comboState);
    renderConvenienceStoreMatrix();
};

// ── CONVENIENCE STORE HOME (6 FUNCTIONAL PORTAL BUTTONS) ───────────────────
window.renderConvenienceHome = function() {
    const list = document.getElementById('sConvenienceList');
    if (!list) return;

    const state = _getConvState();
    const allItems = _buildRadarItems();
    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const combos = canonical.convenienceStore?.combos || canonical.convenienceCombos || [];

    const comboState = _getComboState();

    let wantCount = 0, boughtCount = 0, unlockedCombos = 0;
    allItems.forEach(item => {
        if (state[item.id]?.want) wantCount++;
        if (state[item.id]?.bought) boughtCount++;
    });
    combos.forEach((_, idx) => { if (comboState[idx]?.unlocked) unlockedCombos++; });

    const portals = [
        { id: 'discount', icon: '🏷️', title: '①優惠怎麼看', sub: '1+1 / 2+1 / 行사상품 掃法', color: '#e17055' },
        { id: 'compare', icon: '⚔️', title: '②GS25 vs CU', sub: '自有品牌 / 熟食 / 甜點 / 聯名', color: '#0984e3' },
        { id: 'radar', icon: '📡', title: '③必買雷達', sub: `${allItems.length} 款推薦｜分類篩選`, color: '#00b894' },
        { id: 'microwave', icon: '🍱', title: '④熟食＆微波教室', sub: '怎麼拆 / 怎麼熱 / 韓語對照', color: '#fdcb6e' },
        { id: 'combos', icon: '🍜', title: '⑤神級混搭', sub: `${unlockedCombos}/${combos.length} 已解鎖`, color: '#a29bfe' },
        { id: 'loot', icon: '🛍️', title: '⑥我的超商戰利品', sub: `想買 ${wantCount}　已買 ${boughtCount}　混搭 ${unlockedCombos}/${combos.length}`, color: '#fd79a8' }
    ];

    let html = `
        <div style="text-align:center; padding:8px 0 14px 0;">
            <div style="font-size:0.75rem; font-weight:800; color:#7f8c8d;">🇰🇷 韓國超商攻略助理 — 選擇入口</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-bottom:10px;">
    `;
    portals.forEach(p => {
        html += `
            <div onclick="enterConveniencePortal('${p.id}')" style="
                background:var(--card-bg); border-radius:16px; padding:14px 10px;
                border-left:4px solid ${p.color}; cursor:pointer;
                box-shadow:0 2px 8px rgba(0,0,0,0.1);
                display:flex; flex-direction:column; gap:4px;
                transition:transform 0.15s;
                -webkit-tap-highlight-color:transparent;
            " class="fade-scale-in">
                <div style="font-size:1.6rem; line-height:1;">${p.icon}</div>
                <div style="font-size:0.82rem; font-weight:900; color:var(--text-color); line-height:1.2;">${p.title}</div>
                <div style="font-size:0.68rem; color:#7f8c8d; font-weight:700; line-height:1.2;">${p.sub}</div>
            </div>
        `;
    });
    html += `</div>`;
    list.innerHTML = html;
};

// ── SHARED BACK BUTTON HEADER ────────────────────────────────────────────────
function _convBackHeader(title) {
    return `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border-color);">
            <button onclick="exitConveniencePortal()" style="background:transparent; border:none; cursor:pointer; padding:4px 8px; border-radius:8px; font-size:0.8rem; font-weight:900; color:var(--primary);">← 返回</button>
            <span style="font-size:0.9rem; font-weight:900; color:var(--text-color);">${title}</span>
        </div>
    `;
}

// ── MAIN ROUTER: RENDER ACTIVE PORTAL ───────────────────────────────────────
window.renderConvenienceStoreMatrix = function() {
    const list = document.getElementById('sConvenienceList');
    if (!list) return;
    list.innerHTML = '';

    const portal = window.currentConveniencePortal;
    if (!portal) { renderConvenienceHome(); return; }

    if (portal === 'discount') _renderPortalDiscount(list);
    else if (portal === 'compare') _renderPortalCompare(list);
    else if (portal === 'radar') _renderPortalRadar(list);
    else if (portal === 'microwave') _renderPortalMicrowave(list);
    else if (portal === 'combos') _renderPortalCombos(list);
    else if (portal === 'loot') _renderPortalLoot(list);
    else renderConvenienceHome();
};

// ── PORTAL ① 優惠怎麼看 ────────────────────────────────────────────────────
function _renderPortalDiscount(list) {
    const sections = [
        {
            tag: '1+1',
            kr: '원플러스원 / 1+1',
            desc: '買一送一。拿 2 件同商品結帳，系統自動折扣——不用跟店員說。',
            tip: '可以混不同口味嗎？→ 部分品項「加 1 元換購」才能混，看標籤上是否有「+1원 교환」字樣。'
        },
        {
            tag: '2+1',
            kr: '투플러스원 / 2+1',
            desc: '買二送一。拿 3 件同商品，最便宜那件免費。可跨口味（看標示）。',
            tip: '建議一次跟朋友湊滿 3 件，不然只買 2 件等於沒省到。'
        },
        {
            tag: '행사상품',
            kr: '行사상품（활인 상품）',
            desc: '促銷商品。黃色/橘色標籤或 LED 促銷牌標示，折扣比例不固定。',
            tip: '結帳前確認是否已套用折扣——若有疑問可問店員「이거 행사 맞아요?」'
        },
        {
            tag: '특가상품',
            kr: '特價商品',
            desc: '限時特價，通常是庫存出清或新品導入期間。',
            tip: '當天可能結束，看到直接買。'
        },
        {
            tag: '混口味攻略',
            kr: '다른 맛으로 바꿀 수 있어요?',
            desc: '詢問能否換口味。1+1 中有些品項可混換，但需標示「맛 교환 가능」。',
            tip: '不確定時：「이 1+1 다른 맛으로 바꿀 수 있어요?」→「這個 1+1 可以換別的口味嗎？」'
        },
        {
            tag: '結帳實例',
            kr: '結帳語助手',
            desc: '「이거 행사 적용 됐나요?」→ 這個有套用優惠嗎？\n「따로따로 해주세요.」→ 請幫我分開算。',
            tip: '行動支付：T-money / WOWPASS / 信用卡均可，部分自助結帳機僅限卡。'
        }
    ];

    let html = _convBackHeader('① 優惠怎麼看');
    html += `<p style="font-size:0.72rem; color:#7f8c8d; font-weight:700; margin:0 0 12px 0; line-height:1.4;">⚠️ 以下為超商促銷通用規則說明，非當前特定促銷活動——實際活動以現場標示為準。</p>`;
    sections.forEach(s => {
        html += `
            <div class="v45-store-card fade-scale-in" style="border-left:3px solid #e17055;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span class="v38-badge" style="background:#e17055;">${s.tag}</span>
                    <span style="font-size:0.7rem; color:#7f8c8d; font-weight:700;">${s.kr}</span>
                </div>
                <p style="font-size:0.78rem; color:var(--text-color); font-weight:800; margin:0 0 4px 0; line-height:1.4;">${s.desc}</p>
                <p style="font-size:0.72rem; color:#e17055; font-weight:700; margin:0; line-height:1.4;">💡 ${s.tip}</p>
            </div>
        `;
    });
    list.innerHTML = html;
}

// ── PORTAL ② GS25 vs CU ────────────────────────────────────────────────────
function _renderPortalCompare(list) {
    const dims = [
        {
            dim: '自有品牌',
            gs: 'YOU US（美妝、日用）、GS25 Premium 冰淇淋',
            cu: 'HEYROO（泡麵/零食）、CU Café 咖啡系列'
        },
        {
            dim: '熟食招牌',
            gs: '惠子便當系列（혜자도시락）、束草홍게 蟹膏系列',
            cu: '全州拌飯三角飯糰、各式炒碼麵系列'
        },
        {
            dim: '甜點首選',
            gs: '奶油生乳瑞士捲（모찌롤）、生乳白熊冰棒',
            cu: '延世大學生乳包、布丁/慕斯系列'
        },
        {
            dim: '咖啡',
            gs: 'CAFÉ25（門市內咖啡機，需門市設有）',
            cu: 'CU Café（較多門市設有咖啡機）'
        },
        {
            dim: '聯名新品',
            gs: '共和春炸醬麵（百年老店聯名）、養樂多系列',
            cu: '寶可夢週邊、各大IP合作商品'
        }
    ];

    let html = _convBackHeader('② GS25 vs CU 比較');
    html += `
        <div class="v45-store-card fade-scale-in" style="background:rgba(9,132,227,0.07); border:1px solid rgba(9,132,227,0.2); margin-bottom:12px;">
            <p style="font-size:0.78rem; font-weight:900; color:#0984e3; margin:0; line-height:1.4;">
                📍 附近哪間就先逛，不需要為品牌特地繞路。<br>
                <span style="font-weight:700; color:var(--text-color);">兩家各有擅場，差異在「獨家商品」而非「品質高下」。</span>
            </p>
        </div>
    `;
    dims.forEach(d => {
        html += `
            <div class="v45-store-card fade-scale-in" style="padding:10px 12px;">
                <div style="font-size:0.72rem; font-weight:900; color:#7f8c8d; margin-bottom:6px; letter-spacing:0.5px;">${d.dim}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div>
                        <span class="v38-badge" style="background:#0070BA; margin-bottom:4px;">GS25</span>
                        <p style="font-size:0.75rem; color:var(--text-color); font-weight:700; margin:0; line-height:1.4;">${d.gs}</p>
                    </div>
                    <div>
                        <span class="v38-badge" style="background:#00A859; margin-bottom:4px;">CU</span>
                        <p style="font-size:0.75rem; color:var(--text-color); font-weight:700; margin:0; line-height:1.4;">${d.cu}</p>
                    </div>
                </div>
            </div>
        `;
    });
    list.innerHTML = html;
}

// ── PORTAL ③ 必買雷達 ────────────────────────────────────────────────────────
window.filterConvenienceFilter = function(filter) {
    window.currentConvenienceFilter = filter;
    if (window.currentConveniencePortal === 'radar') _renderPortalRadar(document.getElementById('sConvenienceList'));
    else if (window.currentConveniencePortal === 'loot') _renderPortalLoot(document.getElementById('sConvenienceList'));
};

window.filterRadarCategory = function(cat) {
    window.currentRadarCategory = cat;
    _renderPortalRadar(document.getElementById('sConvenienceList'));
};

window.filterRadarStore = function(store) {
    window.currentRadarStore = store;
    _renderPortalRadar(document.getElementById('sConvenienceList'));
};

function _renderPortalRadar(list) {
    const allItems = _buildRadarItems();
    const state = _getConvState();

    const catFilter = window.currentRadarCategory || 'all';
    const storeFilter = window.currentRadarStore || 'all';

    const categories = [
        { id: 'all', label: '全部分類' },
        { id: 'drink', label: '飲料' },
        { id: 'dessert', label: '甜點' },
        { id: 'ramen', label: '泡麵' },
        { id: 'readyMeal', label: '熟食' },
        { id: 'snack', label: '零食' },
        { id: 'iceCream', label: '冰品' },
        { id: 'dailyGoods', label: '生活用品' }
    ];
    const stores = ['all', 'CU', 'GS25', '7-Eleven', 'Emart24'];
    const storeColors = { CU: '#00A859', GS25: '#0070BA', '7-Eleven': '#008000', Emart24: '#FFB800' };

    let filtered = allItems;
    if (catFilter !== 'all') {
        filtered = filtered.filter(i => i.categoryId === catFilter || i.category === catFilter || _categoryLabel(catFilter) === i.category);
    }
    if (storeFilter !== 'all') filtered = filtered.filter(i => i.store === storeFilter);

    let wantInFilter = filtered.filter(i => state[i.id]?.want).length;
    let boughtInFilter = filtered.filter(i => state[i.id]?.bought).length;

    let html = _convBackHeader('③ 必買雷達');

    // Category filter row
    html += `<div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:8px; scrollbar-width:none;">`;
    categories.forEach(c => {
        const active = (catFilter === c.id || catFilter === c.label);
        html += `<button class="v38-mini-btn" style="white-space:nowrap; flex-shrink:0; ${active ? 'background:var(--primary); color:white; border-color:var(--primary);' : ''}" onclick="filterRadarCategory('${c.id}')">${c.label}</button>`;
    });
    html += `</div>`;


    // Store filter row
    html += `<div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px; scrollbar-width:none;">`;
    stores.forEach(s => {
        const active = storeFilter === s;
        const color = storeColors[s] || 'var(--primary)';
        html += `<button class="v38-mini-btn" style="white-space:nowrap; flex-shrink:0; ${active ? `background:${color}; color:white; border-color:${color};` : ''}" onclick="filterRadarStore('${s}')">${s === 'all' ? '全部門市' : s}</button>`;
    });
    html += `</div>`;

    // Count summary
    html += `<div style="font-size:0.72rem; color:#7f8c8d; font-weight:700; margin-bottom:10px;">共 ${filtered.length} 款　❤️ 想買 ${wantInFilter}　✅ 已買 ${boughtInFilter}</div>`;

    if (filtered.length === 0) {
        html += `<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:25px 0;">此組合無符合商品</p>`;
    } else {
        filtered.forEach(item => {
            const iState = state[item.id] || {};
            const isWant = !!iState.want;
            const isBought = !!iState.bought;
            const badgeColor = storeColors[item.store] || 'var(--dora)';
            html += `
                <div class="v45-store-card ${isBought ? 'bought' : ''} fade-scale-in">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                            <span class="v38-badge" style="background:${badgeColor};">${item.store}</span>
                            <span class="v38-badge" style="background:#636e72; font-size:0.6rem;">${item.category}</span>
                        </div>
                        <div style="display:flex; gap:5px; flex-shrink:0;">
                            <button class="v45-btn-state ${isWant ? 'active-want' : ''}" onclick="toggleConvenienceItemState('${item.id}', 'want')">
                                <i class="fa-${isWant ? 'solid' : 'regular'} fa-heart" style="${isWant ? 'color:#d63031;' : ''}"></i> ${isWant ? '已想買' : '想買'}
                            </button>
                            <button class="v45-btn-state ${isBought ? 'active-bought' : ''}" onclick="toggleConvenienceItemState('${item.id}', 'bought')">
                                <i class="fa-solid ${isBought ? 'fa-check-circle' : 'fa-circle'}" style="${isBought ? 'color:#00b894;' : ''}"></i> ${isBought ? '已買' : '買了'}
                            </button>
                        </div>
                    </div>
                    <div style="font-weight:900; font-size:0.92rem; color:var(--text-color); margin-top:6px;">${item.name}</div>
                    <div style="font-size:0.73rem; color:#666; margin-top:2px; line-height:1.4;">${item.desc}</div>
                </div>
            `;
        });
    }
    list.innerHTML = html;
}

// ── PORTAL ④ 熟食＆微波教室 ────────────────────────────────────────────────
function _renderPortalMicrowave(list) {
    const glossary = [
        { kr: '전자레인지', tw: '微波爐' },
        { kr: '조리방법', tw: '加熱方式' },
        { kr: '몇 분 돌려요?', tw: '要微波幾分鐘？' },
        { kr: '뚜껑을 열어주세요', tw: '請打開蓋子' },
        { kr: '냉장 / 냉동', tw: '冷藏 / 冷凍' }
    ];

    const guides = [
        {
            icon: '🍱',
            type: '便當 도시락',
            how_open: '撕開薄膜角落留一小口透氣，不要完全封死。',
            how_heat: '微波 2–3 分鐘（1000W）。過程中依便當大小可停機攪拌一次。',
            notes: '部分有獨立醬包，先取出再微波，結束後再加入。'
        },
        {
            icon: '🍙',
            type: '飯糰 삼각김밥',
            how_open: '按箭頭方向 1→2→3 撕開包裝，讓海苔與米飯貼合。',
            how_heat: '通常不用微波——直接吃。若喜歡溫熱：去除包裝後微波 20–30 秒。',
            notes: '海苔遇水會軟，建議開封後盡快吃完。'
        },
        {
            icon: '🍜',
            type: '杯麵 컵라면',
            how_open: '撕開蓋子至一半，加熱水至標線，蓋回靜置 3 分鐘。',
            how_heat: '超商有熱水機（온수기）免費使用——即沸熱水最佳。',
            notes: '勿使用微波爐加熱杯麵（紙杯/塑膠杯有安全風險）。'
        },
        {
            icon: '🥤',
            type: '冰杯 얼음컵',
            how_open: '直接開蓋。',
            how_heat: '不加熱——加入咖啡袋裝 / 養樂多 / 飲品即完成。',
            notes: '冰杯分「大/중/소」，咖啡袋裝通常搭中杯剛好。'
        },
        {
            icon: '🥪',
            type: '三明治 샌드위치',
            how_open: '側面撕開，注意餡料方向避免外漏。',
            how_heat: '冷藏取出後直接食用。若需微波：去包裝後 20–30 秒。',
            notes: '蛋沙拉款勿長時間微波，易分離。'
        }
    ];

    let html = _convBackHeader('④ 熟食＆微波教室');

    guides.forEach(g => {
        html += `
            <div class="v45-store-card fade-scale-in" style="border-left:3px solid #fdcb6e;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                    <span style="font-size:1.5rem;">${g.icon}</span>
                    <span style="font-size:0.88rem; font-weight:900; color:var(--text-color);">${g.type}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--text-color); line-height:1.5;">
                    <div style="margin-bottom:4px;"><span style="font-weight:900; color:#e17055;">怎麼拆：</span>${g.how_open}</div>
                    <div style="margin-bottom:4px;"><span style="font-weight:900; color:#0984e3;">怎麼熱：</span>${g.how_heat}</div>
                    <div><span style="font-weight:900; color:#00b894;">注意：</span>${g.notes}</div>
                </div>
            </div>
        `;
    });

    html += `
        <div class="v45-store-card fade-scale-in" style="background:rgba(253,203,110,0.1); border:1px solid rgba(253,203,110,0.3); margin-top:4px;">
            <div style="font-size:0.8rem; font-weight:900; color:var(--text-color); margin-bottom:8px;">🗣️ 韓語微波教室用語</div>
            ${glossary.map(g => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid var(--border-color);">
                    <span style="font-size:0.8rem; font-weight:800; color:#0984e3;">${g.kr}</span>
                    <span style="font-size:0.78rem; font-weight:700; color:var(--text-color);">${g.tw}</span>
                </div>
            `).join('')}
        </div>
    `;
    list.innerHTML = html;
}

// ── PORTAL ⑤ 神級混搭 ──────────────────────────────────────────────────────
function _renderPortalCombos(list) {
    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const combos = canonical.convenienceStore?.combos || canonical.convenienceCombos || [];
    const comboState = _getComboState();

    let html = _convBackHeader('⑤ 神級混搭');
    html += `<p style="font-size:0.73rem; color:#7f8c8d; font-weight:700; margin:0 0 12px 0; line-height:1.4;">勾選食材代表你已購入，全部打勾後自動解鎖；也可直接點「我吃過了」一鍵解鎖。</p>`;

    if (combos.length === 0) {
        html += `<p style="text-align:center; color:#95a5a6; font-size:0.85rem; padding:20px 0;">混搭資料載入中...</p>`;
    } else {
        combos.forEach((combo, cIdx) => {
            const cState = comboState[cIdx] || { ingredients: {}, unlocked: false };
            const isUnlocked = !!cState.unlocked;
            const parts = combo.formula.split('＋').map(p => p.trim());

            let ingHtml = '<div style="display:flex; flex-direction:column; gap:5px; margin:8px 0;">';
            parts.forEach((part, pIdx) => {
                const checked = !!cState.ingredients[pIdx];
                ingHtml += `
                    <label style="display:flex; align-items:center; gap:8px; font-size:0.78rem; font-weight:800; color:var(--text-color); cursor:pointer;">
                        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleComboIngredient(${cIdx}, ${pIdx})" style="width:16px; height:16px; accent-color:#2ecc71;">
                        <span style="${checked ? 'text-decoration:line-through; opacity:0.6;' : ''}">${part}</span>
                    </label>
                `;
            });
            ingHtml += '</div>';

            html += `
                <div class="v45-combo-card ${isUnlocked ? 'unlocked' : ''} fade-scale-in">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; font-size:0.92rem; font-weight:900; color:var(--text-color);">${combo.name}</h4>
                        <span class="v45-combo-badge ${isUnlocked ? 'unlocked' : ''}">${isUnlocked ? '🏆 已解鎖！' : '🔒 未解鎖'}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#d35400; font-weight:800; margin-top:4px;">🥣 配方：${combo.formula}</div>
                    <p style="font-size:0.73rem; color:#666; margin:5px 0 0 0; line-height:1.4;">${combo.desc}</p>
                    ${ingHtml}
                    <div style="display:flex; justify-content:flex-end; margin-top:6px;">
                        <button class="v38-mini-btn" style="${isUnlocked ? 'background:#2ecc71; color:white; border:none;' : 'background:#f39c12; color:white; border:none;'}" onclick="unlockComboDirect(${cIdx})">
                            ${isUnlocked ? '✅ 重新鎖定' : '✨ 我吃過了 / 一鍵解鎖'}
                        </button>
                    </div>
                </div>
            `;
        });
    }
    list.innerHTML = html;
}

// ── PORTAL ⑥ 我的超商戰利品 ───────────────────────────────────────────────
function _renderPortalLoot(list) {
    const allItems = _buildRadarItems();
    const state = _getConvState();
    const canonical = window.TRAVEL_CONTENT_V45 || globalThis.TRAVEL_CONTENT_V45 || {};
    const combos = canonical.convenienceStore?.combos || canonical.convenienceCombos || [];
    const comboState = _getComboState();

    const wantItems = allItems.filter(i => state[i.id]?.want);
    const boughtItems = allItems.filter(i => state[i.id]?.bought);
    const unlockedCombos = combos.filter((_, idx) => comboState[idx]?.unlocked).length;
    const stillNeed = wantItems.filter(i => !state[i.id]?.bought).length;

    const storeColors = { CU: '#00A859', GS25: '#0070BA', '7-Eleven': '#008000', Emart24: '#FFB800' };

    let html = _convBackHeader('⑥ 我的超商戰利品');

    // Summary banner
    html += `
        <div class="v45-loot-counter-card fade-scale-in" style="margin-bottom:14px;">
            <div class="v45-loot-item">
                <span class="v45-loot-num">${wantItems.length}</span>
                <span class="v45-loot-label">❤️ 想買</span>
            </div>
            <div class="v45-loot-item">
                <span class="v45-loot-num">${boughtItems.length}</span>
                <span class="v45-loot-label">✅ 已買</span>
            </div>
            <div class="v45-loot-item">
                <span class="v45-loot-num">${stillNeed}</span>
                <span class="v45-loot-label">⏳ 還缺</span>
            </div>
            <div class="v45-loot-item" onclick="exitConveniencePortal(); setTimeout(()=>enterConveniencePortal('combos'),50);" style="cursor:pointer;">
                <span class="v45-loot-num">${unlockedCombos}/${combos.length}</span>
                <span class="v45-loot-label">🍜 混搭</span>
            </div>
        </div>
    `;

    // Bought section
    html += `<div style="font-size:0.8rem; font-weight:900; color:var(--text-color); margin-bottom:8px;">✅ 已買入袋 (${boughtItems.length})</div>`;
    if (boughtItems.length === 0) {
        html += `<p style="text-align:center; color:#95a5a6; font-size:0.78rem; padding:10px 0 16px 0;">尚無已購買的商品</p>`;
    } else {
        boughtItems.forEach(item => {
            html += `
                <div class="v45-store-card bought fade-scale-in" style="padding:8px 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="v38-badge" style="background:${storeColors[item.store] || 'var(--dora)'}; margin-right:4px;">${item.store}</span>
                            <span style="font-size:0.82rem; font-weight:900; color:var(--text-color);">${item.name}</span>
                        </div>
                        <button class="v45-btn-state active-bought" onclick="toggleConvenienceItemState('${item.id}', 'bought')">
                            <i class="fa-solid fa-check-circle" style="color:#00b894;"></i> 已買
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // Want-but-not-bought section
    const pendingItems = wantItems.filter(i => !state[i.id]?.bought);
    html += `<div style="font-size:0.8rem; font-weight:900; color:var(--text-color); margin:14px 0 8px 0;">❤️ 想買未買 (${pendingItems.length})</div>`;
    if (pendingItems.length === 0) {
        html += `<p style="text-align:center; color:#95a5a6; font-size:0.78rem; padding:10px 0;">想買清單已全部買齊 🎉</p>`;
    } else {
        pendingItems.forEach(item => {
            html += `
                <div class="v45-store-card fade-scale-in" style="padding:8px 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="v38-badge" style="background:${storeColors[item.store] || 'var(--dora)'}; margin-right:4px;">${item.store}</span>
                            <span style="font-size:0.82rem; font-weight:900; color:var(--text-color);">${item.name}</span>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="v45-btn-state active-want" onclick="toggleConvenienceItemState('${item.id}', 'want')">
                                <i class="fa-solid fa-heart" style="color:#d63031;"></i> 取消
                            </button>
                            <button class="v45-btn-state" onclick="toggleConvenienceItemState('${item.id}', 'bought')">
                                <i class="fa-solid fa-circle"></i> 買了
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    list.innerHTML = html;
};









window.renderRecommendedShopping = function() {
    const list = document.getElementById('sRecList');
    if (!list) return;
    list.innerHTML = '';
    
    const hiddenIds = StorageEngine.get('hidden_rec_shop', []).data;
    const favIds = StorageEngine.get('fav_rec_shop', []).data;
    
    // Fetch from window global recommended list
    const items = window.RECOMMENDED_SHOPPING || [];
    let filtered = items.filter(item => {
        if (hiddenIds.includes(item.id)) return false;
        if (currentRecShopFilter !== 'ALL' && item.category !== currentRecShopFilter) return false;
        return true;
    });
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.8rem; font-weight:900; padding:15px 0;">無推薦商品</p>';
        return;
    }
    
    filtered.forEach(item => {
        const isFav = favIds.includes(item.id);
        list.innerHTML += `
            <div class="v38-rec-item" style="padding:10px 0; border-bottom:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="v38-badge" style="background:var(--dora);">${item.category}</span>
                    <div style="display:flex; gap:6px;">
                        <span class="v38-tag" style="background:${isFav?'rgba(255,59,85,0.05)':'rgba(0,0,0,0.02)'}; color:${isFav?'#ff3b30':'#8e8e93'}; font-size:0.65rem;">
                            <i class="fa-${isFav?'solid':'regular'} fa-heart"></i> ${isFav?'已收藏':'未收藏'}
                        </span>
                    </div>
                </div>
                <div style="font-weight:900; font-size:0.92rem; color:var(--text-color); margin-top:2px;">${item.name}</div>
                <div style="font-size:0.75rem; color:#666;">${item.desc}</div>
                <div class="v38-rec-actions">
                    <button class="v38-mini-btn" style="background:var(--primary); color:white; border:none;" onclick="addRecShopToMyList('${item.id}')">🛒 加入清單</button>
                    <button class="v38-mini-btn" onclick="toggleFavRecShopItem('${item.id}')"><i class="fa-solid fa-heart" style="color:#ff3b30;"></i> ${isFav?'取消收藏':'收藏'}</button>
                    <button class="v38-mini-btn" onclick="hideRecShopItem('${item.id}')"><i class="fa-solid fa-eye-slash"></i> 隱藏</button>
                </div>
            </div>
        `;
    });
};

window.renderGuideContent = function() {
    const list = document.getElementById('guideList');
    if (!list) return;
    list.innerHTML = '';
    
    let filtered = (window.guideData || []).filter(g => g.type === (window.currentGuideTab || '打卡景點'));
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:20px 0;">尚無自訂地標，歡迎新增！</p>';
        return;
    }
    
    filtered.forEach(g => {
        let imgHtml = g.img ? `<img src="${g.img}" class="guide-img" onclick="openLightbox('${g.img}', '${g.key}')">` : '';
        let mapBtn = g.link ? `<a href="${g.link}" target="_blank" class="map-tag" style="margin-top:6px;"><i class="fa-solid fa-map-location-dot"></i> 一鍵導航</a>` : '';
        list.innerHTML += `
            <div class="guide-card card fade-scale-in">
                ${imgHtml}
                <div style="padding:15px; position:relative;">
                    <button class="btn-delete" onclick="deleteGuide('${g.key}')" style="position:absolute; top:12px; right:12px;"><i class="fa-solid fa-trash"></i></button>
                    <h4 style="margin:0 0 6px 0; font-size:1.1rem; color:var(--text-color); font-weight:900;">${g.title}</h4>
                    <p style="margin:0; font-size:0.85rem; color:#555; line-height:1.4;">${g.desc}</p>
                    ${mapBtn}
                </div>
            </div>
        `;
    });
};

window.renderRecommendedFood = function() {
    const list = document.getElementById('foodRecList');
    if (!list) return;
    list.innerHTML = '';
    
    const favIds = StorageEngine.get('fav_rec_food', []).data;
    const eatenIds = StorageEngine.get('eaten_rec_food', []).data;
    const items = window.RECOMMENDED_FOOD || [];
    
    items.forEach(item => {
        const isFav = favIds.includes(item.id);
        const isEaten = eatenIds.includes(item.id);
        list.innerHTML += `
            <div class="v38-rec-item card fade-scale-in" style="background:var(--card-bg); border-radius:16px; padding:12px; margin-bottom:8px; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="v38-badge" style="background:var(--accent);">${item.category}</span>
                    <div style="display:flex; gap:6px;">
                        ${isEaten ? '<span class="v38-tag" style="background:#eafaf1; color:#2ecc71; font-size:0.65rem;"><i class="fa-solid fa-circle-check"></i> 已吃過</span>' : ''}
                        <span class="v38-tag" style="background:${isFav?'rgba(255,59,85,0.05)':'rgba(0,0,0,0.02)'}; color:${isFav?'#ff3b30':'#8e8e93'}; font-size:0.65rem;">
                            <i class="fa-${isFav?'solid':'regular'} fa-heart"></i> ${isFav?'已收藏':'未收藏'}
                        </span>
                    </div>
                </div>
                <div style="font-weight:900; font-size:0.92rem; color:var(--text-color); margin-top:2px;">${item.name}</div>
                <div style="font-size:0.75rem; color:#555;">${item.desc}</div>
                <div class="v38-rec-actions">
                    <button class="v38-mini-btn" onclick="toggleFavRecFoodItem('${item.id}')"><i class="fa-solid fa-heart" style="color:#ff3b30;"></i> ${isFav?'取消收藏':'收藏'}</button>
                    <button class="v38-mini-btn" onclick="toggleEatenRecFoodItem('${item.id}')"><i class="fa-solid fa-utensils" style="color:#2ecc71;"></i> ${isEaten?'標記未吃':'標記吃過'}</button>
                    <button class="v38-mini-btn" style="background:var(--primary); color:white; border:none;" onclick="addRecFoodToItinerary('${item.id}')"><i class="fa-solid fa-plus"></i> 加入行程</button>
                </div>
            </div>
        `;
    });
};

window.renderBills = function() {
    const list = document.getElementById('billList');
    if (!list) return;
    list.innerHTML = '';
    
    const ctx = typeof getTripContext === 'function' ? getTripContext() : {};
    const totalShared = (ctx.budget && ctx.budget.totalSharedTWD) ? ctx.budget.totalSharedTWD : 0;
    const filtered = window.sharedBills || [];
    
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無公費記帳紀錄</p>';
    } else {
        filtered.forEach(b => {
            const isSettled = b.settled ? 'style="opacity:0.5;"' : '';
            const settleStatus = b.settled ? '<span class="v38-badge" style="background:#27ae60;">已結清</span>' : '<span class="v38-badge" style="background:#f39c12;">未結</span>';
            const receiptHtml = b.receipt ? `<img src="${b.receipt}" class="item-img" onclick="openLightbox('${b.receipt}', '${b.key}')">` : '';
            
            let amtStr = safePrice(b.amt, b.currency);
            if (b.currency === 'KRW') {
                amtStr += ` (≈ $${Math.round(b.amt * liveKrwToTwd)} TWD)`;
            }
            
            list.innerHTML += `
                <div class="shop-item" ${isSettled}>
                    <div style="font-size:1.2rem; margin-right:12px;">💸</div>
                    ${receiptHtml}
                    <div style="flex:1;">
                        <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                            <span class="cat-tag" style="background:var(--primary);">${b.payer === 'user1' ? '溫' : '鴨'} 付款</span>
                            ${settleStatus}
                        </div>
                        <div style="font-weight:900; font-size:1.02rem; color:var(--text-color);">${b.name}</div>
                        <div style="font-size:0.82rem; font-weight:900; color:var(--primary); margin-top:2px;">${amtStr}</div>
                    </div>
                    <button class="btn-delete" onclick="deleteSharedBill('${b.key}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        });
    }
    
    const sharedSumEl = document.getElementById('sharedBillsSum');
    if (sharedSumEl) sharedSumEl.innerText = `$${Math.round(totalShared).toLocaleString()} TWD`;
    
    // Auto settle logic outputs
    if (typeof renderPrivateBill === 'function') renderPrivateBill();
};

window.renderPrivateBill = function() {
    const list = document.getElementById('pbList');
    if (!list) return;
    list.innerHTML = '';
    
    const ctx = typeof getTripContext === 'function' ? getTripContext() : {};
    const totalPrivate = (ctx.budget && ctx.budget.totalPrivateTWD) ? ctx.budget.totalPrivateTWD : 0;
    
    if ((window.privateBills || []).length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無個人私帳記帳紀錄</p>';
    } else {
        (window.privateBills || []).forEach(b => {
            const receiptHtml = b.receipt ? `<img src="${b.receipt}" class="item-img" onclick="openLightbox('${b.receipt}', b.id)">` : '';
            let amtStr = safePrice(b.amt, b.currency);
            if (b.currency === 'KRW') {
                amtStr += ` (≈ $${Math.round(b.amt * liveKrwToTwd)} TWD)`;
            }
            
            list.innerHTML += `
                <div class="shop-item">
                    <div style="font-size:1.2rem; margin-right:12px;">🔒</div>
                    ${receiptHtml}
                    <div style="flex:1;">
                        <span class="cat-tag" style="background:var(--dora);">${b.payer === 'user1' ? '溫' : '鴨'} 私帳</span>
                        <div style="font-weight:900; font-size:1.02rem; color:var(--text-color);">${b.name}</div>
                        <div style="font-size:0.82rem; font-weight:900; color:var(--dora); margin-top:2px;">${amtStr}</div>
                    </div>
                    <button class="btn-delete" onclick="deletePrivateBill('${b.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        });
    }
    
    const privSumEl = document.getElementById('privateBillsSum');
    if (privSumEl) privSumEl.innerText = `$${Math.round(totalPrivate).toLocaleString()} TWD`;
};

window.renderVoiceList = function() {
    const list = document.getElementById('voiceGridUI');
    if (!list) return;
    list.innerHTML = '';
    
    let displayList = window.voiceData || [];
    if (displayList.length === 0) {
        const localData = StorageEngine.get('busan_v36_voice');
        if (localData && localData.success && Array.isArray(localData.data) && localData.data.length > 0) {
            displayList = localData.data;
            window.voiceData = displayList;
        }
    }
    
    if (displayList.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無常用韓語發音紀錄</p>';
        return;
    }
    
    const esc = s => String(s || '').replace(/'/g, "\\'");
    displayList.forEach(v => {
        const twText = v.tw ?? v.title ?? '';
        const krText = v.kr ?? v.korean ?? '';
        const icon = v.icon ? (v.icon.startsWith('fa-') ? v.icon : `fa-${v.icon}`) : 'fa-ear-listen';
        const roman = v.roman || '';
        const audio = v.audio || '';
        list.innerHTML += `
            <div class="voice-card card" onclick="event.stopPropagation(); openCardLightbox('${esc(twText)}', '${esc(krText)}', '${esc(roman)}', '${esc(audio)}')">
                <button class="del-voice" onclick="event.stopPropagation(); deleteVoice('${v.key}')"><i class="fa-solid fa-xmark"></i></button>
                <i class="fa-solid ${icon}"></i>
                <span>${twText}</span>
                <b>${krText}</b>
            </div>
        `;
    });
};

window.renderPrepList = function() {
    const list = document.getElementById('prepListUI');
    const listTrip = document.getElementById('prepListUI_trip');
    if (!list && !listTrip) return;
    
    let displayList = window.prepData || [];
    if (displayList.length === 0) {
        const localData = StorageEngine.get('busan_v36_prepData');
        if (localData && localData.success && Array.isArray(localData.data) && localData.data.length > 0) {
            displayList = localData.data;
            window.prepData = displayList;
        }
    }
    
    const renderHtml = (items) => {
        if (items.length === 0) {
            return '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無準備清單項目</p>';
        }
        let html = '';
        items.forEach(p => {
            const isDone = p.done ? 'done' : '';
            const linkIcon = p.link ? `<a href="${p.link}" target="_blank" class="prep-link" onclick="event.stopPropagation()"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : '';
            html += `
                <div class="prep-item ${isDone}" onclick="togglePrep('${p.key}', ${p.done})">
                    <div class="prep-check"><i class="fa-solid fa-check"></i></div>
                    <div class="prep-text">${p.text}</div>
                    ${linkIcon}
                    <button class="btn-delete" onclick="event.stopPropagation(); deletePrep('${p.key}')" style="padding: 4px 8px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        });
        return html;
    };

    const finalHtml = renderHtml(displayList);
    if (list) list.innerHTML = finalHtml;
    if (listTrip) listTrip.innerHTML = finalHtml;
};




window.filterRecShop = function(cat, btn) {
    currentRecShopFilter = cat;
    document.querySelectorAll('#shopRecFilterUI .day-tab').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    renderRecommendedShopping();
};

window.addRecShopToMyList = async function(id) {
    const items = window.RECOMMENDED_SHOPPING || [];
    const item = items.find(x => x.id === id);
    if(!item) return;
    try {
        await NetworkEngine.firebasePush(window.DB_SHOP, {
            category: item.category.includes('CU') ? '伴手禮' : (item.category.includes('Olive') ? '彩妝' : '其他'),
            text: item.name,
            where: item.category,
            img: '',
            checked: false,
            owner: deviceOwner
        });
        showToast(`🛒 已加入清單: ${item.name}`, "success");
    } catch (e) {
        showToast("同步失敗", "error");
    }
};

window.hideRecShopItem = function(id) {
    let hidden = StorageEngine.get('hidden_rec_shop', []).data;
    if(!hidden.includes(id)) {
        hidden.push(id);
        StorageEngine.set('hidden_rec_shop', hidden);
        renderRecommendedShopping();
        showToast("已隱藏該推薦", "info");
    }
};

window.toggleFavRecShopItem = function(id) {
    let fav = StorageEngine.get('fav_rec_shop', []).data;
    const idx = fav.indexOf(id);
    if(idx !== -1) {
        fav.splice(idx, 1);
        showToast("已取消收藏", "info");
    } else {
        fav.push(id);
        showToast("❤ 已加入購物收藏", "success");
    }
    StorageEngine.set('fav_rec_shop', fav);
    renderRecommendedShopping();
    triggerContextUpdate();
};

window.setFoodTabMode = function(mode) {
    currentFoodSubTab = mode;
    const btnMy = document.getElementById('btnFoodMy');
    const btnRec = document.getElementById('btnFoodRec');
    const myCont = document.getElementById('guideList');
    const recCont = document.getElementById('foodRecList');
    const addCard = document.getElementById('addGuideCard');
    
    if (mode === 'my') {
        if(btnMy) btnMy.classList.add('active');
        if(btnRec) btnRec.classList.remove('active');
        if(myCont) myCont.style.display = 'block';
        if(recCont) recCont.style.display = 'none';
        if(addCard) addCard.style.display = 'block';
    } else {
        if(btnMy) btnMy.classList.remove('active');
        if(btnRec) btnRec.classList.add('active');
        if(myCont) myCont.style.display = 'none';
        if(recCont) recCont.style.display = 'block';
        if(addCard) addCard.style.display = 'none';
        renderRecommendedFood();
    }
};

window.toggleFavRecFoodItem = function(id) {
    let fav = StorageEngine.get('fav_rec_food', []).data;
    const idx = fav.indexOf(id);
    if(idx !== -1) {
        fav.splice(idx, 1);
        showToast("已取消收藏", "info");
    } else {
        fav.push(id);
        showToast("❤ 已加入美食收藏", "success");
    }
    StorageEngine.set('fav_rec_food', fav);
    renderRecommendedFood();
    triggerContextUpdate();
};

window.toggleEatenRecFoodItem = function(id) {
    let eaten = StorageEngine.get('eaten_rec_food', []).data;
    const idx = eaten.indexOf(id);
    if(idx !== -1) {
        eaten.splice(idx, 1);
        showToast("已標記為未吃過", "info");
    } else {
        eaten.push(id);
        showToast("👍 標記吃過！大飽口福！", "success");
    }
    StorageEngine.set('eaten_rec_food', eaten);
    renderRecommendedFood();
};

window.addRecFoodToItinerary = async function(id) {
    const items = window.RECOMMENDED_FOOD || [];
    const item = items.find(x => x.id === id);
    if(!item) return;
    try {
        await NetworkEngine.firebasePush(window.DB_ITI, {
            day: getV37SelectedDate(),
            time: "12:00",
            tr: "步行",
            desc: `🍴 吃美食：${item.name} (${item.desc})`,
            map: ""
        });
        showToast(`📅 已加至今日行程: ${item.name}`, "success");
    } catch (e) {
        showToast("同步失敗", "error");
    }
};

window.saveV38TravelReview = function() {
    const txt = document.getElementById('v38ReviewText');
    if(!txt) return;
    showToast("⏳ 心得日記同步中...", "info");
    NetworkEngine.firebaseWrite(window.DB_REVIEW, txt.value).then(() => {
        showToast("💾 心得已同步至雲端！", "success");
    }).catch(err => {
        showToast("同步失敗: " + err.message, "error");
    });
};

window.selectGuideSubTab = function(btn, tab) {
    document.querySelectorAll('#guideSubTabs .day-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterGuideContent(tab);
};

window.openGuideFolder = function(folderName) {
    const dash = document.getElementById('guideDashboard');
    const detail = document.getElementById('guideDetail');
    const fab = document.getElementById('fabBack');
    if (dash) dash.style.display = 'none';
    if (detail) detail.style.display = 'block';
    if (fab) fab.style.display = 'flex';

    if (folderName === '工具') {
        const tool = document.getElementById('toolSection');
        const guide = document.getElementById('guideSection');
        const subtabs = document.getElementById('guideSubTabs');
        if (tool) tool.style.display = 'block';
        if (guide) guide.style.display = 'none';
        if (subtabs) subtabs.style.display = 'none';
    } else {
        const tool = document.getElementById('toolSection');
        const guide = document.getElementById('guideSection');
        const tabsContainer = document.getElementById('guideSubTabs');
        if (tool) tool.style.display = 'none';
        if (guide) guide.style.display = 'block';
        if (tabsContainer) {
            tabsContainer.style.display = 'flex';
            tabsContainer.innerHTML = '';
            if (window.folderMapping && window.folderMapping[folderName]) {
                window.folderMapping[folderName].forEach((tab, index) => {
                    let btn = document.createElement('button');
                    btn.className = `day-tab ${index === 0 ? 'active' : ''}`;
                    btn.innerText = tab;
                    btn.setAttribute('onclick', `selectGuideSubTab(this, '${tab}')`);
                    tabsContainer.appendChild(btn);
                });
                filterGuideContent(window.folderMapping[folderName][0]);
            }
        }
    }
};

window.closeGuideFolder = function() {
    const dash = document.getElementById('guideDashboard');
    const detail = document.getElementById('guideDetail');
    const fab = document.getElementById('fabBack');
    if (dash) dash.style.display = 'block';
    if (detail) detail.style.display = 'none';
    if (fab) fab.style.display = 'none';
};
