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
  const dateStr = typeof window.getV37SelectedDate === "function" ? window.getV37SelectedDate() : "11/13";
  
  const globals = {
    itineraryData: window.itineraryData || [],
    sharedBills: window.sharedBills || [],
    privateBills: window.privateBills || [],
    liveKrwToTwd: window.liveKrwToTwd || 0.0240,
    prepData: window.prepData || [],
    ticketData: window.ticketData || [],
    hotelData: window.hotelData || {},
    u1: window.u1,
    u2: window.u2,
    deviceOwner: window.deviceOwner || "user1",
    currentBillTab: window.currentBillTab || "公費"
  };
  
  // Single context generation run
  TripContextEngine.updateContext(dateStr, globals);
  
  // Distribute updates to widgets/renderers in index.html
  if (typeof window.renderV37HomeDashboard === "function") {
    window.renderV37HomeDashboard();
  }
  if (typeof window.renderBills === "function") {
    // Avoid infinite loop if renderBills calls triggerContextUpdate internally
    window.renderBills_LogicOnly(); 
  }
  if (typeof window.renderTickets === "function") {
    window.renderTickets_LogicOnly();
  }
  if (typeof window.renderPrepList === "function") {
    window.renderPrepList_LogicOnly();
  }
}

if (typeof window !== "undefined") {
  window.triggerContextUpdate = triggerContextUpdate;
}
