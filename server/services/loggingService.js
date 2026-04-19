/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ LOGGING SERVICE - Phase 9: Production Hardening
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose:
 * - Centralized structured logging using Winston
 * - Replace console.log with production-grade logging
 * - Log requests, errors, and critical events
 * - Support file and console outputs
 * - Structured logs for monitoring/observability
 * 
 * Features:
 * - Winston logger with multiple transports
 * - Request logging middleware
 * - Error logging utilities
 * - Event logging for critical operations
 * - Log rotation support (future)
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTORY SETUP
// ═══════════════════════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../logs');

// ═══════════════════════════════════════════════════════════════════════════
// WINSTON LOGGER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === 'production';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let meta = '';
    if (Object.keys(metadata).length > 0 && metadata.metadata) {
      meta = JSON.stringify(metadata.metadata, null, 2);
    }
    return `${timestamp} [${level}] ${message} ${meta}`;
  })
);

const transports = [
  // Console output
  new winston.transports.Console({
    format: consoleFormat,
    level: isProduction ? 'info' : 'debug',
  }),
];

// Add file transports only if logs directory exists or can be created
if (!isProduction || process.env.ENABLE_LOG_FILES === 'true') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE LOGGER INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'riskfolio-ai-server' },
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log HTTP request
 */
function logRequest(req, res, responseTime) {
  const { method, path, ip, user } = req;
  const statusCode = res.statusCode;
  
  const logLevel = statusCode >= 400 ? 'warn' : 'info';
  
  logger.log({
    level: logLevel,
    message: `${method} ${path}`,
    metadata: {
      method,
      path,
      statusCode,
      responseTime: `${responseTime}ms`,
      ip: ip || req.connection.remoteAddress,
      userId: user?.userId || 'anonymous',
      userAgent: req.get('user-agent'),
    },
  });
}

/**
 * Log error with context
 */
function logError(error, context = {}) {
  logger.error(error.message, {
    metadata: {
      errorCode: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      ...context,
    },
  });
}

/**
 * Log critical event
 */
function logCritical(message, metadata = {}) {
  logger.error(message, {
    metadata: {
      eventType: 'CRITICAL',
      ...metadata,
    },
  });
}

/**
 * Log info event
 */
function logInfo(message, metadata = {}) {
  logger.info(message, {
    metadata,
  });
}

/**
 * Log warning event
 */
function logWarn(message, metadata = {}) {
  logger.warn(message, {
    metadata,
  });
}

/**
 * Log debug info
 */
function logDebug(message, metadata = {}) {
  logger.debug(message, {
    metadata,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE FOR REQUEST LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Middleware to log all HTTP requests
 * Use this instead of morgan for structured logging
 */
function requestLoggingMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Override res.json to log response
    const originalJson = res.json;
    res.json = function (data) {
      const responseTime = Date.now() - startTime;
      logRequest(req, res, responseTime);
      return originalJson.call(this, data);
    };

    // Override res.send for non-JSON responses
    const originalSend = res.send;
    res.send = function (data) {
      const responseTime = Date.now() - startTime;
      logRequest(req, res, responseTime);
      return originalSend.call(this, data);
    };

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default logger;

export {
  logRequest,
  logError,
  logCritical,
  logInfo,
  logWarn,
  logDebug,
  requestLoggingMiddleware,
};
