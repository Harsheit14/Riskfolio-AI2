/**
 * ✅ GLOBAL ERROR HANDLING MIDDLEWARE
 * 
 * Purpose: Catch all errors from routes/controllers
 * Strategy: Return standardized format, hide stack traces in production
 * 
 * Error Response Format:
 * {
 *   "error": "error message",
 *   "status": 500,
 *   "timestamp": "ISO timestamp"
 * }
 */

export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === "production";

  // Determine status code
  let status = err.status || err.statusCode || 500;
  if (typeof status !== "number") {
    status = 500;
  }

  // Determine error message
  let message = err.message || "Internal server error";

  // Log error with details
  console.error(`[ERROR ${status}] ${req.method} ${req.path}:`, {
    message,
    stack: isProduction ? undefined : err.stack,
    timestamp: new Date().toISOString(),
  });

  // Send response
  res.status(status).json({
    error: isProduction && status === 500 ? "Internal server error" : message,
    status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async error wrapper for controllers
 * Catches errors thrown in async functions
 * Usage: router.get("/path", asyncHandler(controllerFunction))
 * 
 * @param {function} fn - Async controller function
 * @returns {function} Wrapped function
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  errorHandler,
  asyncHandler,
};
