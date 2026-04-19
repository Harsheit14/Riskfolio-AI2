import express from "express";
import * as portfolioController from "../controllers/portfolioController.js";
import * as portfolioHistoryController from "../controllers/portfolioHistoryController.js";
import * as portfolioOptimizationController from "../controllers/portfolioOptimizationController.js";
import { authenticate } from "../middleware/authMiddleware.js";

console.log("Portfolio routes loaded");
const router = express.Router();

// Protect all portfolio routes
router.use(authenticate);

// Phase 1-3: Core portfolio endpoints
router.get("/holdings", portfolioController.getHoldings);
router.get("/value", portfolioController.getPortfolioValue);
router.get("/performance", portfolioController.getPerformance);
router.get("/summary", portfolioController.getPortfolioSummary);
router.get("/trend", portfolioController.getPortfolioTrend);

// Phase 5: Historical data endpoints
router.get("/history", portfolioHistoryController.getPortfolioHistory);
router.get("/history/stats", portfolioHistoryController.getPortfolioHistoryStats);

// Phase 6: Enhanced PnL and optimization endpoints
router.get("/comprehensive-pnl", portfolioOptimizationController.getComprehensivePnL);
router.get("/tax-report", portfolioOptimizationController.getTaxReport);
router.get("/prices-stats", portfolioOptimizationController.getPricesStats);

export default router;
