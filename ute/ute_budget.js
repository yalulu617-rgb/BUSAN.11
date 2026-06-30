// ==========================================
// Universal Travel Engine (UTE)
// Module: Budget Engine
// ==========================================

const BudgetEngine = {
  reMatch(str, list) {
    return list.some(item => str.includes(item));
  },
  
  getCategory(itemName) {
    const name = itemName.toLowerCase();
    if (this.reMatch(name, ["肉", "飯", "麵", "湯", "吃", "喝", "餐", "烤", "酒", "咖啡", "炸雞", "蟹", "海木", "味讚王", "solsot", "東萊", "密陽", "cu", "gs25", "7-11", "超商", "星巴克", "冰", "甜點", "炒年糕", "香蕉牛奶", "麥當勞", "多拿滋", "炸醬麵", "冷麵"])) {
      return "餐飲";
    }
    if (this.reMatch(name, ["地鐵", "公車", "的士", "計程車", "火車", "票", "機票", "纜車", "ke2248", "zimcarry", "交通", "過路費", "加油", "車", "高鐵", "航"])) {
      return "交通";
    }
    if (this.reMatch(name, ["買", "鞋", "衣", "襪", "保養", "彩妝", "藥妝", "伴手禮", "樂天", "超市", "olive", "藥", "行動電源", "底片", "文創", "血拚", "購物", "套組", "明信片", "包", "裙", "褲"])) {
      return "購物";
    }
    if (this.reMatch(name, ["住宿", "飯店", "groove", "旅館", "民宿", "房", "訂房", "urban"])) {
      return "住宿";
    }
    if (this.reMatch(name, ["門票", "汗蒸幕", "spa", "藍線", "入場", "憑證", "景點", "門票", "觀光"])) {
      return "門票";
    }
    return "其他";
  },
  
  calculateBudget(sharedBills, privateBills, liveKrwToTwd, selectedDate, u1, u2, deviceOwner, currentBillTab) {
    const listShared = sharedBills || [];
    const listPrivate = privateBills || [];
    const rate = liveKrwToTwd || 0.0240;
    
    const getTwd = (b) => b.currency === 'KRW' ? b.amt * rate : b.amt;
    
    // 1. Daily spend
    const dailySpend = listShared.concat(listPrivate)
      .filter(b => b.day === selectedDate)
      .reduce((acc, b) => acc + getTwd(b), 0);
      
    // 2. Settlement logic
    let sU1_TotalTWD_Paid = 0;
    let sU2_TotalTWD_Paid = 0;
    listShared.forEach(b => {
      let amtInTWD = getTwd(b);
      if (b.payer === 'user1') sU1_TotalTWD_Paid += amtInTWD;
      if (b.payer === 'user2') sU2_TotalTWD_Paid += amtInTWD;
    });
    const totalSharedTWD = sU1_TotalTWD_Paid + sU2_TotalTWD_Paid;
    const halfTWD = totalSharedTWD / 2;
    const u1Balance = sU1_TotalTWD_Paid - halfTWD;
    
    // Settlement Text
    let settleText = `<div style="text-align:center; margin-bottom:10px;"><span style="font-size:0.85rem; color:#7f8c8d;">公費總支出 (約合台幣)</span><br><span style="font-size:1.8rem; color:var(--primary);">$${Math.round(totalSharedTWD).toLocaleString()}</span></div><hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">`;
    if (u1Balance > 0) {
      settleText += `👉 <b>${u2.avatar || '👦'} ${u2.name || 'GUEST2'}</b> 應給 <b>${u1.avatar || '👧'} ${u1.name || 'ZHANG YARU'}</b>：<span style="color:#27AE60; font-size:1.3rem;">$${Math.round(u1Balance).toLocaleString()}</span>`;
    } else if (u1Balance < 0) {
      settleText += `👉 <b>${u1.avatar || '👧'} ${u1.name || 'ZHANG YARU'}</b> 應給 <b>${u2.avatar || '👦'} ${u2.name || 'GUEST2'}</b>：<span style="color:#27AE60; font-size:1.3rem;">$${Math.round(Math.abs(u1Balance)).toLocaleString()}</span>`;
    } else {
      settleText += `✨ 帳目完美平衡！`;
    }
    
    // 3. Private / Shared expense totals
    const totalPrivateTWD = listPrivate.reduce((acc, b) => acc + getTwd(b), 0);
    const overallSpent = Math.round(totalSharedTWD + totalPrivateTWD);
    
    // 4. Budget bar calculations
    const targetBudget = 50000;
    const currentExpense = currentBillTab === '公費' ? totalSharedTWD : listPrivate.reduce((acc, b) => acc + getTwd(b), 0);
    const target = currentBillTab === '公費' ? targetBudget : 20000;
    const pct = Math.min((currentExpense / target) * 100, 100).toFixed(1);
    
    let budgetBarColor = "linear-gradient(90deg, #F39C12, #E74C3C)";
    let budgetBarShadow = "0 0 15px rgba(231, 76, 60, 0.6)";
    if (pct >= 90) {
      budgetBarColor = "linear-gradient(90deg, #E74C3C, #C0392B)";
      budgetBarShadow = "0 0 20px rgba(192, 57, 43, 0.8)";
    }
    
    const budgetText = `已花費 $${Math.round(currentExpense).toLocaleString()} / 設定預算 $${target.toLocaleString()}`;
    
    // 5. Category Summary
    const filtered = listShared.concat(listPrivate).filter(b => currentBillTab === '公費' ? b.type === '公費' : b.type === '私帳' && b.owner === deviceOwner);
    const categoryTotals = {
      "餐飲": { value: 0, color: "#FF6B6B" },
      "交通": { value: 0, color: "#4D96FF" },
      "購物": { value: 0, color: "#FFD93D" },
      "住宿": { value: 0, color: "#6BCB77" },
      "門票": { value: 0, color: "#9B59B6" },
      "其他": { value: 0, color: "#95A5A6" }
    };
    filtered.forEach(b => {
      const cat = this.getCategory(b.item);
      categoryTotals[cat].value += getTwd(b);
    });
    
    const categoriesArray = Object.keys(categoryTotals).map(key => ({
      name: key,
      value: categoryTotals[key].value,
      color: categoryTotals[key].color
    }));
    
    // 6. SVG Donut calculation
    const activeCats = categoriesArray.filter(c => c.value > 0);
    const totalActive = activeCats.reduce((acc, c) => acc + c.value, 0);
    
    let donutSvg = "";
    let donutLegend = "";
    
    if (totalActive === 0) {
      donutSvg = `<p style="text-align:center; color:#95a5a6; font-size:0.85rem; font-weight:900; padding:15px 0;">無花費資料</p>`;
    } else {
      const r = 45;
      const circumference = 2 * Math.PI * r;
      let accumulatedPercent = 0;
      let svgContent = `<svg width="130" height="130" viewBox="0 0 120 120" style="transform: rotate(-90deg); flex-shrink: 0;">`;
      
      activeCats.forEach(c => {
        const percent = c.value / totalActive;
        const strokeLength = percent * circumference;
        const strokeOffset = circumference - strokeLength;
        const dashOffset = -accumulatedPercent * circumference;
        
        svgContent += `
          <circle cx="60" cy="60" r="${r}" 
              fill="transparent" 
              stroke="${c.color}" 
              stroke-width="14" 
              stroke-dasharray="${strokeLength} ${strokeOffset}" 
              stroke-dashoffset="${dashOffset}"
              style="transition: all 0.5s ease;">
          </circle>
        `;
        accumulatedPercent += percent;
      });
      
      svgContent += `
          <circle cx="60" cy="60" r="34" fill="white"></circle>
          <text x="60" y="56" text-anchor="middle" font-weight="900" font-size="8" fill="#7f8c8d" style="transform: rotate(90deg) translate(0px, -120px);">總支出</text>
          <text x="60" y="70" text-anchor="middle" font-weight="900" font-size="9" fill="var(--primary)" style="transform: rotate(90deg) translate(0px, -120px);">$${Math.round(totalActive).toLocaleString()}</text>
      </svg>`;
      
      let legendHtml = `<div class="chart-legend">`;
      activeCats.forEach(c => {
        const pctVal = ((c.value / totalActive) * 100).toFixed(1);
        legendHtml += `
            <div class="legend-item" style="font-size:0.75rem;">
                <div class="legend-color" style="background:${c.color};"></div>
                <span style="font-weight:900; color:var(--text-dark);">${c.name}</span>
                <span style="color:#777; font-weight:700; margin-left:auto;">$${Math.round(c.value).toLocaleString()} (${pctVal}%)</span>
            </div>
        `;
      });
      legendHtml += `</div>`;
      
      donutSvg = svgContent;
      donutLegend = legendHtml;
    }
    
    const averageSpend = Math.round(overallSpent / 5);
    
    return {
      dailySpend,
      averageSpend,
      categories: categoriesArray,
      donutSvg,
      donutLegend,
      totalSharedTWD,
      totalPrivateTWD,
      overallSpent,
      u1Balance,
      settleText,
      budgetBarPct: pct,
      budgetText,
      budgetBarColor,
      budgetBarShadow
    };
  }
};

if (typeof window !== "undefined") {
  window.BudgetEngine = BudgetEngine;
}
