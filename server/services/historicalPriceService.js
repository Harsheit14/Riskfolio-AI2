/**
 * Historical Price Service
 * 
 * Purpose: Fetch and cache historical price data from CoinGecko API
 * Supports time-series data for portfolio analytics and charting
 * 
 * Uses:
 * - CoinGecko market_chart endpoint for historical data
 * - Redis caching with 5-10 minute TTL for optimal performance
 * - Local cache as fallback
 * 
 * Typical Usage:
 * const history = await getHistoricalPrices("BTC", 30);
 * // Returns: [{timestamp: 1234567890, price: 45000}, ...]
 */

import * as redisClient from "./redisClient.js";
import * as cacheService from "./cacheService.js";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const HISTORICAL_CACHE_TTL = 600; // 10 minutes in seconds (Redis TTL)
const REDIS_HISTORY_PREFIX = "history:";
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

/**
 * Map of crypto symbols to CoinGecko IDs
 * Kept in sync with priceService
 */
const SYMBOL_TO_COINGECKO_ID = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  SOL: "solana",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  USDT: "tether",
  USDC: "usd-coin",
  LINK: "chainlink",
  LTC: "litecoin",
  XLM: "stellar",
  ATOM: "cosmos",
  DOT: "polkadot",
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRIMARY FUNCTION: Get Historical Prices
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Fetch historical price data for a crypto asset
 * 
 * @param {string} symbol - Crypto symbol (e.g., "BTC", "ETH")
 * @param {number} days - Number of days of history (default: 30, max: 365)
 * 
 * @returns {Promise<Array>} Array of price points
 *   Format: [{ timestamp: number, price: number }, ...]
 *   Sorted chronologically (oldest to newest)
 * 
 * @example
 *   const history = await getHistoricalPrices("BTC", 7);
 *   // Returns: [
 *   //   { timestamp: 1713360000000, price: 45000 },
 *   //   { timestamp: 1713446400000, price: 46000 },
 *   //   ...
 *   // ]
 * 
 * Features:
 *   - Validates input parameters
 *   - Checks Redis cache first (5-10 min TTL)
 *   - Falls back to local cache
 *   - Fetches from CoinGecko if not cached
 *   - Gracefully handles API failures
 */
export async function getHistoricalPrices(symbol, days = DEFAULT_DAYS) {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Input Validation
  // ─────────────────────────────────────────────────────────────────────────

  if (!symbol || typeof symbol !== "string") {
    console.warn("[historicalPriceService] Invalid symbol provided");
    return [];
  }

  const normalizedSymbol = symbol.toUpperCase().trim();
  const coinGeckoId = SYMBOL_TO_COINGECKO_ID[normalizedSymbol];

  if (!coinGeckoId) {
    console.warn(`[historicalPriceService] Unknown symbol: ${normalizedSymbol}`);
    return [];
  }

  // Validate and constrain days parameter
  let daysParam = Math.floor(days) || DEFAULT_DAYS;
  if (daysParam < 1) daysParam = 1;
  if (daysParam > MAX_DAYS) daysParam = MAX_DAYS;

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Check Cache (Redis first, then local)
  // ─────────────────────────────────────────────────────────────────────────

  const cacheKey = `${REDIS_HISTORY_PREFIX}${coinGeckoId}:${daysParam}`;

  try {
    // Try Redis cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[historicalPriceService] Cache HIT for ${normalizedSymbol} (${daysParam}d)`);
      return JSON.parse(cached);
    }
  } catch (redisError) {
    console.warn("[historicalPriceService] Redis read error:", redisError.message);
    // Fall through to local cache
  }

  try {
    // Try local cache as fallback
    const localCached = cacheService.get(cacheKey);
    if (localCached) {
      console.log(`[historicalPriceService] Local cache HIT for ${normalizedSymbol} (${daysParam}d)`);
      return localCached;
    }
  } catch (localError) {
    console.warn("[historicalPriceService] Local cache error:", localError.message);
    // Fall through to API call
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Fetch from CoinGecko API
  // ─────────────────────────────────────────────────────────────────────────

  try {
    console.log(`[historicalPriceService] Fetching ${normalizedSymbol} history (${daysParam}d) from API`);

    const url = new URL(
      `${COINGECKO_API}/coins/${coinGeckoId}/market_chart`
    );

    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("days", daysParam.toString());

    const response = await fetch(url.toString(), {
      timeout: 10000, // 10-second timeout
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.prices || !Array.isArray(data.prices)) {
      throw new Error("Invalid CoinGecko response format");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Transform API Response
    // ─────────────────────────────────────────────────────────────────────────

    const history = data.prices.map(([timestamp, price]) => ({
      timestamp: Math.floor(timestamp), // Ensure integer
      price: roundToDecimals(price, 2), // Financial precision
    }));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Cache Result
    // ─────────────────────────────────────────────────────────────────────────

    try {
      // Cache in Redis (10 minutes)
      await redisClient.setex(
        cacheKey,
        HISTORICAL_CACHE_TTL,
        JSON.stringify(history)
      );
    } catch (redisError) {
      console.warn("[historicalPriceService] Redis cache write failed:", redisError.message);
    }

    try {
      // Also cache in local cache (as backup)
      cacheService.set(cacheKey, history, HISTORICAL_CACHE_TTL * 1000);
    } catch (localError) {
      console.warn("[historicalPriceService] Local cache write failed:", localError.message);
    }

    console.log(
      `[historicalPriceService] Successfully fetched ${history.length} price points for ${normalizedSymbol}`
    );

    return history;
  } catch (error) {
    console.error(
      `[historicalPriceService] Failed to fetch historical prices for ${normalizedSymbol}:`,
      error.message
    );

    // Return empty array on failure (graceful degradation)
    return [];
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BATCH FUNCTION: Get Historical Data for Multiple Assets
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Fetch historical prices for multiple assets in parallel
 * Optimized for minimal API calls using batch approach
 * 
 * @param {Array<string>} symbols - Array of crypto symbols
 * @param {number} days - Number of days of history
 * 
 * @returns {Promise<Object>} Object mapping symbol → history array
 * 
 * @example
 *   const history = await getHistoricalPricesBatch(["BTC", "ETH"], 30);
 *   // Returns: {
 *   //   BTC: [{timestamp, price}, ...],
 *   //   ETH: [{timestamp, price}, ...]
 *   // }
 */
export async function getHistoricalPricesBatch(symbols = [], days = DEFAULT_DAYS) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return {};
  }

  try {
    // Fetch all in parallel for efficiency
    const promises = symbols.map((symbol) =>
      getHistoricalPrices(symbol, days)
        .then((history) => ({ symbol: symbol.toUpperCase(), history }))
        .catch((error) => {
          console.warn(`[historicalPriceService] Batch fetch failed for ${symbol}:`, error.message);
          return { symbol: symbol.toUpperCase(), history: [] };
        })
    );

    const results = await Promise.all(promises);

    // Convert array of objects to keyed object
    const batch = {};
    results.forEach(({ symbol, history }) => {
      batch[symbol] = history;
    });

    return batch;
  } catch (error) {
    console.error("[historicalPriceService] Batch fetch error:", error.message);
    return {};
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILITY FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Round number to specified decimal places
 * 
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded value
 */
function roundToDecimals(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Get the CoinGecko ID for a symbol
 * Useful for external integration
 * 
 * @param {string} symbol - Crypto symbol
 * @returns {string|null} CoinGecko ID or null if unknown
 */
export function getCoingeckoId(symbol) {
  if (!symbol || typeof symbol !== "string") {
    return null;
  }

  const normalized = symbol.toUpperCase().trim();
  return SYMBOL_TO_COINGECKO_ID[normalized] || null;
}

/**
 * Check if a symbol is supported
 * 
 * @param {string} symbol - Crypto symbol
 * @returns {boolean} True if symbol is supported
 */
export function isSymbolSupported(symbol) {
  if (!symbol || typeof symbol !== "string") {
    return false;
  }

  const normalized = symbol.toUpperCase().trim();
  return normalized in SYMBOL_TO_COINGECKO_ID;
}

/**
 * Get all supported symbols
 * 
 * @returns {Array<string>} Array of supported symbols
 */
export function getSupportedSymbols() {
  return Object.keys(SYMBOL_TO_COINGECKO_ID);
}

/**
 * Calculate price statistics from history
 * Useful for portfolio analysis
 * 
 * @param {Array} history - Array of {timestamp, price} objects
 * @returns {Object} Statistics object
 * 
 * @example
 *   const stats = calculatePriceStats(history);
 *   // Returns: {
 *   //   min: 44000,
 *   //   max: 48000,
 *   //   avg: 45500,
 *   //   current: 46500,
 *   //   change: 1500,
 *   //   changePercent: 3.33
 *   // }
 */
export function calculatePriceStats(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      current: 0,
      change: 0,
      changePercent: 0,
    };
  }

  const prices = history.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = roundToDecimals(prices.reduce((a, b) => a + b, 0) / prices.length, 2);
  const current = prices[prices.length - 1];
  const start = prices[0];
  const change = roundToDecimals(current - start, 2);
  const changePercent = start > 0 ? roundToDecimals(((change / start) * 100), 2) : 0;

  return {
    min: roundToDecimals(min, 2),
    max: roundToDecimals(max, 2),
    avg,
    current,
    change,
    changePercent,
    dataPoints: history.length,
  };
}

/**
 * Filter history to specific time range
 * 
 * @param {Array} history - Historical price data
 * @param {number} startTime - Start timestamp (ms)
 * @param {number} endTime - End timestamp (ms)
 * @returns {Array} Filtered history
 */
export function filterHistoryByTimeRange(history = [], startTime, endTime) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  return history.filter(
    (point) => point.timestamp >= startTime && point.timestamp <= endTime
  );
}
