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
  const booking = (reservations, id) => (reservations || []).find(row => row.id === id) || {};
  // Do not infer a booking from a ticket's title or an itinerary description.
  // Only an explicit reservationId can tie user-entered evidence to this reminder.
  function reservationReminderStatus(reservations, tickets, id) {
    const canonical = booking(reservations, id);
    const evidence = Array.isArray(tickets)
      ? tickets.find(t => t && t.reservationId === id)
      : null;
    if (evidence) {
      const booked = evidence.booked === true || evidence.status === '已預訂';
      const hasVoucher = typeof evidence.voucher === 'string' && evidence.voucher.trim() !== '';
      if (booked && hasVoucher) return '已預訂・憑證已保存';
      if (booked) return '已預訂・待保存憑證';
      if (hasVoucher) return '憑證已保存・預訂待核對';
      if (evidence.booked === false) return '待確認預約';
    }
    // Static canonical metadata is not independently verified purchase evidence.
    return canonical.status === '已預訂'
      ? '行程資料標記已預訂・憑證待核對'
      : '待確認預約';
  }
  function createModel(data = {}) {
    const now = data.now instanceof Date ? data.now : new Date(data.now || Date.now());
    const today = toDay(now);
    const naturalMode = modeFor(today);
    const previewMode = ['before', 'during', 'after'].includes(data.previewMode) ? data.previewMode : 'auto';
    const mode = previewMode === 'auto' ? naturalMode : previewMode;
    const defaultDay = naturalMode === 'during' ? today : START;
    const selectedDay = previewMode !== 'auto' && LABELS.some(d => d.iso === data.previewDay)
      ? data.previewDay : defaultDay;
    const packing = Array.isArray(data.packing) ? data.packing : [];
    const prepDone = packing.filter(p => p.done).length;
    const ctx = data.context || {};
    const reservations = ctx.reservations || [];
    const sky = booking(reservations, 'sky-capsule');
    const ktx = booking(reservations, 'ktx-korail');
    const hanbok = booking(reservations, 'hanbok');
    const tickets = Array.isArray(ctx.tickets) ? ctx.tickets : [];
    const reminders = [
      {
        id: 'sky-capsule',
        priority: 1,
        title: '天空膠囊列車・預約確認',
        detail: 'Day 2｜尾浦 → 青沙浦；預估開放時間請以官方公告為準',
        status: reservationReminderStatus(reservations, tickets, 'sky-capsule'),
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
        status: reservationReminderStatus(reservations, tickets, 'hanbok'),
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
    const activeReminders = reminders
      .filter(r => r.status !== '不適用' && r.status !== '已預訂・憑證已保存')
      .sort((a, b) => a.priority - b.priority);
    const weather = ctx.currentWeather || null;
    // Never relabel today's city weather as a forecast for another preview date.
    const realWeather = (mode === 'before' || (mode === 'during' && today === selectedDay)) &&
      weather && weather.unavailable !== true && weather.temp !== null &&
      weather.temp !== undefined && Number.isFinite(Number(weather.temp));
    const photos = Array.isArray(data.photos) ? data.photos : [];
    // Show only actual, safe image links already saved by the album; no placeholder trips.
    const photoPreview = photos.filter(p => p && typeof p.url === 'string' &&
      /^https:\/\//i.test(p.url)).slice(0, 3).map(p => ({ url: p.url }));
    const shopping = Array.isArray(data.shopping) ? data.shopping : [];
    const bills = ctx.budget || {};
    const ketaCredential = (ctx.credentials || []).find(r => r.id === 'keta');
    const entryKeta = ketaCredential && typeof ketaCredential.status === 'string'
      ? ketaCredential.status : '適用資格待確認';
    return {
      today, naturalMode, mode, previewMode, selectedDay,
      tripDays: LABELS.map(d => ({ ...d, selected: d.iso === selectedDay })),
      countdown: daysBetween(today, START),
      packing: { done: prepDone, total: packing.length },
      reminders: activeReminders,
      entryKeta,
      weather: realWeather ? {
        temp: Number(weather.temp),
        condition: String(weather.conditionZH || weather.condition || '未標示'),
        updatedAt: weather.timestamp || null,
        cached: !!weather.isCached,
        city: String(ctx.currentCity?.nameTW || (selectedDay === '2026-11-15' ? '慶州' : '釜山'))
      } : null,
      next: mode === 'during' && today === selectedDay ? ctx.nextDestination || null : null,
      photosCount: photos.length,
      photoPreview,
      boughtCount: shopping.filter(p => p.checked === true).length,
      spent: data.hasExpenseRecords === true && typeof bills.overallSpent === 'number' &&
        Number.isFinite(bills.overallSpent) ? bills.overallSpent : null
    };
  }
  target.V46HomeEngine = Object.freeze({ createModel, toDay, modeFor, daysBetween, labels: LABELS });
})(typeof window !== 'undefined' ? window : globalThis);
