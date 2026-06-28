// ==========================================
// Universal Travel Engine (UTE)
// Module: City Engine
// ==========================================

const CityEngine = {
  getCity(cityId) {
    if (!cityId || !travelKnowledge.cities[cityId]) {
      // Default to Busan if not found
      return travelKnowledge.cities.Busan;
    }
    return travelKnowledge.cities[cityId];
  }
};

if (typeof window !== "undefined") {
  window.CityEngine = CityEngine;
}
