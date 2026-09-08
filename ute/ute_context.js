// ==========================================
// Universal Travel Engine (UTE)
// Module: Trip Context Engine
// ==========================================

const TripContextEngine = {
  tripContext: {},

  reservationStates: ["已預訂", "尚未預訂", "不需要", "資訊不足"],

  resolveReservationState(record = {}) {
    const explicitState = record.reservationState || record.status;
    if (this.reservationStates.includes(explicitState)) return explicitState;
    if (record.booked === true || record.booked === "true") return "已預訂";
    if (record.booked === false || record.booked === "false") return "尚未預訂";
    return "資訊不足";
  },
  
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
    const canonical = (typeof window !== "undefined" && window.TRAVEL_CONTENT_V45) || (typeof globalThis !== "undefined" && globalThis.TRAVEL_CONTENT_V45) || {};
    const canonicalHotel = canonical.hotel || {};
    const firstConfirmedValue = (...values) => values.find(value => value && value !== "尚未填寫") || "";
    const unconfirmed = "尚未確認";
    
    const currentHotel = {
      name: firstConfirmedValue(hotelData.name, canonicalHotel.nameTW, "城市律動飯店"),
      nameEN: firstConfirmedValue(hotelData.nameEN, canonicalHotel.nameEN, "Urban Groove Hotel"),
      nameKR: firstConfirmedValue(hotelData.nameKR, canonicalHotel.nameKR),
      country: firstConfirmedValue(hotelData.country, canonicalHotel.country, "韓國"),
      addressKR: firstConfirmedValue(hotelData.addressKR),
      address: firstConfirmedValue(hotelData.address, canonicalHotel.address) || unconfirmed,
      nearestStation: firstConfirmedValue(hotelData.nearestStation, "凡內谷站"),
      exit: firstConfirmedValue(hotelData.exit, "6 號出口"),
      checkInDate: firstConfirmedValue(hotelData.checkInDate, canonicalHotel.checkInDate) || unconfirmed,
      checkInTime: firstConfirmedValue(hotelData.checkInTime) || unconfirmed,
      checkOutDate: firstConfirmedValue(hotelData.checkOutDate, canonicalHotel.checkOutDate) || unconfirmed,
      checkOutTime: firstConfirmedValue(hotelData.checkOutTime) || unconfirmed,
      phone: firstConfirmedValue(hotelData.phone, canonicalHotel.phone) || unconfirmed,
      roomNo: firstConfirmedValue(hotelData.roomNo),
      wifiName: firstConfirmedValue(hotelData.wifiName) || unconfirmed,
      wifiPassword: firstConfirmedValue(hotelData.wifiPassword) || unconfirmed,
      outlet: firstConfirmedValue(hotelData.outlet) || unconfirmed,
      laundry: firstConfirmedValue(hotelData.laundry) || unconfirmed,
      luggageStorage: firstConfirmedValue(hotelData.luggageStorage) || unconfirmed,
      website: firstConfirmedValue(hotelData.website),
      totalPrice: firstConfirmedValue(hotelData.totalPrice),
      currency: firstConfirmedValue(hotelData.currency),
      guestCount: firstConfirmedValue(hotelData.guestCount),
      hotelPhoto: firstConfirmedValue(hotelData.hotelPhoto)
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

    const dayToRainKey = { '11/14': 'day2', '11/15': 'day3', '11/16': 'day4' };
    const rainPlanKey = dayToRainKey[dateStr];
    const todayRainPlan = rainPlanKey && canonical.rainPlans ? canonical.rainPlans[rainPlanKey] : null;
    const reservations = Array.isArray(canonical.reservations)
      ? canonical.reservations.map(item => ({ ...item, status: this.resolveReservationState(item) }))
      : [];
    const credentials = Array.isArray(canonical.credentials)
      ? canonical.credentials.map(item => ({ ...item }))
      : [];

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
      todayRainPlan,
      rainPhrases: canonical.rainPlans ? canonical.rainPlans.phrases : [],
      nextDestination,
      budget,
      navigation,
      uncompletedPreps,
      tickets: ticketData,
      reservations,
      credentials,
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
