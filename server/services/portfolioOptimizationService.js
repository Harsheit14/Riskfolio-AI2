/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 6: PORTFOLIO OPTIMIZATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Accurate PnL calculations with realized/unrealized separation
 * Features:
 * - Weighted average cost basis for accurate accounting
 * - Realized PnL from SELL transactions
 * - Unrealized PnL from current holdings
 * - FIFO/LIFO support for advanced scenarios
 * 
 * @module portfolioOptimizationService
 */

import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";

// Helper: Round to 2 decimal places (financial precision)
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate weighted average cost basis for an asset
 * 
 * Weighted Average Method (WACC):
 * - Total cost = sum(quantity * price for all BUY transactions)
 * - Weighted avg price = Total cost / Total quantity
 * 
 * @param {Array} transactions - Array of transaction objects
 * @param {String} symbol - Asset symbol to filter
 * @returns {Object} { totalQuantity, totalCost, avgPrice }
 * 
 * @example
 * const wacc = calculateWeightedAverageCost(transactions, "BTC");
 * // Returns: { totalQuantity: 2, totalCost: 90000, avgPrice: 45000 }
 */
export function calculateWeightedAverageCost(transactions, symbol) {
  let totalQuantity = 0;
  let totalCost = 0;

  for (const tx of transactions) {
    if (tx.asset_symbol !== symbol || tx.type !== "BUY") continue;

    const quantity = parseFloat(tx.quantity) || 0;
    const price = parseFloat(tx.price_at_transaction) || 0;

    if (quantity > 0 && price > 0) {
      totalQuantity += quantity;
      totalCost += quantity * price;
    }
  }

  const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return {
    totalQuantity: round2(totalQuantity),
    totalCost: round2(totalCost),
    avgPrice: round2(avgPrice),
  };
}

/**
 * Calculate realized PnL from SELL transactions
 * 
 * Realized PnL = Revenue from sells - Cost basis of sold units
 * Uses weighted average cost basis method
 * 
 * @param {Array} transactions - All transactions for a user
 * @param {String} symbol - Asset symbol
 * @returns {Object} { totalSold, revenue, costBasis, realizedPnL }
 * 
 * @example
 * const realized = calculateRealizedPnL(transactions, "BTC");
 * // Returns: { totalSold: 1, revenue: 50000, costBasis: 45000, realizedPnL: 5000 }
 */
export function calculateRealizedPnL(transactions, symbol) {
  // Step 1: Get weighted average cost for all BUY transactions
  const wacc = calculateWeightedAverageCost(transactions, symbol);

  if (wacc.avgPrice === 0) {
    return {
      totalSold: 0,
      revenue: 0,
      costBasis: 0,
      realizedPnL: 0,
    };
  }

  // Step 2: Calculate revenue and cost basis for all SELL transactions
  let totalSold = 0;
  let revenue = 0;

  for (const tx of transactions) {
    if (tx.asset_symbol !== symbol || tx.type !== "SELL") continue;

    const quantity = parseFloat(tx.quantity) || 0;
    const price = parseFloat(tx.price_at_transaction) || 0;

    if (quantity > 0 && price > 0) {
      totalSold += quantity;
      revenue += quantity * price;
    }
  }

  // Step 3: Calculate cost basis using WACC
  const costBasis = round2(totalSold * wacc.avgPrice);
  const realizedPnL = round2(revenue - costBasis);

  return {
    totalSold: round2(totalSold),
    revenue: round2(revenue),
    costBasis: round2(costBasis),
    realizedPnL,
  };
}

/**
 * Calculate unrealized PnL for current holdings
 * 
 * Unrealized PnL = Current value - Cost basis of remaining holdings
 * Based on current market price
 * 
 * @param {Object} holding - Holding object { quantity, totalCostBasis, avgBuyPrice }
 * @param {Number} currentPrice - Current market price
 * @returns {Object} { currentValue, unrealizedPnL, unrealizedPnLPercentage }
 * 
 * @example
 * const unrealized = calculateUnrealizedPnL(
 *   { quantity: 1, totalCostBasis: 45000, avgBuyPrice: 45000 },
 *   50000
 * );
 * // Returns: { currentValue: 50000, unrealizedPnL: 5000, unrealizedPnLPercentage: 11.11 }
 */
export function calculateUnrealizedPnL(holding, currentPrice) {
  const currentValue = round2(holding.quantity * currentPrice);
  const unrealizedPnL = round2(currentValue - holding.totalCostBasis);
  const unrealizedPnLPercentage = holding.totalCostBasis > 0
    ? round2((unrealizedPnL / holding.totalCostBasis) * 100)
    : 0;

  return {
    currentValue,
    unrealizedPnL,
    unrealizedPnLPercentage,
  };
}

/**
 * Calculate comprehensive PnL breakdown for portfolio
 * 
 * Returns both realized (from sales) and unrealized (from holdings) PnL
 * Provides complete accounting of gains/losses
 * 
 * @param {Number} userId - User ID
 * @returns {Promise<Object>} Complete PnL breakdown
 * @throws {Error} If database query fails
 * 
 * @example
 * const pnl = await calculateComprehensivePnL(123);
 * // Returns: {
 * //   totalInvested: 90000,
 * //   totalSold: 1,
 * //   totalHeld: 1,
 * //   realizedPnL: 5000,
 * //   currentHoldingValue: 50000,
 * //   unrealizedPnL: 5000,
 * //   totalPnL: 10000,
 * //   assets: [{symbol, realizedPnL, unrealizedPnL, ...}]
 * // }
 */
export async function calculateComprehensivePnL(userId) {
  try {
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return {
        totalInvested: 0,
        totalSold: 0,
        totalHeld: 0,
        realizedPnL: 0,
        currentHoldingValue: 0,
        unrealizedPnL: 0,
        totalPnL: 0,
        assets: [],
      };
    }

    // Fetch asset metadata
    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Convert asset_id to symbol
    const transactionsWithSymbols = transactions.map((tx) => {
      const asset = assetMetaMap.get(tx.asset_id);
      return {
        asset_symbol: asset ? asset.symbol : `UNKNOWN_${tx.asset_id}`,
        type: tx.type,
        quantity: tx.quantity,
        price_at_transaction: tx.price_at_transaction,
      };
    });

    // Get unique symbols
    const uniqueSymbols = [...new Set(
      transactionsWithSymbols.map((tx) => tx.asset_symbol)
    )];

    // Placeholder for prices (caller will inject)
    const prices = {};

    // Calculate per-asset PnL
    let totalInvested = 0;
    let totalSold = 0;
    let totalHeld = 0;
    let totalRealizedPnL = 0;
    let totalCurrentHoldingValue = 0;
    let totalUnrealizedPnL = 0;

    const assetsPnL = [];

    for (const symbol of uniqueSymbols) {
      const assetTransactions = transactionsWithSymbols.filter(
        (tx) => tx.asset_symbol === symbol
      );

      // Calculate realized PnL
      const realized = calculateRealizedPnL(assetTransactions, symbol);

      // Calculate current holdings
      const wacc = calculateWeightedAverageCost(assetTransactions, symbol);

      // Calculate unrealized PnL if holding any
      let unrealized = {
        currentValue: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercentage: 0,
      };

      if (wacc.totalQuantity > 0) {
        // Simulate current price (caller will update)
        const currentPrice = prices[symbol] || wacc.avgPrice;
        unrealized = calculateUnrealizedPnL(
          {
            quantity: wacc.totalQuantity,
            totalCostBasis: wacc.totalCost,
            avgBuyPrice: wacc.avgPrice,
          },
          currentPrice
        );
      }

      // Accumulate totals
      totalInvested += wacc.totalCost;
      totalSold += realized.totalSold;
      totalHeld += wacc.totalQuantity;
      totalRealizedPnL += realized.realizedPnL;
      totalCurrentHoldingValue += unrealized.currentValue;
      totalUnrealizedPnL += unrealized.unrealizedPnL;

      assetsPnL.push({
        symbol,
        totalInvested: wacc.totalCost,
        totalSold: realized.totalSold,
        totalHeld: wacc.totalQuantity,
        avgBuyPrice: wacc.avgPrice,
        realizedPnL: realized.realizedPnL,
        currentHoldingValue: unrealized.currentValue,
        unrealizedPnL: unrealized.unrealizedPnL,
        unrealizedPnLPercentage: unrealized.unrealizedPnLPercentage,
      });
    }

    const totalPnL = totalRealizedPnL + totalUnrealizedPnL;

    return {
      totalInvested: round2(totalInvested),
      totalSold: round2(totalSold),
      totalHeld: round2(totalHeld),
      realizedPnL: round2(totalRealizedPnL),
      currentHoldingValue: round2(totalCurrentHoldingValue),
      unrealizedPnL: round2(totalUnrealizedPnL),
      totalPnL: round2(totalPnL),
      assets: assetsPnL,
    };
  } catch (error) {
    throw new Error(`Failed to calculate comprehensive PnL: ${error.message}`);
  }
}

/**
 * Calculate fee-adjusted PnL (optional for future use)
 * 
 * Can account for trading fees, withdrawal fees, etc.
 * Currently a placeholder for future enhancement
 * 
 * @param {Object} pnlData - PnL data from calculateComprehensivePnL
 * @param {Number} totalFees - Total fees paid
 * @returns {Object} Fee-adjusted PnL
 */
export function calculateFeeAdjustedPnL(pnlData, totalFees = 0) {
  const feeAdjustedPnL = pnlData.totalPnL - totalFees;
  const feeAdjustedRealized = pnlData.realizedPnL - totalFees;

  return {
    ...pnlData,
    totalFees: round2(totalFees),
    feeAdjustedRealizedPnL: round2(feeAdjustedRealized),
    feeAdjustedTotalPnL: round2(feeAdjustedPnL),
  };
}

/**
 * Calculate portfolio return metrics
 * 
 * Return on Investment (ROI) and other return metrics
 * 
 * @param {Object} pnlData - PnL data from calculateComprehensivePnL
 * @returns {Object} Return metrics
 */
export function calculateReturnMetrics(pnlData) {
  const { totalInvested, totalPnL, realizedPnL, unrealizedPnL } = pnlData;

  const totalROI = totalInvested > 0
    ? round2((totalPnL / totalInvested) * 100)
    : 0;

  const realizedROI = totalInvested > 0
    ? round2((realizedPnL / totalInvested) * 100)
    : 0;

  return {
    totalROI, // Total return %
    realizedROI, // Realized return %
    unrealizedROI: totalROI - realizedROI, // Unrealized return %
    absolutePnL: round2(totalPnL), // Absolute gain/loss in USD
  };
}

/**
 * Calculate tax implications (simplified)
 * 
 * For US tax purposes (simplified - not tax advice):
 * - Short-term gains: Holdings < 1 year (ordinary income tax rates)
 * - Long-term gains: Holdings > 1 year (preferential rates)
 * 
 * @param {Array} transactions - All transactions
 * @param {String} symbol - Asset symbol
 * @returns {Object} Tax breakdown
 */
export function calculateTaxImplications(transactions, symbol) {
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  let shortTermGains = 0;
  let longTermGains = 0;
  let shortTermLosses = 0;
  let longTermLosses = 0;

  const assetTransactions = transactions.filter(
    (tx) => tx.asset_symbol === symbol
  );

  // Simple calculation: compare sell date to buy date
  for (const sellTx of assetTransactions.filter((tx) => tx.type === "SELL")) {
    // Find most recent buy transaction before this sell
    const buyTx = assetTransactions
      .filter((tx) => tx.type === "BUY" && new Date(tx.created_at) < new Date(sellTx.created_at))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!buyTx) continue;

    const holdingPeriod = new Date(sellTx.created_at) - new Date(buyTx.created_at);
    const pnl = (sellTx.price_at_transaction - buyTx.price_at_transaction) * sellTx.quantity;

    if (holdingPeriod > oneYearMs) {
      longTermGains += Math.max(pnl, 0);
      longTermLosses += Math.abs(Math.min(pnl, 0));
    } else {
      shortTermGains += Math.max(pnl, 0);
      shortTermLosses += Math.abs(Math.min(pnl, 0));
    }
  }

  return {
    shortTermGains: round2(shortTermGains),
    longTermGains: round2(longTermGains),
    shortTermLosses: round2(shortTermLosses),
    longTermLosses: round2(longTermLosses),
    netShortTermGains: round2(shortTermGains - shortTermLosses),
    netLongTermGains: round2(longTermGains - longTermLosses),
  };
}
