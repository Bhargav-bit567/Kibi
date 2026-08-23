/* ============================================
   TripMate API Module — Kibi integration
   Free-tier sources: Wikipedia, Wikimedia Commons,
   Open-Meteo, sunrise-sunset.org, open.er-api.com
   Optional key: OpenTripMap (set key below)
   ============================================ */

// PASTE YOUR FREE OPENTRIPMAP KEY HERE (https://dev.opentripmap.org/product)
const OPENTRIPMAP_KEY = "5ae2e3f221c38a28845f05b65ad5c69491fc9e193e19e64eaaf88418";

const TripMateAPI = {
  /* ---------- 1. PLACE INFO (description + hero image) ---------- */
  async getPlaceInfo(placeName) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(placeName)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Place not found");
      const data = await response.json();

      let image = (data.originalimage && data.originalimage.source)
        || (data.thumbnail && data.thumbnail.source)
        || null;

      if (!image) image = await this.searchForImage(placeName);

      return {
        title: data.title,
        description: data.extract,
        image: image,
        coordinates: data.coordinates || null
      };
    } catch (err) {
      console.error("Error fetching place info:", err);
      const fallbackImage = await this.searchForImage(placeName);
      return { title: placeName, description: "No details available for this place.", image: fallbackImage, coordinates: null };
    }
  },

  /* ---------- 2. MULTIPLE SCENIC PHOTOS (gallery) ---------- */
  async getMultipleImages(placeName) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(placeName)}&prop=imageinfo&iiprop=url|size&format=json&origin=*&gimlimit=30`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.query || !data.query.pages) return [];

      const pages = Object.values(data.query.pages);
      const excludeKeywords = [
        "map", "locator", "flag", "coat_of_arms", "coa_", "logo", "icon",
        "symbol", "seal", "emblem", "svg", "diagram", "chart", "location",
        "position", "outline", "sign", "wikimedia", "commons-logo"
      ];

      const candidates = pages
        .map(p => p.imageinfo && p.imageinfo[0])
        .filter(info => info && info.url && /\.(jpg|jpeg|png)$/i.test(info.url))
        .filter(info => {
          const lowerUrl = info.url.toLowerCase();
          return !excludeKeywords.some(kw => lowerUrl.includes(kw));
        })
        .filter(info => info.width >= 500 && info.height >= 350)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));

      return candidates.slice(0, 8).map(info => info.url);
    } catch (err) {
      console.error("Multiple images fetch failed:", err);
      return [];
    }
  },

  /* ---------- 3. WEATHER (current conditions) ---------- */
  async getWeather(lat, lon) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      return data.current_weather || null;
    } catch (err) {
      console.error("Weather fetch failed:", err);
      return null;
    }
  },

  weatherCodeToText(code) {
    const map = {
      0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
      45: "Fog", 48: "Depositing rime fog",
      51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
      61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
      71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
      80: "Rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
      95: "Thunderstorm", 96: "Thunderstorm with hail"
    };
    return map[code] || "Unknown conditions";
  },

  /* ---------- 4. SUNRISE / SUNSET ---------- */
  async getSunTimes(lat, lon) {
    try {
      const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== "OK") return null;
      return {
        sunrise: new Date(data.results.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(data.results.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    } catch (err) {
      console.error("Sun times fetch failed:", err);
      return null;
    }
  },

  /* ---------- 5. LIVE CURRENCY EXCHANGE RATE ---------- */
  async getExchangeRate(targetCurrency) {
    try {
      const url = `https://open.er-api.com/v6/latest/INR`;
      const res = await fetch(url);
      const data = await res.json();
      return data.rates ? data.rates[targetCurrency] : null;
    } catch (err) {
      console.error("Exchange rate fetch failed:", err);
      return null;
    }
  },

  /* ---------- 6. ATTRACTIONS NEAR A PLACE ---------- */
  async getAttractions(placeName) {
    if (OPENTRIPMAP_KEY === "YOUR_API_KEY_HERE") {
      console.warn("Add your OpenTripMap key to see attractions.");
      return [];
    }
    try {
      const geoRes = await fetch(`https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(placeName)}&apikey=${OPENTRIPMAP_KEY}`);
      const geo = await geoRes.json();
      if (!geo.lat || !geo.lon) return [];

      const radiusRes = await fetch(`https://api.opentripmap.com/0.1/en/places/radius?radius=8000&lon=${geo.lon}&lat=${geo.lat}&kinds=interesting_places&rate=2&limit=8&apikey=${OPENTRIPMAP_KEY}`);
      const radiusData = await radiusRes.json();
      const basicPlaces = radiusData.features || [];

      const detailedPlaces = await Promise.all(
        basicPlaces.map(p => this.getPlaceDetails(p.properties.xid))
      );
      return detailedPlaces.filter(p => p !== null);
    } catch (err) {
      console.error("Attractions fetch failed:", err);
      return [];
    }
  },

  async getPlaceDetails(xid) {
    try {
      const res = await fetch(`https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OPENTRIPMAP_KEY}`);
      const d = await res.json();

      return {
        id: d.xid,
        name: d.name || "Unnamed place",
        description: (d.wikipedia_extracts && d.wikipedia_extracts.text) || "No description available.",
        image: (d.preview && d.preview.source) || d.image || null,
        coordinates: {
          latitude: d.point ? d.point.lat : null,
          longitude: d.point ? d.point.lon : null
        },
        category: d.kinds ? d.kinds.split(",").slice(0, 3) : [],
        rating: d.rate || null,
        openingHours: d.opening_hours || null,
        entryFee: (d.ticket_prices && d.ticket_prices.regular) || null,
        activities: [],
        travelStyles: [],
        socialLevel: null,
        recommendedDuration: null,
        bestTime: null,
        difficulty: null,
        tags: []
      };
    } catch (err) {
      console.error("Place details fetch failed for xid:", xid, err);
      return null;
    }
  },

  /* ---------- Fallback image search ---------- */
  async searchForImage(placeName) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(placeName)}&gsrlimit=5&prop=pageimages&piprop=original&format=json&origin=*`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      if (!data.query || !data.query.pages) return null;
      const pages = Object.values(data.query.pages);
      const withImage = pages.find(p => p.original && p.original.source);
      return withImage ? withImage.original.source : null;
    } catch (err) {
      console.error("Image search fallback failed:", err);
      return null;
    }
  }
};
