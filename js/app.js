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
    window.hotelData        = window.hotelData || {};
    window.u1               = window.u1 || { key: 'user1', name: '溫', avatar: '👩' };
    window.u2               = window.u2 || { key: 'user2', name: '鴨', avatar: '🦆' };
    window.deviceOwner      = StorageEngine.get('busan_v36_owner', 'user1').data;
    window.liveKrwToTwd     = parseFloat(StorageEngine.get('busan_v36_live_rate', 0.024).data) || 0.024;
    window.v37SimulatedDate = StorageEngine.get('busan_v37_simulated_date', 'real').data;
    window.currentLightboxUrl = '';
    window.currentLightboxKey = '';
    window.voiceData        = (Array.isArray(window.voiceData) && window.voiceData.length > 0) ? window.voiceData : (StorageEngine.get('busan_v36_voice', []).data || []);
    if (!window.voiceData || window.voiceData.length === 0) {
        window.voiceData    = (window.CANONICAL_VOICE_FALLBACK || []).slice();
    }
    window.prepData         = (Array.isArray(window.prepData) && window.prepData.length > 0) ? window.prepData : (StorageEngine.get('busan_v36_prepData', []).data || []);
    // Decrypted private data is memory-only and starts locked on every boot.
    window.privateBills     = [];
    window.sharedBills      = window.sharedBills || [];
    window.currentBillTab   = '公費';
    window.currentShopSubTab  = 'my';
    window.currentFoodSubTab  = 'my';
    window.currentRecShopFilter = 'ALL';
    window.ticketData       = (Array.isArray(window.ticketData) && window.ticketData.length > 0) ? window.ticketData : (StorageEngine.get('busan_v36_tickets', []).data || []);
    window.itineraryData    = (Array.isArray(window.itineraryData) && window.itineraryData.length > 0) ? window.itineraryData : (StorageEngine.get('busan_v36_itinerary', []).data || []);
    if (!window.itineraryData || window.itineraryData.length === 0) {
        window.itineraryData = window.RECOMMENDED_ITINERARY || [];
    }
    window.currentFilterDay = '11/13';
    window.editingItiKey    = null;
    window.shopList         = (Array.isArray(window.shopList) && window.shopList.length > 0) ? window.shopList : (StorageEngine.get('busan_v36_shopList', []).data || []);
    window.currentShopOwner = 'user1';
    window.guideData        = (Array.isArray(window.guideData) && window.guideData.length > 0) ? window.guideData : (StorageEngine.get('busan_v36_guide', []).data || []);
    window.currentGuideTab  = '打卡景點';
    window.editingGuideKey  = null;
    window.photoList        = window.photoList || [];
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
            const hadController = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
                if (navigator.onLine && typeof reg.update === 'function') {
                    reg.update().catch(() => {});
                }
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
                if (hadController && !refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        });
    }

    function _showSwUpdateBanner(worker) {
        if (document.getElementById('swUpdateBanner')) return;
        const d = document.createElement('div');
        d.id = 'swUpdateBanner';
        d.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#2c3e50;color:#fff;' +
            'padding:10px 18px;border-radius:20px;box-shadow:0 8px 25px rgba(0,0,0,.35);' +
            'z-index:9999;display:flex;gap:12px;align-items:center;font-size:.85rem;font-weight:700;white-space:nowrap;pointer-events:none;';
        d.innerHTML = '<span>🚀 發現新版，立即更新</span>' +
            '<button id="swUpdateBtn" style="background:#2ecc71;border:none;color:#fff;' +
            'padding:6px 14px;border-radius:12px;cursor:pointer;font-weight:900;pointer-events:auto;">更新</button>';
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
    let bootTimeout = null;
    let hasBooted = false;

    function bootApp() {
        if (hasBooted) return;
        hasBooted = true;
        if (bootTimeout) {
            clearTimeout(bootTimeout);
            bootTimeout = null;
        }
        const splash = document.getElementById('splash');
        const app    = document.getElementById('mainApp');
        if (splash) {
            splash.style.transition = 'opacity 300ms ease';
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                if (app) {
                    app.style.display = 'block';
                    app.offsetHeight; // force reflow
                    app.style.opacity = '1';
                }
            }, 300);
        } else if (app) {
            app.style.display = 'block';
            app.offsetHeight;
            app.style.opacity = '1';
        }
    }

    // Safety fallback: boot after 2.5s regardless of image loading
    bootTimeout = setTimeout(() => {
        bootApp();
    }, 2500);

    window.enterApp = function () {
        bootApp();
    };

    window.forceShowApp = function () {
        // Keep splash visible for 1.2s then fade out
        setTimeout(() => {
            bootApp();
        }, 1200);
    };

    // ── Private-ledger PIN presentation ──────────────────────────────────
    function profileLabel(profile) {
        const item = profile === 'user1' ? window.u1 : window.u2;
        return `${item.avatar} ${item.name}`;
    }

    function setupPwaInstallUx() {
        const engine = window.PwaInstallEngine;
        const bar = document.getElementById('pwaInstallBar');
        const text = document.getElementById('pwaInstallText');
        const installButton = document.getElementById('pwaInstallBtn');
        const dismissButton = document.getElementById('pwaInstallDismiss');
        const dialog = document.getElementById('pwaIosDialog');
        const closeButton = document.getElementById('pwaIosClose');
        if (!engine || !bar || !installButton || !dismissButton || !dialog || !closeButton) return;

        function closeIosHelp() {
            dialog.hidden = true;
            installButton.focus();
        }

        function renderInstallState(state) {
            const visible = state.canPrompt || state.showIosHelp;
            bar.hidden = !visible;
            if (!visible) dialog.hidden = true;
            if (state.showIosHelp) {
                text.textContent = '在 iPhone / iPad 上把 BUSAN.11 加到主畫面。';
                installButton.textContent = '📲 加入 iPhone 主畫面';
            } else {
                text.textContent = '把 BUSAN.11 加到主畫面，旅途中可更快開啟。';
                installButton.textContent = '📲 安裝成 App';
            }
        }

        engine.subscribe(renderInstallState);
        installButton.addEventListener('click', async function () {
            const state = engine.getState();
            if (state.showIosHelp) {
                dialog.hidden = false;
                closeButton.focus();
                return;
            }
            await engine.promptInstall();
        });
        dismissButton.addEventListener('click', function () { engine.dismiss(); });
        closeButton.addEventListener('click', closeIosHelp);
        dialog.addEventListener('click', function (event) {
            if (event.target === dialog) closeIosHelp();
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !dialog.hidden) closeIosHelp();
        });
    }

    function setBillTab(type) {
        window.currentBillTab = type;
        const shared = document.getElementById('tabShared');
        const priv = document.getElementById('tabPrivate');
        if (shared) shared.classList.toggle('active', type === '公費');
        if (priv) priv.classList.toggle('active', type === '私帳');
    }

    function refreshAccountingNow() {
        if (typeof triggerContextUpdateImmediate === 'function') triggerContextUpdateImmediate();
        else if (typeof renderBills === 'function') renderBills();
    }

    function finishPinRequest(result) {
        const resolve = window._pinResolve;
        window._pinResolve = null;
        window._pinPromise = null;
        window._pinProfile = null;
        window._pinMode = null;
        if (typeof resolve === 'function') resolve(result);
    }

    window.ensurePrivateLedgerUnlocked = function () {
        const profile = window.deviceOwner;
        if (PrivateLedgerEngine.isUnlocked(profile)) return Promise.resolve(true);
        if (window._pinPromise) return window._pinPromise;

        let setup;
        try {
            setup = !PrivateLedgerEngine.hasVault(profile);
        } catch (_) {
            PrivateLedgerEngine.lock();
            showToast('無法讀取個人私帳，請稍後再試', 'error');
            return Promise.resolve(false);
        }
        const modal = document.getElementById('pinModal');
        const title = document.getElementById('pinTitle');
        const msg = document.getElementById('pinMsg');
        const pin = document.getElementById('pinInput');
        const confirmationWrap = document.getElementById('pinConfirmWrap');
        const confirmation = document.getElementById('pinConfirmInput');
        const submit = document.getElementById('pinSubmitBtn');

        window._pinProfile = profile;
        window._pinMode = setup ? 'setup' : 'unlock';
        if (title) title.textContent = setup ? '🔐 設定個人私帳 PIN' : `🔒 解鎖「${profileLabel(profile)}」個人私帳`;
        if (msg) msg.textContent = setup ? `為「${profileLabel(profile)}」設定專屬 PIN` : '請輸入此個人私帳的 PIN';
        if (confirmationWrap) confirmationWrap.style.display = setup ? 'block' : 'none';
        if (submit) submit.textContent = setup ? '設定並解鎖' : '解鎖';
        if (pin) pin.value = '';
        if (confirmation) confirmation.value = '';
        if (modal) modal.style.display = 'flex';
        setTimeout(() => pin?.focus(), 0);

        window._pinPromise = new Promise(resolve => { window._pinResolve = resolve; });
        return window._pinPromise;
    };

    window.submitPin = async function () {
        const pin = document.getElementById('pinInput');
        const confirmation = document.getElementById('pinConfirmInput');
        const msg = document.getElementById('pinMsg');
        const profile = window._pinProfile;
        if (!pin || !profile) return;

        try {
            if (window._pinMode === 'setup') {
                if (!/^\d{4,12}$/.test(pin.value) || pin.value !== confirmation?.value) {
                    if (msg) msg.textContent = '請輸入 4–12 位數字，並確認兩次 PIN 相同';
                    pin.value = '';
                    if (confirmation) confirmation.value = '';
                    return;
                }
                await PrivateLedgerEngine.setup(profile, pin.value, confirmation.value);
            } else {
                await PrivateLedgerEngine.unlock(profile, pin.value);
            }
            if (profile !== window.deviceOwner) {
                PrivateLedgerEngine.lock();
                throw new Error('Profile changed during unlock');
            }
            window.privateBills = PrivateLedgerEngine.getBills(profile);
            document.getElementById('pinModal').style.display = 'none';
            pin.value = '';
            if (confirmation) confirmation.value = '';
            finishPinRequest(true);
        } catch (_) {
            PrivateLedgerEngine.lock();
            if (msg) msg.textContent = '無法解鎖，請確認 PIN 後重試';
            pin.value = '';
            if (confirmation) confirmation.value = '';
        }
    };

    window.cancelPin = function () {
        const modal = document.getElementById('pinModal');
        if (modal) modal.style.display = 'none';
        PrivateLedgerEngine.lock();
        setBillTab('公費');
        refreshAccountingNow();
        finishPinRequest(false);
    };

    // ── Tab Navigation ────────────────────────────────────────────────────
    window.showV37Tab = function (id, btn, options = {}) {
        try {
            if (!options || options.haptic !== false) {
                triggerHapticFeedback();
            }
            document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => {
                n.classList.remove('active');
                n.setAttribute('aria-selected', 'false');
            });

            // index.html uses id="guide" for home container, and memory lives inside wallet container
            const targetId = (id === 'home') ? 'guide' : (id === 'photo' ? 'wallet' : id);
            const el = document.getElementById(targetId);
            if (el) el.classList.add('active');
            if (btn) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
            }

            // Hide fabBack when switching away from guide
            if (id !== 'home' && id !== 'guide') {
                const fab = document.getElementById('fabBack');
                if (fab) fab.style.display = 'none';
            }

            // Trigger appropriate lazy initialisation per tab
            if (id === 'home' || id === 'guide') {
                if (typeof renderV37HomeDashboard === 'function') renderV37HomeDashboard();
            } else if (id === 'itinerary') {
                filterItineraryDay(getV37SelectedDate(), null);
            } else if (id === 'split') {
                if (typeof renderProfileSelector === 'function') renderProfileSelector();
                if (typeof renderBills === 'function') renderBills();
            } else if (id === 'wallet') {
                if (typeof switchWalletTab === 'function') switchWalletTab('ticket');
            } else if (id === 'shop') {
                if (typeof setShopTabMode === 'function') setShopTabMode('my');
            } else if (id === 'photo') {
                if (typeof switchWalletTab === 'function') switchWalletTab('memory');
                if (typeof renderMemoryAlbum === 'function') renderMemoryAlbum();
            }
        } catch (err) {
            console.error('[App] showV37Tab failed:', err);
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
    window.renderProfileSelector = function () {
        const sel = document.getElementById('deviceOwner');
        if (!sel) return;
        const currentSaved = StorageEngine.get('busan_v36_owner', 'user1').data || 'user1';
        const currentVal = sel.value || window.deviceOwner || currentSaved;
        
        sel.innerHTML = '';
        const profiles = [
            { key: 'user1', name: (window.u1 && window.u1.name) || '溫', avatar: (window.u1 && window.u1.avatar) || '👩' },
            { key: 'user2', name: (window.u2 && window.u2.name) || '鴨', avatar: (window.u2 && window.u2.avatar) || '🦆' }
        ];

        profiles.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.key;
            opt.textContent = `${p.avatar} ${p.name}`;
            if (p.key === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });

        if (sel.value) {
            const ownerChanged = sel.value !== window.deviceOwner;
            if (ownerChanged) {
                PrivateLedgerEngine.lock();
                setBillTab('公費');
                finishPinRequest(false);
            }
            window.deviceOwner = sel.value;
            StorageEngine.set('busan_v36_owner', sel.value);
            if (ownerChanged) refreshAccountingNow();
        }
        togglePayerSelect();
    };

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
        renderProfileSelector();
        triggerContextUpdate();
    };

    window.updateOwner = function () {
        const sel = document.getElementById('deviceOwner');
        if (!sel || !sel.value) return;
        if (sel.value !== window.deviceOwner) {
            PrivateLedgerEngine.lock();
            setBillTab('公費');
            const modal = document.getElementById('pinModal');
            if (modal) modal.style.display = 'none';
            finishPinRequest(false);
        }
        window.deviceOwner = sel.value;
        StorageEngine.set('busan_v36_owner', sel.value);
        togglePayerSelect();
        refreshAccountingNow();
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

    window.filterBillsWithPin = async function (type) {
        if (type === '私帳' && !await ensurePrivateLedgerUnlocked()) return;
        setBillTab(type);
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
        const payer    = type === '私帳' ? window.deviceOwner : (payerEl?.value || window.deviceOwner);
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
            if (!await ensurePrivateLedgerUnlocked()) return;
            const id = `${Date.now()}-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
            try {
                await PrivateLedgerEngine.add(window.deviceOwner, { ...bill, id });
            } catch (_) {
                showToast('個人私帳未能安全儲存，請稍後再試', 'error');
                return;
            }
            window.privateBills = PrivateLedgerEngine.getBills(window.deviceOwner);
            refreshAccountingNow();
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

    window.deletePrivateBill = async function (id) {
        if (!confirm('確認刪除此筆私帳？')) return;
        if (!await ensurePrivateLedgerUnlocked()) return;
        try {
            await PrivateLedgerEngine.remove(window.deviceOwner, id);
        } catch (_) {
            showToast('個人私帳未能安全更新，請稍後再試', 'error');
            return;
        }
        window.privateBills = PrivateLedgerEngine.getBills(window.deviceOwner);
        refreshAccountingNow();
    };

    // ── Firebase Listeners (centralised — all data flows into global arrays) ──
    function initFirebaseListeners() {
        try {
            if (!window.NetworkEngine || !NetworkEngine._db) {
                console.warn('[App] NetworkEngine not ready — Firebase listeners skipped');
                return;
            }

            NetworkEngine.firebaseOn(DB_HOTEL, snap => {
                try {
                    window.hotelData = snap.exists() ? snap.val() : {};
                    if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
                } catch (e) { console.error('[FirebaseOn DB_HOTEL]', e); }
            });

            NetworkEngine.firebaseOn(DB_BILLS, snap => {
                try {
                    window.sharedBills = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { window.sharedBills.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (typeof renderBills === 'function') renderBills();
                    if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
                } catch (e) { console.error('[FirebaseOn DB_BILLS]', e); }
            });

            NetworkEngine.firebaseOn(DB_SHOP, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.shopList = loaded;
                        StorageEngine.set('busan_v36_shopList', window.shopList);
                    }
                    if (typeof renderShop === 'function') renderShop();
                } catch (e) { console.error('[FirebaseOn DB_SHOP]', e); }
            });

            NetworkEngine.firebaseOn(DB_GUIDE, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.guideData = loaded;
                        StorageEngine.set('busan_v36_guide', window.guideData);
                    }
                    if (typeof renderGuideContent === 'function') renderGuideContent();
                } catch (e) { console.error('[FirebaseOn DB_GUIDE]', e); }
            });

            NetworkEngine.firebaseOn(DB_PHOTOS, snap => {
                try {
                    window.photoList = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { window.photoList.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (typeof renderMemoryAlbum === 'function') renderMemoryAlbum();
                } catch (e) { console.error('[FirebaseOn DB_PHOTOS]', e); }
            });

            NetworkEngine.firebaseOn(DB_ITI, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.itineraryData = loaded;
                        StorageEngine.set('busan_v36_itinerary', window.itineraryData);
                    } else {
                        // Do NOT wipe out existing itineraryData if snapshot is empty
                        if (!window.itineraryData || window.itineraryData.length === 0) {
                            const cached = StorageEngine.get('busan_v36_itinerary');
                            if (cached && cached.success && Array.isArray(cached.data) && cached.data.length > 0) {
                                window.itineraryData = cached.data;
                            } else if (window.RECOMMENDED_ITINERARY && window.RECOMMENDED_ITINERARY.length > 0) {
                                window.itineraryData = window.RECOMMENDED_ITINERARY;
                            }
                        }
                    }
                    if (typeof renderItinerary === 'function') renderItinerary();
                    if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
                } catch (e) { console.error('[FirebaseOn DB_ITI]', e); }
            });

            NetworkEngine.firebaseOn(DB_PREP, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.prepData = loaded;
                        StorageEngine.set('busan_v36_prepData', window.prepData);
                    }
                    if (typeof renderPrepList === 'function') renderPrepList();
                    if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
                } catch (e) { console.error('[FirebaseOn DB_PREP]', e); }
            });

            NetworkEngine.firebaseOn(DB_TICKETS, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.ticketData = loaded;
                        StorageEngine.set('busan_v36_tickets', window.ticketData);
                    }
                    if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
                } catch (e) { console.error('[FirebaseOn DB_TICKETS]', e); }
            });

            NetworkEngine.firebaseOn(DB_VOICE, snap => {
                try {
                    const loaded = [];
                    if (snap && typeof snap.forEach === 'function') {
                        snap.forEach(ch => { loaded.push({ ...ch.val(), key: ch.key }); });
                    }
                    if (loaded.length > 0) {
                        window.voiceData = loaded;
                        StorageEngine.set('busan_v36_voice', window.voiceData);
                    }
                    if (typeof renderVoiceList === 'function') renderVoiceList();
                } catch (e) { console.error('[FirebaseOn DB_VOICE]', e); }
            });

            NetworkEngine.firebaseOn(DB_PROFILE, snap => {
                try {
                    if (snap && typeof snap.exists === 'function' && snap.exists()) {
                        const data = snap.val();
                        if (data) {
                            if (data.user1) {
                                window.u1 = {
                                    key: 'user1',
                                    name: data.user1.name || window.u1.name || '溫',
                                    avatar: data.user1.avatar || window.u1.avatar || '👩'
                                };
                            }
                            if (data.user2) {
                                window.u2 = {
                                    key: 'user2',
                                    name: data.user2.name || window.u2.name || '鴨',
                                    avatar: data.user2.avatar || window.u2.avatar || '🦆'
                                };
                            }
                            const u1a = document.getElementById('editU1Avatar');
                            const u1n = document.getElementById('editU1Name');
                            const u2a = document.getElementById('editU2Avatar');
                            const u2n = document.getElementById('editU2Name');
                            if (u1a && window.u1.avatar) u1a.value = window.u1.avatar;
                            if (u1n && window.u1.name) u1n.value = window.u1.name;
                            if (u2a && window.u2.avatar) u2a.value = window.u2.avatar;
                            if (u2n && window.u2.name) u2n.value = window.u2.name;
                        }
                    }
                    if (typeof renderProfileSelector === 'function') renderProfileSelector();
                    if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
                } catch (e) { console.error('[FirebaseOn DB_PROFILE]', e); }
            });
        } catch (err) {
            console.error('[App] initFirebaseListeners failed:', err);
        }
    }

    // ── Offline Sync (15-second interval — runs in app.js because it owns the queue) ──
    setInterval(() => { if (navigator.onLine) syncOfflineQueue(); }, 15000);

    // ── Bootstrap ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        setupPwaInstallUx();

        // Guarantee UI visibility regardless of network or API failure
        try {
            if (typeof window.forceShowApp === 'function') {
                window.forceShowApp();
            }
        } catch (e) {
            console.error('[App] forceShowApp failed:', e);
        }

        // Firebase is initialised by firebase.js which loads before app.js
        try {
            initFirebaseListeners();
            if (typeof renderProfileSelector === 'function') {
                renderProfileSelector();
            }
        } catch (e) {
            console.error('[App] initFirebaseListeners failed:', e);
        }

        // Exchange rate (NetworkEngine.getExchangeRate only exists in ute/ute_network.js)
        try {
            if (window.NetworkEngine && NetworkEngine.getExchangeRate) {
                NetworkEngine.getExchangeRate().then(res => {
                    if (res && res.data && res.data.krwToTwd) {
                        window.liveKrwToTwd = res.data.krwToTwd;
                        const el = document.getElementById('liveFxRate');
                        if (el) el.innerText = `1 KRW ≈ ${res.data.krwToTwd.toFixed(4)} TWD`;
                        StorageEngine.set('busan_v36_live_rate', res.data.krwToTwd);
                    }
                }).catch(err => console.warn('[App] getExchangeRate failed:', err));
            }
        } catch (e) {
            console.warn('[App] Exchange rate setup error:', e);
        }

        // Live Weather fetch on boot
        try {
            if (window.WeatherEngine && typeof WeatherEngine.fetchAll === 'function') {
                WeatherEngine.fetchAll().then(() => {
                    if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
                }).catch(err => console.warn('[App] Weather fetch error:', err));
            }
        } catch (e) {
            console.warn('[App] WeatherEngine.fetchAll setup error:', e);
        }

        // Payer dropdown initial state
        try {
            togglePayerSelect();
        } catch (e) {
            console.warn('[App] togglePayerSelect error:', e);
        }

        // Keyboard navigation for bottom tabs
        try {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.click();
                    }
                });
            });
        } catch (e) {
            console.warn('[App] nav-item keyboard setup error:', e);
        }

        // Keyboard navigation for fab-back
        try {
            const fabBack = document.getElementById('fabBack');
            if (fabBack) {
                fabBack.addEventListener('keydown', e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (typeof closeGuideFolder === 'function') closeGuideFolder();
                    }
                });
            }
        } catch (e) {
            console.warn('[App] fabBack keyboard setup error:', e);
        }

        // Show home tab
        try {
            const firstNavBtn = document.querySelector('.bottom-nav .nav-item');
            showV37Tab('home', firstNavBtn, { haptic: false });
        } catch (e) {
            console.error('[App] showV37Tab initial error:', e);
        }
    });

})();
