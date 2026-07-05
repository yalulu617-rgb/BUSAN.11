// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: UI Components & DOM Renderers
// ─────────────────────────────────────────────────────────────────────────

// ── Helper: Smart Alert Message (called by renderV37HomeDashboard) ──
window.getSmartAlertMessage = function(ctx) {
    if (!ctx) return '載入中...';
    if (ctx.tripMode === 'before') {
        const uncomp = ctx.uncompletedPreps || [];
        if (uncomp.length === 0) return '✅ 所有行前準備已完成！';
        return `📋 待辦：${uncomp[0].text}`;
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

    await NetworkEngine.firebasePush(DB_SHOP, {
        text,
        where    : whereEl?.value?.trim()  || '',
        category : categoryEl?.value       || '其他',
        img      : imgEl?.value            || '',
        checked  : false,
        owner    : window.deviceOwner,
        ts       : Date.now()
    });
    if (textEl)  textEl.value  = '';
    if (whereEl) whereEl.value = '';
    if (imgEl)   imgEl.value   = '';
    showToast('✅ 已加入購物清單', 'success');
};

window.toggleShop = async function (key, currentChecked) {
    await NetworkEngine.firebaseUpdate(`${DB_SHOP}/${key}`, { checked: !currentChecked });
};

window.deleteShop = async function (key) {
    if (!confirm('確認刪除此購物項目？')) return;
    await NetworkEngine.firebaseRemove(`${DB_SHOP}/${key}`);
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

    await NetworkEngine.firebasePush(DB_GUIDE, {
        type  : typeEl?.value  || '打卡景點',
        title,
        desc  : descEl?.value?.trim() || '',
        link  : linkEl?.value?.trim() || '',
        img   : imgEl?.value          || '',
        ts    : Date.now()
    });
    if (titleEl) titleEl.value = '';
    if (descEl)  descEl.value  = '';
    if (linkEl)  linkEl.value  = '';
    if (imgEl)   imgEl.value   = '';
    showToast('✅ 地標已同步至雲端', 'success');
};

window.deleteGuide = async function (key) {
    if (!confirm('確認刪除此地標？')) return;
    await NetworkEngine.firebaseRemove(`${DB_GUIDE}/${key}`);
};

// ── Voice Card CRUD (lives here — tightly coupled to renderVoiceList) ──────
window.addVoiceCard = async function () {
    const twEl = document.getElementById('newCardTw');
    const krEl = document.getElementById('newCardKr');
    const tw   = twEl?.value?.trim();
    const kr   = krEl?.value?.trim();
    if (!tw || !kr) { showToast('請填入中文與韓文', 'warning'); return; }
    await NetworkEngine.firebasePush(DB_VOICE, { title: tw, korean: kr, roman: '', ts: Date.now() });
    if (twEl) twEl.value = '';
    if (krEl) krEl.value = '';
    showToast('✅ 字卡已新增', 'success');
};

window.deleteVoice = async function (key) {
    if (!confirm('確認刪除此字卡？')) return;
    await NetworkEngine.firebaseRemove(`${DB_VOICE}/${key}`);
};

// ── Prep CRUD (lives here — tightly coupled to renderPrepList) ────────────
window.togglePrep = async function (key, currentDone) {
    await NetworkEngine.firebaseUpdate(`${DB_PREP}/${key}`, { done: !currentDone });
    triggerContextUpdate();
};

window.deletePrep = async function (key) {
    if (!confirm('確認刪除此準備事項？')) return;
    await NetworkEngine.firebaseRemove(`${DB_PREP}/${key}`);
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
    
    let heroHtml = `
        <div class="v38-hero-card fade-scale-in" onclick="showV37Tab('trip')" style="background: linear-gradient(135deg, #1e272e, #2f3640);">
            <div class="v38-hero-title">DAY — 尚未出發</div>
            <div class="v38-hero-main">出發：${countdownDays} 天</div>
            <div class="v38-hero-sub">目的地：🇰🇷 ${city.nameTW}</div>
            <div style="margin-top: 8px; font-size: 0.8rem; font-weight: 800; color: #f5cd79;" class="text-truncate">${smartAlert}</div>
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
    
    let heroHtml = `
        <div class="v38-hero-card fade-scale-in" onclick="showV37Tab('itinerary')" style="background: linear-gradient(135deg, #1e272e, #353b48);">
            <div class="v38-hero-title">${dayNum} | 🇰🇷 ${city.nameTW}</div>
            <div class="v38-hero-main" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="text-truncate" style="max-width:180px;">${nextAttr}</span>
                <span style="font-size:1.3rem; color:#4cd964;">${weather.temp}°C</span>
            </div>
            <div class="v38-hero-sub" style="margin-top:4px;"><i class="fa-solid fa-map-pin"></i> ${nextTimeStr ? nextTimeStr + ' 出發' : ''}</div>
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
        <div class="v38-hero-card fade-scale-in" onclick="showV37Tab('split')" style="background: linear-gradient(135deg, #1e272e, #2d3436);">
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

window.renderQuickActions = function() {
    return `
        <div class="v38-widget-card card fade-scale-in" style="grid-column: span 2;">
            <div class="v38-widget-title"><i class="fa-solid fa-star"></i> 快速功能</div>
            <div class="v38-quick-actions">
                <button class="v38-action-btn" onclick="showV37Tab('itinerary')">
                    <i class="fa-solid fa-calendar-days" style="color: #007aff;"></i>
                    <span>行程</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('wallet')">
                    <i class="fa-solid fa-wallet" style="color: #ff9500;"></i>
                    <span>Wallet</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('split')">
                    <i class="fa-solid fa-calculator" style="color: #4cd964;"></i>
                    <span>記帳</span>
                </button>
                <button class="v38-action-btn" onclick="showV37Tab('shop')">
                    <i class="fa-solid fa-cart-shopping" style="color: #ff2d55;"></i>
                    <span>購物</span>
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
    let simulatorHtml = renderDateSimulator(v37SimulatedDate, city);
    
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
    
    container.innerHTML = simulatorHtml + heroHtml + `
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

window.renderShop = function() {
    const list = document.getElementById('sList');
    if (!list) return;
    list.innerHTML = '';
    
    let filtered = shopList.filter(s => s.owner === currentShopOwner);
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
    
    let filtered = guideData.filter(g => g.type === currentGuideTab);
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
    const filtered = sharedBills;
    
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
    renderPrivateBill();
};

window.renderPrivateBill = function() {
    const list = document.getElementById('pbList');
    if (!list) return;
    list.innerHTML = '';
    
    const ctx = typeof getTripContext === 'function' ? getTripContext() : {};
    const totalPrivate = (ctx.budget && ctx.budget.totalPrivateTWD) ? ctx.budget.totalPrivateTWD : 0;
    
    if (privateBills.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無個人私帳記帳紀錄</p>';
    } else {
        privateBills.forEach(b => {
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
    
    if (voiceData.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無常用韓語發音紀錄</p>';
        return;
    }
    
    voiceData.forEach(v => {
        list.innerHTML += `
            <div class="voice-card card" onclick="openCardLightbox('${v.title}', '${v.korean}', '${v.roman}', '${v.audio || ''}')">
                <button class="del-voice" onclick="event.stopPropagation(); deleteVoice('${v.key}')"><i class="fa-solid fa-xmark"></i></button>
                <i class="fa-solid fa-ear-listen"></i>
                <span>${v.title}</span>
                <b>${v.korean}</b>
            </div>
        `;
    });
};

window.renderPrepList = function() {
    const list = document.getElementById('prepListUI');
    if (!list) return;
    list.innerHTML = '';
    
    if (prepData.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">尚無準備清單項目</p>';
        return;
    }
    
    prepData.forEach(p => {
        const isDone = p.done ? 'done' : '';
        const linkIcon = p.link ? `<a href="${p.link}" target="_blank" class="prep-link" onclick="event.stopPropagation()"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : '';
        
        list.innerHTML += `
            <div class="prep-item ${isDone}" onclick="togglePrep('${p.key}', ${p.done})">
                <div class="prep-check"><i class="fa-solid fa-check"></i></div>
                <div class="prep-text">${p.text}</div>
                ${linkIcon}
                <button class="btn-delete" onclick="event.stopPropagation(); deletePrep('${p.key}')" style="padding: 4px 8px;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
};

window.setShopTabMode = function(mode) {
    currentShopSubTab = mode;
    const btnMy = document.getElementById('btnShopMy');
    const btnRec = document.getElementById('btnShopRec');
    const myCont = document.getElementById('shopMyContainer');
    const recCont = document.getElementById('shopRecContainer');
    const cardTitle = document.getElementById('shopCardTitle');
    
    if (mode === 'my') {
        if(btnMy) btnMy.classList.add('active');
        if(btnRec) btnRec.classList.remove('active');
        if(myCont) myCont.style.display = 'block';
        if(recCont) recCont.style.display = 'none';
        if(cardTitle) cardTitle.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> 個人購物清單';
    } else {
        if(btnMy) btnMy.classList.remove('active');
        if(btnRec) btnRec.classList.add('active');
        if(myCont) myCont.style.display = 'none';
        if(recCont) recCont.style.display = 'block';
        if(cardTitle) cardTitle.innerHTML = '<i class="fa-solid fa-fire"></i> 熱門指南推薦';
        renderRecommendedShopping();
    }
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
    document.getElementById('guideDashboard').style.display = 'none';
    document.getElementById('guideDetail').style.display = 'block';
    if(folderName === '工具') {
        document.getElementById('toolSection').style.display = 'block'; 
        document.getElementById('guideSection').style.display = 'none'; 
        document.getElementById('guideSubTabs').style.display = 'none';
    } else {
        document.getElementById('toolSection').style.display = 'none'; 
        document.getElementById('guideSection').style.display = 'block'; 
        document.getElementById('guideSubTabs').style.display = 'flex';
        const tabsContainer = document.getElementById('guideSubTabs'); 
        tabsContainer.innerHTML = '';
        folderMapping[folderName].forEach((tab, index) => {
            let btn = document.createElement('button'); 
            btn.className = `day-tab ${index === 0 ? 'active' : ''}`; 
            btn.innerText = tab;
            btn.setAttribute('onclick', `selectGuideSubTab(this, '${tab}')`);
            tabsContainer.appendChild(btn);
        });
        filterGuideContent(folderMapping[folderName][0]);
    }
};

window.closeGuideFolder = function() {
    document.getElementById('guideDashboard').style.display = 'block';
    document.getElementById('guideDetail').style.display = 'none';
};
