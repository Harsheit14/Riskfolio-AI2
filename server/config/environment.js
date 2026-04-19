/**
 * ✅ ENVIRONMENT CONFIGURATION
 * 
 * Purpose: Centralized environment variable management
 * Strategy: Validate and type-check all configuration
 * 
 * Supports:
 * - development
 * - production
 * - testing
 * 
 * Fails startup if critical variables missing in production
 */

const ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = ENV === "production";

/**
 * Required variables that must be set
 */
const REQUIRED_IN_PRODUCTION = [
  "PORT",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
];

/**
 * Validate environment configuration
 */
function validateEnvironment() {
  const missing = [];

  for (const variable of REQUIRED_IN_PRODUCTION) {
    if (IS_PRODUCTION && !process.env[variable]) {
      missing.push(variable);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required environment variables in production: ${missing.join(
        ", "
      )}`
    );
  }

  console.log(`✅ Environment validation passed (${ENV})`);
}

/**
 * Parse port as integer
 */
function getPort() {
  const port = process.env.PORT || 5000;
  const parsed = parseInt(port, 10);

  if (Number.isNaN(parsed)) {
    throw new Error("PORT must be a valid integer");
  }

  return parsed;
}

/**
 * Get database configuration
 */
function getDatabaseConfig() {
  const url = process.env.DATABASE_URL;

  if (!url && IS_PRODUCTION) {
    throw new Error("DATABASE_URL not set in production");
  }

  return {
    url: url || "postgresql://postgres:harsh@localhost:5432/Crypto_db",
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || "20", 10),
  };
}

/**
 * Get Redis configuration
 */
function getRedisConfig() {
  const url = process.env.REDIS_URL;

  if (!url && IS_PRODUCTION) {
    throw new Error("REDIS_URL not set in production");
  }

  return {
    url: url || "redis://localhost:6379",
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };
}

/**
 * Get JWT configuration
 */
function getJwtConfig() {
  const secret = process.env.JWT_SECRET;

  if (!secret && IS_PRODUCTION) {
    throw new Error("JWT_SECRET not set in production");
  }

  if (secret && secret.length < 32 && IS_PRODUCTION) {
    console.warn("⚠️  JWT_SECRET is less than 32 characters. Consider making it stronger.");
  }

  return {
    secret: secret || "your-super-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256",
  };
}

/**
 * Get server configuration
 */
function getServerConfig() {
  return {
    port: getPort(),
    environment: ENV,
    isDevelopment: !IS_PRODUCTION,
    isProduction: IS_PRODUCTION,
    logLevel: process.env.LOG_LEVEL || (IS_PRODUCTION ? "warn" : "debug"),
  };
}

/**
 * Get rate limiting configuration
 */
function getRateLimitConfig() {
  return {
    enabled: IS_PRODUCTION,
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "5", 10),
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_API_MAX || "30", 10),
    },
    global: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || "100", 10),
    },
  };
}

/**
 * Get cache configuration
 */
function getCacheConfig() {
  return {
    type: process.env.CACHE_TYPE || "redis",
    ttl: parseInt(process.env.CACHE_TTL || "60", 10),
    enabled: process.env.CACHE_ENABLED !== "false",
  };
}

/**
 * Main configuration object
 */
const config = {
  // Validation
  validate: validateEnvironment,

  // Components
  server: getServerConfig(),
  database: getDatabaseConfig(),
  redis: getRedisConfig(),
  jwt: getJwtConfig(),
  rateLimit: getRateLimitConfig(),
  cache: getCacheConfig(),

  // Helpers
  isDevelopment: !IS_PRODUCTION,
  isProduction: IS_PRODUCTION,
  environment: ENV,
};

// Validate on load
try {
  config.validate();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

export default config;
