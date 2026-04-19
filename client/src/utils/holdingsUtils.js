/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOLDINGS UTILITIES - Shared calculation logic across all pages
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Provide unified functions for holdings filtering and counting
 * Used by: Dashboard, Portfolio, Risk pages to ensure consistent asset counts
 * 
 * Why: Prevents mismatches between pages when computing valid holdings
 * Ensures: Assets with quantity <= 0 are never counted
 */

/**
 * Filter holdings to only include assets with positive quantity
 * 
 * @param {Array} holdings - Array of holding objects with quantity property
 * @returns {Array} Filtered array of holdings with quantity > 0
 * 
 * @example
 * getValidHoldings([
 *   { symbol: 'BTC', quantity: 1.5, ... },
 *   { symbol: 'ETH', quantity: 0, ... },
 *   { symbol: 'XRP', quantity: 600, ... }
 * ])
 * // Returns: [
 * //   { symbol: 'BTC', quantity: 1.5, ... },
 * //   { symbol: 'XRP', quantity: 600, ... }
 * // ]
 */
export function getValidHoldings(holdings) {
  if (!Array.isArray(holdings)) {
    return [];
  }
  return holdings.filter(h => h && Number(h.quantity) > 0);
}

/**
 * Get count of valid assets (quantity > 0)
 * 
 * @param {Array} holdings - Array of holding objects
 * @returns {number} Count of holdings with positive quantity
 * 
 * @example
 * getValidAssetCount([
 *   { symbol: 'BTC', quantity: 1.5 },
 *   { symbol: 'ETH', quantity: 0 },
 *   { symbol: 'XRP', quantity: 600 }
 * ])
 * // Returns: 2
 */
export function getValidAssetCount(holdings) {
  return getValidHoldings(holdings).length;
}

/**
 * Check if holdings array has any valid assets
 * 
 * @param {Array} holdings - Array of holding objects
 * @returns {boolean} True if there is at least one holding with quantity > 0
 * 
 * @example
 * hasValidHoldings([
 *   { symbol: 'BTC', quantity: 0 },
 *   { symbol: 'ETH', quantity: 0 }
 * ])
 * // Returns: false
 */
export function hasValidHoldings(holdings) {
  return getValidAssetCount(holdings) > 0;
}

/**
 * Get summary of holdings status
 * Useful for debugging and logging
 * 
 * @param {Array} holdings - Array of holding objects
 * @returns {Object} Summary object with counts
 * 
 * @example
 * getHoldingsSummary(holdings)
 * // Returns: {
 * //   total: 3,
 * //   valid: 2,
 * //   zero: 1,
 * //   symbols: ['BTC', 'XRP']
 * // }
 */
export function getHoldingsSummary(holdings) {
  if (!Array.isArray(holdings)) {
    return { total: 0, valid: 0, zero: 0, symbols: [] };
  }

  const validHoldings = getValidHoldings(holdings);
  const zeroQuantityCount = holdings.length - validHoldings.length;
  const symbols = validHoldings.map(h => h?.symbol).filter(Boolean);

  return {
    total: holdings.length,
    valid: validHoldings.length,
    zero: zeroQuantityCount,
    symbols: symbols
  };
}

/**
 * Debug logging for holdings
 * Helps troubleshoot asset count mismatches
 * 
 * @param {Array} holdings - Array of holding objects
 * @param {string} source - Where this is being called from (e.g., "Dashboard", "Portfolio")
 */
export function logHoldingsSummary(holdings, source = "Unknown") {
  const summary = getHoldingsSummary(holdings);
  console.log(`[${source}] Holdings Summary:`, {
    total: summary.total,
    valid: summary.valid,
    zero: summary.zero,
    validAssets: summary.symbols,
    message: `${summary.valid} valid assets out of ${summary.total} total`
  });
}

export default {
  getValidHoldings,
  getValidAssetCount,
  hasValidHoldings,
  getHoldingsSummary,
  logHoldingsSummary
};
