import * as portfolioService from "../services/portfolioService.js";

export async function getHoldings(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || 1; // Mock for now

    const holdings = await portfolioService.getUserHoldings(userId);

    res.status(200).json({
      success: true,
      data: holdings,
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
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || 1; // Mock for now

    const portfolio = await portfolioService.getPortfolioValue(userId);

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
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || 1; // Mock for now

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
