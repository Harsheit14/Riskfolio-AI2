/**
 * ✅ PRODUCTION-GRADE IN-MEMORY CACHING SERVICE
 * 
 * Purpose: Cache CoinGecko API responses to minimize external calls
 * Strategy: Time-based expiration (TTL), key-based lookup
 * 
 * Cache Structure:
 * {
 *   "key": {
 *     value: any,
 *     expiresAt: timestamp,
 *     createdAt: timestamp
 *   }
 * }
 */

const cache = new Map();

const DEFAULT_TTL = 45 * 1000; // 45 seconds in milliseconds
const CLEANUP_INTERVAL = 60 * 1000; // Cleanup every 60 seconds

/**
 * Start background cleanup of expired entries
 * Runs periodically to prevent memory leaks
 */
export function initializeCache() {
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned ${cleaned} expired entries`);
    }
  }, CLEANUP_INTERVAL);

  console.log("✅ Cache service initialized with auto-cleanup");
}

/**
 * Get value from cache
 * Returns null if not found or expired
 * 
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
export function get(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set value in cache
 * 
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds (default: 45 seconds)
 */
export function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
    createdAt: Date.now(),
  });
}

/**
 * Delete specific key from cache
 * 
 * @param {string} key - Cache key
 */
export function remove(key) {
  cache.delete(key);
}

/**
 * Clear all cache
 */
export function clear() {
  cache.clear();
  console.log("[CACHE] All entries cleared");
}

/**
 * Get cache statistics
 * Useful for monitoring cache efficiency
 * 
 * @returns {object} Cache stats
 */
export function getStats() {
  let expiredCount = 0;
  const now = Date.now();

  for (const entry of cache.values()) {
    if (entry.expiresAt < now) {
      expiredCount++;
    }
  }

  return {
    totalEntries: cache.size,
    expiredEntries: expiredCount,
    activeEntries: cache.size - expiredCount,
    ttlSeconds: DEFAULT_TTL / 1000,
  };
}

/**
 * Get or set pattern - Common caching pattern
 * If key exists and not expired, return value
 * Otherwise, call fetcher function, cache result, and return
 * 
 * @param {string} key - Cache key
 * @param {function} fetcher - Async function to fetch data
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} Cached or fresh value
 */
export async function getOrSet(key, fetcher, ttl = DEFAULT_TTL) {
  // Try to get from cache
  const cached = get(key);
  if (cached !== null) {
    console.log(`[CACHE HIT] ${key}`);
    return cached;
  }

  console.log(`[CACHE MISS] ${key}`);

  // Fetch fresh data
  const value = await fetcher();

  // Cache it
  set(key, value, ttl);

  return value;
}

export default {
  initializeCache,
  get,
  set,
  remove,
  clear,
  getStats,
  getOrSet,
};
