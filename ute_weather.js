// ==========================================
// Universal Travel Engine (UTE)
// Module: Weather Engine
// ==========================================
// Dependency: NetworkEngine (for HTTP), StorageEngine (for cache)
// This module must NOT call fetch() or localStorage directly.

const WeatherEngine = {
  cache: {},

  /**
   * Fetch weather for all cities defined in travelKnowledge and populate cache.
   * Uses NetworkEngine.getWeather() — no direct fetch() calls.
   */
  async fetchAll() {
    const promises = Object.keys(travelKnowledge.cities).map(async (cityKey) => {
      const city = travelKnowledge.cities[cityKey];
      const result = await NetworkEngine.getWeather(city.weatherQuery);

      if (result.success && result.data) {
        const data = result.data;
        const cc = data.current_condition[0];
        const temp = parseInt(cc.temp_C);
        const condition = cc.weatherDesc[0].value;
        const feelsLike = parseInt(cc.FeelsLikeC);
        const windSpeed = parseInt(cc.windspeedKmph);
        const humidity = parseInt(cc.humidity);

        const forecast = data.weather[0];
        const uvIndex = parseInt(forecast.uvIndex);

        let rainChance = 0;
        if (forecast.hourly && forecast.hourly.length > 0) {
          const chances = forecast.hourly.map(h => parseInt(h.chanceofrain) || 0);
          rainChance = Math.max(...chances);
        }

        this.cache[cityKey] = {
          temp, condition, feelsLike, windSpeed, humidity, uvIndex, rainChance,
          timestamp: Date.now()
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
      if (saved.success && saved.data) this.cache = saved.data;
    }
    if (this.cache[cityId]) return this.cache[cityId];

    const fb = this.getFallbackWeather(cityId);
    this.cache[cityId] = fb;
    return fb;
  },

  getFallbackWeather(cityId) {
    return {
      temp: 12, condition: 'Partly cloudy', feelsLike: 11,
      windSpeed: 12, humidity: 60, uvIndex: 3, rainChance: 10,
      timestamp: Date.now()
    };
  },

  getOutfitAdvice(temp) {
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
