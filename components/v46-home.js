// V46 presentation-only home. All data is supplied by TripContext's v46Home model.
(function (target) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const btn = (label, emoji, onclick, sub = '') =>
    '<button type="button" class="v46-shortcut" onclick="' + onclick + '">' +
    '<span class="v46-shortcut-emoji" aria-hidden="true">' + emoji + '</span>' +
    '<strong>' + esc(label) + '</strong>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
  const phaseButton = (id, title, mode, current) =>
    '<button type="button" class="v46-phase' + (mode === id ? ' is-current' : '') +
    '" aria-pressed="' + String(mode === id) + '" onclick="setV46HomePreview(\'' + id +
    '\')">' + title + '</button>';
  // Phase art is decorative; the real hero actions remain keyboard-operable buttons.
  const scene = '<svg class="v46-coast-scene" viewBox="0 0 420 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
    '<defs><linearGradient id="v46-sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f8dfa9"/><stop offset=".6" stop-color="#bfdfe6"/><stop offset="1" stop-color="#77b5c3"/></linearGradient></defs>' +
    '<rect width="420" height="240" fill="url(#v46-sky)"/><circle cx="316" cy="55" r="35" fill="#fff0bd"/>' +
    '<path d="M0 138Q60 121 109 138T220 133T420 127V240H0Z" fill="#a8c3ba"/>' +
    '<path d="M0 161Q42 145 83 160T177 158T277 159T420 153V240H0Z" fill="#78b4c7"/>' +
    '<path d="M0 185Q44 173 96 185T190 185T290 180T420 185" stroke="#f7f5dd" stroke-width="5" fill="none"/>' +
    '<path d="M24 145V112M167 145V104M24 112Q97 84 167 104M23 125H170" fill="none" stroke="#557986" stroke-width="3"/>' +
    '<g stroke="#57798a" stroke-width="2"><rect x="234" y="104" width="125" height="98" rx="25" fill="#f9cb7e"/>' +
    '<rect x="251" y="116" width="91" height="57" rx="12" fill="#d7f4f5"/><path d="M297 116v58"/>' +
    '<circle cx="297" cy="187" r="6" fill="#f49c87"/></g></svg>';
  const phaseArt = mode => mode === 'during' ? scene :
    mode === 'after' ? '<div class="v46-polaroid-art" aria-hidden="true"><span>🌉</span><span>🏯</span><span>🌊</span></div>' :
    '<div class="v46-flight-art" aria-hidden="true"><span>✈️</span><span>🍁</span><span>🧳</span></div>';
  // Hand-rendered reusable travel mascot: the three phases use distinct props.
  const mascotArt = mode => {
    const accessory = mode === 'after'
      ? '<rect x="154" y="173" width="64" height="44" rx="9" fill="#49758d" stroke="#34586c" stroke-width="4"/><circle cx="184" cy="194" r="14" fill="#e8eff0" stroke="#fffbf2" stroke-width="4"/><circle cx="205" cy="181" r="4" fill="#ffdb8f"/>'
      : mode === 'during'
        ? '<rect x="155" y="164" width="82" height="75" rx="14" fill="#ffca7c" stroke="#41647a" stroke-width="4"/><rect x="163" y="177" width="67" height="40" rx="6" fill="#b7dfe8"/>'
        : '<rect x="181" y="169" width="48" height="78" rx="10" fill="#7eb6d2" stroke="#446e81" stroke-width="4"/><rect x="194" y="157" width="23" height="12" rx="4" fill="none" stroke="#446e81" stroke-width="4"/>';
    return '<svg class="v46-mascot-art" viewBox="0 0 260 270" aria-hidden="true">' +
      '<defs><filter id="v46-watercolor"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="8" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="1.3"/></filter></defs>' +
      '<g filter="url(#v46-watercolor)" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="125" cy="223" rx="65" ry="38" fill="#4ea8d4" stroke="#345e78" stroke-width="5"/>' +
      '<ellipse cx="123" cy="223" rx="40" ry="35" fill="#fff9ed"/>' +
      '<ellipse cx="75" cy="246" rx="30" ry="13" fill="#fefbf3" stroke="#345e78" stroke-width="3"/>' +
      '<ellipse cx="169" cy="246" rx="30" ry="13" fill="#fefbf3" stroke="#345e78" stroke-width="3"/>' +
      accessory +
      '<circle cx="127" cy="125" r="92" fill="#4eacd8" stroke="#345e78" stroke-width="5"/>' +
      '<ellipse cx="127" cy="143" rx="77" ry="70" fill="#fffcf5" stroke="#345e78" stroke-width="3"/>' +
      '<ellipse cx="107" cy="93" rx="23" ry="34" fill="#fffdf6" stroke="#345e78" stroke-width="3"/>' +
      '<ellipse cx="148" cy="93" rx="23" ry="34" fill="#fffdf6" stroke="#345e78" stroke-width="3"/>' +
      '<ellipse cx="118" cy="101" rx="5" ry="8" fill="#2c4a60"/><ellipse cx="139" cy="101" rx="5" ry="8" fill="#2c4a60"/>' +
      '<circle cx="128" cy="124" r="13" fill="#dc5454" stroke="#ba474f" stroke-width="2"/><circle cx="124" cy="120" r="4" fill="#fff5ee"/>' +
      '<path d="M128 137v24M93 153q34 35 69 0" fill="none" stroke="#3b6175" stroke-width="3"/>' +
      '<path d="M93 155q35 40 71 0q-35 42-71 0" fill="#d65557" stroke="#3b6175" stroke-width="3"/>' +
      '<path d="M55 139l40 8M52 158h41M58 174l37-15M163 147l39-9M164 158h43M162 159l42 16" stroke="#446a79" stroke-width="3"/>' +
      '<path d="M65 79q-7-46 62-62q74 1 69 54" fill="#f6d99a" stroke="#a37a4d" stroke-width="4"/>' +
      '<ellipse cx="126" cy="76" rx="100" ry="18" fill="#f8d99d" stroke="#a37a4d" stroke-width="3"/>' +
      '<path d="M89 46q41-24 82-2" fill="none" stroke="#6b9db9" stroke-width="8"/>' +
      '<path d="M81 199q45-13 90 1" stroke="#d7585d" stroke-width="9"/><circle cx="127" cy="203" r="9" fill="#f5cb6c" stroke="#a87f31" stroke-width="2"/>' +
      '</g></svg>';
  };

  const hero = (model, title, subtitle, action, actionLabel, slot) =>
    '<section id="liveTravelCard" class="v46-hero v38-hero-card hero-card card fade-scale-in">' +
    phaseArt(model.mode) + '<div class="v46-hero-copy">' +
    '<p class="v46-eyebrow">BUSAN × GYEONGJU · TRAVEL DIARY</p>' +
    '<h2>' + esc(title) + '</h2><p class="v46-hero-subtitle">' + esc(subtitle) + '</p>' +
    slot + '<button type="button" class="v46-hero-link home-nav-button" aria-label="開啟' +
    esc(actionLabel) + '" onclick="' + action + '">' + esc(actionLabel) +
    ' ›</button></div>' +
    '<div class="v46-watercolor-illustration v46-watercolor-' + model.mode +
    '" role="img" aria-label="' + esc(model.mode === 'before' ? '哆啦A夢與旅伴整理行李準備出發' :
    model.mode === 'during' ? '哆啦A夢和朋友在釜山海岸列車旅行' :
    '哆啦A夢與旅伴用相機回顧釜山旅程') + '"></div></section>';
  const phases = model => '<nav class="v46-phase-nav" aria-label="旅行階段">' +
    phaseButton('before', '🧳 出發前', model.mode) +
    phaseButton('during', '🚞 旅途中', model.mode) +
    phaseButton('after', '📸 回憶錄', model.mode) +
    (model.previewMode !== 'auto' ? '<button class="v46-auto" type="button" onclick="setV46HomePreview(\'auto\')">↩ 回到自動</button>' : '') +
    '</nav>';
  const status = (text, detail) => '<p class="v46-state">' + esc(text) + (detail ? ' · ' + esc(detail) : '') + '</p>';
  function before(model) {
    const reminders = model.reminders.slice(0, 3).map(r =>
      '<article class="v46-reminder"><span class="v46-reminder-dot" aria-hidden="true">●</span>' +
      '<div><strong>' + esc(r.title) + '</strong><small>' + esc(r.detail) + '</small>' +
      '<span class="v46-status">' + esc(r.status) + '</span></div>' +
      '<button type="button" onclick="' + (r.action === 'ticket' ? "openWalletSection('ticket')" : 'openPreTripPrep()') +
      '" aria-label="查看' + esc(r.title) + '">查看 ›</button></article>').join('');
    const progress = model.packing.total > 0 ?
      '已完成 ' + model.packing.done + '/' + model.packing.total + ' 項' : '還沒有建立打包項目';
    const heroPart = '<div class="v46-countdown"><small>距離出發還有</small><span>D-' + model.countdown +
      '</span><small>2026.11.13（五）出發 ✈</small></div>' +
      '<p class="v46-flight">✈ 11/13 · BX572 · 13:25 桃園 → 17:00 釜山</p>';
    const weather = model.weather;
    const weatherLabel = weather ?
      esc(weather.city) + '目前｜' + weather.temp + '°C｜' + esc(weather.condition) :
      '即時天氣暫時無法更新';
    const updatedLabel = weather && weather.updatedAt && !Number.isNaN(new Date(weather.updatedAt).getTime())
      ? ' 更新：' + new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(new Date(weather.updatedAt)) : '';
    return hero(model, '釜山 × 慶州', '我們的秋日旅行｜2026.11.13 – 11.17',
      'openPreTripPrep()', '行前準備', heroPart) +
      '<section class="v46-panel card v46-entry-status" aria-label="入境申報狀態">' +
      '<p>🪪 K-ETA：' + esc(model.entryKeta) + '</p>' +
      '<p>📝 e-Arrival Card：依適用資格與抵達前 3 天窗口辦理</p>' +
      '<p>🔄 Q-CODE：Q4出發前RECHECK（依 KDCA 條件）</p></section>' +
      '<section class="v46-panel card" aria-label="出發前天氣與預報">' +
      '<h3>🌤️ 天氣・楓況</h3><div class="v45-home-weather-box"><strong>' + weatherLabel +
      '</strong><span>' + updatedLabel + '</span><p>📅 11/13~11/17 氣候預報：出發前 7–10 天提供詳細預報</p></div>' +
      '<button type="button" class="v46-text-link" onclick="toggleHomeWeatherDetail()">查看詳細天氣 ›</button></section>' +
      '<section class="v46-panel card" aria-labelledby="v46-reminder-title"><h3 id="v46-reminder-title">🔔 出發前別忘記</h3>' +
      '<p class="v46-muted">優先顯示需要確認的事項；靜態資料不等於真實訂單。</p>' +
      (reminders || status('沒有待核對的重要事項')) +
      '<button type="button" class="v46-text-link" onclick="openPreTripPrep()">查看行前準備 ›</button></section>' +
      '<section class="v46-panel" aria-label="出發前必做"><h3>出發前必做</h3><div class="v46-shortcuts">' +
      btn('入境登錄', '🪪', 'openPreTripPrep()', '護照・申報') +
      btn('票券・預約', '🎟️', "openWalletSection('ticket')", '搶票・憑證') +
      btn('行李準備', '🧳', 'openPreTripPrep()', '打包清單') +
      btn('支付・通訊', '💳', 'openPreTripPrep()', 'WOWPASS・SIM') + '</div></section>' +
      '<section class="v46-panel card"><h3>🧳 我的行李準備進度</h3><p class="v46-progress-label">' + esc(progress) + '</p>' +
      '<progress max="' + Math.max(1, model.packing.total) + '" value="' + model.packing.done +
      '" aria-label="行李準備進度"></progress><button type="button" class="v46-text-link" onclick="openPreTripPrep()">查看完整清單 ›</button></section>';
  }

  // Decorative watercolor railway. Real day buttons stay accessible and editable.
  const trainCar = '<svg class="v46-train-art" viewBox="0 0 112 74" aria-hidden="true">' +
    '<path d="M13 48V26Q13 13 30 13H81Q96 13 96 28V54Q94 61 83 61H25Q13 59 13 48" fill="#fac87b" stroke="#385e76" stroke-width="3"/>' +
    '<path d="M24 17H83Q91 18 91 29V44H20V28Q20 19 24 17" fill="#b9e6ef" stroke="#4a778f" stroke-width="2"/>' +
    '<path d="M55 17V44M19 48H94" stroke="#52778e" stroke-width="2"/>' +
    '<circle cx="39" cy="31" r="11" fill="#4aa8d6" stroke="#2e5878" stroke-width="2"/>' +
    '<ellipse cx="39" cy="35" rx="8" ry="7" fill="#fffdf4"/>' +
    '<circle cx="36" cy="31" r="1.6" fill="#2f4e62"/><circle cx="42" cy="31" r="1.6" fill="#2f4e62"/>' +
    '<circle cx="40" cy="34" r="2.4" fill="#df5c60"/><path d="M35 38q6 4 9-1" fill="none" stroke="#2e5268" stroke-width="1.4"/>' +
    '<path d="M18 52H94" stroke="#d77c60" stroke-width="6"/>' +
    '<circle cx="32" cy="61" r="7" fill="#405b6c" stroke="#fff8ed" stroke-width="2"/>' +
    '<circle cx="78" cy="61" r="7" fill="#405b6c" stroke="#fff8ed" stroke-width="2"/>' +
    '<path d="M9 27q-7 6-4 12" fill="none" stroke="#9bc1d0" stroke-width="4"/></svg>';
  const coastalRail = '<svg class="v46-railway-scene" viewBox="0 0 500 105" preserveAspectRatio="none" aria-hidden="true">' +
    '<rect width="500" height="105" rx="15" fill="#e5f5f3"/><circle cx="415" cy="27" r="18" fill="#ffe0a4"/>' +
    '<path d="M0 68Q47 53 100 66T205 65T312 67T500 63V105H0Z" fill="#c0dccb"/>' +
    '<path d="M0 77Q52 63 110 80T251 77T381 80T500 74V105H0Z" fill="#97c9d4"/>' +
    '<path d="M29 69V51M128 68V43M29 51Q78 36 128 43M29 59H128" stroke="#739caa" fill="none" stroke-width="3"/>' +
    '<path d="M157 67l13-28 13 28M187 67l11-32 13 32M354 67l12-29 13 29" fill="#c7dfc3" stroke="#769f93" stroke-width="2"/>' +
    '<path d="M10 85H490M10 95H490" stroke="#597c8e" stroke-width="3"/>' +
    '<path d="M34 85v10M68 85v10M102 85v10M136 85v10M170 85v10M204 85v10M238 85v10M272 85v10M306 85v10M340 85v10M374 85v10M408 85v10M442 85v10M476 85v10" stroke="#7897a0" stroke-width="2"/></svg>';
  const renderTravelTrain = (model, dayIndex) =>
    '<div class="v46-train-world" aria-label="釜山海岸插畫小火車">' + coastalRail +
    '<div class="v46-train-position" style="--v46-train-left:' + (10 + dayIndex * 20) +
    '%" aria-hidden="true"><span class="v46-train-bob">' + trainCar + '</span></div></div>' +
    '<div class="v46-days" role="group" aria-label="Day 1 至 Day 5 日期選擇">' +
    model.tripDays.map((d,i) => '<button type="button" class="v46-day' +
    (d.selected ? ' is-current' : '') + '" aria-pressed="' + String(d.selected) +
    '" data-iso="' + esc(d.iso) + '" onclick="setV46HomeDay(this.dataset.iso)">' +
    '<span class="v46-station-mark" aria-hidden="true">' + ['🧳','🌊','🏯','🚠','✈️'][i] +
    '</span><strong>' + esc(d.label) + '</strong><small>' +
    esc(d.iso.slice(5).replace('-', '/')) + '</small>' +
    '<small class="v46-station-name">' + esc(d.short) + '</small></button>').join('') + '</div>';

  function during(model) {
    const selected = model.tripDays.find(d => d.selected);
    const dayTitle = selected ? selected.label + '｜' + selected.short : '今日行程';
    const dayIndex = Math.max(0, model.tripDays.findIndex(d => d.selected));
    const isPreview = model.today !== model.selectedDay;
    const weather = model.weather;
    const weatherText = weather ? esc(weather.city + '｜' + weather.temp + '°C｜' + weather.condition) :
      '即時天氣暫時無法更新';
    const next = model.next && model.next.desc ? esc(model.next.desc) : '查看今日完整行程與雨備';
    return hero(model, 'HELLO, BUSAN!', dayTitle + (isPreview ? '（預覽）' : ''),
      "showV37Tab('itinerary')", '今日行程',
      '<p class="v46-hero-tag">🍁 秋日海線 × 城市漫遊</p>') +
      '<section class="v46-panel card" aria-label="旅途五天日期軸"><h3>🚃 我們的五天小火車</h3>' +
      renderTravelTrain(model, dayIndex) +
      '<p class="v46-muted">' + (isPreview ? '目前正在預覽其他日期；不會改變真實日期或提醒。' :
      '點選日期可預覽當天主題。') + '</p></section>' +
      '<section class="v46-panel card"><h3>🌤️ 天氣・楓況與穿搭</h3><p class="v46-weather">' +
      weatherText + '</p><p class="v46-muted">🍁 楓況請依最新來源確認；天氣資訊以最後更新為準。</p>' +
      '<button type="button" class="v46-text-link" onclick="toggleHomeWeatherDetail()">查看釜山／慶州詳細天氣 ›</button></section>' +
      '<section class="v46-panel"><h3>旅途快捷百寶袋</h3><div class="v46-shortcuts">' +
      btn('今日行程', '🗺️', "showV37Tab('itinerary')", '路線・雨備') +
      btn('天氣・楓況', '🌤️', 'toggleHomeWeatherDetail()', '氣溫・穿搭') +
      btn('快樂購', '🛍️', "showV37Tab('shop'); setTimeout(()=>setShopTabMode('my'),50)", '想買・已買') +
      btn('超商・超市', '🏪', 'openConvenienceSupermarketHub()', '零食・水果') +
      btn('翻譯・SOS', '🗣️', "showV37Tab('more')", '韓語・救援') +
      btn('旅行記帳', '💰', "showV37Tab('split')", '新增・分帳') + '</div></section>' +
      '<section class="v46-panel card"><h3>📍 ' + (isPreview ? '行程日期預覽' : '下一站，出發吧！') +
      '</h3><p class="v46-muted">' + (isPreview ? '點選今日行程查看指定日期的詳細安排。' : next) +
      '</p><button type="button" class="v46-text-link" onclick="showV37Tab(\'itinerary\')">打開行程與導航 ›</button></section>';
  }
  function after(model) {
    const spent = model.spent === null ? '尚無記帳資料' : 'NT$ ' + model.spent.toLocaleString('zh-TW');
    const photos = Array.isArray(model.photoPreview) ? model.photoPreview.slice(0, 3) : [];
    const memoryGallery = photos.length
      ? '<div class="v46-memory-gallery">' + photos.map((photo, i) =>
          '<button type="button" class="v46-memory-photo" onclick="showV37Tab(\'photo\')">' +
          '<img loading="lazy" src="' + esc(photo.url) + '" alt="旅行照片 ' + (i+1) + '">' +
          '<small>打開旅行相簿 ›</small></button>').join('') + '</div>'
      : '<div class="v46-memory-empty">📸 🍁 📷<p>等著收藏你真正拍下的旅行照片。</p></div>';
    return hero(model, '旅程結束，回憶還在', '釜山 × 慶州｜2026.11.13 – 11.17',
      "showV37Tab('photo')", '旅行回憶',
      '<p class="v46-hero-tag">2026.11.13 – 11.17 🍁</p>') +
      '<section class="v46-panel v46-memory-panel"><h3>📸 旅行回憶精選</h3>' +
      memoryGallery + '<div class="v46-shortcuts">' +
      btn('旅行相簿', '📷', "showV37Tab('photo')", '支援批次上傳') +
      btn('每日回顧', '📝', "showV37Tab('photo')", '精選回憶') +
      '</div></section>' +
      '<section class="v46-panel card"><h3>🍁 我的旅程小結</h3>' +
      '<div class="v46-summary"><div><strong>' + model.photosCount + '</strong><small>張旅行照片</small></div>' +
      '<div><strong>' + model.boughtCount + '</strong><small>項已買商品</small></div></div>' +
      '<p class="v46-muted">旅行花費：' + esc(spent) + '</p>' +
      '<button type="button" class="v46-text-link" onclick="showV37Tab(\'split\')">查看旅行記帳 ›</button></section>';
  }
  target.renderV46Home = function (model, menu, weatherDetail, simulator, collections) {
    if (!model) return '';
    const content = model.mode === 'before' ? before(model) : model.mode === 'after' ? after(model) : during(model);
    return '<div class="v46-home" data-v46-mode="' + esc(model.mode) + '">' +
      '<div class="v46-masthead"><div class="v46-brand"><span aria-hidden="true">🔔</span>' +
      '<div><strong>BUSAN.11</strong><small>TRAVEL DIARY</small></div></div>' +
      '<span class="v46-headleaf" aria-hidden="true">🍁</span></div>' +
      phases(model) + '<div class="home-live-label"><span>LIVE TRAVEL CARD</span><small>秋日旅程</small></div>' +
      content + '<details class="v46-tools"' + (target.v46AllToolsExpanded ? ' open' : '') +
      ' ontoggle="window.v46AllToolsExpanded=this.open">' +
      '<summary class="v46-tools-summary" onclick="window.v46AllToolsExpanded=!this.parentElement.open"><span>🎒 我的旅行百寶袋 <small>・11 項功能</small></span>' +
      '<span class="v46-tools-caret" aria-hidden="true">⌄</span></summary>' +
      '<div class="v46-tools-content">' + menu + '</div></details>' +
      '<div class="v38-widget-row">' + (collections || '') + '</div>' + weatherDetail +
      '<details class="v46-legacy-tool"><summary>舊版日期測試工具</summary>' + simulator + '</details>' +
      '</div>';
  };
})(window);
