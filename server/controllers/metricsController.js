/**
 * ✅ METRICS CONTROLLER
 * 
 * Purpose: Expose application metrics for monitoring
 * Strategy: Collect request metrics and expose in multiple formats
 * 
 * Formats:
 * - JSON (default)
 * - Prometheus text format (for Prometheus scraping)
 */

import * as metricsMiddleware from "../middleware/metricsMiddleware.js";

/**
 * GET /metrics
 * Return metrics in JSON format
 */
export async function getMetrics(req, res) {
  try {
    const metrics = metricsMiddleware.getMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /metrics/prometheus
 * Return metrics in Prometheus text format
 */
export async function getPrometheusMetrics(req, res) {
  try {
    const metrics = metricsMiddleware.getPrometheusMetrics();

    res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(metrics);
  } catch (error) {
    res.status(500).send(`# Error: ${error.message}`);
  }
}

export default {
  getMetrics,
  getPrometheusMetrics,
};
