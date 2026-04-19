import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as priceService from "./priceService.js";

// Helper: Round to 2 decimal places (financial precision)
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Get user holdings grouped by asset with quantity, cost basis, and metadata
 * Returns object mapping symbol → { quantity, totalCostBasis, avgBuyPrice, assetId, coingeckoId }
 * 
 * Uses FIFO (First In First Out) accounting for sell transactions:
 * - Tracks buy transactions in order
 * - When selling, deducts from earliest buys first
 * - Calculates accurate cost basis and average price
 */
export async function getUserHoldings(userId) {
  try {
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return {};
    }

    // Sort transactions by created_at (ascending) for FIFO processing
    const sortedTx = [...transactions].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateA - dateB;
    });

    // Build holdings map: assetId → { quantity, totalCostBasis, buyLots, history }
    const holdingsMap = new Map();

    for (const tx of sortedTx) {
      const { asset_id, type, quantity, price_at_transaction, created_at } = tx;

      if (!holdingsMap.has(asset_id)) {
        holdingsMap.set(asset_id, {
          quantity: 0,
          totalCostBasis: 0,
          buyLots: [], // Track individual buy transactions: { quantity, price, costBasis, filledQty }
          history: [],
        });
      }

      const holding = holdingsMap.get(asset_id);
      const transactionCost = quantity * price_at_transaction;

      if (type === "BUY") {
        // Add new buy lot
        holding.quantity += quantity;
        holding.totalCostBasis += transactionCost;
        holding.buyLots.push({
          quantity,
          price: price_at_transaction,
          costBasis: transactionCost,
          filledQty: 0, // How much of this lot has been sold
        });
        holding.history.push({
          type: "BUY",
          quantity,
          price: price_at_transaction,
          timestamp: created_at,
        });
      } else if (type === "SELL") {
        // Validate we have enough to sell
        if (holding.quantity < quantity) {
          throw new Error(
            `Insufficient holdings for ${asset_id}. Have: ${holding.quantity}, Trying to sell: ${quantity}`
          );
        }

        // Use FIFO: sell from oldest buy lots first
        let remainingToSell = quantity;
        let costOfSoldUnits = 0;

        for (const lot of holding.buyLots) {
          if (remainingToSell <= 0) break;

          const availableInLot = lot.quantity - lot.filledQty;
          const sellFromThisLot = Math.min(availableInLot, remainingToSell);

          if (sellFromThisLot > 0) {
            // Calculate cost of units being sold from this lot
            costOfSoldUnits += sellFromThisLot * lot.price;
            lot.filledQty += sellFromThisLot;
            remainingToSell -= sellFromThisLot;
          }
        }

        // Update holdings
        holding.quantity -= quantity;
        holding.totalCostBasis -= costOfSoldUnits;

        holding.history.push({
          type: "SELL",
          quantity,
          price: price_at_transaction,
          costOfSold: costOfSoldUnits,
          timestamp: created_at,
        });
      }
    }

    // Get all assets to include metadata
    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Build final holdings object
    const holdings = {};
    holdingsMap.forEach((holding, assetId) => {
      const asset = assetMetaMap.get(assetId);
      if (asset) {
        // Only include if quantity is positive
        if (holding.quantity > 0) {
          const avgBuyPrice = holding.quantity > 0 && holding.totalCostBasis > 0
            ? round2(holding.totalCostBasis / holding.quantity)
            : 0;

          holdings[asset.symbol] = {
            quantity: round2(holding.quantity),
            totalCostBasis: round2(holding.totalCostBasis),
            avgBuyPrice,
            assetId,
            coingeckoId: asset.coingecko_id,
          };
        }
      }
    });

    return holdings;
  } catch (error) {
    throw new Error(`Failed to compute user holdings: ${error.message}`);
  }
}

/**
 * Get complete portfolio value with per-asset breakdown
 * Returns: { totalValue, totalInvested, pnl, pnlPercentage, assets: [...] }
 * 
 * Logic:
 * - Total Invested = sum of (quantity × price_at_transaction) for all BUY transactions per asset
 * - Current Value = sum of (quantity_held × current_market_price) per asset
 * - P&L = Current Value - Total Invested
 * - Assets with currentPrice of 0 or null are included with currentPrice: 0 and currentValue: 0
 */
export async function getPortfolioValue(userId) {
  try {
    const holdings = await getUserHoldings(userId);

    if (Object.keys(holdings).length === 0) {
      return {
        totalValue: 0,
        totalInvested: 0,
        pnl: 0,
        pnlPercentage: 0,
        assets: [],
      };
    }

    // Prepare coin IDs for price fetching (use coingeckoId when available)
    const coinIdMap = {};
    const coinIdsToFetch = [];

    Object.entries(holdings).forEach(([symbol, meta]) => {
      const coinId = meta.coingeckoId;
      if (coinId && !coinIdMap[coinId]) {
        coinIdMap[coinId] = symbol;
        coinIdsToFetch.push(coinId);
      }
    });

    // Fetch current prices
    let prices = {};
    if (coinIdsToFetch.length > 0) {
      try {
        prices = await priceService.getCurrentPrices(coinIdsToFetch);
        console.log(`[portfolioService] Fetched prices:`, JSON.stringify(prices));
      } catch (priceError) {
        console.error(`[portfolioService] Price fetch error: ${priceError.message}`);
        throw new Error(`Failed to fetch current prices for portfolio: ${priceError.message}`);
      }
    }

    // Validate that we have prices for all assets
    const missingPrices = [];
    for (const coinId of coinIdsToFetch) {
      if (!prices[coinId] || prices[coinId] <= 0) {
        const symbol = coinIdMap[coinId];
        missingPrices.push(`${symbol} (${coinId}): ${prices[coinId] || 'missing'}`);
      }
    }

    if (missingPrices.length > 0) {
      throw new Error(`Cannot compute portfolio: Missing or invalid prices for: ${missingPrices.join(", ")}`);
    }

    // Calculate per-asset values
    let totalValue = 0;
    let totalInvested = 0;
    const assets = [];

    Object.entries(holdings).forEach(([symbol, meta]) => {
      // Get current price - must be valid at this point
      const currentPrice = prices[meta.coingeckoId];
      
      if (!currentPrice || currentPrice <= 0) {
        console.error(`⚠️  CRITICAL: No valid price for ${symbol}: ${currentPrice}`);
      }
      
      // Current Value = quantity_held × current_market_price
      const currentValue = meta.quantity * (currentPrice || 0);
      
      // P&L = Current Value - Total Invested (cost_basis)
      const assetPnL = currentValue - meta.totalCostBasis;
      
      // P&L Percentage
      const assetPnLPercentage = meta.totalCostBasis > 0
        ? round2((assetPnL / meta.totalCostBasis) * 100)
        : 0;

      totalValue += currentValue;
      totalInvested += meta.totalCostBasis;

      assets.push({
        symbol,
        quantity: meta.quantity,
        avgBuyPrice: meta.avgBuyPrice,
        currentPrice: round2(currentPrice || 0),
        currentValue: round2(currentValue),
        costBasis: round2(meta.totalCostBasis),
        pnl: round2(assetPnL),
        pnlPercentage: assetPnLPercentage,
      });
    });

    // Sort by value descending for better UX
    assets.sort((a, b) => b.currentValue - a.currentValue);

    const portfolioPnL = totalValue - totalInvested;
    const portfolioPnLPercentage = totalInvested > 0
      ? round2((portfolioPnL / totalInvested) * 100)
      : 0;

    return {
      totalValue: round2(totalValue),
      totalInvested: round2(totalInvested),
      pnl: round2(portfolioPnL),
      pnlPercentage: portfolioPnLPercentage,
      assets,
    };
  } catch (error) {
    throw new Error(`Failed to compute portfolio value: ${error.message}`);
  }
}

/**
 * Get portfolio performance metrics and exposure analysis
 * Returns: { totalReturn%, exposure, summary }
 */
export async function getPortfolioPerformance(userId) {
  try {
    const portfolio = await getPortfolioValue(userId);

    if (portfolio.assets.length === 0) {
      return {
        totalReturnPercentage: 0,
        totalInvested: 0,
        currentValue: 0,
        realizedPnL: 0,
        unrealizedPnL: portfolio.pnl,
        exposure: [],
        summary: {
          winningAssets: 0,
          losingAssets: 0,
          totalAssets: 0,
        },
      };
    }

    // Calculate exposure (allocation %) per asset
    const exposure = portfolio.assets.map((asset) => ({
      symbol: asset.symbol,
      allocationPercentage: portfolio.totalValue > 0
        ? round2((asset.currentValue / portfolio.totalValue) * 100)
        : 0,
      quantity: asset.quantity,
      value: asset.currentValue,
    }));

    // Performance summary
    const winningAssets = portfolio.assets.filter((a) => a.pnl > 0).length;
    const losingAssets = portfolio.assets.filter((a) => a.pnl < 0).length;

    return {
      totalReturnPercentage: portfolio.pnlPercentage,
      totalInvested: portfolio.totalInvested,
      currentValue: portfolio.totalValue,
      realizedPnL: 0, // Would require sell transaction tracking
      unrealizedPnL: portfolio.pnl,
      exposure,
      summary: {
        winningAssets,
        losingAssets,
        totalAssets: portfolio.assets.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to compute portfolio performance: ${error.message}`);
  }
}

/**
 * Get portfolio summary with real-time prices
 * Returns: { totalValue, totalInvested, totalPnL, assets: [...] }
 * 
 * Logic:
 * - Groups transactions by asset
 * - Calculates quantity (BUY - SELL, prevents negative)
 * - Calculates invested (sum of BUY transaction value)
 * - Fetches real-time prices
 * - Calculates currentValue and pnl per asset
 * - Ignores assets with 0 quantity
 */
export async function getPortfolioSummary(userId) {
  try {
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return {
        totalValue: 0,
        totalInvested: 0,
        totalPnL: 0,
        pnlPercentage: 0,
        assetCount: 0,
        assets: [],
      };
    }

    // Get all assets for metadata
    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Group transactions by asset_id
    const assetMap = new Map();

    for (const tx of transactions) {
      const { asset_id, type, quantity, price_at_transaction } = tx;

      if (!assetMap.has(asset_id)) {
        assetMap.set(asset_id, {
          asset_id,
          quantity: 0,
          totalInvested: 0,
        });
      }

      const assetData = assetMap.get(asset_id);

      if (type === "BUY") {
        assetData.quantity += quantity;
        assetData.totalInvested += quantity * price_at_transaction;
      } else if (type === "SELL") {
        assetData.quantity -= quantity;
        // Don't subtract from invested - invested is cumulative cost basis
      }
    }

    // Prepare coin IDs for price fetching
    const coinIdsToFetch = [];
    const coinIdMap = {};

    for (const [assetId, assetData] of assetMap.entries()) {
      // Only include assets with positive quantity
      if (assetData.quantity > 0) {
        const asset = assetMetaMap.get(assetId);
        if (asset && asset.coingecko_id) {
          coinIdsToFetch.push(asset.coingecko_id);
          coinIdMap[asset.coingecko_id] = assetId;
        }
      }
    }

    // Fetch current prices
    let prices = {};
    if (coinIdsToFetch.length > 0) {
      prices = await priceService.getCurrentPrices(coinIdsToFetch);
    }

    // Build asset results - only include assets with quantity > 0
    const assetResults = [];
    let totalValue = 0;
    let totalInvested = 0;
    let totalPnL = 0;

    for (const [assetId, assetData] of assetMap.entries()) {
      // Skip if quantity is 0 or negative
      if (assetData.quantity <= 0) {
        continue;
      }

      const asset = assetMetaMap.get(assetId);
      if (!asset) {
        continue;
      }

      // Get current price
      const currentPrice = prices[asset.coingecko_id] || 0;

      // Calculate values
      const currentValue = assetData.quantity * currentPrice;
      const avgBuyPrice = assetData.totalInvested > 0
        ? round2(assetData.totalInvested / assetData.quantity)
        : 0;
      const pnl = currentValue - assetData.totalInvested;
      const pnlPercentage = assetData.totalInvested > 0
        ? round2((pnl / assetData.totalInvested) * 100)
        : 0;

      totalValue += currentValue;
      totalInvested += assetData.totalInvested;
      totalPnL += pnl;

      assetResults.push({
        symbol: asset.symbol,
        quantity: round2(assetData.quantity),
        avgBuyPrice,
        currentPrice: round2(currentPrice),
        currentValue: round2(currentValue),
        pnl: round2(pnl),
        pnlPercentage,
      });
    }

    // Sort by currentValue descending
    assetResults.sort((a, b) => b.currentValue - a.currentValue);

    // Calculate portfolio-level P&L percentage
    const pnlPercentage = totalInvested > 0
      ? round2((totalPnL / totalInvested) * 100)
      : 0;

    // Count assets held (non-zero quantity)
    const assetCount = assetResults.length;

    // Calculate allocation percentages
    const allocation = assetResults.map((asset) => {
      // allocation = (asset.currentValue / totalValue) × 100
      // If totalValue = 0, allocation = 0 (prevent division by zero)
      const percentage = totalValue > 0
        ? round2((asset.currentValue / totalValue) * 100)
        : 0;

      return {
        symbol: asset.symbol,
        percentage: Number.isFinite(percentage) ? percentage : 0,
      };
    });

    return {
      totalValue: round2(totalValue),
      totalInvested: round2(totalInvested),
      totalPnL: round2(totalPnL),
      pnlPercentage,
      assetCount,
      assets: assetResults,
      allocation,
    };
  } catch (error) {
    throw new Error(`Failed to compute portfolio summary: ${error.message}`);
  }
}

/**
 * Get portfolio trend over time
 * 
 * Calculates historical portfolio values using:
 * - Current holdings (quantities per asset)
 * - Historical prices for each asset (last N days)
 * 
 * Formula for each day: portfolio_value = sum(quantity_i × price_i_on_that_day)
 * 
 * @param {string} userId - User ID
 * @param {number} days - Number of historical days (7 or 30)
 * @returns {Promise<Object>} Time series of portfolio values
 *   {
 *     trend: [
 *       { date: "2024-01-15", value: 50000 },
 *       { date: "2024-01-16", value: 51000 },
 *       ...
 *     ]
 *   }
 * 
 * Edge cases handled:
 * - Empty portfolio: returns trend with value = 0 for each day
 * - Missing historical prices: uses 0 for that asset on that day
 * - No transactions: returns trend with all zeros
 * - NaN/Infinity prevention: validates all calculations
 */
export async function getPortfolioTrend(userId, days = 30) {
  try {
    // Guard: validate inputs
    if (!userId) throw new Error("userId is required");
    if (!Number.isFinite(days) || days <= 0) {
      days = 30;
    }

    // Step 1: Get transactions to calculate current holdings
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    // Empty portfolio case: return trend with zeros
    if (!transactions || transactions.length === 0) {
      return generateZeroTrend(days);
    }

    // Step 2: Get all assets for metadata
    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Step 3: Calculate current holdings (aggregated quantities)
    const holdingsMap = new Map(); // assetId → { quantity, coingeckoId, symbol }

    for (const tx of transactions) {
      const { asset_id, type, quantity } = tx;

      if (!holdingsMap.has(asset_id)) {
        const asset = assetMetaMap.get(asset_id);
        if (!asset) continue;

        holdingsMap.set(asset_id, {
          quantity: 0,
          coingeckoId: asset.coingecko_id,
          symbol: asset.symbol,
        });
      }

      const holding = holdingsMap.get(asset_id);

      if (type === "BUY") {
        holding.quantity += quantity;
      } else if (type === "SELL") {
        holding.quantity -= quantity;
      }
    }

    // Step 4: Keep only assets with positive quantity
    const activeAssets = Array.from(holdingsMap.entries())
      .filter(([, holding]) => holding.quantity > 0)
      .map(([assetId, holding]) => ({
        assetId,
        ...holding,
      }));

    // If no active holdings, return zero trend
    if (activeAssets.length === 0) {
      return generateZeroTrend(days);
    }

    // Step 5: Fetch historical prices for all active assets
    const historicalPriceData = {}; // coingeckoId → [{ timestamp, price }, ...]

    for (const asset of activeAssets) {
      try {
        const prices = await priceService.getHistoricalPrices(asset.coingeckoId, days);
        historicalPriceData[asset.coingeckoId] = prices;
      } catch (error) {
        console.warn(`Failed to fetch historical prices for ${asset.symbol}:`, error.message);
        // Continue with missing data - we'll use 0 for that asset
        historicalPriceData[asset.coingeckoId] = [];
      }
    }

    // Step 6: Build date range for the requested period
    const today = new Date();
    const dateRange = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dateRange.push(date);
    }

    // Step 7: Calculate portfolio value for each day
    const trend = dateRange.map((date) => {
      const dateStr = formatDate(date);
      let portfolioValue = 0;

      // For this date, sum: quantity_i × price_i_on_this_date
      for (const asset of activeAssets) {
        const prices = historicalPriceData[asset.coingeckoId] || [];

        // Find price for this date
        const priceData = prices.find((p) => {
          const priceDate = new Date(p.timestamp);
          return formatDate(priceDate) === dateStr;
        });

        const price = priceData ? priceData.price : 0;
        portfolioValue += asset.quantity * price;
      }

      return {
        date: dateStr,
        value: round2(portfolioValue),
      };
    });

    // Step 8: Validate output (prevent NaN, Infinity, undefined)
    const validatedTrend = trend.map((item) => ({
      date: String(item.date) || "",
      value: Number.isFinite(item.value) ? item.value : 0,
    }));

    return {
      trend: validatedTrend,
    };
  } catch (error) {
    console.error("Error calculating portfolio trend:", error.message);
    throw new Error(`Failed to calculate portfolio trend: ${error.message}`);
  }
}

/**
 * Helper: Generate zero trend for empty portfolios
 */
function generateZeroTrend(days) {
  const trend = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    trend.push({
      date: formatDate(date),
      value: 0,
    });
  }
  return { trend };
}

/**
 * Helper: Format date to YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * PHASE 4: PORTFOLIO ANALYTICS
 */

/**
 * Calculate P&L (Profit/Loss) for portfolio
 * 
 * Computes per-asset and total portfolio P&L based on:
 * - Average buy price (from BUY transactions)
 * - Current market price
 * - Quantity held
 * 
 * @param {Array} transactions - Array of transaction objects
 *   Each should have: { asset_symbol, type, quantity, price_at_transaction }
 * @param {Object} holdings - Holdings map from calculateHoldings
 *   Format: { "BTC": 2.5, "ETH": 1.2 }
 * 
 * @returns {Promise<Object>} P&L breakdown
 *   {
 *     totalPnL: number (USD),
 *     pnlPercentage: number (%),
 *     assetsPnL: [
 *       { symbol: "BTC", quantity: 1.5, avgBuyPrice: 45000, currentPrice: 65000, pnl: 30000, pnlPercentage: 66.67 }
 *     ]
 *   }
 * 
 * @example
 *   const pnl = await calculatePnL(transactions, holdings);
 *   // Returns: { totalPnL: 30000, pnlPercentage: 50, assetsPnL: [...] }
 */
export async function calculatePnL(transactions, holdings) {
  try {
    // Guard: return zero P&L for empty portfolio
    if (!holdings || Object.keys(holdings).length === 0) {
      return {
        totalPnL: 0,
        pnlPercentage: 0,
        totalInvested: 0,
        assetsPnL: [],
      };
    }

    // Guard: validate transactions array
    if (!transactions || !Array.isArray(transactions)) {
      return {
        totalPnL: 0,
        pnlPercentage: 0,
        totalInvested: 0,
        assetsPnL: [],
      };
    }

    // Step 1: Calculate average buy price per asset
    const avgPriceMap = new Map();
    const totalCostMap = new Map();

    for (const tx of transactions) {
      if (!tx || !tx.asset_symbol || !tx.type) continue;

      const symbol = String(tx.asset_symbol).toUpperCase().trim();
      if (!symbol) continue;

      // Only use BUY transactions for average price calculation
      if (tx.type === "BUY" && typeof tx.quantity === "number" && typeof tx.price_at_transaction === "number") {
        const cost = tx.quantity * tx.price_at_transaction;

        if (!totalCostMap.has(symbol)) {
          totalCostMap.set(symbol, 0);
          avgPriceMap.set(symbol, 0);
        }

        totalCostMap.set(symbol, totalCostMap.get(symbol) + cost);
      }
    }

    // Step 2: Calculate average price for each asset
    const holdingQuantityMap = new Map();
    for (const [symbol, quantity] of Object.entries(holdings)) {
      holdingQuantityMap.set(symbol, quantity);
    }

    for (const [symbol, totalCost] of totalCostMap.entries()) {
      const quantity = holdingQuantityMap.get(symbol) || 0;
      if (quantity > 0) {
        avgPriceMap.set(symbol, round2(totalCost / quantity));
      }
    }

    // Step 3: Fetch current prices for all holdings
    const coinIdMap = new Map();
    for (const symbol of Object.keys(holdings)) {
      coinIdMap.set(symbol, symbol);
    }

    // Step 4: Calculate P&L per asset
    const assetsPnL = [];
    let totalPnL = 0;
    let totalInvested = 0;

    for (const [symbol, quantity] of Object.entries(holdings)) {
      try {
        // Get current price
        const currentPrice = await priceService.getCryptoPrice(symbol);

        // Skip if price unavailable
        if (currentPrice === null || typeof currentPrice !== "number" || currentPrice <= 0) {
          continue;
        }

        // Get average buy price
        const avgBuyPrice = avgPriceMap.get(symbol) || 0;

        // Calculate P&L
        const currentValue = quantity * currentPrice;
        const investedAmount = avgBuyPrice * quantity;
        const assetPnL = currentValue - investedAmount;
        const assetPnLPercentage = investedAmount > 0 
          ? round2((assetPnL / investedAmount) * 100)
          : 0;

        totalPnL += assetPnL;
        totalInvested += investedAmount;

        assetsPnL.push({
          symbol: symbol.toUpperCase(),
          quantity: round2(quantity),
          avgBuyPrice: round2(avgBuyPrice),
          currentPrice: round2(currentPrice),
          pnl: round2(assetPnL),
          pnlPercentage: assetPnLPercentage,
        });
      } catch (error) {
        console.warn(`[calculatePnL] Failed to fetch price for ${symbol}:`, error.message);
        continue;
      }
    }

    // Sort by P&L descending
    assetsPnL.sort((a, b) => b.pnl - a.pnl);

    const pnlPercentage = totalInvested > 0 
      ? round2((totalPnL / totalInvested) * 100)
      : 0;

    return {
      totalPnL: round2(totalPnL),
      pnlPercentage,
      totalInvested: round2(totalInvested),
      assetsPnL,
    };
  } catch (error) {
    throw new Error(`Failed to calculate P&L: ${error.message}`);
  }
}

/**
 * Calculate portfolio allocation (percentage per asset)
 * 
 * Computes what percentage of total portfolio value each asset represents
 * 
 * @param {Object} detailedPortfolio - Output from calculateDetailedPortfolio
 *   Format: { assets: [{symbol, quantity, price, value}], totalValue: number }
 * 
 * @returns {Array} Allocation breakdown
 *   [
 *     { symbol: "BTC", percentage: 62.5, value: 97500 },
 *     { symbol: "ETH", percentage: 37.5, value: 58500 }
 *   ]
 * 
 * @example
 *   const portfolio = { 
 *     assets: [{symbol: "BTC", value: 97500}, {symbol: "ETH", value: 58500}],
 *     totalValue: 156000 
 *   };
 *   const allocation = calculateAllocation(portfolio);
 *   // Returns: [{ symbol: "BTC", percentage: 62.5, value: 97500 }, ...]
 */
export function calculateAllocation(detailedPortfolio) {
  try {
    // Guard: return empty array for invalid input
    if (!detailedPortfolio || !detailedPortfolio.assets || detailedPortfolio.assets.length === 0) {
      return [];
    }

    // Guard: return empty array if total value is zero or negative
    if (!detailedPortfolio.totalValue || detailedPortfolio.totalValue <= 0) {
      return [];
    }

    // Calculate percentage for each asset
    const allocation = detailedPortfolio.assets.map((asset) => {
      const percentage = round2((asset.value / detailedPortfolio.totalValue) * 100);

      return {
        symbol: asset.symbol.toUpperCase(),
        percentage,
        value: round2(asset.value),
        quantity: round2(asset.quantity),
      };
    });

    // Sort by percentage descending
    allocation.sort((a, b) => b.percentage - a.percentage);

    return allocation;
  } catch (error) {
    throw new Error(`Failed to calculate allocation: ${error.message}`);
  }
}

/**
 * Calculate portfolio risk score (0-100)
 * 
 * Risk assessment based on:
 * - Number of assets (diversification)
 * - Concentration (largest holdings)
 * 
 * Scoring:
 * - 1 asset → 90-100 (high risk)
 * - 2-3 assets → 60-80 (medium-high risk)
 * - 4-5 assets → 40-60 (medium risk)
 * - 6+ assets → 20-40 (lower risk)
 * - Top holding > 70% → +10 risk points
 * - Top holding > 50% → +5 risk points
 * 
 * @param {Object} holdings - Holdings map
 *   Format: { "BTC": 2.5, "ETH": 1.2 }
 * @param {Object} detailedPortfolio - Output from calculateDetailedPortfolio (optional)
 *   Used to calculate concentration. If not provided, assumes equal weighting.
 * 
 * @returns {Object} Risk assessment
 *   {
 *     riskScore: number (0-100),
 *     riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
 *     reasoning: string
 *   }
 * 
 * @example
 *   const risk = calculateRiskScore(holdings, portfolio);
 *   // Returns: { riskScore: 45, riskLevel: "MEDIUM", reasoning: "..." }
 */
export function calculateRiskScore(holdings, detailedPortfolio) {
  try {
    // Guard: return zero risk for empty portfolio
    if (!holdings || Object.keys(holdings).length === 0) {
      return {
        riskScore: 0,
        riskLevel: "UNKNOWN",
        reasoning: "Empty portfolio",
        diversificationScore: 0,
        concentrationScore: 0,
      };
    }

    const assetCount = Object.keys(holdings).length;
    let baseRiskScore = 0;
    let concentrationPenalty = 0;
    let reasoning = "";

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Diversification Score (based on number of assets)
    // ═══════════════════════════════════════════════════════════════════════
    if (assetCount === 1) {
      baseRiskScore = 95;
      reasoning = "Single asset - very high concentration risk";
    } else if (assetCount === 2) {
      baseRiskScore = 75;
      reasoning = "Two assets - high concentration risk";
    } else if (assetCount === 3) {
      baseRiskScore = 60;
      reasoning = "Three assets - moderate-high concentration risk";
    } else if (assetCount <= 5) {
      baseRiskScore = 45;
      reasoning = "Four to five assets - moderate risk";
    } else if (assetCount <= 10) {
      baseRiskScore = 30;
      reasoning = "Six to ten assets - lower risk";
    } else {
      baseRiskScore = 20;
      reasoning = "More than ten assets - well diversified";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Concentration Penalty (if detailedPortfolio provided)
    // ═══════════════════════════════════════════════════════════════════════
    if (detailedPortfolio && detailedPortfolio.assets && detailedPortfolio.totalValue > 0) {
      // Find the largest holding
      const largestAsset = detailedPortfolio.assets[0]; // Already sorted by value
      if (largestAsset) {
        const largestPercentage = (largestAsset.value / detailedPortfolio.totalValue) * 100;

        if (largestPercentage > 70) {
          concentrationPenalty = 15;
          reasoning += ` (${largestAsset.symbol} is ${round2(largestPercentage)}% of portfolio - severe concentration)`;
        } else if (largestPercentage > 50) {
          concentrationPenalty = 10;
          reasoning += ` (${largestAsset.symbol} is ${round2(largestPercentage)}% of portfolio - high concentration)`;
        } else if (largestPercentage > 35) {
          concentrationPenalty = 5;
          reasoning += ` (${largestAsset.symbol} is ${round2(largestPercentage)}% of portfolio)`;
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Final Score Calculation
    // ═══════════════════════════════════════════════════════════════════════
    let riskScore = baseRiskScore + concentrationPenalty;

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk level
    let riskLevel = "MEDIUM";
    if (riskScore >= 80) {
      riskLevel = "VERY_HIGH";
    } else if (riskScore >= 60) {
      riskLevel = "HIGH";
    } else if (riskScore >= 40) {
      riskLevel = "MEDIUM";
    } else if (riskScore >= 20) {
      riskLevel = "LOW";
    } else {
      riskLevel = "VERY_LOW";
    }

    return {
      riskScore: round2(riskScore),
      riskLevel,
      reasoning,
      diversificationScore: baseRiskScore,
      concentrationScore: concentrationPenalty,
      assetCount,
    };
  } catch (error) {
    throw new Error(`Failed to calculate risk score: ${error.message}`);
  }
}
