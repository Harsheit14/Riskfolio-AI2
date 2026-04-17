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
 */
export async function getUserHoldings(userId) {
  try {
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return {};
    }

    // Build holdings map: assetId → { quantity, totalCostBasis, buyCount, sellCount }
    const holdingsMap = new Map();

    for (const tx of transactions) {
      const { asset_id, type, quantity, price_at_transaction } = tx;

      if (!holdingsMap.has(asset_id)) {
        holdingsMap.set(asset_id, {
          quantity: 0,
          totalCostBasis: 0,
          buyCount: 0,
          sellCount: 0,
        });
      }

      const holding = holdingsMap.get(asset_id);

      if (type === "BUY") {
        holding.quantity += quantity;
        holding.totalCostBasis += quantity * price_at_transaction;
        holding.buyCount += 1;
      } else if (type === "SELL") {
        holding.quantity -= quantity;
        holding.sellCount += 1;
      }
    }

    // Filter out zero/negative holdings and fetch asset metadata
    const assetIds = Array.from(holdingsMap.entries())
      .filter(([, holding]) => holding.quantity > 0)
      .map(([assetId]) => assetId);

    if (assetIds.length === 0) {
      return {};
    }

    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Build final holdings object
    const holdings = {};
    holdingsMap.forEach((holding, assetId) => {
      if (holding.quantity > 0) {
        const asset = assetMetaMap.get(assetId);
        if (asset) {
          const avgBuyPrice = round2(holding.totalCostBasis / holding.quantity);
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
      prices = await priceService.getCurrentPrices(coinIdsToFetch);
    }

    // Calculate per-asset values
    let totalValue = 0;
    let totalInvested = 0;
    const assets = [];

    Object.entries(holdings).forEach(([symbol, meta]) => {
      const currentPrice = prices[meta.coingeckoId] || 0;
      const currentValue = meta.quantity * currentPrice;
      const assetPnL = currentValue - meta.totalCostBasis;
      const assetPnLPercentage = meta.totalCostBasis > 0
        ? round2((assetPnL / meta.totalCostBasis) * 100)
        : 0;

      totalValue += currentValue;
      totalInvested += meta.totalCostBasis;

      assets.push({
        symbol,
        quantity: meta.quantity,
        avgBuyPrice: meta.avgBuyPrice,
        currentPrice: round2(currentPrice),
        currentValue: round2(currentValue),
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
