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

  // OWNER rebuild: stage-specific high-resolution image with ACTUAL HTML overlaid,
  // never bake countdown, dates or action labels into the illustration.
  const hero = (model, title, subtitle, action, actionLabel, slot) =>
    '<section id="liveTravelCard" class="v46-hero v46-story-hero v38-hero-card hero-card card fade-scale-in" data-story-mode="' +
    esc(model.mode) + '">' +
    '<img class="v46-story-img v46-story-' + esc(model.mode) +
      '" src="assets/images/v46-owner-fit-' + esc(model.mode) +
      '.webp" alt="' + esc(model.mode === 'before' ?
      '哆啦A夢和旅伴準備出發的水彩旅行情境' :
      model.mode === 'during' ? '哆啦A夢與旅伴搭乘黃色海岸列車欣賞釜山秋日海景' :
      '哆啦A夢與旅伴在釜山秋日海岸收藏旅途回憶') +
      '" decoding="async" loading="eager" />' +
    '<div class="v46-hero-copy v46-story-copy">' +
      '<div class="v46-story-intro"><p class="v46-eyebrow">BUSAN × GYEONGJU · 2026 秋日旅行</p>' +
      '<h2>' + esc(title) + '</h2><p class="v46-hero-subtitle">' + esc(subtitle) + '</p></div>' +
      '<div class="v46-story-actions">' + slot +
      '<button type="button" class="v46-hero-link home-nav-button" aria-label="開啟' +
      esc(actionLabel) + '" onclick="' + action + '">' + esc(actionLabel) +
      ' ›</button></div></div></section>';
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
      '';
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
      '<section class="v46-preflight-strip" aria-label="去程航班"><span>✈ BX572</span>' +
      '<strong>11/13 · 13:25 桃園 → 17:00 金海</strong></section>' +
      '<section class="v46-pretrip-rail-link"><span>🚂 偷看五天路線</span>' +
      '<button type="button" onclick="setV46HomePreview(\'during\')">五日行程預覽 ›</button></section>' +
      '<section class="v46-panel card v46-entry-status" aria-label="入境申報狀態">' +
      '<p>🪪 K-ETA：' + esc(model.entryKeta) + '</p>' +
      '<p>📝 e-Arrival Card：依適用資格與抵達前 3 天窗口辦理</p>' +
      '<p>🔄 Q-CODE：Q4出發前RECHECK（依 KDCA 條件）</p></section>' +
      
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

  // Owner reference: the large illustrated yellow coast train is in the hero;
  // this miniature full-color scene tracks the selected day instead of a generic SVG icon.
  const renderTravelTrain = (model, dayIndex) =>
    '<div class="v46-owner-train-track" data-v46-motion="' + (model.trainMotionEnabled ? 'on' : 'off') + '" aria-label="海岸膠囊列車沿 Day1 到 Day5 向右前進">' +
    '<span class="v46-rail" aria-hidden="true"></span>' +
    '<span class="v46-train-cloud one" aria-hidden="true">☁</span><span class="v46-train-cloud two" aria-hidden="true">☁</span>' +
    '<div class="v46-owner-train-marker" style="--v46-owner-train-left:' + (25 + dayIndex * 12.5) +
    '%"><span class="v46-smoke-stack" aria-hidden="true"></span>' +
    '<span class="v46-train-puff one" aria-hidden="true"></span><span class="v46-train-puff two" aria-hidden="true"></span>' +
    '<span class="v46-train-puff three" aria-hidden="true"></span>' +
    '<img src="assets/images/v46-owner-fit-train.webp" alt="水彩黃色海岸列車"></div></div>' +
    '<div class="v46-days v46-owner-days" role="group" aria-label="Day 1 至 Day 5 日期選擇">' +
    model.tripDays.map((d,i) => '<button type="button" class="v46-day' +
    (d.selected ? ' is-current' : '') + (d.iso === model.today ? ' is-today' : '') + '" aria-pressed="' + String(d.selected) +
    '" data-iso="' + esc(d.iso) + '" aria-label="開啟 ' + esc(d.label + ' ' + d.short) + ' 詳細行程" onclick="openV46TrainDay(this.dataset.iso)">' +
    '<span class="v46-station-mark" aria-hidden="true">' + ['🧳','🌊','🏯','🚠','✈️'][i] +
    '</span><strong>' + esc(d.label) + '</strong><small>' +
    esc(d.iso.slice(5).replace('-', '/')) + '</small>' +
    '<small class="v46-station-name">' + esc(d.short) + '</small></button>').join('') + '</div>';
  // Always-visible, actionable travel companion (not dependent on expanding the rail).
  const mascotMini = mascotArt('during')
    .replace(/<defs><filter[\s\S]*?<\/defs>/, '')
    .replace(' filter="url(#v46-watercolor)"', '')
    .replace('class="v46-mascot-art"', 'class="v46-tiny-mascot-art"');
  const renderNextStop = model => {
    const item = model.nextStop || {};
    const iso = model.selectedDay;
    const enabled = model.trainMotionEnabled !== false;
    const count = Number.isInteger(item.count) ? item.count : 0;
    const pos = Number.isInteger(item.index) ? item.index : 0;
    const show = count > 0 && pos < count;
    const title = show ? item.title : count > 0
      ? '今天的站點已手動查看完畢' : '這天還沒有可顯示的行程';
    const info = show ? (item.time ? '🕒 ' + esc(item.time) + ' · ' : '') +
      esc(item.transport || '依行程安排交通') : '可以按上一站重新查看，或展開當日行程';
    const nav = show && item.naver ?
      '<a href="' + esc(item.naver) +
      '" target="_blank" rel="noopener noreferrer" aria-label="用 NAVER Map 開啟下一站地點">📍 NAVER 地點／導航</a>' :
      '<button type="button" onclick="openV46TrainDay(\'' + iso +
      '\')">查看此站行程（NAVER 待核對）</button>';
    return '<section class="v46-trip-companion" aria-label="旅行下一站指南">' +
      '<div class="v46-companion-head"><strong>📍 下一站｜旅行小夥伴</strong>' +
      '<button type="button" class="v46-motion-toggle" aria-pressed="' + String(enabled) +
      '" onclick="toggleV46TrainMotion()">動畫：' + (enabled ? '開' : '關') + '</button></div>' +
      '<div class="v46-stop-name">' + esc(title) + '</div>' +
      '<div class="v46-stop-time">' + info + '</div>' +
      '<div class="v46-stop-note">' + esc(item.note || '行程預覽，請以現場狀況為準') + '</div>' +
      '<div class="v46-stop-links">' + nav +
      '<button type="button" onclick="openV46TrainDay(\'' + iso + '\')">🗺️ 當天詳細行程</button></div>' +
      '<div class="v46-stop-pager">' +
      '<button type="button" ' + (pos <= 0 ? 'disabled ' : '') +
      'onclick="setV46TrainStop(\'' + iso + '\',\'prev\')">← 上一站</button>' +
      '<span class="v46-stop-count">' + (count ? Math.min(pos + 1, count) : 0) + '/' + count + '</span>' +
      '<button type="button" ' + (pos >= count ? 'disabled ' : '') +
      'onclick="setV46TrainStop(\'' + iso + '\',\'next\')">下一站 →</button>' +
      '<button type="button" class="v46-time-reset" onclick="setV46TrainStop(\'' + iso +
      '\',\'auto\')">依韓國時間建議</button></div>' +
      '<button type="button" class="v46-mascot-hello" onclick="greetV46TrainMascot(this)" ' +
      'aria-label="和旅行夥伴互動打招呼"><span class="v46-mascot-image" aria-hidden="true">' +
      mascotMini + '</span><span class="v46-mascot-message">點一下，哆啦A夢打招呼 ♡</span></button>' +
      '</section>';
  };
  // OWNER correction: the day rail is a first-class home control, never hidden
  // behind an accordion, including the current pre-trip period.
  const renderVisibleRail = model => {
    const day = model.tripDays.find(d => d.selected);
    const dayIndex = Math.max(0, model.tripDays.findIndex(d => d.selected));
    const preview = model.mode === 'before' || model.today !== model.selectedDay;
    return '<section class="v46-panel card v46-compact-rail-card v46-visible-rail-card" ' +
      'aria-label="首頁五日小火車，直接顯示">' +
      '<div class="v46-visible-rail-heading"><span>🚂 五日旅行小火車</span>' +
      '<small>' + esc(day ? day.label + ' · ' + day.short : 'Day 1 · 釜山初日') + '</small></div>' +
      renderTravelTrain(model, dayIndex) +
      '<p class="v46-visible-rail-hint">' +
      (preview ? '旅行日期預覽 · 點 Day 1～5 可開啟當天行程' :
        '依韓國日期顯示今天 · 點 Day 1～5 可開啟當天行程') +
      '</p>' + renderNextStop(model) + '</section>';
  };
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
      renderVisibleRail(model) +
      '<section class="v46-panel"><h3>旅途快捷百寶袋</h3><div class="v46-shortcuts">' +
      btn('今日行程', '🗺️', "showV37Tab('itinerary')", '路線・雨備') +
      btn('天氣・楓況', '🌤️', 'toggleHomeWeatherDetail()', '氣溫・穿搭') +
      btn('快樂購', '🛍️', "showV37Tab('shop'); setTimeout(()=>setShopTabMode('my'),50)", '想買・已買') +
      btn('超商・超市', '🏪', 'openConvenienceSupermarketHub()', '零食・水果') +
      btn('翻譯・SOS', '🗣️', "showV37Tab('more')", '韓語・救援') +
      btn('旅行記帳', '💰', "showV37Tab('split')", '新增・分帳') + '</div></section>';
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
  // Real current conditions only: never label current weather as a future travel-day forecast.
  const compactWeather = model => {
    const api = target.WeatherEngine;
    const current = (key, label) => {
      const w = api && typeof api.getWeather === 'function' ? api.getWeather(key) : null;
      const valid = w && w.unavailable !== true && w.temp != null && Number.isFinite(Number(w.temp));
      return valid
        ? '<span class="v46-weather-city"><strong>' + label + ' ' + Math.round(Number(w.temp)) + '°C</strong>' +
          '<small>' + esc(w.conditionZH || w.condition || '') + (w.isCached ? ' · 快取' : '') + '</small></span>'
        : '<span class="v46-weather-city"><strong>' + label + ' --°</strong><small>待更新</small></span>';
    };
    const busan = current('Busan', '釜山');
    const gyeongju = current('Gyeongju', '慶州');
    return '<div class="v46-weather-current" aria-label="釜山與慶州現在天氣">' +
      '<span class="v46-weather-symbol" aria-hidden="true">🌤️</span>' +
      busan + '<span class="v46-weather-separator" aria-hidden="true"></span>' + gyeongju +
      '<button type="button" class="v46-weather-detail-button" onclick="toggleHomeWeatherDetail()" ' +
      'aria-label="查看即時天氣詳情與穿搭建議" aria-controls="homeWeatherDetailPanel" aria-expanded="' + Boolean(target.homeWeatherDetailExpanded) + '">詳情 ›</button></div>';
  };

  const condensedWeather = () => {
    const api = target.WeatherEngine;
    const w = api && typeof api.getWeather === 'function' ? api.getWeather('Busan') : null;
    const valid = w && w.unavailable !== true && w.temp != null && Number.isFinite(Number(w.temp));
    const caption = valid ? '釜山 ' + Math.round(Number(w.temp)) + '°' : '天氣待更新';
    return '<button type="button" class="v46-mini-weather" onclick="toggleHomeWeatherDetail()" aria-label="' +
      esc(caption) + '，開啟釜山慶州天氣詳情" aria-controls="homeWeatherDetailPanel" aria-expanded="' + Boolean(target.homeWeatherDetailExpanded) + '">🌤 <span>' + esc(caption) + '</span></button>';
  };
  const condensedPhase = model =>
    '<label class="v46-phase-minibar">' +
      '<span class="v46-sr-only">切換旅行階段</span>' +
      '<select class="v46-mini-phase-select" aria-label="切換出發前、旅途中、回憶錄" onchange="setV46HomePreview(this.value)">' +
        [['before','🧳 出發前'],['during','🚞 旅途中'],['after','📸 回憶錄'],['auto','↩ 自動模式']].map(([value,label]) =>
          '<option value="' + value + '"' + (model.mode === value ? ' selected' : '') +
          '>' + label + '</option>').join('') +
      '</select><span class="v46-phase-dropdown" aria-hidden="true">⌄</span></label>';
  // Dismiss mutually exclusive overlay surfaces without replacing an open
  // <details> element while it is receiving a click.
  target.v46OnBagToggle = function (bag) {
    if (!bag?.isConnected) return;
    const isOpen = Boolean(bag.open);
    target.v46AllToolsExpanded = isOpen;
    const header = bag.closest('.v46-sticky-head');
    if (isOpen) {
      // Fix the dropdown to the viewport, not to the scroll coordinate of
      // the sticky header: position:absolute once placed its top at -103px
      // after an S25 page scroll. Only the small menu scrolls.
      const summary = bag.querySelector('summary');
      const menu = bag.querySelector('.v46-tools-content');
      if (summary && menu) {
        const place = () => {
          if (!bag.isConnected || !bag.open) return;
          const viewport = target.visualViewport?.height || target.innerHeight;
          const edge = summary.getBoundingClientRect().bottom;
          const top = Math.max(8, Math.min(edge + 8, viewport - 185));
          bag.style.setProperty('--v46-bag-top', top + 'px');
          menu.style.maxHeight = Math.max(110, Math.min(480, viewport - top - 88)) + 'px';
        };
        menu.scrollTop = 0;
        place();
        target.requestAnimationFrame(place);
      }
      // Opening a details menu can make the browser scroll/resize its sticky
      // ancestor. Keep the pre-open page position and header phase stable.
      target.v46BagScrollAnchor = {
        y: target.scrollY,
        compact: header?.classList.contains('is-compact') ?? Boolean(target.v46StickyCompact)
      };
      if (target.homeWeatherDetailExpanded) {
        target.homeWeatherDetailExpanded = false;
        document.getElementById('homeWeatherDetailPanel')?.remove();
        document.querySelectorAll('#v37HomeDashboard [aria-controls="homeWeatherDetailPanel"]')
          .forEach(button => button.setAttribute('aria-expanded', 'false'));
      }
    } else {
      const anchor = target.v46BagScrollAnchor;
      target.v46BagScrollAnchor = null;
      if (anchor) {
        // Restore the header and the scroll offset after the DOM shrinks.
        // Otherwise auto-scroll triggered by details collapsing can leave a
        // compact phase-select unexpectedly invisible on S25/Firefox.
        const restore = () => {
          const active = document.querySelector('#guide.active #v37HomeDashboard .v46-sticky-head');
          if (!active || active.querySelector('details.v46-inline-tools[open]')) return;
          if (Math.abs(target.scrollY - anchor.y) > 1) {
            target.scrollTo({ top: anchor.y, left: 0, behavior: 'instant' });
          }
          target.v46StickyCompact = anchor.compact;
          active.classList.toggle('is-compact', anchor.compact);
        };
        restore();
        target.requestAnimationFrame(restore);
      }
    }
  };
  target.v46CloseBag = function () {
    const bag = document.querySelector('#guide.active #v37HomeDashboard details.v46-inline-tools[open]');
    if (bag) bag.open = false;
    target.v46AllToolsExpanded = false;
  };
  // Do not let gestures chain from the end of the dropdown into the page.
  // Unlike locking html/body overflow, this preserves sticky-header geometry.
  if (!target.v46BagGestureGuardBound) {
    target.v46BagGestureGuardBound = true;
    let touchStartY = null;
    document.addEventListener('touchstart', e => {
      const el = e.target.closest?.('#guide.active #v37HomeDashboard details.v46-inline-tools[open] > .v46-tools-content');
      touchStartY = el && e.touches[0] ? e.touches[0].clientY : null;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (touchStartY == null || !e.touches[0]) return;
      const el = e.target.closest?.('#guide.active #v37HomeDashboard details.v46-inline-tools[open] > .v46-tools-content');
      if (!el) return;
      const movement = e.touches[0].clientY - touchStartY;
      if ((movement > 0 && el.scrollTop <= 0) ||
          (movement < 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1)) {
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('touchend', () => { touchStartY = null; }, { passive: true });
    document.addEventListener('wheel', e => {
      const el = e.target.closest?.('#guide.active #v37HomeDashboard details.v46-inline-tools[open] > .v46-tools-content');
      if (el && ((e.deltaY < 0 && el.scrollTop <= 0) ||
                 (e.deltaY > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1))) {
        e.preventDefault();
      }
    }, { passive: false });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') target.v46CloseBag();
    });
  }
  // Keep only one scroll listener across rerenders. The expanded masthead collapses
  // after the user has scrolled; the same real data, menus and controls remain available.
  if (!target.v46StickyHeaderBound) {
    target.v46StickyHeaderBound = true;
    let pending = false;
    // Scroll-driven compacting must work for both human and programmatic scroll.
    // A prior touch-intent gate left the header expanded after scrollTo(), failing
    // the existing owner-approved sticky behavior. Use a >256px entry threshold
    // instead: WebKit's ~192px automatic scrollIntoView for the bag does not
    // change the header underneath the tap. The <24px exit threshold provides
    // hysteresis so the header cannot oscillate around a single boundary.
    target.addEventListener('scroll', () => {
      // WebKit can coalesce the top-scroll event with the previous compact
      // request. Clear stale state immediately even while an RAF is pending.
      if (target.scrollY < 24 && !target.v46AllToolsExpanded) {
        target.v46StickyCompact = false;
        document.querySelector('#guide.active #v37HomeDashboard .v46-sticky-head')
          ?.classList.remove('is-compact');
      }
      if (pending) return;
      pending = true;
      target.requestAnimationFrame(() => {
        pending = false;
        const el = document.querySelector('#guide.active #v37HomeDashboard .v46-sticky-head');
        // WebKit scrolls the page while moving through the long 11-item bag.
        // Never resize its containing sticky header during that interaction:
        // changing the target's geometry would make real taps fail.
        // A return to the very top must clear stale compact state,
        // including after mode-switch and restored dropdown scroll anchors.
        // Avoid resizing an OPEN bag during ordinary scrolling.
        if (target.scrollY < 24 && !target.v46AllToolsExpanded) {
          target.v46StickyCompact = false;
          el?.classList.remove('is-compact');
          return;
        }
        if (el?.querySelector('details.v46-tools[open]')) return;
        // Hysteresis avoids scroll/height oscillation when expanded header
        // collapses at the same position that the page is scrolling.
        if (target.scrollY > 256) target.v46StickyCompact = true;
        if (el) el.classList.toggle('is-compact', Boolean(target.v46StickyCompact));
      });
    }, { passive: true });
  }

  target.renderV46Home = function (model, menu, weatherDetail, simulator, collections) {
    if (!model) return '';
    const content = model.mode === 'before' ? before(model) : model.mode === 'after' ? after(model) : during(model);
    // Preserve the open bag's geometry across weather/phase rerenders.
    const activeBag = document.querySelector('#guide.active #v37HomeDashboard details.v46-tools[open]');
    if (!activeBag && !target.v46AllToolsExpanded) {
      if (target.scrollY > 256) target.v46StickyCompact = true;
      else if (target.scrollY < 24) target.v46StickyCompact = false;
    }
    return '<div class="v46-home" data-v46-mode="' + esc(model.mode) + '">' +
      '<div class="v46-bag-backdrop" aria-hidden="true" onclick="v46CloseBag()"></div>' +
      '<div class="v46-sticky-head' + (target.v46StickyCompact ? ' is-compact' : '') + '">' +
      '<div class="v46-sticky-expanded"><div class="v46-masthead"><div class="v46-brand"><span aria-hidden="true">🔔</span>' +
      '<div><strong>BUSAN.11</strong><small>TRAVEL DIARY</small></div></div>' +
      '<span class="v46-headleaf" aria-hidden="true">🍁</span></div>' +
      phases(model) + '</div>' +
      '<div class="v46-top-quick-actions">' + condensedPhase(model) + compactWeather(model) + condensedWeather() +
      '<details class="v46-tools v46-inline-tools"' + (target.v46AllToolsExpanded ? ' open' : '') +
      ' ontoggle="window.v46OnBagToggle(this)">' +
      '<summary class="v46-tools-summary v46-inline-bag-summary" aria-label="開啟或收起旅行百寶袋 11 項功能">' +
      '<span aria-hidden="true">🎒</span><span class="v46-bag-label">百寶袋</span></summary>' +
      '<div class="v46-tools-content">' + menu + '</div></details></div>' + weatherDetail + '</div>' +
      '<div class="v46-wallpaper-window" aria-hidden="true"></div>' +
      content + '<div class="v38-widget-row">' + (collections || '') + '</div>' +
      '<details class="v46-legacy-tool"><summary>舊版日期測試工具</summary>' + simulator + '</details>' +
      '</div>';
  };
})(window);
