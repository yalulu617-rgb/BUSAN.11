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
    if (navigator.vibrate) {
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
            return;
        }
        try {
            navigator.vibrate(15);
        } catch (e) {
            // Silently ignore if blocked by browser policy
        }
    }
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

// Fail closed: a failed Firebase response is not a completed offline sync.
// Save the remaining queue after EACH acknowledged operation so an interruption
// cannot discard later entries. No production data is touched by this logic.
window.addToOfflineQueue = function(method, path, data) {
    const stored = StorageEngine.get('pendingSyncQueue', []);
    if (!stored?.success || !Array.isArray(stored.data)) {
        showToast('❌ 無法讀取離線待同步資料；本次變更未加入佇列', 'error');
        return false;
    }
    const next = [...stored.data, { method, path, data, timestamp: Date.now() }];
    const saved = StorageEngine.set('pendingSyncQueue', next);
    if (saved?.success !== true) {
        showToast('❌ 無法儲存離線佇列；請先保留原始資料', 'error');
        return false;
    }
    return true;
};

window.syncOfflineQueue = async function() {
    if (window.isSyncing) return;
    window.isSyncing = true;
    let successCount = 0;
    let failed = false;
    try {
        const stored = StorageEngine.get('pendingSyncQueue', []);
        if (!stored?.success || !Array.isArray(stored.data)) {
            throw new Error('Cannot read pending offline sync queue');
        }
        const queue = [...stored.data];
        if (!queue.length) return;
        showToast(`⏳ 偵測到網路恢復，正在同步離線佇列 (${queue.length} 筆)...`, 'info');
        while (queue.length) {
            const item = queue[0];
            let response;
            if (item.method === 'SET') response = await NetworkEngine.firebaseWrite(item.path, item.data);
            else if (item.method === 'UPDATE') response = await NetworkEngine.firebaseUpdate(item.path, item.data);
            else if (item.method === 'REMOVE') response = await NetworkEngine.firebaseRemove(item.path);
            else if (item.method === 'PUSH') response = await NetworkEngine.firebasePush(item.path, item.data);
            else throw new Error('Unknown offline queue operation');
            if (response?.success !== true) {
                throw new Error(response?.error || 'Firebase did not acknowledge offline sync');
            }
            // Never dequeue on an unacknowledged remote write or failed local save.
            const saved = StorageEngine.set('pendingSyncQueue', queue.slice(1));
            if (saved?.success !== true) throw new Error('Unable to persist remaining offline queue');
            queue.shift();
            successCount++;
        }
    } catch (error) {
        failed = true;
        console.warn('[Offline Sync] Preserving pending operations:', error);
    } finally {
        window.isSyncing = false;
        if (successCount) showToast(`✅ 離線同步完成：已更新 ${successCount} 筆！`, 'success');
        if (failed) showToast('❌ 離線同步未完成；未確認的項目保留待下次重試', 'error');
    }
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
    const statusId = { shop: 'shopUploadStatus', receipt: 'receiptStatus', guide: 'guideUploadStatus', ticket: 'voucherStatus', coupon: 'couponUploadStatus', ownerCustom: 'ownerCustomUploadStatus' }[type] || 'voucherStatus';
    const hiddenId = { shop: 'tempShopImg', receipt: 'tempReceipt', guide: 'tempGuideImg', ticket: 'tempVoucher', coupon: 'tempCouponImg', ownerCustom: 'tempOwnerCustomImg' }[type] || 'tempVoucher';
    const status = document.getElementById(statusId);
    const hidden = document.getElementById(hiddenId);
    if (!file) return;
    if (status) status.innerText = "壓縮並上傳中...";
    try {
        const compressed = await compressImage(file);
        const res = await NetworkEngine.uploadImage(compressed);
        const url = res?.success === true ? res.data?.url : null;
        if (!url) throw new Error(res?.error || "No URL returned");
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
    let failures = 0;
    for (let i = 0; i < files.length; i++) {
        if (status) status.innerText = `⏳ 正在上傳第 ${i + 1}/${files.length} 張...`;
        try {
            // Read capture EXIF from the ORIGINAL image before canvas conversion strips it.
            // GPS is private and saved to Firebase only with explicit opt-in.
            const metadata = await window.PhotoMetadataEngine?.readOriginal(files[i]) || {};
            const allowGPS = document.getElementById('photoGPSConsent')?.checked === true;
            const compressed = await compressImage(files[i]);
            const res = await NetworkEngine.uploadImage(compressed);
            if (!res || res.success !== true || !res.data?.url) {
                throw new Error(res?.error || '圖片上傳未完成');
            }
            const capturedAt = typeof metadata.capturedAt === 'string' ? metadata.capturedAt : null;
            const travelISO = capturedAt?.slice(0, 10);
            const day = travelISO && travelISO >= '2026-11-13' && travelISO <= '2026-11-17'
                ? travelISO.slice(5).replace('-', '/') : getV37SelectedDate();
            const payload = { url: res.data.url, date: day, timestamp: Date.now() };
            if (capturedAt) {
                payload.capturedAt = capturedAt;
                payload.captureTimeSource = 'exif';
                if (metadata.offsetTime) payload.captureUtcOffset = metadata.offsetTime;
            }
            if (allowGPS && Number.isFinite(metadata.latitude) && Number.isFinite(metadata.longitude)) {
                payload.latitude = metadata.latitude;
                payload.longitude = metadata.longitude;
                payload.locationSource = 'exif';
            }
            const saved = await NetworkEngine.firebasePush(DB_PHOTOS, payload);
            // A successful ImgBB upload is NOT proof that the photo record
            // was saved. The Firebase write must succeed too.
            if (!saved || saved.success !== true) {
                throw new Error(saved?.error || '照片紀錄未儲存');
            }
            success++;
        } catch (err) {
            failures++;
            console.error('[Memory] photo upload/save failed:', err);
        }
    }
    if (status) {
        status.innerText = failures
            ? `⚠️ 已儲存 ${success}/${files.length} 張；失敗 ${failures} 張，請重試未完成的照片。`
            : `✅ 上傳完成，成功 ${success}/${files.length} 張！`;
    }
    if (success === files.length) showToast(`📸 成功批次上傳了 ${success} 張回憶！`, 'success');
    else showToast(`照片僅儲存 ${success}/${files.length} 張；失敗的照片沒有成功儲存。`, 'error');
};
