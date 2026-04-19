/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 7: ANALYTICS ROUTES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Define endpoints for quantitative analytics
 * 
 * All routes:
 * - Require JWT authentication
 * - Accept days parameter (1-365)
 * - Support asset filtering
 * - Return JSON responses with metadata
 * 
 * Base path: /api/analytics
 * 
 * @module analyticsRoutes
 */

import express from "express";
import * as analyticsController from "../controllers/analyticsController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════════════
 */

// All analytics routes require authentication
router.use(authenticate);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANALYTICS ENDPOINTS
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * GET /api/analytics/returns
 * 
 * Calculate daily returns for portfolio assets
 * 
 * Query parameters:
 *   - days: number (1-365, default 30)
 *   - assets: string (comma-separated symbols, optional)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     assets: [{
 *       symbol: "BTC",
 *       dataPoints: 30,
 *       returns: [{timestamp, return}, ...],
 *       stats: {meanReturn, minReturn, maxReturn}
 *     }]
 *   },
 *   requestedDays: 30,
 *   assetsCount: 3,
 *   timestamp: ISO string
 * }
 */
router.get("/returns", analyticsController.getReturnsAnalysis);

/**
 * GET /api/analytics/volatility
 * 
 * Calculate volatility for portfolio assets
 * 
 * Query parameters:
 *   - days: number (1-365, default 30)
 *   - assets: string (comma-separated symbols, optional)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     assets: [{
 *       symbol: "BTC",
 *       volatility: 0.0245,
 *       interpretation: "Low volatility (stable)",
 *       dataPoints: 30
 *     }]
 *   },
 *   requestedDays: 30,
 *   timestamp: ISO string
 * }
 */
router.get("/volatility", analyticsController.getVolatilityAnalysis);

/**
 * GET /api/analytics/risk-metrics
 * 
 * Comprehensive risk metrics (Sharpe, Sortino, VaR, CVaR, etc.)
 * 
 * Query parameters:
 *   - days: number (1-365, default 30)
 *   - assets: string (comma-separated symbols, optional)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     assets: [{
 *       symbol: "BTC",
 *       volatility: 0.0245,
 *       sharpeRatio: 2.34,
 *       sortinoRatio: 3.12,
 *       maxDrawdown: -0.15,
 *       var95: -0.045,
 *       cvar95: -0.065,
 *       dataPoints: 30
 *     }]
 *   },
 *   requestedDays: 30,
 *   timestamp: ISO string
 * }
 */
router.get("/risk-metrics", analyticsController.getRiskMetrics);

/**
 * GET /api/analytics/portfolio-risk-profile
 * 
 * Overall portfolio risk classification
 * 
 * Query parameters:
 *   - days: number (1-365, default 30)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     riskLevel: "Low" | "Medium" | "High",
 *     riskScore: 0-10,
 *     interpretation: "Your portfolio has...",
 *     metrics: {
 *       averageVolatility: 0.0245,
 *       maxDrawdown: -0.15,
 *       assetCount: 3,
 *       diversification: "Good"
 *     },
 *     assets: [{symbol, volatility, drawdown}, ...],
 *     requestedDays: 30,
 *     timestamp: ISO string
 *   }
 * }
 */
router.get("/portfolio-risk-profile", analyticsController.getPortfolioRiskProfile);

/**
 * GET /api/analytics/summary
 * 
 * Quick summary of key analytics metrics
 * 
 * Query parameters:
 *   - days: number (1-365, default 30)
 * 
 * Response: {
 *   success: true,
 *   data: {
 *     riskLevel: "Medium",
 *     riskScore: 4.5,
 *     interpretation: "...",
 *     metrics: {...}
 *   },
 *   timestamp: ISO string
 * }
 */
router.get("/summary", analyticsController.getAnalyticsSummary);

export default router;
