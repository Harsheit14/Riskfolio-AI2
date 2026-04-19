import * as riskService from "../services/riskService.js";

export async function getRiskReport(req, res) {
  try {
    const userId = req.user.userId;

    const riskReport = await riskService.getPortfolioRisk(userId);

    res.status(200).json({
      success: true,
      data: riskReport.data,
      message: "Risk report retrieved successfully",
    });

  } catch (error) {
    console.error("❌ RISK REPORT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Risk calculation failed",
    });
  }
}