// ==========================================
// Universal Travel Engine (UTE)
// Module: Weather Engine
// ==========================================
// Dependency: NetworkEngine (for HTTP), StorageEngine (for cache)
// This module must NOT call fetch() or localStorage directly.

const WeatherEngine = {
  cache: {},
  _cacheTtlMs: 2 * 60 * 60 * 1000, // 2 hours TTL

  localizeCondition(desc) {
    if (!desc) return '多雲';
    const dict = {
      'Sunny': '晴天',
      'Clear': '晴朗',
      'Partly cloudy': '局部多雲',
      'Partly Cloudy': '局部多雲',
      'Cloudy': '多雲',
      'Overcast': '陰天',
      'Mist': '薄霧',
      'Fog': '濃霧',
      'Patchy rain possible': '局部短暫陣雨',
      'Patchy rain nearby': '局部短暫陣雨',
      'Patchy light rain': '局部小雨',
      'Light rain': '小雨',
      'Moderate rain': '中雨',
      'Heavy rain': '大雨',
      'Light rain shower': '局部陣雨',
      'Moderate or heavy rain shower': '中至大陣雨',
      'Torrential rain shower': '暴雨',
      'Patchy light drizzle': '局部毛毛雨',
      'Light drizzle': '毛毛雨',
      'Thundery outbreaks possible': '局部雷陣雨',
      'Patchy light rain with thunder': '局部雷陣雨',
      'Patchy snow possible': '局部降雪',
      'Light snow': '小雪',
      'Moderate snow': '中雪',
      'Heavy snow': '大雪'
    };
    if (dict[desc]) return dict[desc];
    for (const [en, zh] of Object.entries(dict)) {
      if (desc.toLowerCase().includes(en.toLowerCase())) return zh;
    }
    return desc;
  },

  /**
   * Fetch weather for all cities defined in travelKnowledge and populate cache.
   * Uses NetworkEngine.getWeather() — no direct fetch() calls.
   */
  async fetchAll() {
    if (typeof travelKnowledge === 'undefined' || !travelKnowledge.cities) return;
    const promises = Object.keys(travelKnowledge.cities).map(async (cityKey) => {
      const city = travelKnowledge.cities[cityKey];
      const result = await NetworkEngine.getWeather(city.weatherQuery);

      if (result.success && result.data && result.data.current_condition && result.data.current_condition[0]) {
        const data = result.data;
        const cc = data.current_condition[0];
        const temp = parseInt(cc.temp_C);
        const condition = cc.weatherDesc && cc.weatherDesc[0] ? cc.weatherDesc[0].value : 'Cloudy';
        const conditionZH = this.localizeCondition(condition);
        const feelsLike = parseInt(cc.FeelsLikeC) || temp;
        const windSpeed = parseInt(cc.windspeedKmph) || 10;
        const humidity = parseInt(cc.humidity) || 60;

        let uvIndex = 3;
        let rainChance = 0;
        if (data.weather && data.weather[0]) {
          const forecast = data.weather[0];
          uvIndex = parseInt(forecast.uvIndex) || 3;
          if (forecast.hourly && forecast.hourly.length > 0) {
            const chances = forecast.hourly.map(h => parseInt(h.chanceofrain) || 0);
            rainChance = Math.max(...chances);
          }
        }

        this.cache[cityKey] = {
          temp, condition, conditionZH, feelsLike, windSpeed, humidity, uvIndex, rainChance,
          timestamp: Date.now(),
          isLive: true,
          isCached: false,
          isFallback: false,
          unavailable: false
        };
      } else {
        console.warn(`[WeatherEngine] Failed to fetch weather for ${cityKey}:`, result.error);
        if (!this.cache[cityKey]) {
          this.cache[cityKey] = this.getFallbackWeather(cityKey);
        }
      }
    });

    await Promise.all(promises);

    // Persist to StorageEngine (not localStorage directly)
    StorageEngine.set('ute_weather_cache', this.cache);
  },

  /**
   * Get weather for a city. Returns from in-memory cache or StorageEngine-backed cache.
   * @param {string} cityId
   * @returns {object} weather data
   */
  getWeather(cityId) {
    if (Object.keys(this.cache).length === 0) {
      const saved = StorageEngine.get('ute_weather_cache');
      if (saved.success && saved.data && typeof saved.data === 'object') {
        this.cache = saved.data;
      }
    }
    const item = this.cache[cityId];
    if (item && !item.unavailable && item.temp !== null && item.temp !== undefined) {
      if (!item.conditionZH) item.conditionZH = this.localizeCondition(item.condition);
      // Check if cache is still fresh
      if (item.timestamp && (Date.now() - item.timestamp > this._cacheTtlMs)) {
        item.isCached = true;
        item.isLive = false;
      }
      return item;
    }

    return this.getFallbackWeather(cityId);
  },

  getFallbackWeather(cityId) {
    return {
      unavailable: true,
      temp: null,
      condition: null,
      conditionZH: null,
      feelsLike: null,
      windSpeed: 0,
      humidity: 0,
      uvIndex: 0,
      rainChance: 0,
      timestamp: null,
      isLive: false,
      isCached: false,
      isFallback: true
    };
  },

  getOutfitAdvice(temp) {
    if (temp === null || temp === undefined) {
      return '早晚溫差大，建議採洋蔥式穿搭並攜帶防風外套備用。';
    }
    if (temp < 8) {
      return '氣溫極寒！務必穿著發熱衣 + 羊毛針織衫 + 重度防風大衣。';
    } else if (temp >= 8 && temp <= 16) {
      return '早晚溫差極大。強烈建議「洋蔥式防風穿搭」：發熱衣打底 + 輕薄保暖層 + 最外層防風大衣。';
    } else {
      return '氣溫舒適。秋季長袖打底，攜帶輕薄防風外套備用。';
    }
  }
};

if (typeof window !== 'undefined') {
  window.WeatherEngine = WeatherEngine;
}
