/* ============================================
   WanderMatch API — Configuration
   Centralized configuration for all API services.
   ============================================ */

const API_CONFIG = {
  // Feature flags
  features: {
    useWeather: true,
    useGeocoding: true,
    usePlaces: true,
    useRouting: true,
    useFlights: false // Amadeus disabled for Phase 1
  },

  // Open-Meteo (No API key required for non-commercial)
  weather: {
    baseUrl: 'https://api.open-meteo.com/v1',
    timeout: 5000 // 5 seconds
  },

  // Nominatim / OpenStreetMap (No API key, but requires User-Agent and limits)
  geocoding: {
    baseUrl: 'https://nominatim.openstreetmap.org',
    userAgent: 'WanderMatch/1.0 (CollegeProject)',
    timeout: 8000,
    debounceMs: 600, // Important: Nominatim asks for max 1 request/second
    minChars: 3
  },

  // Foursquare Places API (Requires API Key)
  places: {
    baseUrl: 'https://api.foursquare.com/v3',
    // PLACEHOLDER: For testing, you would put a real Foursquare API key here.
    // If empty or invalid, the app falls back to Overpass (OpenStreetMap) or local data.
    apiKey: '',
    fallbackToOverpass: true,
    timeout: 8000,
    radiusLimit: 10000 // 10km radius
  },

  // OpenRouteService (Requires API Key)
  routing: {
    baseUrl: 'https://api.openrouteservice.org/v2',
    // PLACEHOLDER: For testing, you would put a real ORS API key here.
    // If empty or invalid, the app falls back to local distance estimates.
    apiKey: '',
    timeout: 8000
  },

  // Overpass API fallback (free, no key)
  overpass: {
    baseUrl: 'https://overpass-api.de/api/interpreter',
    timeout: 15000,
    radiusLimit: 10000 // 10km radius
  }
};
