import * as riskService from "../services/riskService.js";

export async function getRiskReport(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || 1; // Mock for now

    const riskReport = await riskService.getPortfolioRisk(userId);

    res.status(200).json({
      success: true,
      data: riskReport,
      message: "Risk report retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
