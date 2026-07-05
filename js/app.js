// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Application Entry Point
// Responsibilities: Global state init, tab routing, bootstrap, Firebase listeners,
//                   bill CRUD (public+private), auth/PIN, profile, SW management
// ─────────────────────────────────────────────────────────────────────────
// NOT the place for: ticket CRUD → wallet.js
//                   itinerary CRUD → itinerary.js
//                   shop/guide/voice/prep CRUD → renderers.js
//                   photo CRUD → memory.js
//                   hotel CRUD → wallet.js
//                   speakKorean → ui.js
//                   dark mode → ui.js (canonical)
// ─────────────────────────────────────────────────────────────────────────

(function () {

    // ── Global State ──────────────────────────────────────────────────────
    window.hotelData        = {};
    window.u1               = { key: 'user1', name: '溫', avatar: '👩' };
    window.u2               = { key: 'user2', name: '鴨', avatar: '🦆' };
    window.deviceOwner      = StorageEngine.get('busan_v36_owner', 'user1').data;
    window.liveKrwToTwd     = parseFloat(StorageEngine.get('busan_v36_live_rate', 0.024).data) || 0.024;
    window.v37SimulatedDate = StorageEngine.get('busan_v37_simulated_date', 'real').data;
    window.currentLightboxUrl = '';
    window.currentLightboxKey = '';
    window.voiceData        = [];
    window.prepData         = [];
    window.privateBills     = StorageEngine.get('busan_v36_p_bills', []).data;
    window.sharedBills      = [];
    window.currentBillTab   = '公費';
    window.currentShopSubTab  = 'my';
    window.currentFoodSubTab  = 'my';
    window.currentRecShopFilter = 'ALL';
    window.ticketData       = [];
    window.itineraryData    = [];
    window.currentFilterDay = '11/13';
    window.editingItiKey    = null;
    window.shopList         = [];
    window.currentShopOwner = 'user1';
    window.guideData        = [];
    window.currentGuideTab  = '打卡景點';
    window.editingGuideKey  = null;
    window.photoList        = [];
    window.isSyncing        = false;
    window.folderMapping    = {
        '工具': [],
        '美食景點': ['打卡景點', '必吃美食'],
        '購物': ['伴手禮', '衣物鞋履', '小物配件', '彩妝', '保養', 'Olive Young', '當地藥局'],
        '超商': ['GS25', 'CU', '7-11']
    };

    // ── Theme Init (ui.js owns toggleDarkMode; we only apply saved value here) ──
    const savedTheme = StorageEngine.get('busan_v36_theme', 'light').data;
    document.documentElement.setAttribute('data-theme', savedTheme);

    // ── PWA Service Worker ────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(reg => {
                if (reg.waiting) _showSwUpdateBanner(reg.waiting);
                reg.addEventListener('updatefound', () => {
                    const nw = reg.installing;
                    nw.addEventListener('statechange', () => {
                        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                            _showSwUpdateBanner(nw);
                        }
                    });
                });
            }).catch(() => {/* SW unavailable — no crash */});

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) { refreshing = true; window.location.reload(); }
            });
        });
    }

    function _showSwUpdateBanner(worker) {
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;bottom:80px;right:16px;background:#2c3e50;color:#fff;' +
            'padding:10px 14px;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,.25);' +
            'z-index:9999;display:flex;gap:10px;align-items:center;font-size:.82rem;font-weight:700;';
        d.innerHTML = '<span>發現新版，立即更新</span>' +
            '<button id="swUpdateBtn" style="background:#2ecc71;border:none;color:#fff;' +
            'padding:4px 10px;border-radius:8px;cursor:pointer;font-weight:700;">更新</button>';
        document.body.appendChild(d);
        document.getElementById('swUpdateBtn').onclick = () => {
            worker.postMessage({ action: 'skipWaiting' });
            d.remove();
        };
    }

    // ── Date Helpers ──────────────────────────────────────────────────────
    window.getTravelDay = function () {
        if (window.v37SimulatedDate === 'real') {
            const d = new Date().getDate();
            const m = new Date().getMonth() + 1;
            if (m === 11) {
                if (d >= 13 && d <= 17) return `11/${d}`;
            }
            return '11/10'; // before trip default
        }
        return window.v37SimulatedDate;
    };

    window.getV37SelectedDate = function () { return getTravelDay(); };

    window.setV37SelectedDate = function (val) {
        window.v37SimulatedDate = val;
        StorageEngine.set('busan_v37_simulated_date', val);
        triggerContextUpdate();
    };

    // ── Splash / Entry ────────────────────────────────────────────────────
    window.enterApp = function () {
        const splash = document.getElementById('splash');
        const app    = document.getElementById('mainApp');
        if (splash) { splash.style.opacity = '0'; setTimeout(() => { splash.style.display = 'none'; }, 400); }
        if (app)    { app.style.display = 'block'; }
    };

    // ── PIN ───────────────────────────────────────────────────────────────
    window.submitPin = function () {
        const pin = document.getElementById('pinInput');
        if (!pin) return;
        if (pin.value === '1313') {
            document.getElementById('pinModal').style.display = 'none';
            if (typeof window._pinResolve === 'function') { window._pinResolve(); window._pinResolve = null; }
        } else {
            const msg = document.getElementById('pinMsg');
            if (msg) msg.innerText = '密碼錯誤，請重試';
            pin.value = '';
        }
    };

    window.cancelPin = function () {
        const modal = document.getElementById('pinModal');
        if (modal) modal.style.display = 'none';
        window.currentBillTab = '公費';
    };

    // ── Tab Navigation ────────────────────────────────────────────────────
    window.showV37Tab = function (id, btn) {
        triggerHapticFeedback();
        document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        // index.html uses id="guide" for the home container
        const targetId = (id === 'home') ? 'guide' : id;
        const el = document.getElementById(targetId);
        if (el) el.classList.add('active');
        if (btn) btn.classList.add('active');

        // Trigger appropriate lazy initialisation per tab
        if (id === 'home' || id === 'guide') {
            if (typeof renderV37HomeDashboard === 'function') renderV37HomeDashboard();
        } else if (id === 'itinerary') {
            filterItineraryDay(getV37SelectedDate(), null);
        } else if (id === 'split') {
            if (typeof renderBills === 'function') renderBills();
        } else if (id === 'wallet') {
            if (typeof switchWalletTab === 'function') switchWalletTab('ticket');
        } else if (id === 'shop') {
            if (typeof setShopTabMode === 'function') setShopTabMode('my');
        } else if (id === 'photo') {
            if (typeof switchWalletTab === 'function') switchWalletTab('memory');
        }
    };

    // ── Misc UI Shortcuts ─────────────────────────────────────────────────
    window.openPapago = function () {
        window.open('https://papago.naver.com/', '_blank');
    };

    window.autoFetchMap = function (titleId, linkId) {
        const titleEl = document.getElementById(titleId);
        if (!titleEl || !titleEl.value) return;
        const q      = encodeURIComponent(titleEl.value);
        const linkEl = document.getElementById(linkId);
        if (linkEl) linkEl.value = `https://map.naver.com/v5/search/${q}`;
        showToast('已自動填入 Naver Map 連結', 'info');
    };

    window.openMoreShortcut = function (type) {
        const actions = {
            attractions : () => showV37Tab('home'),
            shop        : () => showV37Tab('shop'),
            photo       : () => showV37Tab('photo'),
            tickets     : () => showV37Tab('wallet'),
            korean      : () => showV37Tab('home'),
            settings    : () => { const m = document.getElementById('profileModal'); if (m) m.style.display = 'flex'; }
        };
        if (actions[type]) actions[type]();
    };

    // ── Profile ───────────────────────────────────────────────────────────
    window.saveProfiles = function () {
        const fields = {
            editU1Avatar: (v) => { window.u1.avatar = v || '👩'; },
            editU1Name  : (v) => { window.u1.name   = v || '溫'; },
            editU2Avatar: (v) => { window.u2.avatar = v || '🦆'; },
            editU2Name  : (v) => { window.u2.name   = v || '鴨'; }
        };
        Object.entries(fields).forEach(([id, setter]) => {
            const el = document.getElementById(id);
            if (el) setter(el.value.trim());
        });
        const modal = document.getElementById('profileModal');
        if (modal) modal.style.display = 'none';
        showToast('✅ 頭像與名稱已儲存', 'success');
        triggerContextUpdate();
    };

    window.updateOwner = function () {
        const sel = document.getElementById('deviceOwner');
        if (!sel) return;
        window.deviceOwner = sel.value;
        StorageEngine.set('busan_v36_owner', sel.value);
    };

    // ── Bill CRUD (public+private) — belongs here because it bridges Firebase + localStorage ──
    window.togglePayerSelect = function () {
        const typeEl  = document.getElementById('billType');
        const payerEl = document.getElementById('payer');
        if (!typeEl || !payerEl) return;
        if (typeEl.value === '公費') {
            payerEl.innerHTML =
                `<option value="user1">${u1.avatar} ${u1.name}</option>` +
                `<option value="user2">${u2.avatar} ${u2.name}</option>`;
        } else {
            const me = deviceOwner === 'user1' ? u1 : u2;
            payerEl.innerHTML = `<option value="${deviceOwner}">${me.avatar} ${me.name}</option>`;
        }
    };

    window.filterBillsWithPin = function (type) {
        window.currentBillTab = type;
        const shared  = document.getElementById('tabShared');
        const priv    = document.getElementById('tabPrivate');
        if (shared)  shared.classList.toggle('active',  type === '公費');
        if (priv)    priv.classList.toggle('active',    type === '私帳');
        if (typeof renderBills === 'function') renderBills();
        triggerContextUpdate();
    };

    window.calcQuickExchange = function () {
        const krwEl    = document.getElementById('quickKrw');
        const resultEl = document.getElementById('quickResult');
        const twdEl    = document.getElementById('quickTwd');
        const taxEl    = document.getElementById('taxRefundMsg');
        if (!krwEl || !resultEl) return;
        const krw = parseFloat(krwEl.value);
        if (isNaN(krw) || krw <= 0) { resultEl.style.display = 'none'; return; }
        const twd = Math.round(krw * window.liveKrwToTwd);
        if (twdEl) twdEl.innerText = `$${twd.toLocaleString()}`;
        const taxRefund = krw >= 30000 ? Math.round(krw * 0.1) : 0;
        if (taxEl) taxEl.innerHTML =
            `<i class="fa-solid fa-money-bill-wave"></i> 預估可退稅：₩${taxRefund.toLocaleString()}`;
        resultEl.style.display = 'block';
    };

    window.quickAddBill = function () {
        const krwEl  = document.getElementById('quickKrw');
        const amtEl  = document.getElementById('billAmt');
        const curEl  = document.getElementById('billCurrency');
        if (!krwEl || !krwEl.value) return;
        if (amtEl) amtEl.value = krwEl.value;
        if (curEl) curEl.value = 'KRW';
        showToast('已填入金額，請輸入項目名稱後儲存', 'info');
    };

    window.addBill = async function () {
        const nameEl     = document.getElementById('billName');
        const amtEl      = document.getElementById('billAmt');
        const currencyEl = document.getElementById('billCurrency');
        const typeEl     = document.getElementById('billType');
        const payerEl    = document.getElementById('payer');
        const methodEl   = document.getElementById('payMethod');
        const receiptEl  = document.getElementById('tempReceipt');

        const name     = nameEl?.value?.trim();
        const amt      = parseFloat(amtEl?.value);
        const currency = currencyEl?.value || 'KRW';
        const type     = typeEl?.value || '公費';
        const payer    = payerEl?.value || window.deviceOwner;
        const method   = methodEl?.value || '現金';
        const receipt  = receiptEl?.value || '';

        if (!name || isNaN(amt) || amt <= 0) {
            showToast('請填入項目名稱與金額', 'warning');
            return;
        }

        // Schema: use field "name" consistently (BudgetEngine reads b.name || b.item)
        const bill = { name, amt, currency, type, payer, method, receipt,
                       day: getV37SelectedDate(), ts: Date.now() };

        if (type === '公費') {
            await NetworkEngine.firebasePush(DB_BILLS, bill);
        } else {
            const pb = StorageEngine.get('busan_v36_p_bills', []).data;
            pb.push({ ...bill, id: String(Date.now()) });
            StorageEngine.set('busan_v36_p_bills', pb);
            window.privateBills = pb;
            if (typeof renderBills === 'function') renderBills();
        }
        if (nameEl)    nameEl.value    = '';
        if (amtEl)     amtEl.value     = '';
        if (receiptEl) receiptEl.value = '';
        showToast('✅ 已記帳', 'success');
        triggerContextUpdate();
    };

    window.deleteSharedBill = async function (key) {
        if (!confirm('確認刪除此筆公費記帳？')) return;
        await NetworkEngine.firebaseRemove(`${DB_BILLS}/${key}`);
    };

    window.deletePrivateBill = function (id) {
        if (!confirm('確認刪除此筆私帳？')) return;
        window.privateBills = window.privateBills.filter(b => b.id !== id);
        StorageEngine.set('busan_v36_p_bills', window.privateBills);
        if (typeof renderBills === 'function') renderBills();
        triggerContextUpdate();
    };

    // ── Firebase Listeners (centralised — all data flows into global arrays) ──
    function initFirebaseListeners() {
        if (!window.NetworkEngine || !NetworkEngine._db) {
            console.warn('[App] NetworkEngine not ready — Firebase listeners skipped');
            return;
        }

        NetworkEngine.firebaseOn(DB_HOTEL, snap => {
            window.hotelData = snap.exists() ? snap.val() : {};
            if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
        });

        NetworkEngine.firebaseOn(DB_BILLS, snap => {
            window.sharedBills = [];
            snap.forEach(ch => window.sharedBills.push({ ...ch.val(), key: ch.key }));
            if (typeof renderBills === 'function') renderBills();
            triggerContextUpdate();
        });

        NetworkEngine.firebaseOn(DB_SHOP, snap => {
            window.shopList = [];
            snap.forEach(ch => window.shopList.push({ ...ch.val(), key: ch.key }));
            if (typeof renderShop === 'function') renderShop();
        });

        NetworkEngine.firebaseOn(DB_GUIDE, snap => {
            window.guideData = [];
            snap.forEach(ch => window.guideData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderGuideContent === 'function') renderGuideContent();
        });

        NetworkEngine.firebaseOn(DB_PHOTOS, snap => {
            window.photoList = [];
            snap.forEach(ch => window.photoList.push({ ...ch.val(), key: ch.key }));
            if (typeof renderMemoryAlbum === 'function') renderMemoryAlbum();
        });

        NetworkEngine.firebaseOn(DB_ITI, snap => {
            window.itineraryData = [];
            snap.forEach(ch => window.itineraryData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderItinerary === 'function') renderItinerary();
            triggerContextUpdate();
        });

        NetworkEngine.firebaseOn(DB_PREP, snap => {
            window.prepData = [];
            snap.forEach(ch => window.prepData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderPrepList === 'function') renderPrepList();
            triggerContextUpdate();
        });

        NetworkEngine.firebaseOn(DB_TICKETS, snap => {
            window.ticketData = [];
            snap.forEach(ch => window.ticketData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
        });

        NetworkEngine.firebaseOn(DB_VOICE, snap => {
            window.voiceData = [];
            snap.forEach(ch => window.voiceData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderVoiceList === 'function') renderVoiceList();
        });
    }

    // ── Offline Sync (15-second interval — runs in app.js because it owns the queue) ──
    setInterval(() => { if (navigator.onLine) syncOfflineQueue(); }, 15000);

    // ── Bootstrap ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Firebase is initialised by firebase.js which loads before app.js
        initFirebaseListeners();

        // Exchange rate (NetworkEngine.getExchangeRate only exists in ute/ute_network.js)
        if (NetworkEngine.getExchangeRate) {
            NetworkEngine.getExchangeRate().then(res => {
                if (res && res.data && res.data.krwToTwd) {
                    window.liveKrwToTwd = res.data.krwToTwd;
                    const el = document.getElementById('liveFxRate');
                    if (el) el.innerText = `1 KRW ≈ ${res.data.krwToTwd.toFixed(4)} TWD`;
                    StorageEngine.set('busan_v36_live_rate', res.data.krwToTwd);
                }
            });
        }

        // Payer dropdown initial state
        togglePayerSelect();

        // Show home tab
        const firstNavBtn = document.querySelector('.bottom-nav .nav-item');
        showV37Tab('home', firstNavBtn);
    });

})();
