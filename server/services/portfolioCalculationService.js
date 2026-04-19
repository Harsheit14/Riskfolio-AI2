/**
 * Portfolio Calculation Service
 * 
 * Handles all portfolio-related calculations:
 * - Aggregating holdings from transactions
 * - Computing portfolio value using live prices
 * - Generating detailed portfolio breakdowns
 * 
 * Safe for production use with comprehensive error handling
 */

import * as priceService from "./priceService.js";

// ═══════════════════════════════════════════════════════════════════════════
// A) CALCULATE HOLDINGS - Aggregate transactions into holdings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Aggregate transactions into holdings by asset
 * 
 * @param {Array} transactions - Array of transaction objects
 *   Each transaction should have: { asset_symbol, type, quantity }
 * 
 * @returns {Object} Holdings map: { "BTC": 2.5, "ETH": 1.2 }
 *   - Only includes assets with positive quantity
 *   - Empty object if no valid transactions
 * 
 * @example
 *   const holdings = calculateHoldings([
 *     { asset_symbol: "BTC", type: "BUY", quantity: 1 },
 *     { asset_symbol: "BTC", type: "BUY", quantity: 1.5 },
 *     { asset_symbol: "BTC", type: "SELL", quantity: 0.5 },
 *     { asset_symbol: "ETH", type: "BUY", quantity: 2 }
 *   ]);
 *   // Returns: { BTC: 2, ETH: 2 }
 */
export function calculateHoldings(transactions) {
  // Guard: return empty object for invalid input
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return {};
  }

  // Aggregate holdings: symbol → { quantity, valid }
  const holdingsMap = new Map();

  for (const tx of transactions) {
    // Skip invalid transactions
    if (
      !tx ||
      !tx.asset_symbol ||
      !tx.type ||
      typeof tx.quantity !== "number" ||
      tx.quantity <= 0
    ) {
      continue;
    }

    // Normalize symbol to uppercase
    const symbol = String(tx.asset_symbol).toUpperCase().trim();

    // Skip empty symbols
    if (!symbol) continue;

    // Initialize holding if not exists
    if (!holdingsMap.has(symbol)) {
      holdingsMap.set(symbol, 0);
    }

    // Apply transaction
    let current = holdingsMap.get(symbol);
    if (tx.type === "BUY") {
      current += tx.quantity;
    } else if (tx.type === "SELL") {
      current -= tx.quantity;
    }

    // Update map
    holdingsMap.set(symbol, current);
  }

  // Convert map to object, filtering out non-positive quantities
  const holdings = {};
  for (const [symbol, quantity] of holdingsMap.entries()) {
    if (quantity > 0) {
      holdings[symbol] = quantity;
    }
  }

  return holdings;
}

// ═══════════════════════════════════════════════════════════════════════════
// B) CALCULATE PORTFOLIO VALUE - Sum holdings at current prices
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate total portfolio value at current market prices
 * 
 * @param {Object} holdings - Holdings map: { "BTC": 2.5, "ETH": 1.2 }
 * 
 * @returns {Promise<Object>} Portfolio value summary
 *   { totalValue: number }
 *   - Returns 0 if no holdings or price fetch fails
 *   - Gracefully skips assets with missing prices
 * 
 * @example
 *   const holdings = { BTC: 1, ETH: 2 };
 *   const result = await calculatePortfolioValue(holdings);
 *   // Returns: { totalValue: 97500 } (if BTC=65000, ETH=1250)
 */
export async function calculatePortfolioValue(holdings) {
  // Guard: return 0 for invalid input
  if (!holdings || typeof holdings !== "object" || Object.keys(holdings).length === 0) {
    return { totalValue: 0 };
  }

  let totalValue = 0;

  // Process each asset in holdings
  for (const [symbol, quantity] of Object.entries(holdings)) {
    try {
      // Fetch current price for this asset
      const price = await priceService.getCryptoPrice(symbol);

      // Skip if price unavailable (graceful degradation)
      if (price === null || typeof price !== "number" || price <= 0) {
        continue;
      }

      // Add to total
      totalValue += price * quantity;
    } catch (error) {
      // Log warning but continue processing other assets
      console.warn(
        `[portfolioCalculationService] Failed to fetch price for ${symbol}:`,
        error.message
      );
      continue;
    }
  }

  return { totalValue: round2(totalValue) };
}

// ═══════════════════════════════════════════════════════════════════════════
// C) CALCULATE DETAILED PORTFOLIO - Full breakdown with prices
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate detailed portfolio breakdown with individual asset values
 * 
 * @param {Object} holdings - Holdings map: { "BTC": 2.5, "ETH": 1.2 }
 * 
 * @returns {Promise<Object>} Detailed portfolio breakdown
 *   {
 *     assets: [
 *       { symbol: "BTC", quantity: 1.5, price: 65000, value: 97500 },
 *       { symbol: "ETH", quantity: 2, price: 3500, value: 7000 }
 *     ],
 *     totalValue: 104500
 *   }
 * 
 * @example
 *   const holdings = { BTC: 1, ETH: 2 };
 *   const portfolio = await calculateDetailedPortfolio(holdings);
 *   // Returns detailed breakdown with live prices
 */
export async function calculateDetailedPortfolio(holdings) {
  // Guard: return empty portfolio for invalid input
  if (!holdings || typeof holdings !== "object" || Object.keys(holdings).length === 0) {
    return {
      assets: [],
      totalValue: 0,
    };
  }

  const assets = [];
  let totalValue = 0;

  // Process each asset in holdings
  for (const [symbol, quantity] of Object.entries(holdings)) {
    try {
      // Fetch current price for this asset
      const price = await priceService.getCryptoPrice(symbol);

      // Skip if price unavailable
      if (price === null || typeof price !== "number" || price <= 0) {
        continue;
      }

      // Calculate value for this asset
      const value = round2(price * quantity);
      totalValue += value;

      // Add to assets array
      assets.push({
        symbol: symbol.toUpperCase(),
        quantity: round2(quantity),
        price: round2(price),
        value,
      });
    } catch (error) {
      // Log warning but continue processing other assets
      console.warn(
        `[portfolioCalculationService] Failed to process asset ${symbol}:`,
        error.message
      );
      continue;
    }
  }

  return {
    assets: assets.sort((a, b) => b.value - a.value), // Sort by value (descending)
    totalValue: round2(totalValue),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Round number to 2 decimal places for financial precision
 * 
 * @param {number} value - Value to round
 * @returns {number} Rounded value
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}
