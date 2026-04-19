/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ ENHANCED ERROR HANDLER - Phase 9: Production Hardening
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose:
 * - Centralized error handling for all routes/controllers
 * - Standardized error response format
 * - Structured error logging
 * - Production-safe error messages
 * 
 * Error Response Format:
 * {
 *   "success": false,
 *   "message": "User-friendly error message",
 *   "errorCode": "ERROR_CODE",
 *   "statusCode": 400,
 *   "timestamp": "ISO timestamp"
 * }
 */

import { logError, logWarn } from '../services/loggingService.js';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CODE MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: { code: 'BAD_REQUEST', status: 400, message: 'Invalid request' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401, message: 'Authentication required' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
  NOT_FOUND: { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
  CONFLICT: { code: 'CONFLICT', status: 409, message: 'Resource conflict' },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', status: 422, message: 'Validation failed' },
  RATE_LIMIT: { code: 'RATE_LIMIT', status: 429, message: 'Too many requests' },

  // Server errors (5xx)
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', status: 500, message: 'Internal server error' },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503, message: 'Service unavailable' },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', status: 500, message: 'Database operation failed' },
  EXTERNAL_API_ERROR: { code: 'EXTERNAL_API_ERROR', status: 502, message: 'External service error' },
};

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class AppError extends Error {
  constructor(message, errorCode = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CENTRALIZED ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main error handling middleware
 * Place this as the LAST middleware in index.js
 */
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';

  // ─────────────────────────────────────────────────────────────────────
  // DETERMINE ERROR DETAILS
  // ─────────────────────────────────────────────────────────────────────

  let statusCode = err.statusCode || err.status || 500;
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Validate status code
  if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }

  // ─────────────────────────────────────────────────────────────────────
  // HANDLE SPECIFIC ERROR TYPES
  // ─────────────────────────────────────────────────────────────────────

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }

  // Joi validation errors
  if (err.name === 'ValidationError' && err.details) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = err.details.map(d => d.message).join(', ');
  }

  // Database errors
  if (err.name === 'DatabaseError' || err.code === 'ECONNREFUSED') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = isProduction ? 'Database operation failed' : err.message;
  }

  // Rate limit errors
  if (statusCode === 429) {
    errorCode = 'RATE_LIMIT';
    message = 'Too many requests, please try again later';
  }

  // ─────────────────────────────────────────────────────────────────────
  // LOG ERROR
  // ─────────────────────────────────────────────────────────────────────

  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userId: req.user?.userId || 'anonymous',
    statusCode,
    errorCode,
  };

  if (statusCode >= 500) {
    // Log server errors (5xx) as errors
    logError(err, logData);
  } else if (statusCode >= 400) {
    // Log client errors (4xx) as warnings
    logWarn(message, logData);
  }

  // ─────────────────────────────────────────────────────────────────────
  // BUILD RESPONSE
  // ─────────────────────────────────────────────────────────────────────

  // Hide detailed error in production for 5xx errors
  const clientMessage = isProduction && statusCode >= 500 
    ? 'Internal server error' 
    : message;

  const response = {
    success: false,
    message: clientMessage,
    errorCode,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  // Include request ID if available (for tracing)
  if (req.id) {
    response.requestId = req.id;
  }

  // ─────────────────────────────────────────────────────────────────────
  // SEND RESPONSE
  // ─────────────────────────────────────────────────────────────────────

  res.status(statusCode).json(response);
}

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC ERROR WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap async controller functions to catch errors
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // Your code
 * }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR THROWING ERRORS
// ═══════════════════════════════════════════════════════════════════════════

export function throwBadRequest(message = 'Invalid request') {
  throw new AppError(message, 'BAD_REQUEST', 400);
}

export function throwUnauthorized(message = 'Authentication required') {
  throw new AppError(message, 'UNAUTHORIZED', 401);
}

export function throwForbidden(message = 'Access denied') {
  throw new AppError(message, 'FORBIDDEN', 403);
}

export function throwNotFound(message = 'Resource not found') {
  throw new AppError(message, 'NOT_FOUND', 404);
}

export function throwValidationError(message = 'Validation failed') {
  throw new AppError(message, 'VALIDATION_ERROR', 422);
}

export function throwConflict(message = 'Resource conflict') {
  throw new AppError(message, 'CONFLICT', 409);
}

export function throwInternalError(message = 'Internal server error') {
  throw new AppError(message, 'INTERNAL_ERROR', 500);
}

export function throwServiceUnavailable(message = 'Service unavailable') {
  throw new AppError(message, 'SERVICE_UNAVAILABLE', 503);
}

export function throwDatabaseError(message = 'Database operation failed') {
  throw new AppError(message, 'DATABASE_ERROR', 500);
}

export function throwExternalApiError(message = 'External service error') {
  throw new AppError(message, 'EXTERNAL_API_ERROR', 502);
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR DETECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(statusCode) {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(statusCode) {
  return statusCode >= 500;
}

/**
 * Get HTTP error message for status code
 */
export function getHttpErrorMessage(statusCode) {
  const messages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return messages[statusCode] || 'Unknown Error';
}
