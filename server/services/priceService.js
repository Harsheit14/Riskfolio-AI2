import * as redisClient from "./redisClient.js";
import * as cacheService from "./cacheService.js";
import { getMockPrices } from "../config/mockPrices.js";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 60; // 60 seconds (for Redis TTL)
const REDIS_PRICE_PREFIX = "price:";
const REDIS_HISTORY_PREFIX = "history:";
const IN_MEMORY_CACHE_DURATION = 60 * 1000; // 60 seconds in milliseconds

// Rate limiting to avoid CoinGecko 429 errors
let lastApiCall = 0;
const MIN_API_CALL_INTERVAL = 2000; // Minimum 2 seconds between API calls

// Use mock prices in development to avoid rate limiting
const USE_MOCK_PRICES = process.env.NODE_ENV !== "production" && process.env.USE_MOCK_PRICES !== "false";

// In-memory cache for current prices to prevent rate limiting
const priceCache = {
  prices: {},
  lastFetched: 0,
};

// In-memory cache for historical prices
const historicalCache = new Map();

// Last known prices as fallback (updated whenever we successfully fetch prices)
const lastKnownPrices = {};

/**
 * Map of crypto symbols to CoinGecko IDs
 * Add more symbols as needed - CoinGecko uses lowercase IDs
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
 * Check if in-memory cache is still fresh
 * @returns {boolean}
 */
function isCacheFresh() {
  const now = Date.now();
  return priceCache.lastFetched && (now - priceCache.lastFetched) < IN_MEMORY_CACHE_DURATION;
}

/**
 * Get symbol from CoinGecko ID
 * @param {string} coingeckoId
 * @returns {string|null}
 */
function getSymbolFromCoingeckoId(coingeckoId) {
  for (const [symbol, id] of Object.entries(SYMBOL_TO_COINGECKO_ID)) {
    if (id === coingeckoId) return symbol;
  }
  return null;
}

/**
 * Get the current price for a single crypto asset by symbol
 * NOTE: This should not be called in loops! Use getPricesBySymbols() instead.
 * 
 * @param {string} symbol - Crypto symbol (e.g., "BTC", "ETH")
 * @returns {Promise<number|null>} USD price or null if unavailable
 * 
 * Example:
 *   const btcPrice = await getCryptoPrice("BTC");
 *   // returns: 45000 (or similar)
 */
export async function getCryptoPrice(symbol) {
  if (!symbol || typeof symbol !== "string") {
    console.warn(`[priceService] Invalid symbol provided: ${symbol}`);
    return null;
  }

  const normalizedSymbol = symbol.toUpperCase().trim();
  const coinGeckoId = SYMBOL_TO_COINGECKO_ID[normalizedSymbol];

  console.log(`[priceService] getCryptoPrice(${symbol}): Normalized=${normalizedSymbol}, MappedID=${coinGeckoId}`);

  if (!coinGeckoId) {
    console.error(`❌ Unknown symbol: ${normalizedSymbol}`);
    return null;
  }

  try {
    // Use batched fetch for single symbol
    const prices = await getPricesBySymbols([normalizedSymbol]);
    const price = prices[normalizedSymbol];
    console.log(`[priceService] getCryptoPrice result: ${normalizedSymbol} = $${price}`);
    return price || null;
  } catch (error) {
    console.error(`❌ [priceService] Failed to get price for ${normalizedSymbol}: ${error.message}`);
    
    // Return last known price if available
    if (lastKnownPrices[normalizedSymbol]) {
      console.warn(`[priceService] Returning last known price for ${normalizedSymbol}: $${lastKnownPrices[normalizedSymbol]}`);
      return lastKnownPrices[normalizedSymbol];
    }
    
    return null;
  }
}

/**
 * Get prices for multiple symbols at once (BATCHED)
 * This is the recommended way to fetch prices
 * 
 * @param {string[]} symbols - Array of crypto symbols (e.g., ["BTC", "ETH", "USDC"])
 * @returns {Promise<Object>} Map of symbol to USD price
 * 
 * Example:
 *   const prices = await getPricesBySymbols(["BTC", "ETH", "USDC"]);
 *   // returns: { BTC: 45000, ETH: 2500, USDC: 1.00 }
 *   // Throws error if API fails and no cached prices available
 */
export async function getPricesBySymbols(symbols = []) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return {};
  }

  // Normalize and deduplicate symbols
  const normalizedSymbols = [...new Set(symbols.map(s => s?.toUpperCase?.()?.trim()).filter(Boolean))];
  
  if (normalizedSymbols.length === 0) {
    return {};
  }

  console.log(`[priceService] getPricesBySymbols: ${normalizedSymbols.join(", ")}`);

  // Check in-memory cache first
  if (isCacheFresh()) {
    const result = {};
    const missing = [];
    
    for (const symbol of normalizedSymbols) {
      if (priceCache.prices[symbol] != null) {
        result[symbol] = priceCache.prices[symbol];
      } else {
        missing.push(symbol);
      }
    }
    
    console.log(`[priceService] Cache HIT for: ${Object.keys(result).join(", ")}`);
    
    // If all symbols are in cache, return immediately
    if (missing.length === 0) {
      return result;
    }
    
    if (missing.length > 0) {
      console.log(`[priceService] Cache MISS for: ${missing.join(", ")}`);
    }
  }

  // Need to fetch - convert symbols to CoinGecko IDs
  const coingeckoIds = normalizedSymbols
    .map(symbol => {
      const id = SYMBOL_TO_COINGECKO_ID[symbol];
      console.log(`[priceService] Symbol mapping: ${symbol} → ${id || 'UNKNOWN'}`);
      return id;
    })
    .filter(Boolean);

  if (coingeckoIds.length === 0) {
    console.error(`❌ [priceService] No valid CoinGecko IDs found for symbols: ${normalizedSymbols.join(", ")}`);
    
    // Return last known prices if available
    const fallback = {};
    for (const symbol of normalizedSymbols) {
      if (lastKnownPrices[symbol] != null) {
        fallback[symbol] = lastKnownPrices[symbol];
        console.warn(`[priceService] Using last known price for ${symbol}: $${lastKnownPrices[symbol]}`);
      }
    }
    
    if (Object.keys(fallback).length > 0) {
      return fallback;
    }
    
    throw new Error(`No valid CoinGecko IDs found for any symbol. Symbols: ${normalizedSymbols.join(", ")}`);
  }

  try {
    // Fetch from API with all IDs at once
    console.log(`[priceService] Fetching prices for CoinGecko IDs: ${coingeckoIds.join(", ")}`);
    const prices = await getCurrentPrices(coingeckoIds);

    // Validate that we got prices
    const priceCount = Object.values(prices).filter(p => p > 0).length;
    if (priceCount === 0) {
      throw new Error(`API returned no valid prices for IDs: ${coingeckoIds.join(", ")}`);
    }

    console.log(`[priceService] Got ${priceCount} valid prices from API`);

    // Map CoinGecko IDs back to symbols
    const result = {};
    const missing = [];
    
    for (const symbol of normalizedSymbols) {
      const coinGeckoId = SYMBOL_TO_COINGECKO_ID[symbol];
      const price = prices[coinGeckoId];
      
      console.log(`[priceService] Price response - ${symbol} (${coinGeckoId}): ${price}`);
      
      if (price != null && price > 0) {
        result[symbol] = price;
        lastKnownPrices[symbol] = price; // Update last known price
      } else if (lastKnownPrices[symbol] != null) {
        result[symbol] = lastKnownPrices[symbol];
        console.warn(`[priceService] Price for ${symbol} was invalid (${price}), using last known: $${lastKnownPrices[symbol]}`);
      } else {
        missing.push(symbol);
      }
    }

    if (missing.length > 0) {
      console.error(`❌ [priceService] Failed to get prices for: ${missing.join(", ")}`);
      throw new Error(`No prices available for: ${missing.join(", ")}. API returned: ${JSON.stringify(prices)}`);
    }

    // Update in-memory cache
    Object.assign(priceCache.prices, result);
    priceCache.lastFetched = Date.now();

    console.log(`[priceService] Successfully cached prices: ${Object.keys(result).join(", ")}`);
    return result;
  } catch (error) {
    console.error(`❌ [priceService] Failed to get prices:`, error.message);
    
    // Fallback to last known prices
    const fallback = {};
    for (const symbol of normalizedSymbols) {
      if (lastKnownPrices[symbol] != null) {
        fallback[symbol] = lastKnownPrices[symbol];
        console.warn(`[priceService] Using last known price for ${symbol}: $${lastKnownPrices[symbol]}`);
      }
    }
    
    // If we have at least some fallback prices, return them
    if (Object.keys(fallback).length > 0) {
      console.warn(`[priceService] Returning partial fallback (${Object.keys(fallback).length}/${normalizedSymbols.length} symbols)`);
      return fallback;
    }
    
    // No fallback available - throw error instead of silently returning 0
    throw new Error(`Cannot get prices for ${normalizedSymbols.join(", ")} - API failed and no cached prices available. Error: ${error.message}`);
  }
}

/**
 * Get current prices (USD) from CoinGecko
 * Internal function - should use getPricesBySymbols() instead for most use cases
 * 
 * @param {string[]} coinIds - Array of CoinGecko coin IDs
 * @returns {Promise<Object>} Map of coin ID to USD price
 */
export async function getCurrentPrices(coinIds = []) {
  if (!Array.isArray(coinIds) || coinIds.length === 0) {
    return {};
  }

  // Use mock prices in development
  if (USE_MOCK_PRICES) {
    console.log(`[priceService] DEVELOPMENT MODE: Using mock prices`);
    const mockPrices = getMockPrices(coinIds);
    console.log(`[priceService] Mock prices:`, JSON.stringify(mockPrices));
    return mockPrices;
  }

  const sortedIds = [...coinIds].sort();
  const cacheKey = `${REDIS_PRICE_PREFIX}${sortedIds.join(",")}`;

  try {
    // Try Redis first (distributed cache)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`[priceService] Redis cache HIT for: ${sortedIds.join(", ")}`);
      return JSON.parse(cached);
    }
  } catch (redisError) {
    console.warn("⚠️  Redis get failed for prices:", redisError.message);
  }

  // Apply rate limiting to avoid 429 errors
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
    console.log(`[priceService] Rate limiting: waiting ${waitTime}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    // Make API request - batch all IDs in one call
    const url = new URL(`${COINGECKO_API}/simple/price`);
    url.searchParams.set("ids", sortedIds.join(","));
    url.searchParams.set("vs_currencies", "usd");

    console.log(`[priceService] Fetching ${sortedIds.length} prices from CoinGecko API: ${sortedIds.join(", ")}`);
    
    lastApiCall = Date.now(); // Update last API call timestamp
    
    const response = await fetch(url.toString());

    if (response.status === 429) {
      throw new Error("CoinGecko rate limit (429) - too many requests. Falling back to cached prices.");
    }

    if (!response.ok) {
      throw new Error(`CoinGecko error ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid API response");
    }

    console.log(`[priceService] API Response:`, JSON.stringify(data, null, 2));

    const prices = {};
    const validPrices = [];
    const invalidPrices = [];

    for (const [coin, value] of Object.entries(data)) {
      if (value?.usd != null && typeof value.usd === "number") {
        if (value.usd > 0) {
          prices[coin] = value.usd;
          validPrices.push(`${coin}=$${value.usd}`);
        } else {
          invalidPrices.push(`${coin}=${value.usd} (zero)`);
        }
      } else {
        invalidPrices.push(`${coin}=undefined`);
      }
    }

    console.log(`[priceService] Valid prices: ${validPrices.join(", ") || "NONE"}`);
    console.log(`[priceService] Invalid prices: ${invalidPrices.join(", ") || "NONE"}`);

    if (Object.keys(prices).length === 0) {
      throw new Error(`CoinGecko API returned no valid prices. Response: ${JSON.stringify(data)}`);
    }

    // Cache in Redis with TTL
    try {
      await redisClient.set(cacheKey, JSON.stringify(prices), CACHE_DURATION);
      console.log(`[priceService] Cached ${Object.keys(prices).length} prices in Redis`);
    } catch (redisError) {
      console.warn("⚠️  Redis set failed for prices:", redisError.message);
    }

    return prices;
  } catch (error) {
    console.error(`❌ Failed to fetch current prices: ${error.message}`);
    throw error; // Throw error instead of returning 0
  }
}

/**
 * Get historical prices
 * Uses Redis for distributed caching, falls back to local cache
 */
export async function getHistoricalPrices(coinId, days = 30) {
  if (!coinId) throw new Error("coinId is required");

  const cacheKey = `${REDIS_HISTORY_PREFIX}${coinId}-${days}`;

  try {
    // Try to get from Redis first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (redisError) {
    console.warn("⚠️  Redis get failed for historical prices:", redisError.message);
  }

  try {
    const url = new URL(`${COINGECKO_API}/coins/${coinId}/market_chart`);
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("days", String(days));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`CoinGecko error ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data?.prices)) {
      throw new Error("Invalid historical price response");
    }

    const prices = data.prices
      .filter(([t, p]) => Number.isFinite(t) && Number.isFinite(p))
      .map(([timestamp, price]) => ({
        timestamp,
        price,
      }));

    if (prices.length === 0) {
      throw new Error("No price data available");
    }

    // Cache in Redis with TTL
    try {
      await redisClient.set(cacheKey, JSON.stringify(prices), CACHE_DURATION);
    } catch (redisError) {
      console.warn("⚠️  Redis set failed for historical prices:", redisError.message);
    }

    return prices;
  } catch (error) {
    throw new Error(
      `Failed to fetch historical prices for ${coinId}: ${error.message}`
    );
  }
}