/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 7: ANALYTICS CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Expose quantitative analytics endpoints
 * Features:
 * - Daily returns calculation
 * - Volatility analysis
 * - Risk-adjusted returns (Sharpe, Sortino)
 * - Maximum drawdown
 * - Portfolio risk profiling
 * - Value at Risk (VaR) and Conditional VaR
 * 
 * All endpoints require JWT authentication and return production-safe responses
 * 
 * @module analyticsController
 */

import * as analyticsService from "../services/analyticsService.js";
import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as historicalPriceService from "../services/historicalPriceService.js";

/**
 * Helper: Round to N decimal places
 */
function roundTo(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * GET /api/analytics/returns
 * 
 * Calculate daily returns for portfolio assets
 * 
 * Query parameters:
 * - days: 1-365 (default 30)
 * - assets: comma-separated symbols (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "symbol": "BTC",
 *     "dataPoints": 30,
 *     "returns": [{timestamp, return}, ...],
 *     "stats": {
 *       "meanReturn": 0.01,
 *       "minReturn": -0.05,
 *       "maxReturn": 0.08
 *     }
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getReturnsAnalysis(req, res) {
  try {
    const userId = req.user.userId;
    const { days = 30, assets } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 1: Get user transactions and holdings
    // ════════════════════════════════════════════════════════════════════════

    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
        message: "No transaction data available",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 2: Get asset metadata and filter if specified
    // ════════════════════════════════════════════════════════════════════════

    const assetList = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assetList.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    // Get unique assets
    const uniqueAssets = [...new Set(
      transactions
        .map((tx) => {
          const asset = assetMetaMap.get(tx.asset_id);
          return asset ? asset.symbol : null;
        })
        .filter(Boolean)
    )];

    // Filter by requested assets if specified
    let assetsToAnalyze = uniqueAssets;
    if (assets) {
      const requested = assets.split(",").map((s) => s.toUpperCase().trim());
      assetsToAnalyze = uniqueAssets.filter((a) => requested.includes(a));
    }

    if (assetsToAnalyze.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
        message: "No matching assets found",
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // STEP 3: Fetch historical prices and calculate returns
    // ════════════════════════════════════════════════════════════════════════

    const resultsData = [];

    for (const symbol of assetsToAnalyze) {
      try {
        // Fetch historical data
        const history = await historicalPriceService.getHistoricalPrices(symbol, days);

        if (!history || history.length === 0) {
          continue;
        }

        // Calculate returns
        const returns = analyticsService.calculateReturns(history);

        if (returns.length === 0) {
          continue;
        }

        // Calculate statistics
        const returnValues = returns.map((r) => r.return);
        const meanReturn = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
        const minReturn = Math.min(...returnValues);
        const maxReturn = Math.max(...returnValues);

        resultsData.push({
          symbol,
          dataPoints: returns.length,
          returns: returns.slice(-50), // Return last 50 for response size
          stats: {
            meanReturn: roundTo(meanReturn, 4),
            minReturn: roundTo(minReturn, 4),
            maxReturn: roundTo(maxReturn, 4),
          },
        });
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${symbol}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: { assets: resultsData },
      requestedDays: parseInt(days),
      assetsCount: assetsToAnalyze.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getReturnsAnalysis:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate returns",
      message: error.message,
    });
  }
}

/**
 * GET /api/analytics/volatility
 * 
 * Calculate volatility for portfolio assets
 * 
 * Query parameters:
 * - days: 1-365 (default 30)
 * - assets: comma-separated symbols (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "assets": [
 *       {
 *         "symbol": "BTC",
 *         "volatility": 0.0245,
 *         "interpretation": "Low to moderate volatility"
 *       }
 *     ]
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getVolatilityAnalysis(req, res) {
  try {
    const userId = req.user.userId;
    const { days = 30, assets } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Get transactions
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
      });
    }

    // Get assets
    const assetList = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assetList.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    const uniqueAssets = [...new Set(
      transactions
        .map((tx) => {
          const asset = assetMetaMap.get(tx.asset_id);
          return asset ? asset.symbol : null;
        })
        .filter(Boolean)
    )];

    // Filter by requested assets
    let assetsToAnalyze = uniqueAssets;
    if (assets) {
      const requested = assets.split(",").map((s) => s.toUpperCase().trim());
      assetsToAnalyze = uniqueAssets.filter((a) => requested.includes(a));
    }

    // Calculate volatility
    const resultsData = [];

    for (const symbol of assetsToAnalyze) {
      try {
        const history = await historicalPriceService.getHistoricalPrices(symbol, days);

        if (!history || history.length < 2) continue;

        const returns = analyticsService.calculateReturns(history);
        const returnValues = returns.map((r) => r.return);

        const { volatility } = analyticsService.calculateVolatility(returnValues);

        // Classify volatility
        let interpretation;
        if (volatility < 0.01) {
          interpretation = "Very low volatility (very stable)";
        } else if (volatility < 0.025) {
          interpretation = "Low volatility (stable)";
        } else if (volatility < 0.05) {
          interpretation = "Moderate volatility (normal)";
        } else if (volatility < 0.10) {
          interpretation = "High volatility (risky)";
        } else {
          interpretation = "Very high volatility (very risky)";
        }

        resultsData.push({
          symbol,
          volatility,
          interpretation,
          dataPoints: returns.length,
        });
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${symbol}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: { assets: resultsData },
      requestedDays: parseInt(days),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getVolatilityAnalysis:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate volatility",
      message: error.message,
    });
  }
}

/**
 * GET /api/analytics/risk-metrics
 * 
 * Comprehensive risk metrics including Sharpe, Sortino, VaR, etc.
 * 
 * Query parameters:
 * - days: 1-365 (default 30)
 * - assets: comma-separated symbols (optional)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "assets": [{
 *       "symbol": "BTC",
 *       "volatility": 0.0245,
 *       "sharpeRatio": 2.34,
 *       "sortinoRatio": 3.12,
 *       "maxDrawdown": -0.15,
 *       "var95": -0.045,
 *       "cvar95": -0.065
 *     }]
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getRiskMetrics(req, res) {
  try {
    const userId = req.user.userId;
    const { days = 30, assets } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Get transactions
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { assets: [] },
      });
    }

    // Get assets
    const assetList = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assetList.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    const uniqueAssets = [...new Set(
      transactions
        .map((tx) => {
          const asset = assetMetaMap.get(tx.asset_id);
          return asset ? asset.symbol : null;
        })
        .filter(Boolean)
    )];

    // Filter by requested assets
    let assetsToAnalyze = uniqueAssets;
    if (assets) {
      const requested = assets.split(",").map((s) => s.toUpperCase().trim());
      assetsToAnalyze = uniqueAssets.filter((a) => requested.includes(a));
    }

    // Calculate metrics
    const resultsData = [];

    for (const symbol of assetsToAnalyze) {
      try {
        const history = await historicalPriceService.getHistoricalPrices(symbol, days);

        if (!history || history.length < 2) continue;

        const returns = analyticsService.calculateReturns(history);
        const returnValues = returns.map((r) => r.return);

        // Calculate all metrics
        const volatility = analyticsService.calculateVolatility(returnValues).volatility;
        const sharpe = analyticsService.calculateSharpeRatio(returnValues).sharpeRatio;
        const sortino = analyticsService.calculateSortinoRatio(returnValues).sortinoRatio;
        const drawdown = analyticsService.calculateMaxDrawdown(history).maxDrawdown;
        const var95 = analyticsService.calculateValueAtRisk(returnValues).var95;
        const cvar95 = analyticsService.calculateConditionalValueAtRisk(returnValues).cvar95;

        resultsData.push({
          symbol,
          volatility,
          sharpeRatio: sharpe,
          sortinoRatio: sortino,
          maxDrawdown: drawdown,
          var95,
          cvar95,
          dataPoints: returns.length,
        });
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${symbol}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      data: { assets: resultsData },
      requestedDays: parseInt(days),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getRiskMetrics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate risk metrics",
      message: error.message,
    });
  }
}

/**
 * GET /api/analytics/portfolio-risk-profile
 * 
 * Overall portfolio risk classification
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "riskLevel": "Medium",
 *     "riskScore": 4.5,
 *     "interpretation": "Your portfolio has moderate risk...",
 *     "metrics": {
 *       "averageVolatility": 0.0245,
 *       "maxDrawdown": -0.15,
 *       "assetCount": 3,
 *       "diversification": "Good"
 *     }
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getPortfolioRiskProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Get transactions
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          riskLevel: "Unknown",
          riskScore: 0,
          interpretation: "No transaction data available",
        },
      });
    }

    // Get assets
    const assetList = await assetRepository.getAllAssets();
    const assetMetaMap = new Map();
    assetList.forEach((asset) => {
      assetMetaMap.set(asset.id, asset);
    });

    const uniqueAssets = [...new Set(
      transactions
        .map((tx) => {
          const asset = assetMetaMap.get(tx.asset_id);
          return asset ? asset.symbol : null;
        })
        .filter(Boolean)
    )];

    // Calculate metrics for all assets
    const assetMetrics = [];
    let totalVolatility = 0;
    let maxDrawdown = 0;

    for (const symbol of uniqueAssets) {
      try {
        const history = await historicalPriceService.getHistoricalPrices(symbol, days);

        if (!history || history.length < 2) continue;

        const returns = analyticsService.calculateReturns(history);
        const returnValues = returns.map((r) => r.return);

        const volatility = analyticsService.calculateVolatility(returnValues).volatility;
        const drawdown = analyticsService.calculateMaxDrawdown(history).maxDrawdown;

        assetMetrics.push({ symbol, volatility, drawdown });
        totalVolatility += volatility;

        if (drawdown < maxDrawdown) {
          maxDrawdown = drawdown;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${symbol}: ${error.message}`);
      }
    }

    if (assetMetrics.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          riskLevel: "Unknown",
          riskScore: 0,
          interpretation: "Insufficient data for risk assessment",
        },
      });
    }

    // Calculate portfolio metrics
    const averageVolatility = totalVolatility / assetMetrics.length;

    // Classify portfolio risk
    const riskProfile = analyticsService.calculatePortfolioRiskProfile({
      volatility: averageVolatility,
      maxDrawdown,
      assetCount: assetMetrics.length,
    });

    // Diversification score
    let diversification;
    if (assetMetrics.length === 1) {
      diversification = "Low (single asset)";
    } else if (assetMetrics.length === 2) {
      diversification = "Moderate (two assets)";
    } else if (assetMetrics.length <= 4) {
      diversification = "Good (3-4 assets)";
    } else {
      diversification = "Excellent (5+ assets)";
    }

    // Interpretation
    let interpretation;
    if (riskProfile.riskLevel === "Low") {
      interpretation = "Your portfolio has low risk with stable performance and minimal drawdowns. Suitable for conservative investors.";
    } else if (riskProfile.riskLevel === "Medium") {
      interpretation = "Your portfolio has moderate risk with balanced volatility. Suitable for most investors.";
    } else {
      interpretation = "Your portfolio has high risk with significant volatility and drawdown potential. Suitable for aggressive investors.";
    }

    return res.status(200).json({
      success: true,
      data: {
        riskLevel: riskProfile.riskLevel,
        riskScore: riskProfile.riskScore,
        interpretation,
        metrics: {
          averageVolatility: roundTo(averageVolatility, 4),
          maxDrawdown: roundTo(maxDrawdown, 4),
          assetCount: assetMetrics.length,
          diversification,
        },
        assets: assetMetrics.map((m) => ({
          symbol: m.symbol,
          volatility: m.volatility,
          drawdown: m.drawdown,
        })),
      },
      requestedDays: parseInt(days),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getPortfolioRiskProfile:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to calculate portfolio risk profile",
      message: error.message,
    });
  }
}

/**
 * GET /api/analytics/summary
 * 
 * Quick summary of key analytics metrics
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": {
 *       "volatility": 0.0245,
 *       "sharpeRatio": 2.34,
 *       "maxDrawdown": -0.15,
 *       "riskLevel": "Medium"
 *     }
 *   }
 * }
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function getAnalyticsSummary(req, res) {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    // Get all data
    const riskProfile = await new Promise((resolve) => {
      getPortfolioRiskProfile(
        { user: { userId }, query: { days } },
        {
          status: () => ({ json: (data) => resolve(data.data) }),
          json: (data) => resolve(data.data),
        }
      );
    });

    return res.status(200).json({
      success: true,
      data: riskProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in getAnalyticsSummary:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get analytics summary",
      message: error.message,
    });
  }
}
