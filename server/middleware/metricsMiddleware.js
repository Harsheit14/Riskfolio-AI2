/**
 * ✅ METRICS MIDDLEWARE
 * 
 * Purpose: Track request metrics for observability and monitoring
 * Strategy: In-memory counters (can be exported to Prometheus/Grafana later)
 * 
 * Tracks:
 * - Total requests
 * - Response times
 * - Endpoint-specific metrics
 * - Cache hit/miss rates
 */

const metrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  requestsByEndpoint: {},
  cacheHits: 0,
  cacheMisses: 0,
  errorCounts: {},
  uptime: Date.now(),
};

/**
 * Metrics collection middleware
 * Attach to Express app: app.use(metricsMiddleware);
 */
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();

  // Increment total requests
  metrics.totalRequests++;

  // Track endpoint
  const endpoint = `${req.method} ${req.path}`;
  if (!metrics.requestsByEndpoint[endpoint]) {
    metrics.requestsByEndpoint[endpoint] = {
      count: 0,
      totalTime: 0,
      errors: 0,
    };
  }
  metrics.requestsByEndpoint[endpoint].count++;

  // Intercept response to track timing and status
  const originalSend = res.send;

  res.send = function (data) {
    const responseTime = Date.now() - startTime;

    // Track response time
    metrics.totalResponseTime += responseTime;
    metrics.requestsByEndpoint[endpoint].totalTime += responseTime;

    // Track errors
    if (res.statusCode >= 400) {
      if (!metrics.errorCounts[res.statusCode]) {
        metrics.errorCounts[res.statusCode] = 0;
      }
      metrics.errorCounts[res.statusCode]++;
      metrics.requestsByEndpoint[endpoint].errors++;
    }

    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      console.warn(
        `[SLOW REQUEST] ${endpoint} took ${responseTime}ms (${res.statusCode})`
      );
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Track cache hit
 */
export function trackCacheHit() {
  metrics.cacheHits++;
}

/**
 * Track cache miss
 */
export function trackCacheMiss() {
  metrics.cacheMisses++;
}

/**
 * Get cache hit rate (percentage)
 */
function getCacheHitRate() {
  const total = metrics.cacheHits + metrics.cacheMisses;
  if (total === 0) return 0;
  return Number(((metrics.cacheHits / total) * 100).toFixed(2));
}

/**
 * Get average response time (ms)
 */
function getAverageResponseTime() {
  if (metrics.totalRequests === 0) return 0;
  return Number((metrics.totalResponseTime / metrics.totalRequests).toFixed(2));
}

/**
 * Get all metrics
 */
export function getMetrics() {
  const cacheTotal = metrics.cacheHits + metrics.cacheMisses;

  return {
    timestamp: new Date().toISOString(),
    uptime: Date.now() - metrics.uptime,
    totalRequests: metrics.totalRequests,
    averageResponseTime: getAverageResponseTime(),
    cacheHitRate: getCacheHitRate(),
    cacheMetrics: {
      hits: metrics.cacheHits,
      misses: metrics.cacheMisses,
      total: cacheTotal,
    },
    errorCounts: metrics.errorCounts,
    topEndpoints: getTopEndpoints(),
  };
}

/**
 * Get top 10 slowest endpoints
 */
function getTopEndpoints() {
  return Object.entries(metrics.requestsByEndpoint)
    .map(([endpoint, data]) => ({
      endpoint,
      requests: data.count,
      averageTime: Number((data.totalTime / data.count).toFixed(2)),
      errors: data.errors,
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 10);
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics() {
  metrics.totalRequests = 0;
  metrics.totalResponseTime = 0;
  metrics.requestsByEndpoint = {};
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.errorCounts = {};
  metrics.uptime = Date.now();
}

/**
 * Get Prometheus-compatible metrics
 * Format: metric_name{labels} value
 */
export function getPrometheusMetrics() {
  const lines = [
    `# HELP riskfolio_total_requests Total HTTP requests`,
    `# TYPE riskfolio_total_requests counter`,
    `riskfolio_total_requests ${metrics.totalRequests}`,
    ``,
    `# HELP riskfolio_average_response_time Average response time in milliseconds`,
    `# TYPE riskfolio_average_response_time gauge`,
    `riskfolio_average_response_time ${getAverageResponseTime()}`,
    ``,
    `# HELP riskfolio_cache_hits Total cache hits`,
    `# TYPE riskfolio_cache_hits counter`,
    `riskfolio_cache_hits ${metrics.cacheHits}`,
    ``,
    `# HELP riskfolio_cache_misses Total cache misses`,
    `# TYPE riskfolio_cache_misses counter`,
    `riskfolio_cache_misses ${metrics.cacheMisses}`,
    ``,
    `# HELP riskfolio_cache_hit_rate Cache hit rate percentage`,
    `# TYPE riskfolio_cache_hit_rate gauge`,
    `riskfolio_cache_hit_rate ${getCacheHitRate()}`,
  ];

  // Add error counts
  Object.entries(metrics.errorCounts).forEach(([status, count]) => {
    lines.push(
      `riskfolio_errors_total{status="${status}"} ${count}`
    );
  });

  return lines.join("\n");
}

export default {
  metricsMiddleware,
  trackCacheHit,
  trackCacheMiss,
  getMetrics,
  resetMetrics,
  getPrometheusMetrics,
};
