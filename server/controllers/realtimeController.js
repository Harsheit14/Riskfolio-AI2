/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 6: REAL-TIME STREAMING CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Server-Sent Events (SSE) for real-time portfolio updates
 * Features:
 * - Efficient streaming with 10-15 second updates
 * - Automatic client reconnection support
 * - Per-user data isolation
 * - Resource cleanup on disconnect
 * 
 * Server-Sent Events Benefits:
 * - One-way communication (server → client)
 * - Automatic reconnection
 * - Built-in retry mechanism
 * - Lower overhead than WebSockets for this use case
 * - Works with existing HTTP infrastructure
 * 
 * @module realtimeController
 */

import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";
import * as portfolioService from "../services/portfolioService.js";
import * as priceServiceOptimized from "../services/priceServiceOptimized.js";

/**
 * Active SSE connections
 * Structure: { userId: { clientId: response, lastUpdate: timestamp } }
 */
const activeConnections = new Map();

/**
 * Streaming intervals per user
 * Prevents duplicate intervals when multiple clients connect
 */
const streamingIntervals = new Map();

const STREAM_INTERVAL = 15000; // 15 seconds between updates
const STREAM_TIMEOUT = 60000; // 60 seconds before marking stale
const SSE_RETRY_TIMEOUT = 5000; // Client reconnect after 5 seconds

/**
 * Cleanup resources for a user
 * @private
 */
function cleanupUserResources(userId) {
  if (streamingIntervals.has(userId)) {
    clearInterval(streamingIntervals.get(userId));
    streamingIntervals.delete(userId);
  }

  activeConnections.delete(userId);
}

/**
 * Send SSE message to client
 * @private
 */
function sendSSEMessage(response, event, data) {
  try {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    console.warn("⚠️  Failed to send SSE message:", error.message);
  }
}

/**
 * Format portfolio data for streaming
 * @private
 */
async function formatPortfolioSnapshot(userId) {
  try {
    const portfolio = await portfolioService.getPortfolioValue(userId);

    return {
      timestamp: new Date().toISOString(),
      portfolio: {
        totalValue: portfolio.totalValue,
        totalInvested: portfolio.totalInvested,
        pnl: portfolio.pnl,
        pnlPercentage: portfolio.pnlPercentage,
        assetCount: portfolio.assets.length,
      },
      assets: portfolio.assets.map((asset) => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        currentPrice: asset.currentPrice,
        currentValue: asset.currentValue,
        pnl: asset.pnl,
        pnlPercentage: asset.pnlPercentage,
      })),
    };
  } catch (error) {
    console.warn(`⚠️  Failed to format portfolio snapshot: ${error.message}`);
    return null;
  }
}

/**
 * GET /api/dashboard/stream
 * 
 * Stream real-time portfolio updates via Server-Sent Events
 * 
 * Usage (Frontend):
 * ```javascript
 * const eventSource = new EventSource('/api/dashboard/stream');
 * 
 * eventSource.addEventListener('portfolio', (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Portfolio updated:', data);
 * });
 * 
 * eventSource.addEventListener('error', () => {
 *   console.log('Connection lost, will retry...');
 * });
 * ```
 * 
 * Response Format (SSE):
 * ```
 * event: portfolio
 * data: {
 *   "timestamp": "2026-04-18T14:05:30Z",
 *   "portfolio": {
 *     "totalValue": 150000,
 *     "pnl": 5000,
 *     ...
 *   },
 *   "assets": [...]
 * }
 * ```
 * 
 * Features:
 * - Automatic updates every 15 seconds
 * - Automatic reconnection (browser handles it)
 * - Per-user data isolation
 * - Graceful error handling
 * - Resource cleanup on disconnect
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function streamPortfolioUpdates(req, res) {
  const userId = req.user.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "User ID not found",
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 1: Setup SSE Response Headers
  // ════════════════════════════════════════════════════════════════════════

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Longer timeout for streaming endpoint
  req.setTimeout(0); // Disable timeout
  res.setTimeout(0);

  // ════════════════════════════════════════════════════════════════════════
  // STEP 2: Send Initial Connection Confirmation
  // ════════════════════════════════════════════════════════════════════════

  sendSSEMessage(res, "connected", {
    message: "Streaming started",
    timestamp: new Date().toISOString(),
    updateInterval: STREAM_INTERVAL,
  });

  // ════════════════════════════════════════════════════════════════════════
  // STEP 3: Setup Connection Tracking
  // ════════════════════════════════════════════════════════════════════════

  const clientId = Math.random().toString(36).substr(2, 9);

  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, {});
  }

  const userConnections = activeConnections.get(userId);
  userConnections[clientId] = {
    response: res,
    connectedAt: Date.now(),
  };

  // ════════════════════════════════════════════════════════════════════════
  // STEP 4: Start Streaming Interval (only if not already running)
  // ════════════════════════════════════════════════════════════════════════

  if (!streamingIntervals.has(userId)) {
    const interval = setInterval(async () => {
      try {
        const snapshot = await formatPortfolioSnapshot(userId);

        if (snapshot) {
          // Send to all connected clients for this user
          const connections = activeConnections.get(userId);

          if (connections) {
            for (const [, connection] of Object.entries(connections)) {
              sendSSEMessage(connection.response, "portfolio", snapshot);
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Streaming error for user ${userId}: ${error.message}`);

        // Send error event to clients
        const connections = activeConnections.get(userId);
        if (connections) {
          for (const [, connection] of Object.entries(connections)) {
            sendSSEMessage(connection.response, "error", {
              message: "Failed to fetch portfolio update",
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }, STREAM_INTERVAL);

    streamingIntervals.set(userId, interval);
  }

  // ════════════════════════════════════════════════════════════════════════
  // STEP 5: Handle Client Disconnect
  // ════════════════════════════════════════════════════════════════════════

  req.on("close", () => {
    const connections = activeConnections.get(userId);

    if (connections) {
      delete connections[clientId];

      // If no more connections, cleanup
      if (Object.keys(connections).length === 0) {
        cleanupUserResources(userId);
        console.log(`📊 SSE stream closed for user ${userId} (no active connections)`);
      } else {
        console.log(`📊 SSE client ${clientId} disconnected (${Object.keys(connections).length} remaining)`);
      }
    }
  });

  // Handle request errors
  req.on("error", (error) => {
    console.warn(`⚠️  SSE request error for user ${userId}:`, error.message);
    const connections = activeConnections.get(userId);
    if (connections) {
      delete connections[clientId];
      if (Object.keys(connections).length === 0) {
        cleanupUserResources(userId);
      }
    }
  });

  console.log(`📊 SSE stream opened for user ${userId} (client: ${clientId})`);
}

/**
 * GET /api/dashboard/stream/health
 * 
 * Check health of streaming connections
 * Returns information about active streams for debugging
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export function getStreamHealth(req, res) {
  const userId = req.user.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  const userConnections = activeConnections.get(userId) || {};
  const hasStream = streamingIntervals.has(userId);

  const connections = Object.entries(userConnections).map(([clientId, conn]) => ({
    clientId,
    connectedAt: conn.connectedAt,
    uptime: Date.now() - conn.connectedAt,
  }));

  return res.status(200).json({
    success: true,
    data: {
      userId,
      activeConnections: Object.keys(userConnections).length,
      streamingActive: hasStream,
      updateInterval: STREAM_INTERVAL,
      connections,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Force cleanup of stale connections (administrative)
 * @private
 */
export function cleanupStaleConnections() {
  let cleaned = 0;
  const now = Date.now();

  for (const [userId, connections] of activeConnections.entries()) {
    for (const [clientId, conn] of Object.entries(connections)) {
      if (now - conn.connectedAt > STREAM_TIMEOUT) {
        try {
          conn.response.end();
        } catch {
          // Connection already closed
        }
        delete connections[clientId];
        cleaned++;
      }
    }

    if (Object.keys(connections).length === 0) {
      cleanupUserResources(userId);
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} stale SSE connections`);
  }

  return cleaned;
}

/**
 * Get global streaming statistics (admin endpoint)
 * @private
 */
export function getGlobalStreamStats() {
  let totalUsers = 0;
  let totalConnections = 0;

  for (const [, connections] of activeConnections.entries()) {
    totalUsers++;
    totalConnections += Object.keys(connections).length;
  }

  return {
    totalUsers,
    totalConnections,
    activeIntervals: streamingIntervals.size,
    updateInterval: STREAM_INTERVAL,
  };
}

/**
 * Graceful shutdown of all streams
 * Call this on server shutdown
 */
export function shutdownAllStreams() {
  console.log("🛑 Shutting down all SSE connections...");

  // Clear all intervals
  for (const [userId, interval] of streamingIntervals.entries()) {
    clearInterval(interval);
  }
  streamingIntervals.clear();

  // Close all connections
  for (const [userId, connections] of activeConnections.entries()) {
    for (const [, connection] of Object.entries(connections)) {
      try {
        connection.response.end();
      } catch (error) {
        console.warn(`⚠️  Error closing connection: ${error.message}`);
      }
    }
  }
  activeConnections.clear();

  console.log("✅ All SSE connections closed");
}

/**
 * Manual trigger to send update to all users
 * Useful for emergency broadcasts (e.g., price spike alert)
 * @private
 */
export async function broadcastUpdateToAllUsers(event, data) {
  console.log(`📢 Broadcasting event: ${event}`);

  let sent = 0;

  for (const [userId, connections] of activeConnections.entries()) {
    for (const [, connection] of Object.entries(connections)) {
      try {
        sendSSEMessage(connection.response, event, data);
        sent++;
      } catch (error) {
        console.warn(`⚠️  Failed to send broadcast: ${error.message}`);
      }
    }
  }

  console.log(`📊 Broadcast sent to ${sent} connections`);
  return sent;
}
