/* ============================================
   WanderMatch API — Geocoding (Nominatim)
   ============================================ */

const GeocodingAPI = {
  /**
   * Search for a destination by name
   * @param {string} query - Destination name (e.g. "Manali")
   * @returns {Promise<Array>} Array of destination objects
   */
  async searchDestination(query, externalSignal) {
    if (!API_CONFIG.features.useGeocoding) return [];
    if (!query || query.length < API_CONFIG.geocoding.minChars) return [];

    const cacheKey = `geo_${query.toLowerCase().trim()}`;
    const cached = ApiCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Nominatim search endpoint
      const url = new URL(`${API_CONFIG.geocoding.baseUrl}/search`);
      url.searchParams.append('q', query);
      url.searchParams.append('format', 'json');
      url.searchParams.append('limit', '5');
      url.searchParams.append('featuretype', 'city'); // Prioritize cities/towns
      url.searchParams.append('addressdetails', '1');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.geocoding.timeout);

      // Combine external abort signal (typing) with internal timeout signal.
      let signal = controller.signal;
      if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': API_CONFIG.geocoding.userAgent,
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform into WanderMatch format
      const results = data.map(item => ({
        id: `api_${item.place_id}`,
        name: item.name || item.address.city || item.address.town || item.address.village,
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        country: item.address.country,
        state: item.address.state || item.address.region,
        source: 'nominatim'
      }));

      // Cache for 24 hours (seldom changes)
      ApiCache.set(cacheKey, results, 24 * 60);

      return results;

    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.warn('Geocoding search failed:', error);
      // Fallback handled by the caller
      return null;
    }
  }
};
