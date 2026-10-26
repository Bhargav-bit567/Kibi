/* ============================================
   WanderMatch API — Caching Layer
   Prevents redundant network requests and handles rate limits.
   ============================================ */

const ApiCache = {
  // Save data to cache with a Time-To-Live (TTL) in minutes
  set(key, data, ttlMinutes = 60) {
    try {
      const cacheEntry = {
        data: data,
        expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
      };
      localStorage.setItem(`wm_cache_${key}`, JSON.stringify(cacheEntry));
    } catch (e) {
      console.warn('ApiCache set failed (quota exceeded?):', e);
    }
  },

  // Get data from cache if it exists and is not expired
  get(key) {
    try {
      const item = localStorage.getItem(`wm_cache_${key}`);
      if (!item) return null;

      const cacheEntry = JSON.parse(item);
      if (Date.now() > cacheEntry.expiresAt) {
        // Expired
        localStorage.removeItem(`wm_cache_${key}`);
        return null;
      }
      
      return cacheEntry.data;
    } catch (e) {
      console.error('ApiCache get failed:', e);
      return null;
    }
  },

  // Clear specific cache entry
  clear(key) {
    localStorage.removeItem(`wm_cache_${key}`);
  },

  // Clear all WanderMatch API caches
  clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('wm_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
};
