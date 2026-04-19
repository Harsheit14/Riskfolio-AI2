/**
 * Portfolio History Controller
 * 
 * Purpose: Handle portfolio historical data requests
 * Returns time-series data for assets in user's portfolio
 * 
 * Endpoint: GET /api/portfolio/history
 * Query params: ?days=30 (default), ?assets=BTC,ETH (optional filter)
 */

import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as historicalPriceService from "../services/historicalPriceService.js";

/**
 * GET /api/portfolio/history
 * 
 * Returns historical price data for all assets in user's portfolio
 * 
 * Query Parameters:
 *   - days: number (1-365, default: 30) - Number of days of history
 *   - assets: string (optional) - Comma-separated symbols to filter (e.g., "BTC,ETH")
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     assets: [
 *       {
 *         symbol: "BTC",
 *         history: [
 *           { timestamp: 1713360000000, price: 45000 },
 *           { timestamp: 1713446400000, price: 46000 },
 *           ...
 *         ],
 *         stats: {
 *           min: 44000,
 *           max: 48000,
 *           avg: 45500,
 *           current: 46500,
 *           change: 1500,
 *           changePercent: 3.33
 *         }
 *       }
 *     ],
 *     requestedDays: 30,
 *     dataPoints: 450,
 *     lastUpdated: "2026-04-18T14:05:30Z"
 *   }
 * }
 */
export async function getPortfolioHistory(req, res) {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
        timestamp: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Parse and Validate Query Parameters
    // ═══════════════════════════════════════════════════════════════════════

    let days = parseInt(req.query.days) || 30;
    if (days < 1) days = 1;
    if (days > 365) days = 365;

    const assetFilter = req.query.assets
      ? req.query.assets
          .toUpperCase()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
      : null;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Fetch User's Transactions
    // ═══════════════════════════════════════════════════════════════════════

    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          assets: [],
          requestedDays: days,
          dataPoints: 0,
          lastUpdated: new Date().toISOString(),
        },
        message: "No transactions found",
        timestamp: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Get Asset Metadata
    // ═══════════════════════════════════════════════════════════════════════

    const assets = await assetRepository.getAllAssets();
    const assetMap = new Map();
    const symbolSet = new Set();

    assets.forEach((asset) => {
      assetMap.set(asset.id, asset);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Extract Unique Asset Symbols from Transactions
    // ═══════════════════════════════════════════════════════════════════════

    transactions.forEach((tx) => {
      const asset = assetMap.get(tx.asset_id);
      if (asset && asset.symbol) {
        symbolSet.add(asset.symbol.toUpperCase());
      }
    });

    // Convert to array and apply filter if provided
    let uniqueSymbols = Array.from(symbolSet);
    if (assetFilter && assetFilter.length > 0) {
      uniqueSymbols = uniqueSymbols.filter((symbol) => assetFilter.includes(symbol));
    }

    if (uniqueSymbols.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          assets: [],
          requestedDays: days,
          dataPoints: 0,
          lastUpdated: new Date().toISOString(),
        },
        message: "No assets found with transaction history",
        timestamp: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Fetch Historical Data (Batch Fetch for Efficiency)
    // ═══════════════════════════════════════════════════════════════════════

    console.log(`[portfolioHistory] Fetching history for ${uniqueSymbols.length} assets (${days} days)`);

    const historicalBatch = await historicalPriceService.getHistoricalPricesBatch(
      uniqueSymbols,
      days
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Assemble Response with Statistics
    // ═══════════════════════════════════════════════════════════════════════

    const assetHistories = [];
    let totalDataPoints = 0;

    for (const symbol of uniqueSymbols) {
      const history = historicalBatch[symbol] || [];

      if (history.length > 0) {
        const stats = historicalPriceService.calculatePriceStats(history);

        assetHistories.push({
          symbol,
          dataPoints: history.length,
          history,
          stats,
        });

        totalDataPoints += history.length;
      }
    }

    // Sort by symbol for consistent response
    assetHistories.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: Return Successful Response
    // ═══════════════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      data: {
        assets: assetHistories,
        requestedDays: days,
        assetsCount: assetHistories.length,
        dataPoints: totalDataPoints,
        lastUpdated: new Date().toISOString(),
      },
      message: `Historical data retrieved for ${assetHistories.length} asset(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[portfolioHistory] Error:", error.message);

    let statusCode = 500;
    let message = "Failed to fetch portfolio history";

    if (error.message?.includes("Unauthorized")) {
      statusCode = 401;
      message = "Unauthorized";
    } else if (error.message?.includes("Not found")) {
      statusCode = 404;
      message = "Resource not found";
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/portfolio/history/stats
 * 
 * Returns only statistics (min, max, avg) for assets, without full history
 * Useful for lightweight requests or dashboard summaries
 * 
 * Query Parameters:
 *   - days: number (default: 30)
 *   - assets: string (optional filter)
 * 
 * Response Format:
 * {
 *   success: true,
 *   data: {
 *     assets: [
 *       {
 *         symbol: "BTC",
 *         stats: { min, max, avg, current, change, changePercent }
 *       }
 *     ]
 *   }
 * }
 */
export async function getPortfolioHistoryStats(req, res) {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User ID not found",
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Parse Parameters (same as getPortfolioHistory)
    // ═══════════════════════════════════════════════════════════════════════

    let days = parseInt(req.query.days) || 30;
    if (days < 1) days = 1;
    if (days > 365) days = 365;

    const assetFilter = req.query.assets
      ? req.query.assets
          .toUpperCase()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
      : null;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Get Transactions and Assets
    // ═══════════════════════════════════════════════════════════════════════

    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
        message: "No transactions found",
      });
    }

    const assets = await assetRepository.getAllAssets();
    const assetMap = new Map();
    const symbolSet = new Set();

    assets.forEach((asset) => {
      assetMap.set(asset.id, asset);
    });

    transactions.forEach((tx) => {
      const asset = assetMap.get(tx.asset_id);
      if (asset && asset.symbol) {
        symbolSet.add(asset.symbol.toUpperCase());
      }
    });

    let uniqueSymbols = Array.from(symbolSet);
    if (assetFilter && assetFilter.length > 0) {
      uniqueSymbols = uniqueSymbols.filter((symbol) => assetFilter.includes(symbol));
    }

    if (uniqueSymbols.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
        message: "No assets found",
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Fetch Historical Data
    // ═══════════════════════════════════════════════════════════════════════

    const historicalBatch = await historicalPriceService.getHistoricalPricesBatch(
      uniqueSymbols,
      days
    );

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Calculate Stats Only
    // ═══════════════════════════════════════════════════════════════════════

    const assetStats = [];

    for (const symbol of uniqueSymbols) {
      const history = historicalBatch[symbol] || [];

      if (history.length > 0) {
        const stats = historicalPriceService.calculatePriceStats(history);

        assetStats.push({
          symbol,
          stats,
        });
      }
    }

    assetStats.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Return Response
    // ═══════════════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      data: {
        assets: assetStats,
        requestedDays: days,
        assetsCount: assetStats.length,
      },
      message: `Statistics retrieved for ${assetStats.length} asset(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[portfolioHistoryStats] Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch portfolio statistics",
      timestamp: new Date().toISOString(),
    });
  }
}

export default {
  getPortfolioHistory,
  getPortfolioHistoryStats,
};
