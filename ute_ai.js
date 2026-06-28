// ==========================================
// Universal Travel Engine (UTE)
// Module: AI Assistant Engine
// ==========================================

const AIAssistantEngine = {
  generateSuggestions(ctx) {
    const dateStr = ctx.currentDate;
    const city = ctx.currentCity;
    const weather = ctx.currentWeather;
    const place = ctx.currentPlace;
    
    if (dateStr === '11/10') {
      let uncompletedCount = ctx.uncompletedPreps ? ctx.uncompletedPreps.length : 0;
      if (uncompletedCount === 0) {
        return `✨ <b>哆啦秋遊助手：</b>行前準備已 100% 完成！護照、換錢、隨身清單都準備妥當，期待出發囉！✈️`;
      } else {
        return `🤖 <b>行前助手：</b>離出發僅剩幾天，您還有 <b>${uncompletedCount} 項</b> 準備工作尚未勾選完成。請務必在出發前 72 小時申請 <b>K-ETA</b> 與填寫 <b>Q-Code</b>，避免入境受阻喔！`;
      }
    } else if (dateStr === '11/20') {
      return `🎉 <b>哆啦回憶助手：</b>本次旅行已圓滿結束！希望旅途中的美景與體驗給您留下了珍貴的回憶！別忘了在下方寫下旅行心得喔！`;
    } else {
      let tips = [];
      
      // 1. Budget alert
      if (ctx.budget) {
        const ratio = ctx.budget.totalSharedTWD / 50000;
        if (ratio >= 0.9) {
          tips.push(`⚠️ <b>公費超支預警！</b>預算已使用 ${Math.round(ratio*100)}%，請控制購物與娛樂支出！`);
        } else if (ratio >= 0.75) {
          tips.push(`📊 共用公費已消耗 ${Math.round(ratio*100)}%，剩餘可支配預算約 $${Math.round(50000 - ctx.budget.totalSharedTWD).toLocaleString()} 元。`);
        } else {
          tips.push(`💰 <b>理財顧問：</b>目前公費使用率約 ${Math.round(ratio*100)}%，預算狀況非常健康！`);
        }
      }
      
      // 2. Weather alert
      if (weather) {
        if (weather.rainChance >= 50) {
          tips.push(`☔ <b>降雨警報：</b>${city.nameTW}今日降雨機率達 <b>${weather.rainChance}%</b>，出門務必攜帶折疊傘或雨具！`);
        }
        if (weather.windSpeed >= 20) {
          tips.push(`💨 <b>強風特報：</b>${city.nameTW}今日風速達 ${weather.windSpeed} km/h，體感溫度僅 <b>${weather.feelsLike}℃</b>，請穿著防風外套！`);
        }
        if (weather.uvIndex >= 6) {
          tips.push(`☀️ <b>防曬提示：</b>${city.nameTW}今日紫外線指數偏高 (${weather.uvIndex})，戶外行走請加強防曬與補充水分。`);
        }
      }
      
      // 3. Transit alert
      if (ctx.nextDestination) {
        tips.push(`⏰ <b>時程提示：</b>下一個行程 <b>${ctx.nextDestination.time} 【${ctx.nextDestination.desc.split(' ')[0]}】</b>，記得提早準備出發！`);
      }
      
      // 4. Place-specific knowledge-driven tips
      if (place) {
        if (place.tags && place.tags.includes("碎石步道")) {
          tips.push(`👟 <b>景點溫馨小叮嚀：</b>目前參訪的【${place.name}】含有碎石步道，且園區範圍較大，強烈建議穿著減震慢跑鞋，避免腳步疲勞。`);
        }
        if (place.category === "airport") {
          tips.push(`✈️ <b>機場出境提醒：</b>抵達金海機場後，請記得先到退稅櫃台/自助機台辦理退稅手續，並留意隨身行李是否含有液體限制物品。`);
        }
        if (place.city === "Gyeongju") {
          tips.push(`💱 <b>慶州行前指引：</b>慶州市區實體換錢所極少，若有購物、小吃或搭計程車等現金需求，建議在釜山或機場預先兌換好足額韓幣。`);
        }
        if (place.id === "capsule") {
          tips.push(`🚡 <b>膠囊列車提示：</b>海雲台尾浦膠囊火車座位有限，請務必確認已提前預約取得電子票券乘車憑證。`);
        }
      }
      
      // 5. City-specific emergency AI tips fallback
      if (city.aiTips && city.aiTips.length > 0) {
        city.aiTips.forEach(tip => tips.push(tip));
      }
      
      if (ctx.hotel && (ctx.hotel.name || ctx.hotel.nameEN)) {
        tips.push(`🏨 <b>住宿提示：</b>今日預計入住 ${ctx.hotel.name} (${ctx.hotel.nameEN})，鄰近<b>${ctx.hotel.nearestStation || ''} ${ctx.hotel.exit || ''}</b>，出示憑證即可 Check-in。`);
      }
      
      return tips.map(t => `<div style="margin-bottom: 6px;">${t}</div>`).join('');
    }
  }
};

if (typeof window !== "undefined") {
  window.AIAssistantEngine = AIAssistantEngine;
}
