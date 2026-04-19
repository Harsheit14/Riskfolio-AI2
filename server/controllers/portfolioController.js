import * as portfolioService from "../services/portfolioService.js";
import * as holdingsCalculationService from "../services/holdingsCalculationService.js";

export async function getHoldings(req, res) {
  try {
    const userId = req.user.userId;

    // ✅ USE UNIFIED HOLDINGS CALCULATION (Simple utility-based)
    const holdings = await holdingsCalculationService.computeSimpleHoldings(userId);
    
    // Get asset count
    const assetCount = Object.keys(holdings).length;

    res.status(200).json({
      success: true,
      data: {
        holdings,
        assetCount,
        assetsHeld: assetCount,
      },
      message: "Holdings retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getPortfolioValue(req, res) {
  try {
    const userId = req.user.userId;

    // ✅ USE UNIFIED HOLDINGS CALCULATION FOR PORTFOLIO VALUES
    const portfolio = await holdingsCalculationService.getPortfolioWithValues(userId);

    res.status(200).json({
      success: true,
      data: portfolio,
      message: "Portfolio value retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getPerformance(req, res) {
  try {
    const userId = req.user.userId;

    const performance = await portfolioService.getPortfolioPerformance(userId);

    res.status(200).json({
      success: true,
      data: performance,
      message: "Portfolio performance retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getPortfolioSummary(req, res) {
  try {
    const userId = req.user.userId;

    const summary = await portfolioService.getPortfolioSummary(userId);

    res.status(200).json({
      success: true,
      data: summary,
      message: "Portfolio summary retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getPortfolioTrend(req, res) {
  try {
    const userId = req.user.userId;
    // Default to 30 days, allow override via query param
    const days = Math.min(parseInt(req.query.days) || 30, 365);

    const trend = await portfolioService.getPortfolioTrend(userId, days);

    res.status(200).json({
      success: true,
      data: trend,
      message: "Portfolio trend retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
