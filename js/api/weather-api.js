/* ============================================
   WanderMatch API — Weather (Open-Meteo)
   ============================================ */

const WeatherAPI = {
  /**
   * Get current and daily forecast for a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object>} Weather data object
   */
  async getWeather(lat, lon) {
    if (!API_CONFIG.features.useWeather) return null;
    if (lat == null || lon == null) return null;

    // Round coordinates slightly to improve cache hit rate
    const cacheKey = `weather_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = ApiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${API_CONFIG.weather.baseUrl}/forecast`);
      url.searchParams.append('latitude', lat);
      url.searchParams.append('longitude', lon);
      url.searchParams.append('current', 'temperature_2m,weather_code,wind_speed_10m');
      url.searchParams.append('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
      url.searchParams.append('timezone', 'auto');
      url.searchParams.append('forecast_days', '7');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.weather.timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Open-Meteo error! status: ${response.status}`);

      const data = await response.json();

      const result = {
        current: {
          temp: Math.round(data.current.temperature_2m),
          condition: this.getWeatherDescription(data.current.weather_code),
          icon: this.getWeatherIcon(data.current.weather_code),
          wind: data.current.wind_speed_10m
        },
        daily: data.daily.time.map((date, i) => ({
          date: date,
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          rainProb: data.daily.precipitation_probability_max[i],
          condition: this.getWeatherDescription(data.daily.weather_code[i]),
          icon: this.getWeatherIcon(data.daily.weather_code[i])
        }))
      };

      // Cache for 3 hours
      ApiCache.set(cacheKey, result, 3 * 60);
      return result;

    } catch (error) {
      console.warn('Weather fetch failed:', error);
      return null; // Silent failure, fallback to UI hiding
    }
  },

  /**
   * Translate WMO Weather codes to readable text
   */
  getWeatherDescription(code) {
    const codes = {
      0: 'Clear sky',
      1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
      80: 'Rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with hail'
    };
    return codes[code] || 'Unknown';
  },

  /**
   * Translate WMO Weather codes to emojis for UI
   */
  getWeatherIcon(code) {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 2) return '⛅';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 75) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌡️';
  }
};
