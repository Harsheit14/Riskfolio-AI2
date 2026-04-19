/**
 * ✅ DASHBOARD CONTROLLER - UNIFIED HOLDINGS CALCULATION
 * 
 * Purpose: Aggregated endpoint for frontend dashboard
 * Returns: Complete portfolio snapshot using UNIFIED holdings calculation
 * 
 * Integration:
 * - Uses holdingsCalculationService for consistent FIFO calculations
 * - Fetches live prices for real-time portfolio value
 * - Handles errors gracefully (empty portfolios, price API failures)
 */

import * as holdingsCalculationService from "../services/holdingsCalculationService.js";
import * as riskService from "../services/riskService.js";
import * as aiService from "../services/aiService.js";

/**
 * GET /api/dashboard
 * Complete portfolio snapshot with unified calculations
 */
export async function getDashboard(req, res) {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "User ID not found in request",
        timestamp: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: GET PORTFOLIO USING UNIFIED CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════
    const portfolio = await holdingsCalculationService.getPortfolioWithValues(userId);

    // If empty portfolio
    if (portfolio.assetCount === 0) {
      const emptyPortfolioInsights = aiService.generateInsightsAndRecommendations({
        totalValue: 0,
        allocation: [],
      });

      return res.status(200).json({
        success: true,
        data: {
          totalValue: 0,
          assets: [],
          assetCount: 0,
          allocation: [],
          pnl: {
            totalPnL: 0,
            pnlPercentage: 0,
            totalInvested: 0,
          },
          riskScore: {
            riskScore: 0,
            riskLevel: "UNKNOWN",
            reasoning: "Empty portfolio",
          },
          insights: emptyPortfolioInsights.insights,
          recommendations: emptyPortfolioInsights.recommendations,
          lastUpdated: new Date().toISOString(),
        },
        message: "Empty portfolio",
        timestamp: new Date().toISOString(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: GET ALLOCATION
    // ═══════════════════════════════════════════════════════════════════════
    let allocation = [];
    try {
      allocation = await holdingsCalculationService.getAllocation(userId);
    } catch (error) {
      console.warn("[DASHBOARD] Allocation calculation failed:", error.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: GET RISK SCORE
    // ═══════════════════════════════════════════════════════════════════════
    let riskScore = {
      riskScore: 0,
      riskLevel: "UNKNOWN",
      reasoning: "Unable to calculate",
    };
    try {
      riskScore = await riskService.getPortfolioRisk(userId);
    } catch (error) {
      console.warn("[DASHBOARD] Risk calculation failed:", error.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: GET AI INSIGHTS
    // ═══════════════════════════════════════════════════════════════════════
    const insights = aiService.generateInsightsAndRecommendations({
      totalValue: portfolio.totalValue,
      allocation,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // RETURN COMPLETE DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════
    res.status(200).json({
      success: true,
      data: {
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalCostBasis,
        assets: portfolio.assets,
        assetCount: portfolio.assetCount,
        allocation,
        pnl: {
          totalPnL: portfolio.totalPnL,
          pnlPercentage: portfolio.totalPnLPercentage,
          totalInvested: portfolio.totalCostBasis,
        },
        riskScore,
        insights: insights.insights,
        recommendations: insights.recommendations,
        lastUpdated: new Date().toISOString(),
      },
      message: "Dashboard data retrieved successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DASHBOARD] Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export default {
  getDashboard,
};
