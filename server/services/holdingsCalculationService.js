import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as priceService from "./priceService.js";
import { computeHoldings as utilComputeHoldings, logHoldings } from "../utils/computeHoldings.js";

function round2(value) {
  return Math.round(value * 100) / 100;
}

async function getAllTransactions(userId) {
  if (!userId) throw new Error("Missing userId");
  return await transactionRepository.getTransactionsByUser(userId);
}

async function computeSimpleHoldings(userId) {
  try {
    console.log(`\n[computeSimpleHoldings] Starting for userId=${userId}`);
    
    const transactions = await getAllTransactions(userId);
    console.log(`[computeSimpleHoldings] Retrieved ${transactions.length} transactions`);

    if (!transactions || transactions.length === 0) {
      console.log(`[computeSimpleHoldings] No transactions found`);
      return {};
    }

    if (transactions.length > 0) {
      console.log(`[computeSimpleHoldings] First transaction:`, transactions[0]);
    }

    const enrichedTx = transactions.map((tx) => ({
      ...tx,
      symbol: tx.symbol || `UNKNOWN_${tx.asset_id}`,
      price_at_transaction: tx.price_at_transaction,
      quantity: tx.quantity,
      type: tx.type,
      created_at: tx.created_at,
    }));

    console.log(`[computeSimpleHoldings] Enriched ${enrichedTx.length} transactions`);

    const holdings = utilComputeHoldings(enrichedTx);
    
    console.log(`[computeSimpleHoldings] Final holdings:`, {
      count: Object.keys(holdings).length,
      symbols: Object.keys(holdings),
      details: holdings,
    });

    return holdings;
  } catch (error) {
    console.error(`[computeSimpleHoldings] Error:`, error.message, error.stack);
    throw error;
  }
}

export async function getHoldings(userId) {
  try {
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return [];
    }

    const assets = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assets.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    const holdings = utilComputeHoldings(transactions);

    const result = {};
    for (const symbol in holdings) {
      const h = holdings[symbol];
      const avgBuyPrice =
        h.quantity > 0 && h.totalCost > 0
          ? round2(h.totalCost / h.quantity)
          : 0;

      const asset = Array.from(assetMetaMap.values()).find(
        (a) => a.symbol === symbol
      );

      result[symbol] = {
        symbol,
        quantity: round2(h.quantity),
        totalCostBasis: round2(h.totalCost),
        avgBuyPrice,
        assetId: asset?.id,
        coingeckoId: asset?.coingecko_id,
      };
    }

    const holdingsArray = Object.entries(result).map(([symbol, data]) => ({
      symbol,
      quantity: data.quantity,
      totalCostBasis: data.totalCostBasis,
      avgBuyPrice: data.avgBuyPrice,
      assetId: data.assetId,
      coingeckoId: data.coingeckoId,
    }));

    return holdingsArray;
  } catch (error) {
    console.error(`[holdingsCalculationService] getHoldings error:`, error.message);
    throw new Error(`Failed to calculate holdings: ${error.message}`);
  }
}

async function getPricesForHoldings(holdings) {
  const coingeckoIds = holdings
    .map((h) => h.coingeckoId)
    .filter(Boolean);

  if (coingeckoIds.length === 0) {
    return {};
  }

  try {
    const prices = await priceService.getCurrentPrices(coingeckoIds);
    return prices || {};
  } catch (error) {
    console.error(`[holdingsCalculationService] Price fetch error:`, error.message);
    throw new Error(`Failed to fetch prices: ${error.message}`);
  }
}

export async function getPortfolioWithValues(userId) {
  try {
    const holdings = await getHoldings(userId);

    if (!holdings || holdings.length === 0) {
      return {
        holdings: [],
        assets: [],
        totalValue: 0,
        totalCostBasis: 0,
        totalPnL: 0,
        totalPnLPercentage: 0,
        assetCount: 0,
      };
    }

    const prices = await getPricesForHoldings(holdings);

    let totalValue = 0;
    let totalCostBasis = 0;
    const assets = [];

    for (const h of holdings) {
      const currentPrice = prices[h.coingeckoId] || 0;

      if (!currentPrice || currentPrice <= 0) {
        console.warn(
          `⚠️  WARNING: No valid price for ${h.symbol} (${h.coingeckoId}): ${currentPrice}`
        );
      }

      const currentValue = h.quantity * (currentPrice || 0);
      const assetPnL = currentValue - h.totalCostBasis;
      const assetPnLPercentage =
        h.totalCostBasis > 0 ? round2((assetPnL / h.totalCostBasis) * 100) : 0;

      totalValue += currentValue;
      totalCostBasis += h.totalCostBasis;

      assets.push({
        symbol: h.symbol,
        quantity: h.quantity,
        avgBuyPrice: h.avgBuyPrice,
        currentPrice: round2(currentPrice || 0),
        currentValue: round2(currentValue),
        costBasis: round2(h.totalCostBasis),
        pnl: round2(assetPnL),
        pnlPercentage: assetPnLPercentage,
      });
    }

    assets.sort((a, b) => b.currentValue - a.currentValue);

    const totalPnL = totalValue - totalCostBasis;
    const totalPnLPercentage =
      totalCostBasis > 0 ? round2((totalPnL / totalCostBasis) * 100) : 0;

    return {
      holdings,
      assets,
      totalValue: round2(totalValue),
      totalCostBasis: round2(totalCostBasis),
      totalPnL: round2(totalPnL),
      totalPnLPercentage,
      assetCount: assets.length,
    };
  } catch (error) {
    console.error(
      `[holdingsCalculationService] getPortfolioWithValues error:`,
      error.message
    );
    throw new Error(`Failed to calculate portfolio: ${error.message}`);
  }
}

export async function getAllocation(userId) {
  try {
    const portfolio = await getPortfolioWithValues(userId);

    if (portfolio.totalValue === 0) {
      return [];
    }

    return portfolio.assets.map((asset) => ({
      symbol: asset.symbol,
      quantity: asset.quantity,
      value: asset.currentValue,
      percentage: round2((asset.currentValue / portfolio.totalValue) * 100),
    }));
  } catch (error) {
    console.error(`[holdingsCalculationService] getAllocation error:`, error.message);
    throw new Error(`Failed to calculate allocation: ${error.message}`);
  }
}

export async function getHoldingsList(userId) {
  const holdings = await getHoldings(userId);
  return holdings;
}

export async function getAssetCount(userId) {
  const holdings = await getHoldings(userId);
  return holdings.length;
}

export async function getTotalPortfolioValue(userId) {
  const portfolio = await getPortfolioWithValues(userId);
  return portfolio.totalValue;
}

export { computeSimpleHoldings };
