import * as portfolioService from "./portfolioService.js";
import * as priceService from "./priceService.js";

/**
 * Volatility (standard deviation of returns)
 */
function calculateVolatility(prices) {
  if (!prices || prices.length < 2) return 0;

  const returns = [];

  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] === 0) continue;
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  if (returns.length === 0) return 0;

  const mean =
    returns.reduce((sum, r) => sum + r, 0) / returns.length;

  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    returns.length;

  return Math.sqrt(variance);
}

/**
 * Max drawdown
 */
function calculateMaxDrawdown(prices) {
  if (!prices || prices.length === 0) return 0;

  let peak = prices[0];
  let maxDrawdown = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) peak = prices[i];

    const drawdown = peak === 0 ? 0 : (peak - prices[i]) / peak;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

export async function getPortfolioRisk(userId) {
  try {
    const portfolio = await portfolioService.getPortfolioValue(userId);

    const assets = portfolio.assets || [];

    if (assets.length === 0 || portfolio.totalValue === 0) {
      return {
        volatility: 0,
        drawdown: 0,
        riskScore: 0,
      };
    }

    const assetMetrics = [];

    for (const asset of assets) {
      try {
        if (!asset.symbol) continue;

        const historical = await priceService.getHistoricalPrices(
          asset.symbol.toLowerCase(),
          30
        );

        const prices = historical.map((p) => p.price);

        if (prices.length < 2) continue;

        const volatility = calculateVolatility(prices);
        const drawdown = calculateMaxDrawdown(prices);

        const weight =
          portfolio.totalValue > 0
            ? asset.currentValue / portfolio.totalValue
            : 0;

        assetMetrics.push({
          symbol: asset.symbol,
          volatility,
          drawdown,
          weight,
        });
      } catch (err) {
        console.error(`Risk calc failed for ${asset.symbol}`, err.message);
      }
    }

    if (!assetMetrics.length) {
      return {
        volatility: 0,
        drawdown: 0,
        riskScore: 0,
      };
    }

    let portfolioVolatility = 0;
    let portfolioDrawdown = 0;

    for (const m of assetMetrics) {
      portfolioVolatility += m.volatility * m.weight;
      portfolioDrawdown += m.drawdown * m.weight;
    }

    const riskScore =
      portfolioVolatility * 0.6 + portfolioDrawdown * 0.4;

    return {
      volatility: Number(portfolioVolatility.toFixed(6)),
      drawdown: Number(portfolioDrawdown.toFixed(6)),
      riskScore: Number(riskScore.toFixed(6)),
    };
  } catch (error) {
    throw new Error(`Portfolio risk calculation failed: ${error.message}`);
  }
}