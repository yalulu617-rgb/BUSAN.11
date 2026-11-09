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
        hasExpenseRecords: globals.sharedBills.length > 0 || globals.privateBills.length > 0,
        previewMode: window.v46HomePreviewMode || 'auto',
        previewDay: window.v46HomePreviewDay || null
      });
    }

    // Render the actual per-person budget and category chart. These widgets
    // previously stayed at hard-coded 0% regardless of existing records.
    const summary = TripContextEngine?.getTripContext?.()?.budget;
    if (summary) {
      const pct = document.getElementById('budgetPct');
      const bar = document.getElementById('budgetBar');
      const caption = document.getElementById('budgetText');
      const chart = document.getElementById('v37SplitChartContainer');
      const profile = globals.deviceOwner;
      let vaultExists = false, vaultUnlocked = true;
      if (window.PrivateLedgerEngine) {
        try {
          vaultExists = PrivateLedgerEngine.hasVault(profile);
          vaultUnlocked = !vaultExists || PrivateLedgerEngine.isUnlocked(profile);
        } catch (_) { vaultExists = true; vaultUnlocked = false; }
      }
      if (pct) pct.textContent = vaultExists && !vaultUnlocked ? '部分' : summary.budgetBarPct + '%';
      if (bar) {
        bar.style.width = summary.budgetBarPct + '%';
        bar.style.background = summary.budgetBarColor;
      }
      if (caption) caption.textContent = vaultExists && !vaultUnlocked
        ? '目前公費分攤約 
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

}
 + Math.round(summary.ownerSharedShareTWD).toLocaleString()
          + '；私人帳本尚未解鎖，預算未完整計算（目標 $35,000）'
        : summary.budgetText;
      if (chart) {
        chart.innerHTML = (vaultExists && !vaultUnlocked
          ? '<p class="owner-data-note">私人帳本尚未解鎖；目前只列入公費的個人分攤。解鎖後才會顯示完整類別。</p>'
          : '<p class="owner-data-note">個人花費類別：公費分攤 50%＋本人的私人帳目；不影響兩人公費結算。</p>')
          + '<div class="owner-budget-chart">' + summary.donutSvg + summary.donutLegend + '</div>';
      }
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

}
