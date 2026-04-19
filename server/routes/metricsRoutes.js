/**
 * ✅ METRICS ROUTES
 * 
 * Purpose: Metrics endpoints for monitoring and observability
 * Routes:
 * - GET /metrics - Metrics in JSON format
 * - GET /metrics/prometheus - Metrics in Prometheus format
 */

import express from "express";
import * as metricsController from "../controllers/metricsController.js";

const router = express.Router();

/**
 * Get metrics in JSON format
 * No authentication required
 */
router.get("/", metricsController.getMetrics);

/**
 * Get metrics in Prometheus format
 * For Prometheus scraping
 */
router.get("/prometheus", metricsController.getPrometheusMetrics);

export default router;
