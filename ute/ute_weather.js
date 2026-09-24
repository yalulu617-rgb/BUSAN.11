// Universal Travel Engine — Open-Meteo weather normalization and cache.
const WeatherEngine = {
  cache: {},
  _cacheTtlMs: 2 * 60 * 60 * 1000,

  localizeCondition(code) {
    const legacy = {
      Sunny: '晴天', Clear: '晴朗', 'Partly cloudy': '局部多雲', 'Partly Cloudy': '局部多雲',
      Cloudy: '多雲', Overcast: '陰天', 'Light rain shower': '局部陣雨', 'Light rain': '小雨'
    };
    if (typeof code === 'string' && legacy[code]) return legacy[code];
    const value = Number(code);
    if (value === 0) return '晴朗';
    if ([1, 2].includes(value)) return '局部多雲';
    if (value === 3) return '陰天';
    if ([45, 48].includes(value)) return '有霧';
    if ([51, 53, 55, 56, 57].includes(value)) return '毛毛雨';
    if ([61, 63, 65, 66, 67].includes(value)) return '降雨';
    if ([71, 73, 75, 77].includes(value)) return '降雪';
    if ([80, 81, 82].includes(value)) return '陣雨';
    if ([85, 86].includes(value)) return '陣雪';
    if ([95, 96, 99].includes(value)) return '雷雨';
    return '天氣狀態待更新';
  },

  _normalize(cityKey, data) {
    const current = data.current || {};
    const hourly = data.hourly || {};
    const daily = data.daily || {};
    const currentHour = String(current.time || '').slice(0, 13);
    const foundHour = Array.isArray(hourly.time) ? hourly.time.findIndex(time => String(time).slice(0, 13) === currentHour) : -1;
    const hourIndex = foundHour >= 0 ? foundHour : 0;
    const rainChance = Number(hourly.precipitation_probability?.[hourIndex] ?? daily.precipitation_probability_max?.[0] ?? 0);
    const forecast = (daily.time || []).map((date, index) => ({
      date,
      weatherCode: Number(daily.weather_code?.[index]),
      conditionZH: this.localizeCondition(daily.weather_code?.[index]),
      maxTemp: Number(daily.temperature_2m_max?.[index]),
      minTemp: Number(daily.temperature_2m_min?.[index]),
      rainChance: Number(daily.precipitation_probability_max?.[index] ?? 0),
      sunrise: daily.sunrise?.[index] || '',
      sunset: daily.sunset?.[index] || ''
    }));
    return {
      cityKey,
      temp: Number(current.temperature_2m),
      apparentTemp: Number(current.apparent_temperature),
      feelsLike: Number(current.apparent_temperature),
      humidity: Number(current.relative_humidity_2m),
      precipitation: Number(current.precipitation),
      weatherCode: Number(current.weather_code),
      condition: Number(current.weather_code),
      conditionZH: this.localizeCondition(current.weather_code),
      windSpeed: Number(current.wind_speed_10m),
      rainChance,
      daily: forecast,
      timestamp: Date.now(),
      updatedAt: current.time || new Date().toISOString(),
      isLive: true,
      isCached: false,
      isFallback: false,
      unavailable: false,
      source: 'Open-Meteo'
    };
  },

  async fetchAll(options = {}) {
    if (typeof travelKnowledge === 'undefined' || !travelKnowledge.cities) return this.cache;
    const force = options.force === true;
    await Promise.all(Object.entries(travelKnowledge.cities).map(async ([cityKey, city]) => {
      const existing = this.getWeather(cityKey);
      if (!force && existing.source === 'Open-Meteo' && existing.timestamp && Date.now() - existing.timestamp < this._cacheTtlMs) return;
      const result = await NetworkEngine.getWeather(city);
      if (result.success && result.data?.current) this.cache[cityKey] = this._normalize(cityKey, result.data);
      else if (!this.cache[cityKey]) this.cache[cityKey] = this.getFallbackWeather(cityKey);
    }));
    StorageEngine.set('ute_weather_cache', this.cache);
    return this.cache;
  },

  getWeather(cityId) {
    if (Object.keys(this.cache).length === 0) {
      const saved = StorageEngine.get('ute_weather_cache');
      if (saved.success && saved.data && typeof saved.data === 'object') this.cache = saved.data;
    }
    const item = this.cache[cityId];
    if (item && !item.unavailable && Number.isFinite(Number(item.temp))) {
      item.isCached = Boolean(item.timestamp && Date.now() - item.timestamp > this._cacheTtlMs);
      item.isLive = !item.isCached;
      return item;
    }
    return this.getFallbackWeather(cityId);
  },

  getFallbackWeather(cityId) {
    return { cityKey: cityId, unavailable: true, temp: null, apparentTemp: null, feelsLike: null, condition: null, conditionZH: null, windSpeed: 0, humidity: 0, precipitation: 0, rainChance: 0, daily: [], timestamp: null, updatedAt: null, isLive: false, isCached: false, isFallback: true, source: 'Open-Meteo' };
  },

  getOutfitAdvice(weather, rainChance, windSpeed) {
    const apparent = typeof weather === 'object' ? Number(weather.apparentTemp ?? weather.feelsLike ?? weather.temp) : Number(weather);
    const rain = typeof weather === 'object' ? Number(weather.rainChance || 0) : Number(rainChance || 0);
    const wind = typeof weather === 'object' ? Number(weather.windSpeed || 0) : Number(windSpeed || 0);
    let advice;
    if (!Number.isFinite(apparent)) advice = '早晚溫差大，建議採洋蔥式穿搭並攜帶防風外套備用。';
    else if (apparent <= 7) advice = '發熱衣＋針織／保暖層＋防風厚外套；早晚可加圍巾。';
    else if (apparent <= 12) advice = '發熱／長袖內搭＋針織或薄刷毛＋防風外套。';
    else if (apparent <= 17) advice = '長袖＋薄針織／外罩＋輕防風外套，早晚加層。';
    else if (apparent <= 22) advice = '長袖或短袖打底＋薄外套，早晚注意溫差。';
    else advice = '輕薄上衣為主，備薄外套應付室內冷氣／晚間。';
    if (rain >= 40) advice += ' 建議攜帶折疊傘／防潑水鞋。';
    if (wind >= 20) advice += ' 優先防風外層。';
    return advice;
  },

  getTripForecastStatus(now = new Date()) {
    const start = new Date('2026-11-13T00:00:00+09:00');
    const daysUntil = Math.ceil((start.getTime() - now.getTime()) / 86400000);
    if (daysUntil > 10) return { available: false, message: '11/13–11/17 旅行日期預報將於出發前 7–10 天顯示' };
    const dates = ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'];
    const forecasts = {};
    for (const cityKey of ['Busan', 'Gyeongju']) {
      const weather = this.getWeather(cityKey);
      forecasts[cityKey] = (weather.daily || []).filter(day => dates.includes(day.date));
    }
    const available = Object.values(forecasts).some(rows => rows.length > 0);
    return available ? { available: true, forecasts } : { available: false, message: '旅行日期尚未進入 Open-Meteo 8 日預報範圍' };
  }
};

if (typeof window !== 'undefined') window.WeatherEngine = WeatherEngine;
