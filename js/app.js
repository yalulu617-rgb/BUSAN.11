// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Application Initializer & Global Controller
// ─────────────────────────────────────────────────────────────────────────

(function() {
    // Application state
    window.selectedTravelDay = "";
    window.isSyncing = false;
    window.hotelData = {};
    window.u1 = { key: 'user1', name: '溫', avatar: '👩' };
    window.u2 = { key: 'user2', name: '鴨', avatar: '🦆' };
    window.deviceOwner = StorageEngine.get('busan_v36_owner', 'user1').data;
    window.targetTabAction = null; 
    window.tabRevertAction = null;
    window.liveKrwToTwd = parseFloat(StorageEngine.get('busan_v36_live_rate', 0.024).data) || 0.024;
    window.currentLightboxUrl = ""; 
    window.currentLightboxKey = "";
    window.v37SimulatedDate = StorageEngine.get('busan_v37_simulated_date', 'real').data;
    window.v37NavSource = "";
    window.voiceData = [];
    window.prepData = [];
    window.privateBills = StorageEngine.get('busan_v36_p_bills', []).data; 
    window.sharedBills = []; 
    window.currentBillTab = '公費';
    window.ticketData = [];
    window.itineraryData = []; 
    window.currentFilterDay = "11/13"; 
    window.editingItiKey = null;
    window.shopList = []; 
    window.currentShopOwner = "user1";
    window.guideData = []; 
    window.currentGuideTab = "打卡景點"; 
    window.editingGuideKey = null;
    window.photoList = [];
    window.folderMapping = { 
        '工具': [], 
        '美食景點': ['打卡景點', '必吃美食'], 
        '購物': ['伴手禮', '衣物鞋履', '小物配件', '彩妝', '保養', 'Olive Young', '當地藥局'], 
        '超商': ['GS25', 'CU', '7-11'] 
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PWA Service Worker Registration & Live Updates Prompt
    // ─────────────────────────────────────────────────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').then(reg => {
                console.log('Service Worker 註冊成功！範疇為：', reg.scope);
                
                if (reg.waiting) {
                    showUpdatePrompt(reg.waiting);
                }
                
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdatePrompt(newWorker);
                        }
                    });
                });
            }).catch(err => console.error('Service Worker 註冊失敗', err));
            
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        });
    }

    function showUpdatePrompt(worker) {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'dynamic-island active';
        promptDiv.style.cssText = "position:fixed; bottom:20px; right:20px; background:#2c3e50; color:#fff; padding:12px 18px; border-radius:14px; box-shadow:0 10px 25px rgba(0,0,0,0.25); z-index:9999; display:flex; gap:10px; align-items:center; font-weight:bold; font-size:0.82rem;";
        promptDiv.innerHTML = `
            <span>發現新版，立即更新</span>
            <button id="swUpdateBtn" style="background:#2ecc71; border:none; color:white; padding:4px 10px; border-radius:8px; cursor:pointer; font-weight:bold;">更新</button>
        `;
        document.body.appendChild(promptDiv);
        document.getElementById('swUpdateBtn').addEventListener('click', () => {
            worker.postMessage({ action: 'skipWaiting' });
            promptDiv.remove();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Date & Time Simulator Helpers
    // ─────────────────────────────────────────────────────────────────────────
    window.getTravelDay = function() {
        if (v37SimulatedDate === "real") {
            const today = new Date();
            const date = today.getDate();
            if (date === 13) return "11/13";
            if (date === 14) return "11/14";
            if (date === 15) return "11/15";
            if (date === 16) return "11/16";
            if (date === 17) return "11/17";
        }
        return v37SimulatedDate;
    };

    window.setV37SelectedDate = function(val) {
        v37SimulatedDate = val;
        StorageEngine.set('v37_simulated_date', val);
        triggerContextUpdate();
        renderV37HomeDashboard();
        renderSmartNearby();
    };

    window.getV37SelectedDate = function() {
        return getTravelDay();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Core Navigation & Tab Routing Controller
    // ─────────────────────────────────────────────────────────────────────────
    window.showV37Tab = function(id, btn) {
        triggerHapticFeedback();
        
        // Hide all screens
        document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        
        const fabBack = document.getElementById('fabBackBtn');
        if (fabBack) fabBack.style.display = 'none';
        
        // Handle target tab activation
        if (id === 'home') {
            document.getElementById('home').classList.add('active');
            if(btn) btn.classList.add('active');
            renderV37HomeDashboard();
        } else if (id === 'itinerary') {
            document.getElementById('itinerary').classList.add('active');
            if(btn) btn.classList.add('active');
            
            // Auto click current simulation day tab
            const curDay = getV37SelectedDate();
            const targetBtn = Array.from(document.querySelectorAll('#itiTabsUI .day-tab')).find(b => b.innerText.includes(curDay));
            if (targetBtn) targetBtn.click();
        } else if (id === 'split') {
            document.getElementById('split').classList.add('active');
            if(btn) btn.classList.add('active');
            renderBills();
        } else if (id === 'wallet') {
            document.getElementById('wallet').classList.add('active');
            if(btn) btn.classList.add('active');
            switchWalletTab('ticket');
        } else if (id === 'more') {
            document.getElementById('more').classList.add('active');
            if(btn) btn.classList.add('active');
        } else if (id === 'shop') {
            document.getElementById('shop').classList.add('active');
            setShopTabMode('my');
        } else if (id === 'photo') {
            document.getElementById('wallet').classList.add('active');
            switchWalletTab('memory');
        } else {
            document.getElementById(id).classList.add('active');
        }
    };

    // Dark Mode Toggle Trigger
    window.toggleDarkMode = function() {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        StorageEngine.set('busan_v36_theme', theme);
        triggerHapticFeedback();
    };

    // Initialize Theme Mode
    const savedTheme = StorageEngine.get('busan_v36_theme', 'light').data;
    document.documentElement.setAttribute('data-theme', savedTheme);

    // ─────────────────────────────────────────────────────────────────────────
    // Firebase Listeners & Initial Syncs
    // ─────────────────────────────────────────────────────────────────────────
    if (window.firebase && firebase.apps.length) {
        NetworkEngine.firebaseOn(DB_HOTEL, s => {
            if (s.exists()) {
                hotelData = s.val();
            }
            renderTickets_LogicOnly();
        });

        NetworkEngine.firebaseOn(DB_BILLS, s => {
            sharedBills = [];
            s.forEach(ch => {
                sharedBills.push({ ...ch.val(), key: ch.key });
            });
            renderBills();
        });

        NetworkEngine.firebaseOn(DB_SHOP, s => {
            shopList = [];
            s.forEach(ch => {
                shopList.push({ ...ch.val(), key: ch.key });
            });
            renderShop();
        });

        NetworkEngine.firebaseOn(DB_GUIDE, s => {
            guideData = [];
            s.forEach(ch => {
                guideData.push({ ...ch.val(), key: ch.key });
            });
            renderGuideContent();
        });

        NetworkEngine.firebaseOn(DB_PHOTOS, s => {
            photoList = [];
            s.forEach(ch => {
                photoList.push({ ...ch.val(), key: ch.key });
            });
            renderMemoryAlbum();
        });

        NetworkEngine.firebaseOn(DB_ITI, s => {
            itineraryData = [];
            s.forEach(ch => {
                itineraryData.push({ ...ch.val(), key: ch.key });
            });
            renderItinerary();
        });

        NetworkEngine.firebaseOn(DB_PREP, s => {
            prepData = [];
            s.forEach(ch => {
                prepData.push({ ...ch.val(), key: ch.key });
            });
            renderPrepList();
        });

        NetworkEngine.firebaseOn(DB_VOICE, s => {
            voiceData = [];
            s.forEach(ch => {
                voiceData.push({ ...ch.val(), key: ch.key });
            });
            renderVoiceList();
        });
    }

    // Auto-fetch exchange rates and weather updates
    setInterval(() => {
        if (navigator.onLine) {
            syncOfflineQueue();
        }
    }, 15000);

    // Initial page load bootstrap
    document.addEventListener('DOMContentLoaded', () => {
        showV37Tab('home', document.querySelector('.bottom-nav .nav-item'));
        
        // Auto pull weather outfits
        NetworkEngine.getWeather("Busan").then(res => {
            if(res && res.data) {
                console.log("Weather bootstrap success");
            }
        });
    });
})();
