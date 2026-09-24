// ─────────────────────────────────────────────────────────────────────────
// V41 Ultimate Edition: Nearby Service (Smart Nearby Radar)
// ─────────────────────────────────────────────────────────────────────────

window.fetchSmartNearbyPlaces = async function(cityId) {
    const key = (cityId || 'Busan').toLowerCase() === 'gyeongju' ? 'Gyeongju' : 'Busan';
    return (window.SMART_NEARBY_DATABASE && window.SMART_NEARBY_DATABASE[key]) || [];
};
