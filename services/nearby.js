// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Nearby Service (Smart Nearby Radar)
// ─────────────────────────────────────────────────────────────────────────

window.fetchSmartNearbyPlaces = async function(cityId) {
    try {
        // Fetch recommendations from data files
        const res = await fetch('data/places.json');
        if (!res.ok) throw new Error("CORS or network error loading places");
        const allPlaces = await res.json();
        
        // Filter by city
        let filtered = allPlaces.filter(p => p.city.toLowerCase() === cityId.toLowerCase());
        
        // Map places data to UI list format
        return filtered.map(p => {
            return {
                type: p.category === 'station' ? '🚇 地鐵' : '📍 景點',
                name: p.name,
                dist: 120, // default dummy distance
                rate: 4.6,
                status: '營業中',
                naver: `https://map.naver.com/v5/search/${encodeURIComponent(p.name)}`,
                kakao: `https://map.kakao.com/?q=${encodeURIComponent(p.name)}`,
                google: `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
            };
        });
    } catch (err) {
        console.warn("Places API error, falling back to local list:", err);
        // Local Fallback list
        const fallbackList = [
            { type: '🚇 地鐵', name: '凡內谷地鐵站 (6號出口)', dist: 100, rate: 4.5, status: '營業中', naver: 'https://map.naver.com/p/entry/place/13479629', kakao: 'https://map.kakao.com/?id=21160751', google: 'https://maps.app.goo.gl/beameom' },
            { type: '🛒 CU', name: 'CU 凡內谷站店', dist: 50, rate: 4.2, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560933', kakao: 'https://map.kakao.com/?id=8116260', google: 'https://maps.app.goo.gl/cu_beom' },
            { type: '🏪 GS25', name: 'GS25 凡內谷中央店', dist: 80, rate: 4.1, status: '24小時營業', naver: 'https://map.naver.com/p/entry/place/15560944', kakao: 'https://map.kakao.com/?id=8116261', google: 'https://maps.app.goo.gl/gs_beom' }
        ];
        return fallbackList;
    }
};
