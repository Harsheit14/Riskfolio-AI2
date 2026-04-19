/**
 * ✅ HEALTH CHECK CONTROLLER
 * 
 * Purpose: Comprehensive health check for monitoring and orchestration
 * Strategy: Check all critical services (database, cache, etc.)
 * 
 * Response includes:
 * - Overall status
 * - Component health
 * - Uptime
 * - Version
 */

import pool from "../config/db.js";
import * as redisClient from "../services/redisClient.js";

/**
 * GET /health
 * Simple liveness check for load balancers
 */
export async function getHealth(req, res) {
  try {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
}

/**
 * GET /health/live
 * Kubernetes liveness probe endpoint
 */
export async function getLive(req, res) {
  res.status(200).json({ status: "alive" });
}

/**
 * GET /health/ready
 * Kubernetes readiness probe endpoint
 * Checks all critical dependencies
 */
export async function getReady(req, res) {
  try {
    const checks = await runHealthChecks();

    const allReady = Object.values(checks).every((check) => check.ready);

    res.status(allReady ? 200 : 503).json({
      status: allReady ? "ready" : "not_ready",
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      error: error.message,
    });
  }
}

/**
 * GET /health/detailed
 * Comprehensive health check with all metrics
 */
export async function getDetailed(req, res) {
  try {
    const checks = await runHealthChecks();
    const uptime = process.uptime();

    res.status(200).json({
      status: "ok",
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
}

/**
 * Run all health checks
 */
async function runHealthChecks() {
  const checks = {
    database: await checkDatabase(),
    cache: await checkCache(),
  };

  return checks;
}

/**
 * Check database connectivity
 */
async function checkDatabase() {
  const start = Date.now();

  try {
    const result = await pool.query("SELECT NOW()");
    const responseTime = Date.now() - start;

    return {
      ready: true,
      connected: true,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ready: false,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkCache() {
  const start = Date.now();

  try {
    const redis = redisClient.getRedis();
    const pong = await redis.ping();
    const responseTime = Date.now() - start;

    return {
      ready: pong === "PONG",
      connected: true,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ready: false,
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default {
  getHealth,
  getLive,
  getReady,
  getDetailed,
};
