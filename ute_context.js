// ==========================================
// Universal Travel Engine (UTE)
// Module: Trip Context Engine
// ==========================================

const TripContextEngine = {
  tripContext: {},
  
  getTripContext() {
    return this.tripContext;
  },
  
  updateContext(dateStr, globals) {
    const { 
      itineraryData = [], 
      sharedBills = [], 
      privateBills = [], 
      liveKrwToTwd = 0.0240, 
      prepData = [], 
      ticketData = [], 
      hotelData = {},
      u1 = { name: "ZHANG YARU", avatar: "👧" },
      u2 = { name: "GUEST2", avatar: "👦" },
      deviceOwner = "user1",
      currentBillTab = "公費"
    } = globals;
    
    const currentDate = dateStr;
    const currentDay = dateStr === '11/10' ? 'Before' : dateStr === '11/20' ? 'After' : `Day ${dateStr}`;
    
    let tripMode = 'during';
    if (dateStr === '11/10') tripMode = 'before';
    else if (dateStr === '11/20') tripMode = 'after';
    
    const todayItinerary = itineraryData.filter(i => i.day === dateStr).sort((a,b) => a.time.localeCompare(b.time));
    
    const now = new Date();
    const currentHHMM = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    const nextDestination = todayItinerary.find(i => i.time > currentHHMM);
    
    let activeIti = null;
    if (todayItinerary.length > 0) {
      if (nextDestination) {
        const idx = todayItinerary.indexOf(nextDestination);
        activeIti = idx > 0 ? todayItinerary[idx - 1] : todayItinerary[0];
      } else {
        activeIti = todayItinerary[todayItinerary.length - 1];
      }
    }
    
    const currentPlace = PlaceEngine.resolvePlace(activeIti ? activeIti.desc : (dateStr === '11/15' ? '慶州' : '釜山'));
    const currentCity = CityEngine.getCity(currentPlace.city);
    
    const currentHotel = {
      name: hotelData.name || "城市律動飯店",
      nameEN: hotelData.nameEN || "Urban Groove Hotel",
      nameKR: hotelData.nameKR || "어반그루브호텔",
      address: hotelData.address || "18 Hwangnyeong-daero 17beon-gil, Busanjin-gu, Busan 47353, South Korea",
      nearestStation: hotelData.nearestStation || "凡內谷站",
      exit: hotelData.exit || "6 號出口",
      phone: hotelData.phone || "+82 1096755552",
      roomNo: hotelData.roomNo || "",
      wifiPassword: hotelData.wifiPassword || ""
    };
    
    const currentWeather = WeatherEngine.getWeather(currentPlace.city);
    const currentOutfit = WeatherEngine.getOutfitAdvice(currentWeather.temp);
    
    const budget = BudgetEngine.calculateBudget(
      sharedBills,
      privateBills,
      liveKrwToTwd,
      dateStr,
      u1,
      u2,
      deviceOwner,
      currentBillTab
    );
    
    const navigation = NavigationEngine.calculateNavigation(todayItinerary, nextDestination, currentCity);
    const uncompletedPreps = prepData.filter(p => !p.done);
    
    this.tripContext = {
      currentDate,
      currentDay,
      tripMode,
      currentPlace,
      currentCity,
      currentHotel,
      currentWeather,
      currentOutfit,
      todayItinerary,
      nextDestination,
      budget,
      navigation,
      uncompletedPreps,
      tickets: ticketData,
      checklist: prepData,
      exchangeRate: liveKrwToTwd,
      deviceOwner,
      currentBillTab
    };
    
    this.tripContext.aiSuggestions = AIAssistantEngine.generateSuggestions(this.tripContext);
    
    return this.tripContext;
  }
};

if (typeof window !== "undefined") {
  window.TripContextEngine = TripContextEngine;
  window.getTripContext = () => TripContextEngine.getTripContext();
}
