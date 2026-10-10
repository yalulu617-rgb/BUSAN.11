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
    
    // Single context generation run
    if (window.TripContextEngine && typeof window.TripContextEngine.updateContext === "function") {
      TripContextEngine.updateContext(dateStr, globals);
    }
    
    // V46 presentation model: aggregate already-loaded user snapshots without mutations.
    // The specialized V46 engine is pure; TripContext remains the UI source of truth.
    if (window.V46HomeEngine && window.TripContextEngine) {
      const context = TripContextEngine.getTripContext();
      const packing = typeof window.getPackingDisplayList === 'function'
        ? window.getPackingDisplayList() : (globals.prepData || []);
      context.v46Home = window.V46HomeEngine.createModel({
        context,
        packing,
        photos: Array.isArray(window.photoList) ? window.photoList : [],
        shopping: Array.isArray(window.shopList) ? window.shopList : [],
        previewMode: window.v46HomePreviewMode || 'auto',
        previewDay: window.v46HomePreviewDay || null
      });
    }

    // Distribute updates to widgets/renderers in index.html
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
    console.error("[UTE] triggerContextUpdateImmediate error:", err);
  }
}

if (typeof window !== "undefined") {
  window.triggerContextUpdate = triggerContextUpdate;
  window.triggerContextUpdateImmediate = triggerContextUpdateImmediate;
  window.setV46HomePreview = function (mode) {
    window.v46HomePreviewMode = ['auto', 'before', 'during', 'after'].includes(mode) ? mode : 'auto';
    triggerContextUpdateImmediate();
  };
  window.setV46HomeDay = function (dateISO) {
    if (window.V46HomeEngine?.labels?.some(d => d.iso === dateISO)) {
      window.v46HomePreviewDay = dateISO;
      triggerContextUpdateImmediate();
    }
  };

}
