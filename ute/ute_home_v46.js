// V46 Smart Home: pure derivation from injected TripContext and read-only snapshots.
// No Firebase, storage, or network access; legacy engines remain unmodified.
(function (target) {
  'use strict';
  const START = '2026-11-13';
  const END = '2026-11-17';
  const LABELS = [
    { iso: '2026-11-13', label: 'Day 1', short: '西面初到' },
    { iso: '2026-11-14', label: 'Day 2', short: '海景釜山' },
    { iso: '2026-11-15', label: 'Day 3', short: '慶州秋日' },
    { iso: '2026-11-16', label: 'Day 4', short: '海岸散策' },
    { iso: '2026-11-17', label: 'Day 5', short: '帶著回憶返家' }
  ];
  const toDay = (date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const value = key => parts.find(x => x.type === key)?.value || '';
    return value('year') + '-' + value('month') + '-' + value('day');
  };
  const modeFor = iso => iso < START ? 'before' : iso > END ? 'after' : 'during';
  const daysBetween = (from, to) => {
    const utc = iso => Date.UTC(...iso.split('-').map((s, i) => i === 1 ? Number(s) - 1 : Number(s)));
    return Math.max(0, Math.round((utc(to) - utc(from)) / 86400000));
  };
  const completed = state => ['已完成', '已預訂'].includes(state);
  const usableUrl = value => typeof value === 'string' && /^https:\/\//i.test(value);
  const booking = (reservations, id) => (reservations || []).find(row => row.id === id) || {};
  const hasVoucher = tickets => (tickets || []).some(t => Boolean(t.voucher || t.image || t.img) && t.reservationId);
  function createModel(data = {}) {
    const now = data.now instanceof Date ? data.now : new Date(data.now || Date.now());
    const today = toDay(now);
    const naturalMode = modeFor(today);
    const previewMode = ['before', 'during', 'after'].includes(data.previewMode) ? data.previewMode : 'auto';
    const mode = previewMode === 'auto' ? naturalMode : previewMode;
    const defaultDay = naturalMode === 'during' ? today : START;
    const selectedDay = LABELS.some(d => d.iso === data.previewDay) ? data.previewDay : defaultDay;
    const packing = Array.isArray(data.packing) ? data.packing : [];
    const prepDone = packing.filter(p => p.done).length;
    const ctx = data.context || {};
    const reservations = ctx.reservations || [];
    const sky = booking(reservations, 'sky-capsule');
    const ktx = booking(reservations, 'ktx-korail');
    const hanbok = booking(reservations, 'hanbok');
    const reminders = [
      {
        id: 'sky-capsule',
        priority: 1,
        title: '天空膠囊列車・預約確認',
        detail: 'Day 2｜尾浦 → 青沙浦；預估開放時間請以官方公告為準',
        status: completed(sky.status) ? '待核對憑證' : '待確認預約',
        url: 'https://www.bluelinepark.com/eng/booking.do',
        action: 'ticket',
        openAt: '2026-10-13T07:00:00+09:00',
        verification: 'estimated'
      },
      {
        id: 'gyeongju-transport',
        priority: 3,
        title: '慶州交通方式與車票',
        detail: '先確認是否選擇 KTX；不要把 KTX 當成必搭',
        status: ktx.status === '不需要' ? '不適用' : '待確認交通方案',
        action: 'ticket',
        verification: 'unverified'
      },
      {
        id: 'hanbok',
        priority: 4,
        title: '慶州韓服・確認預約憑證',
        detail: '靜態資料已標記預訂，不代表已檢視實際訂單',
        status: completed(hanbok.status) ? '待確認憑證' : '待確認預約',
        action: 'ticket',
        verification: 'unverified'
      },
      {
        id: 'entry',
        priority: 2,
        title: '韓國入境申報核對',
        detail: 'e-Arrival 依資格與開放窗口辦理；K-ETA／Q-CODE 不預設必填',
        status: '待確認適用資格',
        action: 'prep',
        verification: 'conditional'
      }
    ];
    const activeReminders = reminders.filter(r => r.status !== '不適用').sort((a, b) => a.priority - b.priority);
    const weather = ctx.currentWeather || null;
    const realWeather = weather && weather.unavailable !== true && Number.isFinite(Number(weather.temp));
    const photos = Array.isArray(data.photos) ? data.photos : [];
    const shopping = Array.isArray(data.shopping) ? data.shopping : [];
    const bills = ctx.budget || {};
    return {
      today, naturalMode, mode, previewMode, selectedDay,
      tripDays: LABELS.map(d => ({ ...d, selected: d.iso === selectedDay })),
      countdown: daysBetween(today, START),
      packing: { done: prepDone, total: packing.length },
      reminders: activeReminders,
      weather: realWeather ? {
        temp: Number(weather.temp),
        condition: String(weather.conditionZH || weather.condition || '未標示'),
        updatedAt: weather.timestamp || null,
        cached: !!weather.isCached,
        city: selectedDay === '2026-11-15' ? '慶州' : '釜山'
      } : null,
      next: mode === 'during' && today === selectedDay ? ctx.nextDestination || null : null,
      photosCount: photos.length,
      boughtCount: shopping.filter(p => p.checked === true).length,
      spent: typeof bills.overallSpent === 'number' && Number.isFinite(bills.overallSpent) ? bills.overallSpent : null
    };
  }
  target.V46HomeEngine = Object.freeze({ createModel, toDay, modeFor, daysBetween, labels: LABELS });
})(typeof window !== 'undefined' ? window : globalThis);
