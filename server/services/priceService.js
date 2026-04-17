const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_DURATION = 60 * 1000; // 60 seconds

// In-memory cache
const priceCache = {
  current: new Map(),
  historical: new Map(),
};

function isCacheValid(timestamp) {
  return timestamp && Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Get current prices (USD)
 */
export async function getCurrentPrices(coinIds = []) {
  if (!Array.isArray(coinIds) || coinIds.length === 0) {
    return {};
  }

  const sortedIds = [...coinIds].sort();
  const cacheKey = sortedIds.join(",");

  const cached = priceCache.current.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  try {
    const url = new URL(`${COINGECKO_API}/simple/price`);
    url.searchParams.set("ids", sortedIds.join(","));
    url.searchParams.set("vs_currencies", "usd");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`CoinGecko error ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Invalid API response");
    }

    const prices = {};

    for (const [coin, value] of Object.entries(data)) {
      if (value?.usd != null) {
        prices[coin] = value.usd;
      }
    }

    priceCache.current.set(cacheKey, {
      data: prices,
      timestamp: Date.now(),
    });

    return prices;
  } catch (error) {
    // fallback: return cached stale data if available
    if (cached?.data) return cached.data;

    throw new Error(`Failed to fetch current prices: ${error.message}`);
  }
}

/**
 * Get historical prices
 */
export async function getHistoricalPrices(coinId, days = 30) {
  if (!coinId) throw new Error("coinId is required");

  const cacheKey = `${coinId}-${days}`;

  const cached = priceCache.historical.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
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

    priceCache.historical.set(cacheKey, {
      data: prices,
      timestamp: Date.now(),
    });

    return prices;
  } catch (error) {
    if (cached?.data) return cached.data;

    throw new Error(
      `Failed to fetch historical prices for ${coinId}: ${error.message}`
    );
  }
}