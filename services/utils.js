// ─────────────────────────────────────────────────────────────────────────
// V41 Refactored: Utility Helpers
// Canonical source for: safeValue, safePrice, safeUrl, calculateNights,
// getMapLinks, copyWiFi, copyAddress, copyTaxiHelper, triggerHapticFeedback,
// compressImage, uploadSingleToImgBB, uploadMultipleToImgBB,
// isRestrictedPath, addToOfflineQueue, syncOfflineQueue
// ─────────────────────────────────────────────────────────────────────────

window.safeValue = function(val, fallback = "尚未填寫") {
    return (val && val !== "尚未填寫") ? val : fallback;
};

window.safeNumber = function(val, fallback = "0") {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
};

window.safePrice = function(val, currency = "TWD") {
    const num = Number(val);
    if (isNaN(num)) return "尚未填寫";
    return `${currency === 'KRW' ? '₩' : '$'}${Math.round(num).toLocaleString()}`;
};

window.safeUrl = function(url, text, iconClass, bg, color) {
    if (!url || url === "尚未填寫") return '';
    return `<a href="${url}" target="_blank" class="map-tag" style="background:${bg}; color:${color};"><i class="${iconClass}"></i> ${text}</a>`;
};

window.calculateNights = function(inDate, outDate) {
    if (!inDate || !outDate || inDate === "尚未填寫" || outDate === "尚未填寫") return null;
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diff = d2 - d1;
    return isNaN(diff) ? null : Math.round(diff / (1000 * 60 * 60 * 24));
};

window.getMapLinks = function(address) {
    if (!address || address === "尚未填寫") return {};
    const encAddr = encodeURIComponent(address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    return {
        google: `https://www.google.com/maps/search/?api=1&query=${encAddr}`,
        naver: `https://map.naver.com/v5/search/${encAddr}`,
        kakao: `https://map.kakao.com/?q=${encAddr}`,
        apple: isIOS ? `maps://?q=${encAddr}` : `https://maps.apple.com/?q=${encAddr}`
    };
};

window.triggerHapticFeedback = function() {
    if (navigator.vibrate) navigator.vibrate(15);
};

window.copyWiFi = function(str) {
    if (!str || str === "尚未填寫") { showToast("無資料可複製", "warning"); return; }
    navigator.clipboard.writeText(str).then(() => {
        triggerHapticFeedback();
        showToast(`WiFi 資訊已複製: ${str}`, "success");
    });
};

window.copyAddress = function(str) {
    if (!str || str === "尚未填寫") { showToast("無地址可複製", "warning"); return; }
    navigator.clipboard.writeText(str).then(() => {
        triggerHapticFeedback();
        showToast("地址已複製到剪貼簿", "success");
    });
};

window.copyTaxiHelper = function(str) {
    if (!str || str === "尚未填寫") { showToast("無地址可複製", "warning"); return; }
    const fullText = `기사님, 여기로 부탁드립니다.\n\n${str}`;
    navigator.clipboard.writeText(fullText).then(() => {
        triggerHapticFeedback();
        showToast("計程車字條已複製，可直接貼給司機看！", "success");
    });
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
    if (queue.length === 0) { window.isSyncing = false; return; }
    showToast(`⏳ 偵測到網路恢復，正在同步離線佇列 (${queue.length} 筆)...`, "info");
    let successCount = 0;
    let failed = false;
    while (queue.length > 0) {
        const item = queue[0];
        try {
            if (item.method === 'SET') await NetworkEngine.firebaseWrite(item.path, item.data);
            else if (item.method === 'UPDATE') await NetworkEngine.firebaseUpdate(item.path, item.data);
            else if (item.method === 'REMOVE') await NetworkEngine.firebaseRemove(item.path);
            else if (item.method === 'PUSH') await NetworkEngine.firebasePush(item.path, item.data);
            queue.shift();
            successCount++;
        } catch (err) {
            failed = true;
            break;
        }
    }
    StorageEngine.set('pendingSyncQueue', queue);
    window.isSyncing = false;
    if (successCount > 0) showToast(`✅ 離線同步完成：已更新 ${successCount} 筆！`, "success");
    if (failed) showToast("❌ 部分同步失敗，將於網路恢復時重試", "error");
};

window.compressImage = function(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                const maxDim = 1200;
                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim; }
                    else { width = Math.round((width * maxDim) / height); height = maxDim; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.85);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

window.uploadSingleToImgBB = async function(file, type) {
    const statusId = { shop: 'shopUploadStatus', receipt: 'receiptStatus', guide: 'guideUploadStatus', ticket: 'voucherStatus' }[type] || 'voucherStatus';
    const hiddenId = { shop: 'tempShopImg', receipt: 'tempReceipt', guide: 'tempGuideImg', ticket: 'tempVoucher' }[type] || 'tempVoucher';
    const status = document.getElementById(statusId);
    const hidden = document.getElementById(hiddenId);
    if (!file) return;
    if (status) status.innerText = "壓縮並上傳中...";
    try {
        const compressed = await compressImage(file);
        const res = await NetworkEngine.uploadImage(compressed);
        const url = res.data ? res.data.url : (res.data && res.data.url);
        if (!url) throw new Error("No URL returned");
        if (hidden) hidden.value = url;
        if (status) status.innerText = "✅ 上傳成功！";
        showToast("圖片上傳成功", "success");
    } catch (err) {
        if (status) status.innerText = "❌ 上傳失敗";
        showToast("上傳失敗：" + err.message, "error");
    }
};

window.uploadMultipleToImgBB = async function(files, type) {
    const status = document.getElementById('photoUploadStatus');
    if (!files || files.length === 0) return;
    if (status) status.innerText = `準備上傳 ${files.length} 張照片...`;
    let success = 0;
    for (let i = 0; i < files.length; i++) {
        if (status) status.innerText = `⏳ 正在上傳第 ${i + 1}/${files.length} 張...`;
        try {
            const compressed = await compressImage(files[i]);
            const res = await NetworkEngine.uploadImage(compressed);
            const url = res.data ? res.data.url : null;
            if (!url) throw new Error("No URL");
            await NetworkEngine.firebasePush(DB_PHOTOS, { url, date: getV37SelectedDate(), timestamp: Date.now() });
            success++;
        } catch (err) { /* skip failed photo */ }
    }
    if (status) status.innerText = `✅ 上傳完成，成功 ${success}/${files.length} 張！`;
    showToast(`📸 成功批次上傳了 ${success} 張回憶！`, "success");
};
