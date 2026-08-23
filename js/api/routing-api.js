/* ============================================
   WanderMatch API — Routing (OpenRouteService)
   ============================================ */

const RoutingAPI = {
  /**
   * Get driving route between multiple coordinates
   * @param {Array} coords - Array of [lon, lat] pairs
   * @returns {Promise<Object>} Route object with distance, duration, geometry
   */
  async getRoute(coords) {
    if (!API_CONFIG.features.useRouting) return null;
    if (!coords || coords.length < 2) return null;

    // If no API key, fallback to estimated distance
    if (!API_CONFIG.routing.apiKey || API_CONFIG.routing.apiKey.length < 10) {
      return this.estimateRoute(coords);
    }

    // Cache key based on coordinate points
    const cacheStr = coords.map(c => `${c[0].toFixed(3)},${c[1].toFixed(3)}`).join('_');
    const cacheKey = `route_${cacheStr}`;
    const cached = ApiCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Directions endpoint (driving-car profile)
      const url = new URL(`${API_CONFIG.routing.baseUrl}/directions/driving-car`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.routing.timeout);

      // ORS expects POST for multiple coordinates in JSON body
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': API_CONFIG.routing.apiKey,
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          coordinates: coords,
          elevation: false,
          instructions: false // We only need the polyline and summary
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`OpenRouteService error! status: ${response.status}`);

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) return null;

      const route = data.routes[0];
      const result = {
        distanceKm: (route.summary.distance / 1000).toFixed(1),
        durationMin: Math.round(route.summary.duration / 60),
        geometry: route.geometry // Encoded polyline
      };

      // Cache for 30 days (routes rarely change)
      ApiCache.set(cacheKey, result, 30 * 24 * 60);
      return result;

    } catch (error) {
      console.warn('Routing fetch failed (check API key):', error);
      return this.estimateRoute(coords);
    }
  },

  /**
   * Fallback distance/duration estimator when API key is missing
   */
  estimateRoute(coords) {
    let totalDistanceKm = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      totalDistanceKm += this.haversine(coords[i][1], coords[i][0], coords[i + 1][1], coords[i + 1][0]);
    }
    // Assume ~30 km/h average on mountain roads
    const durationMin = Math.round((totalDistanceKm / 30) * 60);

    return {
      distanceKm: totalDistanceKm.toFixed(1),
      durationMin: durationMin,
      geometry: null,
      estimated: true
    };
  },

  haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};
