// ==========================================
// Universal Travel Engine (UTE)
// Module: Navigation Engine
// ==========================================

const NavigationEngine = {
  calculateNavigation(todayItinerary, nextIti, cityConfig) {
    if (!todayItinerary || todayItinerary.length === 0) {
      return {
        available: false,
        startName: "",
        endName: "",
        transitMethod: "",
        naverUrl: "",
        kakaoUrl: "",
        googleUrl: ""
      };
    }
    
    let currentIti = null;
    if (nextIti) {
      const idx = todayItinerary.indexOf(nextIti);
      currentIti = idx > 0 ? todayItinerary[idx - 1] : null;
    }
    
    if (!nextIti) {
      return {
        available: true,
        finishedAll: true,
        transitMethod: "🎉 今日所有行程皆已順利完成！"
      };
    }
    
    const startName = currentIti ? currentIti.desc.split(' ')[0] : "目前位置";
    const endName = nextIti.desc.split(' ')[0];
    const transitMethod = nextIti.tr || (cityConfig && cityConfig.transportation.desc) || "🚶 步行 / 🚕 計程車";
    
    const naverUrl = nextIti.map || `https://map.naver.com/p/search/${encodeURIComponent(nextIti.desc)}`;
    const kakaoUrl = `https://map.kakao.com/?q=${encodeURIComponent(nextIti.desc)}`;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextIti.desc)}`;
    
    return {
      available: true,
      finishedAll: false,
      startName,
      endName,
      transitMethod,
      naverUrl,
      kakaoUrl,
      googleUrl
    };
  }
};

if (typeof window !== "undefined") {
  window.NavigationEngine = NavigationEngine;
}
