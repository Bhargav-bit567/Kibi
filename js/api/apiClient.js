/* ============================================
   Kibi — API Client Module
   Lean wrapper for destination data APIs
   All functions are standalone, cacheable, and Postman-testable
   ============================================ */

/**
 * Get coordinates for a destination using Nominatim (OpenStreetMap)
 * @param {string} placeName - Destination name
 * @returns {Promise<{lat, lon, displayName}|null>}
 */
async function getPlaceCoords(placeName) {
  if (!placeName) return null;
  
  const cacheKey = `coords_${placeName}`;
  const cached = ApiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
    console.log('[apiClient.getPlaceCoords] URL:', url);
    
    const response = await Promise.race([
      fetch(url, { headers: { 'User-Agent': 'KibiTravelApp/1.0' } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
      ApiCache.set(cacheKey, result, 1440);
      console.log('[apiClient.getPlaceCoords] Success:', result);
      return result;
    }
    console.warn('[apiClient.getPlaceCoords] No results for:', placeName);
    return null;
  } catch (e) {
    console.error('[apiClient.getPlaceCoords] Error:', e.message);
    return null;
  }
}

/**
 * Filter out non-scenic images (maps, flags, logos, diagrams)
 * @param {string} url
 * @returns {boolean}
 */
function _isScenicImage(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Must be a photo format
  if (!/\.(jpg|jpeg|png)/i.test(lower)) return false;
  // Reject known non-scenic keywords
  const bad = [
    'map', 'locator', 'flag', 'coat_of_arms', 'logo', 'icon', 'symbol',
    'seal', 'emblem', 'svg', 'diagram', 'chart', 'location', 'position',
    'outline', 'sign', 'sat-nasa', 'satellite', 'stub', 'blank',
    'silhouette', 'red_dot', 'blue_dot', 'arrow', 'placeholder'
  ];
  return !bad.some(kw => lower.includes(kw));
}

/**
 * Get images for a destination using Wikimedia Commons (scenic landscape photos)
 * Fallback: Wikipedia page images
 * @param {string} placeName - Destination name
 * @returns {Promise<string[]>}
 */
async function getImages(placeName) {
  if (!placeName) return [];

  const cacheKey = `images_${placeName}`;
  const cached = ApiCache.get(cacheKey);
  if (cached) return cached;

  // ── Strategy 1: Wikimedia Commons search (best for scenic travel photos) ──
  try {
    const searchTerm = `${placeName} landscape`;
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=8&format=json&origin=*`;
    console.log('[apiClient.getImages] Wikimedia Commons search URL:', searchUrl);

    const searchResp = await Promise.race([
      fetch(searchUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (searchResp.ok) {
      const searchData = await searchResp.json();
      const fileTitles = (searchData.query?.search || [])
        .map(r => r.title)
        .filter(t => /\.(jpg|jpeg|png)$/i.test(t))
        .slice(0, 5);

      if (fileTitles.length > 0) {
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitles.join('|'))}&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
        console.log('[apiClient.getImages] Wikimedia Commons imageinfo URL:', infoUrl);

        const infoResp = await Promise.race([
          fetch(infoUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
        ]);

        if (infoResp.ok) {
          const infoData = await infoResp.json();
          const urls = Object.values(infoData.query?.pages || {})
            .map(p => p.imageinfo?.[0]?.url)
            .filter(url => url && _isScenicImage(url))
            // Strip UTM tracking params for cleaner URLs
            .map(url => url.split('?')[0])
            .slice(0, 3);

          if (urls.length > 0) {
            ApiCache.set(cacheKey, urls, 1440);
            console.log('[apiClient.getImages] Wikimedia Commons success:', urls);
            return urls;
          }
        }
      }
    }
    console.warn('[apiClient.getImages] Wikimedia Commons returned no usable images');
  } catch (e) {
    console.warn('[apiClient.getImages] Wikimedia Commons error:', e.message);
  }

  // ── Strategy 2: Wikipedia page images with scenic filter ──
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(placeName + ' India')}&gsrlimit=5&prop=pageimages&piprop=original&format=json&origin=*`;
    console.log('[apiClient.getImages] Wikipedia fallback URL:', wikiUrl);

    const wikiResp = await Promise.race([
      fetch(wikiUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (wikiResp.ok) {
      const wikiData = await wikiResp.json();
      const urls = Object.values(wikiData.query?.pages || {})
        .map(p => p.original?.source)
        .filter(url => url && _isScenicImage(url))
        .slice(0, 3);

      if (urls.length > 0) {
        ApiCache.set(cacheKey, urls, 1440);
        console.log('[apiClient.getImages] Wikipedia fallback success:', urls.length, 'images');
        return urls;
      }
    }
  } catch (e) {
    console.error('[apiClient.getImages] Wikipedia fallback error:', e.message);
  }

  console.warn('[apiClient.getImages] No scenic images found for:', placeName);
  return [];
}

/**
 * Get current weather for coordinates using Open-Meteo
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{temp, condition, windspeed}|null>}
 */
async function getWeather(lat, lon) {
  if (!lat || !lon) return null;
  
  const cacheKey = `weather_${lat}_${lon}`;
  const cached = ApiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    console.log('[apiClient.getWeather] URL:', url);
    
    const response = await Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data.current_weather) {
      const result = {
        temp: data.current_weather.temperature,
        condition: data.current_weather.weathercode,
        windspeed: data.current_weather.windspeed
      };
      ApiCache.set(cacheKey, result, 60); // Cache for 1 hour
      console.log('[apiClient.getWeather] Success:', result);
      return result;
    }
    return null;
  } catch (e) {
    console.error('[apiClient.getWeather] Error:', e.message);
    return null;
  }
}

/**
 * Get points of interest (hotels, restaurants, attractions) using Overpass API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters (default: 1000)
 * @returns {Promise<Array>}
 */
async function getPOIs(lat, lon, radius = 1000) {
  if (!lat || !lon) return [];
  
  const cacheKey = `pois_${lat}_${lon}_${radius}`;
  const cached = ApiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const query = `[out:json][timeout:10];(node["tourism"="hotel"](around:${radius},${lat},${lon});node["amenity"="restaurant"](around:${radius},${lat},${lon});node["tourism"="attraction"](around:${radius},${lat},${lon}););out 20;`;
    const url = `https://overpass-api.de/api/interpreter`;
    
    console.log('[apiClient.getPOIs] Overpass URL:', url);
    console.log('[apiClient.getPOIs] Query:', query);

    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000))
    ]);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (Array.isArray(data.elements)) {
      const pois = data.elements
        .filter(e => e.tags && (e.tags.name || e.tags.amenity || e.tags.tourism))
        .map(e => ({
          name: e.tags.name || e.tags.amenity || e.tags.tourism,
          type: e.tags.tourism || e.tags.amenity || 'place',
          lat: e.lat,
          lon: e.lon
        }))
        .slice(0, 20);
      
      ApiCache.set(cacheKey, pois, 1440);
      console.log('[apiClient.getPOIs] Success:', pois.length, 'POIs');
      return pois;
    }
    return [];
  } catch (e) {
    console.error('[apiClient.getPOIs] Error:', e.message);
    return [];
  }
}

/**
 * Get destination description from Wikipedia
 * @param {string} placeName - Destination name
 * @returns {Promise<{title, description, image}|null>}
 */
async function getDescription(placeName) {
  if (!placeName) return null;
  
  const cacheKey = `desc_${placeName}`;
  const cached = ApiCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`;
    console.log('[apiClient.getDescription] URL:', url);
    
    const response = await Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    if (data.extract && data.extract.length > 50) {
      const result = {
        title: data.title,
        description: data.extract,
        image: data.originalimage?.source || data.thumbnail?.source || null
      };
      ApiCache.set(cacheKey, result, 1440);
      console.log('[apiClient.getDescription] Success:', result.title);
      return result;
    }
    console.warn('[apiClient.getDescription] No description found for:', placeName);
    return null;
  } catch (e) {
    console.error('[apiClient.getDescription] Error:', e.message);
    return null;
  }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getPlaceCoords, getImages, getWeather, getPOIs, getDescription };
}
