/* Isolated view-only V46 harness. No Firebase, APIs, browser storage or production APP imports. */
(function () {
  'use strict';
  let previewMode = 'before';
  let previewDay = null;
  const demo11 = [
    ['🗺️', '今日行程', '路線・雨備'],
    ['🌤️', '天氣・楓況', '氣溫・穿搭'],
    ['💰', '旅行記帳', '公費・私帳'],
    ['🍜', '吃喝・景點', '美食・打卡'],
    ['🏪', '超商・超市', '零食・採買'],
    ['🛍️', '快樂購', '想買・已買'],
    ['💬', '翻譯・SOS', '韓語・緊急'],
    ['📷', '旅行回憶', '照片・回顧'],
    ['🏨', '住宿・交通', '飯店・導航'],
    ['🎟️', '票券・優惠', '票券・憑證'],
    ['🧳', '行前準備', '清單・文件']
  ];
  const esc = str => String(str).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const menu = '<div class="v45-home-nine-grid" aria-label="旅行功能導覽">' +
    '<section class="home-ia-section"><div class="home-ia-heading">🎒 旅行中常用功能</div><div class="v45-nine-grid">' +
    demo11.slice(0,8).map(([emoji,label,sub]) => '<button type="button" class="v45-nine-card" onclick="previewOnly()">' +
      '<span class="v45-nine-icon" aria-hidden="true">' + emoji + '</span><span class="v45-nine-title">' +
      esc(label) + '</span><small class="v45-nine-sub">' + esc(sub) + '</small></button>').join('') +
    '</div></section><section class="home-ia-section"><div class="home-ia-heading">📁 旅行管理</div><div class="v45-nine-grid">' +
    demo11.slice(8).map(([emoji,label,sub]) => '<button type="button" class="v45-nine-card" onclick="previewOnly()">' +
      '<span class="v45-nine-icon" aria-hidden="true">' + emoji + '</span><span class="v45-nine-title">' +
      esc(label) + '</span><small class="v45-nine-sub">' + esc(sub) + '</small></button>').join('') +
    '</div></section></div>';
  let noticeHide;
  window.previewOnly = function () {
    const node=document.getElementById('previewNotice');
    node.textContent='這是 UI 預覽：正式功能要等 APP 整合驗收，不會儲存或修改資料。';
    node.hidden=false;
    clearTimeout(noticeHide);
    noticeHide=setTimeout(()=>{node.hidden=true},3400);
  };
  ['openPreTripPrep','toggleHomeWeatherDetail','openConvenienceSupermarketHub'].forEach(k=>window[k]=window.previewOnly);
  window.openWalletSection=window.previewOnly;
  window.showV37Tab=window.previewOnly;
  window.openGuideFolder=window.previewOnly;
  window.setShopTabMode=window.previewOnly;
  window.setV46HomePreview=mode=>{
    previewMode=['auto','before','during','after'].includes(mode)?mode:'auto';
    render();
  };
  window.setV46HomeDay=iso=>{
    if(window.V46HomeEngine.labels.some(x=>x.iso===iso)){previewDay=iso;render()}
  };
  function render() {
    const model=window.V46HomeEngine.createModel({
      now:new Date(), previewMode, previewDay,
      context:{reservations:[],credentials:[],currentWeather:{unavailable:true},budget:{}},
      packing:[],photos:[],shopping:[],hasExpenseRecords:false
    });
    const output=window.renderV46Home(model,menu,'','', '');
    const container=document.getElementById('v37HomeDashboard');
    container.innerHTML=output;
  }
  render();
})();