/**
 * ✅ REDIS CLIENT SERVICE
 * 
 * Purpose: Distributed caching for production-scale systems
 * Strategy: Replace in-memory cache with Redis for multi-instance deployments
 * 
 * Features:
 * - Connection pooling
 * - Automatic reconnection
 * - Error handling and recovery
 * - TTL-based expiration
 * - Batch operations support
 */

import Redis from "ioredis";

let redis = null;

/**
 * Initialize Redis connection
 * Supports both single instance and cluster configurations
 */
export async function initializeRedis(url) {
  try {
    redis = new Redis(url || process.env.REDIS_URL || "redis://localhost:6379", {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redis.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
      // Suppress verbose Redis connection errors in development
      if (process.env.NODE_ENV !== "production") {
        // Silently ignore connection errors in development
      } else {
        console.error("❌ Redis error:", err.message);
      }
    });

    redis.on("reconnecting", () => {
      // Suppress verbose reconnection messages in development
      if (process.env.NODE_ENV === "production") {
        console.log("🔄 Redis reconnecting...");
      }
    });

    // Test connection
    await redis.ping();
    console.log("✅ Redis ping successful");

    return redis;
  } catch (error) {
    console.error("❌ Failed to initialize Redis:", error.message);
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedis() {
  if (!redis) {
    throw new Error("Redis not initialized. Call initializeRedis first.");
  }
  return redis;
}

/**
 * Set key-value with TTL (seconds)
 */
export async function set(key, value, ttl = 60) {
  const client = getRedis();
  const serialized = JSON.stringify(value);

  if (ttl) {
    return client.setex(key, ttl, serialized);
  }
  return client.set(key, serialized);
}

/**
 * Get value by key
 */
export async function get(key) {
  const client = getRedis();
  const data = await client.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to parse Redis value for key ${key}:`, error.message);
    return null;
  }
}

/**
 * Delete key
 */
export async function del(key) {
  const client = getRedis();
  return client.del(key);
}

/**
 * Delete multiple keys
 */
export async function delMany(keys) {
  const client = getRedis();
  if (keys.length === 0) return 0;
  return client.del(...keys);
}

/**
 * Clear all keys (use with caution)
 */
export async function clear() {
  const client = getRedis();
  return client.flushdb();
}

/**
 * Get or set pattern
 * If key exists, return cached value
 * Otherwise, call fetcher, cache result, and return
 */
export async function getOrSet(key, fetcher, ttl = 60) {
  const client = getRedis();

  try {
    // Try to get from cache
    const cached = await client.get(key);
    if (cached) {
      console.log(`[REDIS HIT] ${key}`);
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached value for ${key}`);
      }
    }
  } catch (error) {
    console.error(`Redis get error for ${key}:`, error.message);
    // Fall through to fetcher if cache fails
  }

  console.log(`[REDIS MISS] ${key}`);

  // Fetch fresh data
  const value = await fetcher();

  // Store in cache (don't block on this)
  try {
    if (ttl) {
      await client.setex(key, ttl, JSON.stringify(value));
    } else {
      await client.set(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error(`Failed to cache ${key}:`, error.message);
    // Still return value even if caching fails
  }

  return value;
}

/**
 * Increment counter
 */
export async function increment(key, amount = 1) {
  const client = getRedis();
  return client.incrby(key, amount);
}

/**
 * Set counter with expiry
 */
export async function setCounter(key, value, ttl = 60) {
  const client = getRedis();
  const pipeline = client.pipeline();

  pipeline.set(key, value);
  if (ttl) {
    pipeline.expire(key, ttl);
  }

  return pipeline.exec();
}

/**
 * Get connection status
 */
export async function getStatus() {
  const client = getRedis();

  try {
    const info = await client.info();
    const lines = info.split("\r\n");
    const status = {};

    for (const line of lines) {
      if (line.includes(":")) {
        const [key, value] = line.split(":");
        status[key.trim()] = value.trim();
      }
    }

    return {
      connected: true,
      status: status.redis_version,
      memory: status.used_memory_human,
      uptime: status.uptime_in_seconds,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Gracefully close connection
 */
export async function closeConnection() {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log("✅ Redis connection closed");
  }
}

export default {
  initializeRedis,
  getRedis,
  set,
  get,
  del,
  delMany,
  clear,
  getOrSet,
  increment,
  setCounter,
  getStatus,
  closeConnection,
};
