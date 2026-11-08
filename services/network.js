// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Network Service (Firebase & REST Network Engine)
// ─────────────────────────────────────────────────────────────────────────

window.NetworkEngine = {
    firebaseRootUrl: function() {
        return "https://busan-trip-2026-4148f-default-rtdb.asia-southeast1.firebasedatabase.app/";
    },
    
    firebaseOn: function(path, callback) {
        if (!window.firebase || !firebase.apps.length) return;
        firebase.database().ref(path).on('value', callback);
    },
    
    firebaseWrite: async function(path, data) {
        if (!navigator.onLine && isRestrictedPath(path)) {
            addToOfflineQueue('SET', path, data);
            showToast("📴 處於離線狀態，交易已排入同步佇列", "info");
            return;
        }
        return firebase.database().ref(path).set(data);
    },
    
    firebaseUpdate: async function(path, data) {
        if (!navigator.onLine && isRestrictedPath(path)) {
            addToOfflineQueue('UPDATE', path, data);
            showToast("📴 處於離線狀態，變更已排入同步佇列", "info");
            return;
        }
        return firebase.database().ref(path).update(data);
    },
    
    firebaseRemove: async function(path) {
        if (!navigator.onLine && isRestrictedPath(path)) {
            addToOfflineQueue('REMOVE', path, null);
            showToast("📴 處於離線狀態，刪除操作已排入佇列", "info");
            return;
        }
        return firebase.database().ref(path).remove();
    },
    
    firebasePush: async function(path, data) {
        if (!navigator.onLine && isRestrictedPath(path)) {
            addToOfflineQueue('PUSH', path, data);
            showToast("📴 處於離線狀態，新增項目已排入佇列", "info");
            return { key: "offline_" + Date.now() };
        }
        return firebase.database().ref(path).push(data);
    },
    
    getWeather: async function(city) {
        // Fallback or static mock weather
        return {
            data: {
                temp: city === 'Busan' ? 18 : 15,
                desc: 'Sunny'
            }
        };
    },
    
    uploadImage: async function(file) {
        const IMGBB_API_KEY = "ba1b2b24f8275c9d3a199bea5cd52bf9";
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: fd
        });
        if (!res.ok) throw new Error("ImgBB upload failed");
        return res.json();
    }
};

window.isRestrictedPath = function(path) {
    const p = path.toLowerCase();
    return p.includes('prep') || p.includes('bill') || p.includes('profile') || p.includes('shop');
};

window.addToOfflineQueue = function(method, path, data) {
    let queue = StorageEngine.get('pendingSyncQueue', []).data;
    queue.push({ method, path, data, timestamp: Date.now() });
    StorageEngine.set('pendingSyncQueue', queue);
};

window.syncOfflineQueue = async function() {
    if (window.isSyncing) return;
    window.isSyncing = true;
    let queue = StorageEngine.get('pendingSyncQueue', []).data;
    if (queue.length === 0) {
        window.isSyncing = false;
        return;
    }
    showToast(`⏳ 偵測到網路恢復，正在同步離線佇列 (${queue.length} 筆)...`, "info");
    let successCount = 0;
    let failed = false;
    while (queue.length > 0) {
        const item = queue[0];
        try {
            if (item.method === 'SET') {
                await firebase.database().ref(item.path).set(item.data);
            } else if (item.method === 'UPDATE') {
                await firebase.database().ref(item.path).update(item.data);
            } else if (item.method === 'REMOVE') {
                await firebase.database().ref(item.path).remove();
            } else if (item.method === 'PUSH') {
                await firebase.database().ref(item.path).push(item.data);
            }
            queue.shift();
            successCount++;
        } catch (err) {
            console.error("Offline sync error:", err);
            failed = true;
            break;
        }
    }
    StorageEngine.set('pendingSyncQueue', queue);
    window.isSyncing = false;
    if (successCount > 0) {
        showToast(`✅ 離線同步完成：已更新 ${successCount} 筆交易！`, "success");
    }
    if (failed) {
        showToast("❌ 部分同步失敗，將於下一次網路恢復時重試", "error");
    }
};
