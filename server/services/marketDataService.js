import * as redisClient from "./redisClient.js";
import * as cacheService from "./cacheService.js";

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 3600; // 1 hour for market data (changes less frequently)
const REDIS_MARKET_PREFIX = "market:";

// Rate limiting
let lastMarketDataCall = 0;
const MIN_MARKET_DATA_CALL_INTERVAL = 3000; // 3 seconds between API calls

// In-memory cache for market data
const marketDataCache = new Map();

/**
 * Map CoinGecko IDs to their ranks and market cap
 * CoinGecko ID → { rank, marketCap, symbol }
 */
const marketDataStore = new Map();

/**
 * Fetch market data (rank, market cap) for a single asset
 * 
 * @param {string} coingeckoId - CoinGecko ID (e.g., "bitcoin", "ethereum")
 * @returns {Promise<Object>} { rank, marketCap, symbol, price }
 */
export async function getAssetMarketData(coingeckoId) {
  if (!coingeckoId || typeof coingeckoId !== "string") {
    throw new Error("Invalid coingeckoId");
  }

  const normalizedId = coingeckoId.toLowerCase().trim();

  // Check in-memory cache first
  if (marketDataCache.has(normalizedId)) {
    const cached = marketDataCache.get(normalizedId);
    if (Date.now() - cached.fetchedAt < CACHE_DURATION * 1000) {
      console.log(`[marketDataService] Cache hit for ${normalizedId}`);
      return cached.data;
    }
  }

  // Check Redis cache
  try {
    const redisKey = `${REDIS_MARKET_PREFIX}${normalizedId}`;
    const redisData = await redisClient.get(redisKey);
    
    if (redisData) {
      const data = JSON.parse(redisData);
      console.log(`[marketDataService] Redis cache hit for ${normalizedId}`);
      
      // Update in-memory cache
      marketDataCache.set(normalizedId, {
        data,
        fetchedAt: Date.now(),
      });
      
      return data;
    }
  } catch (err) {
    console.warn(`[marketDataService] Redis error: ${err.message}`);
  }

  // Fetch from API
  return await fetchMarketDataFromAPI(normalizedId);
}

/**
 * Fetch market data for multiple assets at once
 * 
 * @param {string[]} coingeckoIds - Array of CoinGecko IDs
 * @returns {Promise<Object>} Map of ID to market data
 */
export async function getMultipleAssetMarketData(coingeckoIds = []) {
  if (!Array.isArray(coingeckoIds) || coingeckoIds.length === 0) {
    return {};
  }

  // Normalize and deduplicate
  const normalizedIds = [...new Set(coingeckoIds.map(id => id?.toLowerCase?.()?.trim()).filter(Boolean))];

  console.log(`[marketDataService] Fetching market data for: ${normalizedIds.join(", ")}`);

  const result = {};
  const missing = [];

  // First, check what we have in cache
  for (const id of normalizedIds) {
    if (marketDataCache.has(id)) {
      const cached = marketDataCache.get(id);
      if (Date.now() - cached.fetchedAt < CACHE_DURATION * 1000) {
        result[id] = cached.data;
        continue;
      }
    }

    // Check Redis
    try {
      const redisKey = `${REDIS_MARKET_PREFIX}${id}`;
      const redisData = await redisClient.get(redisKey);
      
      if (redisData) {
        const data = JSON.parse(redisData);
        result[id] = data;
        
        // Update in-memory cache
        marketDataCache.set(id, {
          data,
          fetchedAt: Date.now(),
        });
        
        continue;
      }
    } catch (err) {
      console.warn(`[marketDataService] Redis error for ${id}: ${err.message}`);
    }

    // Not in cache, need to fetch
    missing.push(id);
  }

  // Fetch missing data from API
  if (missing.length > 0) {
    const fetched = await fetchMultipleMarketDataFromAPI(missing);
    Object.assign(result, fetched);
  }

  return result;
}

/**
 * Fetch market data from CoinGecko API
 * 
 * @private
 * @param {string} coingeckoId - Single CoinGecko ID
 * @returns {Promise<Object>} Market data
 */
async function fetchMarketDataFromAPI(coingeckoId) {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastMarketDataCall;
  
  if (timeSinceLastCall < MIN_MARKET_DATA_CALL_INTERVAL) {
    const delay = MIN_MARKET_DATA_CALL_INTERVAL - timeSinceLastCall;
    console.log(`[marketDataService] Rate limiting: waiting ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastMarketDataCall = Date.now();

  try {
    console.log(`[marketDataService] Fetching API data for ${coingeckoId}`);
    
    const url = `${COINGECKO_API}/coins/${coingeckoId}?localization=false&market_data=true&sparkline=false`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract market data
    const marketData = {
      rank: data?.market_cap_rank || 9999,
      marketCap: data?.market_data?.market_cap?.usd || 0,
      symbol: data?.symbol?.toUpperCase() || coingeckoId.toUpperCase(),
      price: data?.market_data?.current_price?.usd || 0,
      priceChange24h: data?.market_data?.price_change_percentage_24h || 0,
      totalVolume: data?.market_data?.total_volume?.usd || 0,
      circulatingSupply: data?.market_data?.circulating_supply || 0,
    };

    // Cache in Redis
    try {
      const redisKey = `${REDIS_MARKET_PREFIX}${coingeckoId}`;
      await redisClient.setex(redisKey, CACHE_DURATION, JSON.stringify(marketData));
    } catch (err) {
      console.warn(`[marketDataService] Failed to cache in Redis: ${err.message}`);
    }

    // Cache in memory
    marketDataCache.set(coingeckoId, {
      data: marketData,
      fetchedAt: Date.now(),
    });

    console.log(`[marketDataService] Fetched ${coingeckoId}: rank=${marketData.rank}, marketCap=$${marketData.marketCap}`);

    return marketData;
  } catch (error) {
    console.error(`[marketDataService] API fetch error for ${coingeckoId}: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch market data for multiple assets from API
 * 
 * @private
 * @param {string[]} coingeckoIds - Array of CoinGecko IDs
 * @returns {Promise<Object>} Map of ID to market data
 */
async function fetchMultipleMarketDataFromAPI(coingeckoIds) {
  const result = {};

  // Fetch in batches to avoid overloading API
  const batchSize = 5;
  for (let i = 0; i < coingeckoIds.length; i += batchSize) {
    const batch = coingeckoIds.slice(i, i + batchSize);

    // Fetch all in batch concurrently
    const promises = batch.map(id => 
      fetchMarketDataFromAPI(id)
        .then(data => ({ id, data }))
        .catch(err => {
          console.error(`Failed to fetch ${id}: ${err.message}`);
          return { id, data: null };
        })
    );

    const batchResults = await Promise.all(promises);
    
    for (const { id, data } of batchResults) {
      if (data) {
        result[id] = data;
      }
    }

    // Delay between batches
    if (i + batchSize < coingeckoIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return result;
}

/**
 * Clear market data cache (for testing or manual refresh)
 */
export async function clearMarketDataCache() {
  marketDataCache.clear();
  marketDataStore.clear();
  console.log("[marketDataService] Market data cache cleared");
}

/**
 * Get cache stats
 */
export function getMarketDataCacheStats() {
  return {
    cacheSize: marketDataCache.size,
    entries: Array.from(marketDataCache.keys()),
  };
}
