import * as holdingsCalculationService from "./holdingsCalculationService.js";

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
  const safeDefaultResponse = {
    success: true,
    data: {
      volatility: 0,
      concentration: 0,
      riskScore: 0,
      classification: "LOW",
      assets: []
    }
  };

  try {
    console.log(`\n[riskService] ═══════════════════════════════════════════`);
    console.log(`[riskService] Starting risk calculation for userId: ${userId}`);
    console.log(`[riskService] Calling holdingsCalculationService.getPortfolioWithValues()...`);
    const portfolio = await holdingsCalculationService.getPortfolioWithValues(userId);
    console.log(`[riskService] ✅ Portfolio fetched:`, {
      totalValue: portfolio.totalValue,
      assetCount: portfolio.assetCount,
      totalCostBasis: portfolio.totalCostBasis
    });
    
    const assets = portfolio.assets || [];
    console.log(`[riskService] Portfolio assets:`, assets.length);

    const validHoldings = assets.filter(
      (asset) => asset && Number(asset.quantity) > 0
    );

    console.log(`[riskService] Filtered holdings: ${assets.length} → ${validHoldings.length} valid`);

    if (validHoldings.length === 0 || portfolio.totalValue === 0) {
      console.log(`[riskService] ⚠️  No valid holdings or zero value, returning safe default`);
      console.log(`[riskService] validHoldings.length=${validHoldings.length}, totalValue=${portfolio.totalValue}`);
      return safeDefaultResponse;
    }
    
    console.log(`[riskService] ✅ Portfolio has data, continuing calculation...`);

    const totalValue = portfolio.totalValue;
    console.log(`[riskService] Using unified totalValue: $${totalValue}`);
    
    console.log(`[riskService] Asset details with prices:`);
    validHoldings.forEach((asset) => {
      console.log(`  - ${asset.symbol}: qty=${asset.quantity}, price=$${asset.currentPrice}, value=$${asset.currentValue}`);
    });

    const weights = validHoldings.map((asset) => {
      const value = Number(asset.currentValue) || 0;
      console.log(`[riskService] Weight calc for ${asset.symbol}: value=$${value} / totalValue=$${totalValue} = ${(value / totalValue * 100).toFixed(2)}%`);
      return value / totalValue;
    });

    const maxWeight = Math.max(...weights);
    const concentration = maxWeight * 100;
    console.log(`[riskService] Max weight: ${maxWeight.toFixed(6)}, Concentration: ${concentration.toFixed(2)}%`);

    const volatility = validHoldings.length === 1 ? 0.2 : 0.5;
    console.log(`[riskService] Volatility: ${volatility} (${validHoldings.length} assets)`);

    let riskScore = (volatility * 50) + (maxWeight * 50);
    console.log(`[riskService] Risk score calculation: (${volatility} * 50) + (${maxWeight.toFixed(6)} * 50) = ${riskScore.toFixed(2)}`);

    riskScore = Math.min(100, Math.max(0, riskScore));
    console.log(`[riskService] Clamped risk score: ${riskScore.toFixed(2)}`);

    let classification = "LOW";
    if (riskScore > 70) {
      classification = "HIGH";
    } else if (riskScore > 40) {
      classification = "MEDIUM";
    }

    console.log(`[riskService] ✅ Final result: Risk score: ${riskScore.toFixed(2)} (${classification})`);
    console.log(`[riskService] ═══════════════════════════════════════════\n`);

    return {
      success: true,
      data: {
        volatility: Number(volatility.toFixed(4)),
        concentration: Number(concentration.toFixed(2)),
        riskScore: Number(riskScore.toFixed(2)),
        classification,
        assets: validHoldings.map((asset) => ({
          symbol: asset.symbol,
          quantity: asset.quantity,
          currentValue: asset.currentValue,
          weight: (asset.currentValue / totalValue) * 100
        }))
      }
    };
  } catch (error) {
    console.error(`\n[riskService] ❌ ERROR during risk calculation:`);
    console.error(`[riskService] Error Message: ${error.message}`);
    console.error(`[riskService] Error Stack:`, error.stack);
    console.error(`[riskService] Returning safe default response`);
    console.error(`[riskService] ═══════════════════════════════════════════\n`);
    return safeDefaultResponse;
  }
}