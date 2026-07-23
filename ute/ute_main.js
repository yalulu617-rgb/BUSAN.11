// ==========================================
// Universal Travel Engine (UTE)
// Module: Main Orchestrator
// ==========================================

let debounceTimeout = null;

function triggerContextUpdate() {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    triggerContextUpdateImmediate();
  }, 30); // 30ms debouncing window
}

function triggerContextUpdateImmediate() {
  try {
    const dateStr = typeof window.getV37SelectedDate === "function" ? window.getV37SelectedDate() : "11/13";
    
    const globals = {
      itineraryData: window.itineraryData || [],
      sharedBills: window.sharedBills || [],
      privateBills: window.privateBills || [],
      liveKrwToTwd: window.liveKrwToTwd || 0.0240,
      prepData: window.prepData || [],
      ticketData: window.ticketData || [],
      hotelData: window.hotelData || {},
      u1: window.u1 || { name: "溫", avatar: "👩" },
      u2: window.u2 || { name: "鴨", avatar: "🦆" },
      deviceOwner: window.deviceOwner || "user1",
      currentBillTab: window.currentBillTab || "公費"
    };
    
    // 1. 產生單一真理 Context
    if (window.TripContextEngine && typeof window.TripContextEngine.updateContext === "function") {
      TripContextEngine.updateContext(dateStr, globals);
    }
    
    // 2. 分發更新至各個組件渲染器 (嚴格防禦性呼叫)
    if (typeof window.renderV37HomeDashboard === "function") {
      window.renderV37HomeDashboard();
    }
    if (typeof window.renderBills === "function") {
      window.renderBills();
    }
    if (typeof window.renderTickets_LogicOnly === "function") {
      window.renderTickets_LogicOnly();
    }
    if (typeof window.renderPrepList === "function") {
      window.renderPrepList();
    }
  } catch (err) {
        console.error('[UTE Orchestrator Safe Handled]:', err);
  }
}

if (typeof window !== "undefined") {
  window.triggerContextUpdate = triggerContextUpdate;
  window.triggerContextUpdateImmediate = triggerContextUpdateImmediate;
}
