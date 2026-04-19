/**
 * ✅ PRODUCTION CONFIGURATION
 * 
 * Purpose: Centralized production settings
 * Environment: Development / Production / Testing
 */

const config = {
  // ═══════════════════════════════════════════════════════
  // SERVER CONFIG
  // ═══════════════════════════════════════════════════════
  server: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || "development",
    isDevelopment: process.env.NODE_ENV !== "production",
    isProduction: process.env.NODE_ENV === "production",
  },

  // ═══════════════════════════════════════════════════════
  // DATABASE CONFIG
  // ═══════════════════════════════════════════════════════
  database: {
    url: process.env.DATABASE_URL || "",
    connectionTimeout: 10000,
    maxRetries: 3,
    retryDelay: 2000,
  },

  // ═══════════════════════════════════════════════════════
  // JWT CONFIG
  // ═══════════════════════════════════════════════════════
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // ═══════════════════════════════════════════════════════
  // RATE LIMITING CONFIG
  // ═══════════════════════════════════════════════════════
  rateLimiting: {
    enabled: process.env.NODE_ENV === "production",
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 requests
    },
    global: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 requests
    },
  },

  // ═══════════════════════════════════════════════════════
  // CACHING CONFIG
  // ═══════════════════════════════════════════════════════
  cache: {
    enabled: true,
    ttl: 45 * 1000, // 45 seconds
    cleanupInterval: 60 * 1000, // 60 seconds
  },

  // ═══════════════════════════════════════════════════════
  // CORS CONFIG
  // ═══════════════════════════════════════════════════════
  cors: {
    origins: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },

  // ═══════════════════════════════════════════════════════
  // SECURITY CONFIG
  // ═══════════════════════════════════════════════════════
  security: {
    bcryptRounds: 12,
    passwordMinLength: 8,
    tokenExpiration: "7d",
  },

  // ═══════════════════════════════════════════════════════
  // API CONFIG
  // ═══════════════════════════════════════════════════════
  api: {
    version: "2.0.0",
    baseUrl: "/api",
    timeout: 30000, // 30 seconds
    maxBodySize: "10mb",
  },

  // ═══════════════════════════════════════════════════════
  // PRICE SERVICE CONFIG
  // ═══════════════════════════════════════════════════════
  priceService: {
    provider: "coingecko",
    cacheDuration: 60000, // 60 seconds
    timeout: 10000, // 10 seconds
  },

  // ═══════════════════════════════════════════════════════
  // LOGGING CONFIG
  // ═══════════════════════════════════════════════════════
  logging: {
    format: process.env.NODE_ENV === "production" ? "combined" : "dev",
    level: process.env.LOG_LEVEL || "info",
  },
};

export default config;
