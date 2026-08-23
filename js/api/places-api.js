/* ============================================
   WanderMatch API — Places (Foursquare + Overpass fallback)
   Tries Foursquare first if API key is available, otherwise uses Overpass.
   ============================================ */

const PlacesAPI = {
  /**
   * Search for points of interest near coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} categoryStr - comma-separated interest names or Foursquare category IDs
   * @returns {Promise<Array>} Array of place objects
   */
  async searchPlaces(lat, lon, categoryStr = '') {
    if (!API_CONFIG.features.usePlaces) return null;
    if (lat == null || lon == null) return null;

    // Try Foursquare if API key is configured
    const hasFoursquareKey = API_CONFIG.places.apiKey && API_CONFIG.places.apiKey.length > 10;
    if (hasFoursquareKey) {
      try {
        const results = await this.searchFoursquare(lat, lon, categoryStr);
        if (results && results.length > 0) return results;
      } catch (e) {
        console.warn('Foursquare failed, trying fallback:', e);
      }
    }

    // Fallback to Overpass (OpenStreetMap) if enabled
    if (API_CONFIG.places.fallbackToOverpass !== false) {
      try {
        return await this.searchOverpass(lat, lon, categoryStr);
      } catch (e) {
        console.warn('Overpass fallback failed:', e);
      }
    }

    return null;
  },

  async searchFoursquare(lat, lon, categoryStr = '') {
    const cacheKey = `places_fsq_${lat.toFixed(2)}_${lon.toFixed(2)}_${categoryStr}`;
    const cached = ApiCache.get(cacheKey);
    if (cached) return cached;

    const url = new URL(`${API_CONFIG.places.baseUrl}/places/search`);
    url.searchParams.append('ll', `${lat},${lon}`);
    url.searchParams.append('radius', API_CONFIG.places.radiusLimit);
    url.searchParams.append('limit', '10');
    url.searchParams.append('sort', 'RELEVANCE');
    if (categoryStr) url.searchParams.append('categories', categoryStr);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.places.timeout);

    const response = await fetch(url, {
      headers: {
        'Authorization': API_CONFIG.places.apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Foursquare error! status: ${response.status}`);

    const data = await response.json();

    const results = data.results.map(place => ({
      id: `fsq_${place.fsq_id}`,
      name: place.name,
      category: place.categories && place.categories.length > 0 ? place.categories[0].name : 'Attraction',
      address: place.location ? place.location.formatted_address : '',
      lat: place.geocodes?.main?.latitude,
      lon: place.geocodes?.main?.longitude,
      source: 'foursquare'
    }));

    ApiCache.set(cacheKey, results, 24 * 60);
    return results;
  },

  async searchOverpass(lat, lon, categoryStr = '') {
    const cacheKey = `places_overpass_${lat.toFixed(2)}_${lon.toFixed(2)}_${categoryStr}`;
    const cached = ApiCache.get(cacheKey);
    if (cached) return cached;

    const radius = API_CONFIG.overpass.radiusLimit;
    const overpassQl = this.buildOverpassQuery(categoryStr, lat, lon, radius);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.overpass.timeout);

    const response = await fetch(API_CONFIG.overpass.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(overpassQl),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Overpass error! status: ${response.status}`);

    const data = await response.json();

    const results = (data.elements || [])
      .filter(el => el.tags && (el.tags.name || el.tags['name:en']))
      .map(el => {
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'];
        let category = 'Point of Interest';
        if (tags.tourism) category = this.capitalize(tags.tourism);
        else if (tags.amenity) category = this.capitalize(tags.amenity);
        else if (tags.leisure) category = this.capitalize(tags.leisure);
        else if (tags.natural) category = this.capitalize(tags.natural);
        else if (tags.historic) category = this.capitalize(tags.historic);

        let latVal = el.lat;
        let lonVal = el.lon;
        if (el.center) {
          latVal = el.center.lat;
          lonVal = el.center.lon;
        }

        return {
          id: `osm_${el.id}`,
          name: name,
          category: category,
          address: tags['addr:city'] || tags['addr:state'] || '',
          lat: latVal,
          lon: lonVal,
          source: 'overpass'
        };
      });

    // Deduplicate by name
    const seen = new Set();
    const unique = [];
    for (const r of results) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        unique.push(r);
      }
    }

    ApiCache.set(cacheKey, unique.slice(0, 12), 24 * 60);
    return unique.slice(0, 12);
  },

  buildOverpassQuery(categoryStr, lat, lon, radius) {
    const interestMap = {
      'Nature': ['natural', 'leisure=park', 'tourism=nature_reserve'],
      'Photography': ['tourism=viewpoint', 'tourism=attraction'],
      'Cafés': ['amenity=cafe'],
      'Trekking': ['route=hiking', 'highway=path'],
      'Local Food': ['amenity=restaurant', 'amenity=food_court'],
      'History': ['historic', 'tourism=museum'],
      'Yoga': ['amenity=studio', 'sport=yoga'],
      'Adventure': ['tourism=attraction', 'sport=climbing_adventure'],
      'Culture': ['tourism=museum', 'historic'],
      'Food': ['amenity=restaurant', 'amenity=cafe'],
      'Wellness': ['leisure=spa', 'amenity=studio'],
      'Beach': ['natural=beach'],
      'Camping': ['tourism=camp_site'],
      'Markets': ['amenity=marketplace', 'shop=market'],
      'Meditation': ['amenity=studio'],
      'Stargazing': ['tourism=viewpoint'],
      'Wildlife': ['tourism=zoo', 'tourism=wildlife_hide'],
      'Architecture': ['tourism=attraction', 'historic=monument'],
      'Shopping': ['shop=mall', 'amenity=marketplace']
    };

    const categories = categoryStr.split(',').map(c => c.trim()).filter(Boolean);
    if (categories.length === 0) categories.push('Nature');

    const queries = [];
    categories.forEach(cat => {
      const mapped = interestMap[cat] || interestMap['Nature'];
      mapped.forEach(tag => {
        if (tag.includes('=')) {
          const [key, val] = tag.split('=');
          queries.push(`node["${key}"="${val}"](around:${radius},${lat},${lon});`);
          queries.push(`way["${key}"="${val}"](around:${radius},${lat},${lon});`);
        } else {
          queries.push(`node["${tag}"](around:${radius},${lat},${lon});`);
          queries.push(`way["${tag}"](around:${radius},${lat},${lon});`);
        }
      });
    });

    return `
      [out:json][timeout:20];
      (
        ${queries.join('\n')}
      );
      out center 20;
    `;
  },

  capitalize(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  },

  /**
   * Helper to map WanderMatch interests to Foursquare Category IDs
   * See: https://location.foursquare.com/places/docs/categories
   */
  mapInterestToCategory(interest) {
    const map = {
      'Nature': '16000', // Landmarks and Outdoors
      'Photography': '16032', // Scenic Lookout
      'Cafés': '13032', // Cafe, Coffee, and Tea House
      'Trekking': '16019', // Hiking Trail
      'Local Food': '13065', // Restaurant
      'History': '10027', // Museum
      'Yoga': '18021', // Yoga Studio
      'Adventure': '19000' // Travel and Transportation (fallback)
    };
    return map[interest] || '16000'; // Default to outdoors
  }
};
