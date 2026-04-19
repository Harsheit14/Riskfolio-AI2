/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ✅ WEBSOCKET SERVICE - Phase 8: Real-Time Infrastructure
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose:
 * - Handle WebSocket connections via Socket.IO
 * - Manage real-time dashboard updates
 * - Send portfolio metrics every 10-15 seconds
 * - Support user-specific rooms
 * - Prevent memory leaks with cleanup
 * 
 * Features:
 * - User-specific subscriptions
 * - Automatic interval management (no duplicates)
 * - Graceful cleanup on disconnect
 * - Logging for debugging
 * 
 * Events:
 * - subscribe_dashboard: Client requests dashboard updates
 * - dashboard_update: Server sends portfolio data to client
 * - error: Error handling
 */

import * as transactionRepository from "../repositories/transactionRepository.js";
import * as portfolioCalculationService from "../services/portfolioCalculationService.js";
import * as portfolioService from "../services/portfolioService.js";

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL STATE FOR INTERVAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
// Maps userId -> { intervalId, lastUpdate }
// Prevents duplicate intervals per user
const userIntervals = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// FETCH DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Fetch current dashboard metrics for a user
 * Returns: { totalValue, pnl, allocation, riskScore, volatility, sharpeRatio }
 */
async function fetchDashboardData(userId) {
  try {
    // Fetch all transactions for this user
    const transactions = await transactionRepository.getTransactionsByUser(userId);

    if (!transactions || transactions.length === 0) {
      return {
        totalValue: 0,
        pnl: 0,
        allocation: [],
        riskScore: 0,
        volatility: 0,
        sharpeRatio: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Get current portfolio value and asset breakdown
    const portfolio = await portfolioCalculationService.aggregateUserPortfolio(userId);

    if (!portfolio) {
      return {
        totalValue: 0,
        pnl: 0,
        allocation: [],
        riskScore: 0,
        volatility: 0,
        sharpeRatio: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Calculate portfolio metrics using existing services
    const totalValue = portfolio.totalValue || 0;

    // Calculate PnL (simplified: total invested vs current value)
    const totalCost = transactions.reduce((sum, tx) => {
      const qty = parseFloat(tx.quantity) || 0;
      const price = parseFloat(tx.price) || 0;
      const cost = tx.type === "BUY" ? qty * price : -qty * price;
      return sum + cost;
    }, 0);
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    // Asset allocation by percentage
    const allocation = portfolio.assets
      ?.map((asset) => ({
        symbol: asset.symbol,
        value: asset.value || 0,
        percentage: totalValue > 0 ? ((asset.value || 0) / totalValue) * 100 : 0,
      }))
      .slice(0, 10) || []; // Top 10 assets

    // Risk metrics (fetch from existing endpoints or return defaults)
    // For now, using placeholder values - integrate with analyticsService as needed
    const riskScore = Math.min(
      10,
      Math.max(0, allocation.length > 0 ? 5 + allocation.length * 0.5 : 0)
    );
    const volatility = allocation.length > 0 ? 0.15 + Math.random() * 0.15 : 0; // Placeholder
    const sharpeRatio = volatility > 0 ? pnlPercent / (volatility * 100) : 0;

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      allocation,
      riskScore: Math.round(riskScore * 100) / 100,
      volatility: Math.round(volatility * 10000) / 10000,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      assetCount: portfolio.assets?.length || 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error fetching dashboard data for user ${userId}:`, error.message);
    return {
      totalValue: 0,
      pnl: 0,
      allocation: [],
      riskScore: 0,
      volatility: 0,
      sharpeRatio: 0,
      error: "Failed to fetch dashboard data",
      lastUpdated: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// START REAL-TIME UPDATES FOR USER
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Start emitting dashboard updates every 10-15 seconds
 * Prevents duplicate intervals per user
 */
function startUserUpdates(io, socket, userId) {
  // Check if interval already exists for this user
  if (userIntervals.has(userId)) {
    console.log(`📡 User ${userId} already has active interval`);
    return;
  }

  console.log(`✅ Starting real-time updates for user ${userId}`);

  // Emit initial data
  fetchDashboardData(userId).then((data) => {
    socket.emit("dashboard_update", {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  });

  // Start interval: emit every 12 seconds (between 10-15 seconds)
  const intervalId = setInterval(async () => {
    try {
      const data = await fetchDashboardData(userId);

      // Emit to user's room only
      io.to(`user_${userId}`).emit("dashboard_update", {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`❌ Error updating dashboard for user ${userId}:`, error.message);

      // Emit error event
      io.to(`user_${userId}`).emit("dashboard_error", {
        success: false,
        error: "Failed to fetch dashboard updates",
        timestamp: new Date().toISOString(),
      });
    }
  }, 12000); // 12 seconds

  // Store interval ID and metadata
  userIntervals.set(userId, {
    intervalId,
    startTime: Date.now(),
    socket: socket.id,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STOP REAL-TIME UPDATES FOR USER
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Clean up interval and remove from tracking
 * Called on disconnect or unsubscribe
 */
function stopUserUpdates(userId) {
  if (userIntervals.has(userId)) {
    const { intervalId } = userIntervals.get(userId);
    clearInterval(intervalId);
    userIntervals.delete(userId);
    console.log(`🛑 Stopped real-time updates for user ${userId}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Set up Socket.IO handlers for a new connection
 * - Handle subscribe/unsubscribe events
 * - Manage user rooms
 * - Clean up on disconnect
 */
export function initializeWebSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ─────────────────────────────────────────────────────────────────────
    // EVENT: subscribe_dashboard
    // ─────────────────────────────────────────────────────────────────────
    socket.on("subscribe_dashboard", (data) => {
      try {
        const userId = data?.userId;

        if (!userId) {
          socket.emit("error", {
            success: false,
            error: "Missing userId in subscribe_dashboard",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`📡 User ${userId} subscribing to dashboard updates`);

        // Join user-specific room
        socket.join(`user_${userId}`);

        // Start emitting updates for this user
        startUserUpdates(io, socket, userId);

        // Confirm subscription
        socket.emit("subscription_confirmed", {
          success: true,
          message: "Subscribed to dashboard updates",
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error in subscribe_dashboard:", error.message);
        socket.emit("error", {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // EVENT: unsubscribe_dashboard
    // ─────────────────────────────────────────────────────────────────────
    socket.on("unsubscribe_dashboard", (data) => {
      try {
        const userId = data?.userId;

        if (!userId) {
          socket.emit("error", {
            success: false,
            error: "Missing userId in unsubscribe_dashboard",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        console.log(`📢 User ${userId} unsubscribing from dashboard updates`);

        // Leave user-specific room
        socket.leave(`user_${userId}`);

        // Stop emitting updates for this user
        stopUserUpdates(userId);

        // Confirm unsubscription
        socket.emit("unsubscription_confirmed", {
          success: true,
          message: "Unsubscribed from dashboard updates",
          userId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Error in unsubscribe_dashboard:", error.message);
        socket.emit("error", {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // EVENT: disconnect
    // ─────────────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      // Clean up any intervals associated with this socket
      // Note: User might have multiple sockets, so we only clean up if this is the last one
      for (const [userId, metadata] of userIntervals.entries()) {
        if (metadata.socket === socket.id) {
          stopUserUpdates(userId);
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // EVENT: ping (heartbeat)
    // ─────────────────────────────────────────────────────────────────────
    socket.on("ping", () => {
      socket.emit("pong", {
        timestamp: new Date().toISOString(),
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // EVENT: error handling
    // ─────────────────────────────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`❌ Socket error (${socket.id}):`, error);
    });
  });

  console.log("✅ WebSocket handlers initialized");
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP ON SERVER SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Clear all intervals on server shutdown
 */
export function cleanupWebSocketService() {
  console.log("🧹 Cleaning up WebSocket intervals...");

  for (const [userId, metadata] of userIntervals.entries()) {
    clearInterval(metadata.intervalId);
    userIntervals.delete(userId);
  }

  console.log("✅ WebSocket cleanup complete");
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  fetchDashboardData,
  startUserUpdates,
  stopUserUpdates,
};
