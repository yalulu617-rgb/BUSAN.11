// ─────────────────────────────────────────────────────────────────────────
// V41.4 Production Entry Point (Safe Recovery Edition)
// ─────────────────────────────────────────────────────────────────────────

(function () {
    // ── 1. 全域變數安全初始化 ──────────────────────────────────────────────
    window.hotelData        = window.hotelData || {};
    window.u1               = window.u1 || { key: 'user1', name: '溫', avatar: '👩' };
    window.u2               = window.u2 || { key: 'user2', name: '鴨', avatar: '🦆' };
    window.deviceOwner      = (window.StorageEngine && StorageEngine.get) ? StorageEngine.get('busan_v36_owner', 'user1').data : 'user1';
    window.liveKrwToTwd     = 0.0240;
    window.v37SimulatedDate = 'real';
    window.currentLightboxUrl = '';
    window.currentLightboxKey = '';
    window.voiceData        = [];
    window.prepData         = [];
    window.privateBills     = (window.StorageEngine && StorageEngine.get) ? StorageEngine.get('busan_v36_p_bills', []).data : [];
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

    // ── 2. 進入 APP 開關 ─────────────────────────────────────────────────
    window.enterApp = function () {
        const splash = document.getElementById('splash');
        const app = document.getElementById('mainApp');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; }, 400);
        }
        if (app) {
            app.style.display = 'block';
            app.style.opacity = '1';
        }
    };

    // ── 3. 切換 Tab ──────────────────────────────────────────────────────
    window.showV37Tab = function (id, btn) {
        try {
            if (typeof triggerHapticFeedback === 'function') triggerHapticFeedback();
            document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

            const targetId = (id === 'home') ? 'guide' : id;
            const el = document.getElementById(targetId);
            if (el) el.classList.add('active');
            if (btn) btn.classList.add('active');

            if ((id === 'home' || id === 'guide') && typeof renderV37HomeDashboard === 'function') {
                renderV37HomeDashboard();
            } else if (id === 'itinerary' && typeof filterItineraryDay === 'function') {
                filterItineraryDay(getV37SelectedDate(), null);
            } else if (id === 'split' && typeof renderBills === 'function') {
                renderBills();
            } else if (id === 'wallet' && typeof switchWalletTab === 'function') {
                switchWalletTab('ticket');
            } else if (id === 'shop' && typeof setShopTabMode === 'function') {
                setShopTabMode('my');
            } else if (id === 'photo' && typeof switchWalletTab === 'function') {
                switchWalletTab('memory');
            }
        } catch (err) {
            console.warn('[Tab Switch Safe Shield]:', err);
        }
    };

    // ── 4. 日期與捷徑輔助 ────────────────────────────────────────────────
    window.getTravelDay = function () {
        if (window.v37SimulatedDate === 'real') {
            const d = new Date().getDate();
            const m = new Date().getMonth() + 1;
            if (m === 11 && d >= 13 && d <= 17) return `11/${d}`;
            return '11/10';
        }
        return window.v37SimulatedDate;
    };
    window.getV37SelectedDate = function () { return getTravelDay(); };
    window.setV37SelectedDate = function (val) {
        window.v37SimulatedDate = val;
        if (window.StorageEngine) StorageEngine.set('busan_v37_simulated_date', val);
        if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
    };

    window.openPapago = function () { window.open('https://papago.naver.com/', '_blank'); };
    window.autoFetchMap = function (titleId, linkId) {
        const titleEl = document.getElementById(titleId);
        if (!titleEl || !titleEl.value) return;
        const q = encodeURIComponent(titleEl.value);
        const linkEl = document.getElementById(linkId);
        if (linkEl) linkEl.value = `https://map.naver.com/v5/search/${q}`;
        if (typeof showToast === 'function') showToast('已自動填入 Naver Map 連結', 'info');
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

    // ── 5. 使用者身分與記帳 CRUD ──────────────────────────────────────────
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
        if (typeof showToast === 'function') showToast('✅ 頭像與名稱已儲存', 'success');
        if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
    };

    window.updateOwner = function () {
        const sel = document.getElementById('deviceOwner');
        if (!sel) return;
        window.deviceOwner = sel.value;
        if (window.StorageEngine) StorageEngine.set('busan_v36_owner', sel.value);
    };

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
        if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
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
        if (taxEl) taxEl.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> 預估可退稅：₩${taxRefund.toLocaleString()}`;
        resultEl.style.display = 'block';
    };

    window.quickAddBill = function () {
        const krwEl  = document.getElementById('quickKrw');
        const amtEl  = document.getElementById('billAmt');
        const curEl  = document.getElementById('billCurrency');
        if (!krwEl || !krwEl.value) return;
        if (amtEl) amtEl.value = krwEl.value;
        if (curEl) curEl.value = 'KRW';
        if (typeof showToast === 'function') showToast('已填入金額，請輸入項目名稱後儲存', 'info');
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
            if (typeof showToast === 'function') showToast('請填入項目名稱與金額', 'warning');
            return;
        }

        const bill = { name, amt, currency, type, payer, method, receipt, day: getV37SelectedDate(), ts: Date.now() };

        if (type === '公費' && window.NetworkEngine) {
            await NetworkEngine.firebasePush(DB_BILLS, bill);
        } else if (window.StorageEngine) {
            const pb = StorageEngine.get('busan_v36_p_bills', []).data;
            pb.push({ ...bill, id: String(Date.now()) });
            StorageEngine.set('busan_v36_p_bills', pb);
            window.privateBills = pb;
            if (typeof renderBills === 'function') renderBills();
        }
        if (nameEl)    nameEl.value    = '';
        if (amtEl)     amtEl.value     = '';
        if (receiptEl) receiptEl.value = '';
        if (typeof showToast === 'function') showToast('✅ 已記帳', 'success');
        if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
    };

    window.deleteSharedBill = async function (key) {
        if (!confirm('確認刪除此筆公費記帳？')) return;
        if (window.NetworkEngine) await NetworkEngine.firebaseRemove(`${DB_BILLS}/${key}`);
    };

    window.deletePrivateBill = function (id) {
        if (!confirm('確認刪除此筆私帳？')) return;
        window.privateBills = window.privateBills.filter(b => b.id !== id);
        if (window.StorageEngine) StorageEngine.set('busan_v36_p_bills', window.privateBills);
        if (typeof renderBills === 'function') renderBills();
        if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
    };

    // ── 6. Firebase 資料庫監聽器 ──────────────────────────────────────────
    function initFirebaseListeners() {
        if (!window.NetworkEngine || !NetworkEngine._db) return;

        NetworkEngine.firebaseOn(DB_HOTEL, snap => {
            window.hotelData = snap.exists() ? snap.val() : {};
            if (typeof renderTickets_LogicOnly === 'function') renderTickets_LogicOnly();
        });

        NetworkEngine.firebaseOn(DB_BILLS, snap => {
            window.sharedBills = [];
            snap.forEach(ch => window.sharedBills.push({ ...ch.val(), key: ch.key }));
            if (typeof renderBills === 'function') renderBills();
            if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
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
            if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
        });

        NetworkEngine.firebaseOn(DB_PREP, snap => {
            window.prepData = [];
            snap.forEach(ch => window.prepData.push({ ...ch.val(), key: ch.key }));
            if (typeof renderPrepList === 'function') renderPrepList();
            if (typeof triggerContextUpdate === 'function') triggerContextUpdate();
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

    // ── 7. 啟動防護網 (Bootstrap) ──────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        try {
            initFirebaseListeners();

            if (window.NetworkEngine && NetworkEngine.getExchangeRate) {
                NetworkEngine.getExchangeRate().then(res => {
                    if (res && res.data && res.data.krwToTwd) {
                        window.liveKrwToTwd = res.data.krwToTwd;
                        const el = document.getElementById('liveFxRate');
                        if (el) el.innerText = `1 KRW ≈ ${res.data.krwToTwd.toFixed(4)} TWD`;
                        if (window.StorageEngine) StorageEngine.set('busan_v36_live_rate', res.data.krwToTwd);
                    }
                });
            }

            if (typeof togglePayerSelect === 'function') togglePayerSelect();

            if (window.triggerContextUpdateImmediate) {
                triggerContextUpdateImmediate();
            }

            const firstNavBtn = document.querySelector('.bottom-nav .nav-item');
            showV37Tab('home', firstNavBtn);
        } catch (bootErr) {
            console.error('[Boot Shield Handled Failure]:', bootErr);
        }
    });

})();
