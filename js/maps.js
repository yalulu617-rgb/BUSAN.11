// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Maps Service (Auto Map Navigation Link Autogen)
// ─────────────────────────────────────────────────────────────────────────

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

window.copyWiFi = function(str) {
    if(!str || str === "尚未填寫") {
        showToast("無資料可複製", "warning");
        return;
    }
    navigator.clipboard.writeText(str).then(() => {
        triggerHapticFeedback();
        showToast(`WiFi 資訊已複製: ${str}`, "success");
    });
};

window.copyAddress = function(str) {
    if(!str || str === "尚未填寫") {
        showToast("無地址可複製", "warning");
        return;
    }
    navigator.clipboard.writeText(str).then(() => {
        triggerHapticFeedback();
        showToast(`地址已複製到剪貼簿`, "success");
    });
};

window.copyTaxiHelper = function(str) {
    if(!str || str === "尚未填寫") {
        showToast("無地址可複製", "warning");
        return;
    }
    const fullText = `기사님, 여기로 부탁드립니다.\n\n${str}`;
    navigator.clipboard.writeText(fullText).then(() => {
        triggerHapticFeedback();
        showToast("計程車字條已複製，可直接貼給司機看！", "success");
    });
};
