// ═══════════════════════════════════════════════════════
// ✅ RISKFOLIO-AI BACKEND - MAIN SERVER
// Production-Ready with Phase 4 Infrastructure Upgrade
// ═══════════════════════════════════════════════════════

// ✅ LOAD ENVIRONMENT VARIABLES FIRST
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

// ═══════════════════════════════════════════════════════
// ✅ CORE DEPENDENCIES
// ═══════════════════════════════════════════════════════

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// ═══════════════════════════════════════════════════════
// ✅ CONFIGURATION & SERVICES
// ═══════════════════════════════════════════════════════

import config from "./config/environment.js";
import { connectDB } from "./config/db.js";
import * as cacheService from "./services/cacheService.js";
import * as redisClient from "./services/redisClient.js";
import { initializeWebSocketHandlers, cleanupWebSocketService } from "./services/websocketService.js";
import logger, { requestLoggingMiddleware, logInfo, logError, logCritical, logWarn } from "./services/loggingService.js";

// ═══════════════════════════════════════════════════════
// ✅ MIDDLEWARE
// ═══════════════════════════════════════════════════════

import { errorHandler } from "./middleware/enhancedErrorHandler.js";
import { globalLimiter, authLimiter, apiLimiter } from "./middleware/rateLimitMiddleware.js";
import { metricsMiddleware } from "./middleware/metricsMiddleware.js";

// ═══════════════════════════════════════════════════════
// ✅ ROUTES
// ═══════════════════════════════════════════════════════

import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import riskRoutes from "./routes/riskRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";

// ═══════════════════════════════════════════════════════
// ✅ EXPRESS APP SETUP
// ═══════════════════════════════════════════════════════

const app = express();

// ═══════════════════════════════════════════════════════
// ✅ HTTP SERVER & WEBSOCKET SETUP (Phase 8)
// ═══════════════════════════════════════════════════════

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:3000",
      process.env.CLIENT_URL || "http://localhost:5175",
      process.env.FRONTEND_URL || "http://localhost:5173",
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// ═══════════════════════════════════════════════════════
// ✅ SECURITY MIDDLEWARE
// ═══════════════════════════════════════════════════════

// ✅ CORS configuration (MUST be first) - Supports dynamic frontend ports
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:3000",
  process.env.CLIENT_URL || "http://localhost:5175",
  process.env.FRONTEND_URL || "http://localhost:5173",
].filter(Boolean); // Remove any undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ✅ Handle preflight OPTIONS requests explicitly (uses regex for Express 5.x compatibility)
app.options(/.*/, cors(corsOptions));

// ✅ Helmet for HTTP security headers
app.use(helmet());

// ═══════════════════════════════════════════════════════
// ✅ BODY PARSING & LOGGING
// ═══════════════════════════════════════════════════════

app.use(express.json({ limit: "10mb" }));

// ✅ Use structured logging instead of morgan
app.use(requestLoggingMiddleware());

// ═══════════════════════════════════════════════════════
// ✅ METRICS TRACKING
// ═══════════════════════════════════════════════════════

app.use(metricsMiddleware);

// ═══════════════════════════════════════════════════════
// ✅ RATE LIMITING
// ═══════════════════════════════════════════════════════

// Apply global rate limiter
app.use(globalLimiter);

// ═══════════════════════════════════════════════════════
// ✅ ROUTES
// ═══════════════════════════════════════════════════════

// Root test route
app.get("/", (req, res) => {
  res.json({
    message: "✅ Riskfolio AI Backend API (Production Ready)",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes (strict rate limit)
app.use("/api/auth", authLimiter, authRoutes);

// API routes (moderate rate limit)
app.use("/api/transactions", apiLimiter, transactionRoutes);
app.use("/api/portfolio", apiLimiter, portfolioRoutes);
app.use("/api/risk", apiLimiter, riskRoutes);
app.use("/api/dashboard", apiLimiter, dashboardRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);

// ═══════════════════════════════════════════════════════
// ✅ HEALTH CHECK & OBSERVABILITY ENDPOINTS
// ═══════════════════════════════════════════════════════

// Health check routes (no rate limit)
app.use("/health", healthRoutes);

// Metrics endpoints (no rate limit)
app.use("/metrics", metricsRoutes);

// ═══════════════════════════════════════════════════════
// ✅ ERROR HANDLING MIDDLEWARE
// ═══════════════════════════════════════════════════════

// 404 handler (standardized error format)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    errorCode: "NOT_FOUND",
    statusCode: 404,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (MUST be last middleware)
app.use(errorHandler);

// ═══════════════════════════════════════════════════════
// ✅ SERVER STARTUP
// ═══════════════════════════════════════════════════════

const startServer = async () => {
  try {
    logInfo("🚀 Starting Riskfolio-AI backend server...");

    // REQUIRED: Database must connect
    await connectDB();
    logInfo("✅ Database connection verified");

    // Initialize Redis caching system
    try {
      await redisClient.initializeRedis(config.redis.url);
      logInfo("✅ Redis connection verified");
    } catch (redisError) {
      logError(redisError, { context: "Redis initialization failed, using local cache fallback" });
    }

    // Initialize local caching system (fallback)
    cacheService.initializeCache();
    logInfo("✅ Local cache initialized");

    // ═══════════════════════════════════════════════════════════════════════
    // Initialize WebSocket handlers (Phase 8)
    // ═══════════════════════════════════════════════════════════════════════
    initializeWebSocketHandlers(io);
    logInfo("✅ WebSocket handlers initialized");

    const port = config.server.port;
    httpServer.listen(port, () => {
      const startupMessage = `
${"=".repeat(75)}
✅ RISKFOLIO-AI BACKEND (PRODUCTION-READY - PHASE 9 HARDENED)
${"=".repeat(75)}
📍 Server running on port ${port}
🌍 API Base: http://localhost:${port}/api
🔐 Security: Helmet + CORS + Rate Limiting + Enhanced Error Handling
💾 Cache: Redis + Local cache (hybrid)
📊 Health Checks: http://localhost:${port}/health
📈 Metrics: http://localhost:${port}/metrics
🗄️  Database: PostgreSQL connected
🔌 WebSocket: Socket.IO ready for real-time updates
📝 Logging: Winston structured logging enabled
🛡️  Environment: ${config.environment}
${"=".repeat(75)}
      `;
      console.log(startupMessage);
      logInfo("Server started successfully", { 
        port, 
        environment: config.environment,
        nodeEnv: process.env.NODE_ENV,
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Graceful Shutdown Handlers (Phase 9)
    // ═══════════════════════════════════════════════════════════════════════
    const gracefulShutdown = async (signal) => {
      logCritical(`${signal} received, initiating graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        httpServer.close(() => {
          logInfo("HTTP server closed");
        });

        // Clean up WebSocket
        cleanupWebSocketService();
        logInfo("WebSocket service cleaned up");

        // Close database connection
        // TODO: Add DB close logic if available

        // Close Redis connection
        try {
          await redisClient.closeConnection?.();
          logInfo("Redis connection closed");
        } catch (err) {
          logWarn("Error closing Redis connection", { error: err.message });
        }

        logInfo("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        logError(error, { context: "Error during graceful shutdown" });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logCritical("Uncaught exception detected", { 
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logCritical("Unhandled promise rejection", { 
        reason: reason?.message || String(reason),
        promise: promise.toString(),
      });
    });

  } catch (error) {
    logCritical("Fatal error during server startup", {
      error: error.message,
      stack: error.stack,
    });
    console.error("❌ FATAL: Cannot start server -", error.message);
    process.exit(1);
  }
};

// ═══════════════════════════════════════════════════════
// ✅ START SERVER
// ═══════════════════════════════════════════════════════

startServer();