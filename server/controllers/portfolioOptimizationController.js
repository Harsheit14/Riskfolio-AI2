/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 6: ENHANCED PORTFOLIO CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Portfolio endpoints with improved PnL calculations
 * Features:
 * - Separated realized/unrealized PnL
 * - Accurate cost basis tracking
 * - Comprehensive performance metrics
 * - Optimized price fetching
 * 
 * @module enhancedPortfolioController
 */

import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as portfolioOptimizationService from "../services/portfolioOptimizationService.js";
import * as priceServiceOptimized from "../services/priceServiceOptimized.js";

/**
 * Helper: Round to 2 decimal places
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * GET /api/portfolio/comprehensive-pnl
 * 
 * Get comprehensive profit/loss breakdown with realized and unrealized PnL
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalInvested": number,
 *     "totalSold": number,
 *     "totalHeld": number,
 *     "realizedPnL": number,
 *     "currentHoldingValue": number,
 *     "unrealizedPnL": number,
 *     "totalPnL": number,
 *     "returnMetrics": {
 *       "totalROI": number,
 *       "realizedROI": number,
 *       "unrealizedROI": number,
 *       "absolutePnL": number
 *     },
 *     "assets": [
 *       {
 *         "symbol": "BTC",
 *         "totalInvested": number,
 *         "totalSold": number,
 *         "totalHeld": number,
 *         "avgBuyPrice": number,
 *         "realizedPnL": number,
 *         "currentHoldingValue": number,
 *         "unrealizedPnL": number,
 *         "unrealizedPnLPercentage": number
 *       }
 *     ]
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getComprehensivePnL(req, res) {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User ID not found",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Calculate base PnL
    // ════════════════════════════════════════════════════════════════════════

    const pnlData = await portfolioOptimizationService.calculateComprehensivePnL(userId);

    if (!pnlData || pnlData.assets.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalInvested: 0,
          totalSold: 0,
          totalHeld: 0,
          realizedPnL: 0,
          currentHoldingValue: 0,
          unrealizedPnL: 0,
          totalPnL: 0,
          returnMetrics: {
            totalROI: 0,
            realizedROI: 0,
            unrealizedROI: 0,
            absolutePnL: 0,
          },
          assets: [],
        },
        message: "Empty portfolio",
        timestamp: new Date().toISOString(),
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: Fetch current prices for held assets (with optimization)
    // ════════════════════════════════════════════════════════════════════════

    const heldSymbols = pnlData.assets
      .filter((a) => a.totalHeld > 0)
      .map((a) => a.symbol);

    let currentPrices = {};
    if (heldSymbols.length > 0) {
      try {
        currentPrices = await priceServiceOptimized.getOptimizedPrices(heldSymbols);
      } catch (error) {
        console.warn(`⚠️  Failed to fetch current prices: ${error.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Update unrealized PnL with current prices
    // ════════════════════════════════════════════════════════════════════════

    let totalCurrentHoldingValue = 0;
    let totalUnrealizedPnL = 0;

    const assetsWithCurrentPrices = pnlData.assets.map((asset) => {
      if (asset.totalHeld > 0) {
        const currentPrice = currentPrices[asset.symbol] || asset.avgBuyPrice;

        const unrealized = portfolioOptimizationService.calculateUnrealizedPnL(
          {
            quantity: asset.totalHeld,
            totalCostBasis: asset.totalInvested,
            avgBuyPrice: asset.avgBuyPrice,
          },
          currentPrice
        );

        totalCurrentHoldingValue += unrealized.currentValue;
        totalUnrealizedPnL += unrealized.unrealizedPnL;

        return {
          ...asset,
          currentPrice: round2(currentPrice),
          currentHoldingValue: unrealized.currentValue,
          unrealizedPnL: unrealized.unrealizedPnL,
          unrealizedPnLPercentage: unrealized.unrealizedPnLPercentage,
        };
      }

      return asset;
    });

    // ════════════════════════════════════════════════════════════════════════
    // STEP 4: Calculate return metrics
    // ════════════════════════════════════════════════════════════════════════

    const updatedPnL = {
      ...pnlData,
      currentHoldingValue: totalCurrentHoldingValue,
      unrealizedPnL: totalUnrealizedPnL,
      totalPnL: pnlData.realizedPnL + totalUnrealizedPnL,
      assets: assetsWithCurrentPrices,
    };

    const returnMetrics = portfolioOptimizationService.calculateReturnMetrics(updatedPnL);

    return res.status(200).json({
      success: true,
      data: {
        ...updatedPnL,
        returnMetrics,
      },
      message: "Comprehensive PnL calculated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getComprehensivePnL:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate comprehensive PnL",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/portfolio/tax-report
 * 
 * Get tax-related information (simplified)
 * Shows realized gains/losses for tax reporting
 * 
 * Note: This is simplified and not tax advice
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "assets": [
 *       {
 *         "symbol": "BTC",
 *         "shortTermGains": number,
 *         "longTermGains": number,
 *         "shortTermLosses": number,
 *         "longTermLosses": number,
 *         "netShortTermGains": number,
 *         "netLongTermGains": number
 *       }
 *     ],
 *     "summary": {
 *       "totalShortTermGains": number,
 *       "totalLongTermGains": number,
 *       "totalShortTermLosses": number,
 *       "totalLongTermLosses": number,
 *       "netShortTermGains": number,
 *       "netLongTermGains": number,
 *       "totalTaxableGains": number
 *     }
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getTaxReport(req, res) {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Get transactions
    // ════════════════════════════════════════════════════════════════════════

    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          assets: [],
          summary: {
            totalShortTermGains: 0,
            totalLongTermGains: 0,
            totalShortTermLosses: 0,
            totalLongTermLosses: 0,
            netShortTermGains: 0,
            netLongTermGains: 0,
            totalTaxableGains: 0,
          },
        },
        message: "Empty portfolio",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: Convert to symbols and calculate tax data
    // ════════════════════════════════════════════════════════════════════════

    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    const transactionsWithSymbols = transactions.map((tx) => {
      const asset = assetMetaMap.get(tx.asset_id);
      return {
        asset_symbol: asset ? asset.symbol : `UNKNOWN_${tx.asset_id}`,
        type: tx.type,
        quantity: tx.quantity,
        price_at_transaction: tx.price_at_transaction,
        created_at: tx.created_at,
      };
    });

    // Get unique symbols
    const uniqueSymbols = [...new Set(
      transactionsWithSymbols.map((tx) => tx.asset_symbol)
    )];

    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Calculate tax data per asset
    // ════════════════════════════════════════════════════════════════════════

    const assetTaxData = uniqueSymbols.map((symbol) => ({
      symbol,
      ...portfolioOptimizationService.calculateTaxImplications(
        transactionsWithSymbols,
        symbol
      ),
    }));

    // ════════════════════════════════════════════════════════════════════════
    // STEP 4: Calculate summary
    // ════════════════════════════════════════════════════════════════════════

    let totalShortTermGains = 0;
    let totalLongTermGains = 0;
    let totalShortTermLosses = 0;
    let totalLongTermLosses = 0;

    for (const asset of assetTaxData) {
      totalShortTermGains += asset.shortTermGains;
      totalLongTermGains += asset.longTermGains;
      totalShortTermLosses += asset.shortTermLosses;
      totalLongTermLosses += asset.longTermLosses;
    }

    const netShortTermGains = totalShortTermGains - totalShortTermLosses;
    const netLongTermGains = totalLongTermGains - totalLongTermLosses;
    const totalTaxableGains = netShortTermGains + netLongTermGains;

    return res.status(200).json({
      success: true,
      data: {
        assets: assetTaxData,
        summary: {
          totalShortTermGains: round2(totalShortTermGains),
          totalLongTermGains: round2(totalLongTermGains),
          totalShortTermLosses: round2(totalShortTermLosses),
          totalLongTermLosses: round2(totalLongTermLosses),
          netShortTermGains: round2(netShortTermGains),
          netLongTermGains: round2(netLongTermGains),
          totalTaxableGains: round2(totalTaxableGains),
        },
      },
      message: "Tax report generated",
      disclaimer: "This is a simplified report and not tax advice. Consult a tax professional.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getTaxReport:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate tax report",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/portfolio/prices-stats
 * 
 * Get cached price statistics and cache health
 * Useful for debugging and monitoring
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export function getPricesStats(req, res) {
  try {
    const stats = priceServiceOptimized.getCacheStats();
    const lastKnown = priceServiceOptimized.getLastKnownPrices();

    return res.status(200).json({
      success: true,
      data: {
        cacheStats: stats,
        lastKnownPrices: lastKnown,
        supportedSymbols: priceServiceOptimized.getSupportedSymbols(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to get price statistics",
      message: error.message,
    });
  }
}
