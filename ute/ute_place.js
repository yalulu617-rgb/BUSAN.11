// ==========================================
// Universal Travel Engine (UTE)
// Module: Place Engine
// ==========================================

const PlaceEngine = {
  resolvePlace(descText) {
    if (!descText) return this.getFallbackPlace();
    const cleanDesc = descText.toLowerCase();
    
    // Scan travelKnowledge.places for matching keywords
    for (const key in travelKnowledge.places) {
      const place = travelKnowledge.places[key];
      if (cleanDesc.includes(place.name.toLowerCase()) || 
          (place.station && cleanDesc.includes(place.station.toLowerCase())) ||
          (place.tags && place.tags.some(t => cleanDesc.includes(t.toLowerCase())))) {
        return place;
      }
    }
    
    // Fallback logic based on text indicator
    return this.getFallbackPlace(cleanDesc);
  },
  
  getFallbackPlace(descText = "") {
    const isGyeongju = descText.includes("慶州") || descText.includes("gyeongju") || descText.includes("佛國寺") || descText.includes("大陵苑");
    if (isGyeongju) {
      return {
        id: "gyeongju_fallback",
        name: "慶州市區",
        city: "Gyeongju",
        country: "Korea",
        category: "area",
        latitude: 35.8382,
        longitude: 129.2098,
        maps: {
          naver: "https://map.naver.com",
          kakao: "https://map.kakao.com",
          google: "https://maps.google.com"
        },
        tags: ["慶州區"],
        transportation: "慶州市內巴士 / 計程車"
      };
    }
    // Default fallback to Busan Seomyeon center
    return {
      id: "busan_fallback",
      name: "釜山市區",
      city: "Busan",
      country: "Korea",
      category: "area",
      latitude: 35.1578,
      longitude: 129.0592,
      maps: {
        naver: "https://map.naver.com",
        kakao: "https://map.kakao.com",
        google: "https://maps.google.com"
      },
      tags: ["釜山區"],
      transportation: "釜山地鐵 / 一般公車 / 計程車"
    };
  }
};

if (typeof window !== "undefined") {
  window.PlaceEngine = PlaceEngine;
}
