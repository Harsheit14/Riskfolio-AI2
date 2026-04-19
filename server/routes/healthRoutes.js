/**
 * ✅ HEALTH CHECK ROUTES
 * 
 * Purpose: Health check endpoints for monitoring and orchestration
 * Routes:
 * - GET /health - Simple liveness check
 * - GET /health/live - Kubernetes liveness probe
 * - GET /health/ready - Kubernetes readiness probe
 * - GET /health/detailed - Comprehensive health check
 */

import express from "express";
import * as healthController from "../controllers/healthController.js";

const router = express.Router();

/**
 * Simple health check
 * No authentication required
 */
router.get("/", healthController.getHealth);

/**
 * Kubernetes liveness probe
 * Check if application is still running
 */
router.get("/live", healthController.getLive);

/**
 * Kubernetes readiness probe
 * Check if application is ready to serve traffic
 */
router.get("/ready", healthController.getReady);

/**
 * Detailed health check
 * Comprehensive status including all dependencies
 */
router.get("/detailed", healthController.getDetailed);

export default router;
