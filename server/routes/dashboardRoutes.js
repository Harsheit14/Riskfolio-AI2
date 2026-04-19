/**
 * ✅ DASHBOARD ROUTES
 * 
 * Purpose: Aggregated endpoint for frontend dashboard
 * Requires: Authentication
 */

import express from "express";
import * as dashboardController from "../controllers/dashboardController.js";
import * as realtimeController from "../controllers/realtimeController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all dashboard routes
router.use(authenticate);

/**
 * GET /api/dashboard
 * Get complete dashboard snapshot
 * Includes: portfolio value, P&L, holdings, allocation, risk summary
 */
router.get("/", dashboardController.getDashboard);

/**
 * GET /api/dashboard/stream
 * Real-time portfolio updates via Server-Sent Events
 * Streams portfolio data every 15 seconds
 */
router.get("/stream", realtimeController.streamPortfolioUpdates);

/**
 * GET /api/dashboard/stream/health
 * Check health of streaming connection
 * Returns active connection count and status
 */
router.get("/stream/health", realtimeController.getStreamHealth);

export default router;
