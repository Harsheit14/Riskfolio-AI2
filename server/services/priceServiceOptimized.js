/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 6: OPTIMIZED PRICE SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Efficient price fetching with batch API calls and fallback logic
 * Features:
 * - Batch multiple symbols into single API request
 * - Multi-level fallback (Redis → Local → Cache)
 * - Request deduplication
 * - Comprehensive error handling
 * 
 * @module priceServiceOptimized
 */

import * as redisClient from "./redisClient.js";
import * as cacheService from "./cacheService.js";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const REDIS_PRICE_TTL = 60; // 60 seconds for Redis
const LOCAL_CACHE_TTL = 45 * 1000; // 45 seconds for local cache
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout

/**
 * Map of crypto symbols to CoinGecko IDs
 * Supports 15+ cryptocurrencies
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

// Track pending API requests to avoid duplicates
const pendingRequests = new Map();

// Last known good prices for fallback
const lastKnownPrices = new Map();

/**
 * Normalize symbol to uppercase
 * @param {String} symbol - Symbol to normalize
 * @returns {String} Normalized symbol
 */
function normalizeSymbol(symbol) {
  return String(symbol).toUpperCase().trim();
}

/**
 * Convert symbol to CoinGecko ID
 * @param {String} symbol - Crypto symbol
 * @returns {String|null} CoinGecko ID or null
 */
function getCoingeckoId(symbol) {
  const normalized = normalizeSymbol(symbol);
  return SYMBOL_TO_COINGECKO_ID[normalized] || null;
}

/**
 * Check if symbol is supported
 * @param {String} symbol - Crypto symbol
 * @returns {Boolean} True if supported
 */
export function isSymbolSupported(symbol) {
  return getCoingeckoId(symbol) !== null;
}

/**
 * Get list of all supported symbols
 * @returns {Array} Array of supported symbols
 */
export function getSupportedSymbols() {
  return Object.keys(SYMBOL_TO_COINGECKO_ID);
}

/**
 * Get current prices with comprehensive fallback logic
 * 
 * Fallback chain:
 * 1. Redis cache (distributed cache)
 * 2. Local memory cache (fast fallback)
 * 3. CoinGecko API (fresh data)
 * 4. Last known prices (graceful degradation)
 * 
 * @param {Array<String>} symbols - Crypto symbols (e.g., ["BTC", "ETH"])
 * @returns {Promise<Object>} Map of symbol → price
 * 
 * @example
 * const prices = await getOptimizedPrices(["BTC", "ETH"]);
 * // Returns: { BTC: 45000, ETH: 2500 }
 */
export async function getOptimizedPrices(symbols = []) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return {};
  }

  const normalizedSymbols = symbols.map(normalizeSymbol);
  const coinIds = [];
  const symbolToCoinId = {};

  // Convert symbols to CoinGecko IDs
  for (const symbol of normalizedSymbols) {
    const coinId = getCoingeckoId(symbol);
    if (coinId) {
      coinIds.push(coinId);
      symbolToCoinId[symbol] = coinId;
    }
  }

  if (coinIds.length === 0) {
    console.warn("⚠️  No supported symbols found");
    return {};
  }

  try {
    // Attempt: Redis cache (distributed, fast)
    const redisPrices = await tryRedisCache(coinIds);
    if (redisPrices && Object.keys(redisPrices).length > 0) {
      return convertCoinIdPricesToSymbols(redisPrices, symbolToCoinId);
    }
  } catch (error) {
    console.warn("⚠️  Redis cache lookup failed:", error.message);
  }

  try {
    // Attempt: Local memory cache (instant fallback)
    const localPrices = tryLocalCache(coinIds);
    if (localPrices && Object.keys(localPrices).length > 0) {
      return convertCoinIdPricesToSymbols(localPrices, symbolToCoinId);
    }
  } catch (error) {
    console.warn("⚠️  Local cache lookup failed:", error.message);
  }

  try {
    // Attempt: Fetch from API with deduplication
    const apiPrices = await getFromApiWithDedup(coinIds);
    if (apiPrices && Object.keys(apiPrices).length > 0) {
      // Store in both caches
      await updateCaches(coinIds, apiPrices);
      return convertCoinIdPricesToSymbols(apiPrices, symbolToCoinId);
    }
  } catch (error) {
    console.warn("⚠️  API fetch failed:", error.message);
  }

  // Fallback: Return last known prices
  console.warn("⚠️  All sources failed, using last known prices");
  return convertCoinIdPricesToSymbols(
    Object.fromEntries(lastKnownPrices),
    symbolToCoinId
  );
}

/**
 * Try to get prices from Redis cache
 * @private
 */
async function tryRedisCache(coinIds) {
  const cacheKey = `prices:${coinIds.sort().join(",")}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  return null;
}

/**
 * Try to get prices from local memory cache
 * @private
 */
function tryLocalCache(coinIds) {
  const prices = {};

  for (const coinId of coinIds) {
    const cached = cacheService.get(`price:${coinId}`);
    if (cached) {
      prices[coinId] = cached;
    }
  }

  return Object.keys(prices).length > 0 ? prices : null;
}

/**
 * Fetch prices from CoinGecko API with request deduplication
 * 
 * If multiple requests arrive simultaneously, only one API call is made
 * Others wait for the first result (race condition safe)
 * 
 * @private
 */
async function getFromApiWithDedup(coinIds) {
  const sortedIds = [...coinIds].sort();
  const requestKey = sortedIds.join(",");

  // Check if this request is already pending
  if (pendingRequests.has(requestKey)) {
    return await pendingRequests.get(requestKey);
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const url = new URL(`${COINGECKO_API}/simple/price`);
      url.searchParams.set("ids", sortedIds.join(","));
      url.searchParams.set("vs_currencies", "usd");

      const response = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const prices = {};

      // Extract USD prices
      for (const [coin, value] of Object.entries(data)) {
        if (value?.usd != null) {
          prices[coin] = value.usd;
          lastKnownPrices.set(coin, value.usd);
        }
      }

      return prices;
    } finally {
      // Remove from pending requests
      pendingRequests.delete(requestKey);
    }
  })();

  // Store the pending request
  pendingRequests.set(requestKey, requestPromise);

  return await requestPromise;
}

/**
 * Update both Redis and local caches
 * @private
 */
async function updateCaches(coinIds, prices) {
  // Update Redis
  try {
    const cacheKey = `prices:${coinIds.sort().join(",")}`;
    await redisClient.set(cacheKey, JSON.stringify(prices), REDIS_PRICE_TTL);
  } catch (error) {
    console.warn("⚠️  Failed to update Redis cache:", error.message);
  }

  // Update local cache
  try {
    for (const [coinId, price] of Object.entries(prices)) {
      cacheService.set(`price:${coinId}`, price, LOCAL_CACHE_TTL);
    }
  } catch (error) {
    console.warn("⚠️  Failed to update local cache:", error.message);
  }
}

/**
 * Convert prices keyed by CoinGecko ID to prices keyed by symbol
 * @private
 */
function convertCoinIdPricesToSymbols(pricesById, symbolToCoinId) {
  const pricesBySymbol = {};

  for (const [symbol, coinId] of Object.entries(symbolToCoinId)) {
    if (pricesById[coinId] != null) {
      pricesBySymbol[symbol] = pricesById[coinId];
    }
  }

  return pricesBySymbol;
}

/**
 * Get price for a single symbol with fallback
 * 
 * @param {String} symbol - Crypto symbol
 * @returns {Promise<Number|null>} Price or null
 * 
 * @example
 * const btcPrice = await getSinglePrice("BTC");
 * // Returns: 45000 or null
 */
export async function getSinglePrice(symbol) {
  const prices = await getOptimizedPrices([symbol]);
  return prices[normalizeSymbol(symbol)] || null;
}

/**
 * Batch fetch prices with automatic batching
 * 
 * Handles large lists of symbols efficiently by:
 * - Grouping into batches of 250 symbols (CoinGecko limit)
 * - Parallel batch requests
 * - Combining results
 * 
 * @param {Array<String>} symbols - Crypto symbols
 * @returns {Promise<Object>} Map of symbol → price
 * 
 * @example
 * const prices = await batchFetchPrices(["BTC", "ETH", ...100+ more]);
 */
export async function batchFetchPrices(symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return {};
  }

  const BATCH_SIZE = 250; // CoinGecko API limit
  const batches = [];

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    batches.push(getOptimizedPrices(batch));
  }

  // Wait for all batches to complete
  const results = await Promise.all(batches);

  // Merge results
  return results.reduce((merged, batch) => ({ ...merged, ...batch }), {});
}

/**
 * Update last known prices manually (for testing/debugging)
 * @private
 */
export function setLastKnownPrices(prices) {
  for (const [symbol, price] of Object.entries(prices)) {
    const coinId = getCoingeckoId(symbol);
    if (coinId) {
      lastKnownPrices.set(coinId, price);
    }
  }
}

/**
 * Get last known prices (fallback data)
 * @returns {Object} Map of symbol → price
 */
export function getLastKnownPrices() {
  const result = {};
  for (const [coinId, price] of lastKnownPrices.entries()) {
    // Find symbol from coinId
    for (const [symbol, id] of Object.entries(SYMBOL_TO_COINGECKO_ID)) {
      if (id === coinId) {
        result[symbol] = price;
        break;
      }
    }
  }
  return result;
}

/**
 * Clear all caches (for testing/debugging)
 * @private
 */
export function clearAllCaches() {
  cacheService.clear();
  lastKnownPrices.clear();
  pendingRequests.clear();
}

/**
 * Get cache statistics (for monitoring)
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return {
    lastKnownPricesCount: lastKnownPrices.size,
    pendingRequests: pendingRequests.size,
    supportedSymbols: Object.keys(SYMBOL_TO_COINGECKO_ID).length,
  };
}
