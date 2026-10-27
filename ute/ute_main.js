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
      const home = window.V46HomeEngine.createModel({
        context,
        packing,
        photos: Array.isArray(window.photoList) ? window.photoList : [],
        shopping: Array.isArray(window.shopList) ? window.shopList : [],
        hasExpenseRecords: globals.sharedBills.length > 0 || globals.privateBills.length > 0,
        previewMode: window.v46HomePreviewMode || 'auto',
        previewDay: window.v46HomePreviewDay || null
      });
      const tripState = window.V46TrainControls?.stateFor(home.selectedDay);
      home.nextStop = window.V46TripCompanion?.createModel({
        iso:home.selectedDay,today:home.today,
        itinerary:globals.itineraryData,
        manualIndex:tripState?.manualIndex ?? null,
        registry:window.AUTHORITATIVE_MAPS_V45 || {},
        mapKeys:window.V46_NEXT_STOP_MAP_KEYS || {}
      }) || null;
      home.trainMotionEnabled = window.V46TrainControls?.motionEnabled() ?? false;
      context.v46Home = home;
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
    // A phase change must never resurrect an open dropdown from the DOM being
    // replaced, because its hidden overlay blocks the rail's real touch target.
    window.v46AllToolsExpanded = false;
    const bag = document.querySelector('#v37HomeDashboard details.v46-tools');
    if (bag?.open) bag.open = false;
    window.v46HomePreviewMode = ['auto', 'before', 'during', 'after'].includes(mode) ? mode : 'auto';
    // Returning to live mode must also clear the old manually selected day.
    if (window.v46HomePreviewMode === 'auto') window.v46HomePreviewDay = null;
    triggerContextUpdateImmediate();
  };
  window.setV46HomeDay = function (dateISO) {
    if (window.V46HomeEngine?.labels?.some(d => d.iso === dateISO)) {
      window.v46HomePreviewDay = dateISO;
      triggerContextUpdateImmediate();
    }
  };

  // One tap on any train station always opens that specific canonical itinerary.
  // It does not change the phone clock, official itinerary data or legacy date
  // simulator. Returning home restores automatic Korea-local date selection.
  window.openV46TrainDay = function (dateISO) {
    const index = window.V46HomeEngine?.labels?.findIndex(d => d.iso === dateISO) ?? -1;
    if (index < 0 || typeof window.showV37Tab !== 'function' ||
        typeof window.filterItineraryDay !== 'function') return false;
    const marker = document.querySelector('#v37HomeDashboard .v46-owner-train-marker');
    marker?.style.setProperty('--v46-owner-train-left', (25 + index * 12.5) + '%');
    document.querySelectorAll('#v37HomeDashboard .v46-owner-days .v46-day').forEach(day => {
      const selected = day.dataset.iso === dateISO;
      day.classList.toggle('is-current', selected);
      day.setAttribute('aria-pressed', String(selected));
    });
    // The preview is temporary: homepage resumes real Korea time after navigation.
    window.v46HomePreviewMode = 'auto';
    window.v46HomePreviewDay = null;
    const navigate = () => {
      window.showV37Tab('itinerary');
      window.filterItineraryDay(dateISO.slice(5).replace('-', '/'), null);
      triggerContextUpdateImmediate();
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) navigate();
    else window.setTimeout(navigate, 240);
    return true;
  };

  // If the PWA stays open across Korea midnight, update its train only when the
  // actual Korean calendar date changes. Also correct the model on tab resume.
  let lastKoreaDate = window.V46HomeEngine?.toDay(new Date()) || '';
  let lastSeoulMinute = '';
  const checkKoreaDay = () => {
    if (document.hidden || window.v46HomePreviewMode && window.v46HomePreviewMode !== 'auto') return;
    const actual = window.V46HomeEngine?.toDay(new Date());
    if (actual && actual !== lastKoreaDate) {
      lastKoreaDate = actual;
      lastSeoulMinute = '';
      triggerContextUpdateImmediate();
    } else if (actual && window.V46HomeEngine?.modeFor(actual) === 'during') {
      // Refresh a time-based suggestion once per Seoul minute, never while hidden.
      const minute = new Intl.DateTimeFormat('en-GB',{
        timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
      }).format(new Date());
      if (minute !== lastSeoulMinute) {
        lastSeoulMinute = minute;
        triggerContextUpdateImmediate();
      }
    }
  };
  document.addEventListener('visibilitychange', checkKoreaDay);
  window.addEventListener('focus', checkKoreaDay);
  window.setInterval(checkKoreaDay, 60 * 1000);

}
