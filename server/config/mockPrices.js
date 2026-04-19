/**
 * Mock Price Data for Development
 * 
 * Use this to avoid CoinGecko rate limiting during development
 * In production, remove this and rely on real API calls
 */

export const MOCK_PRICES = {
  bitcoin: 75000,           // Current market price (April 2026)
  ethereum: 4200,           // Current market price
  binancecoin: 650,         // Current market price
  ripple: 2.50,             // Current market price
  cardano: 1.20,            // Current market price
  solana: 180,              // Current market price
  dogecoin: 0.35,           // Current market price
  "matic-network": 1.50,    // Current market price
  tether: 1.00,             // Stablecoin
  "usd-coin": 1.00,         // Stablecoin
  chainlink: 35,            // Current market price
  litecoin: 280,            // Current market price
  stellar: 0.45,            // Current market price
  cosmos: 15,               // Current market price
  polkadot: 12,             // Current market price
};

export const LAST_UPDATED_PRICES = {
  "2026-04-19": MOCK_PRICES,
};

/**
 * Get mock prices for development
 * @param {string[]} coinIds - List of CoinGecko coin IDs
 * @returns {Object} Map of coin ID to mock USD price
 */
export function getMockPrices(coinIds = []) {
  const result = {};
  
  for (const coinId of coinIds) {
    if (MOCK_PRICES[coinId] != null) {
      result[coinId] = MOCK_PRICES[coinId];
    }
  }
  
  return result;
}

console.log(`[mockPrices] Loaded mock prices for ${Object.keys(MOCK_PRICES).length} coins`);
