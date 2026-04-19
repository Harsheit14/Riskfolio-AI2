/**
 * ✅ RATE LIMITING MIDDLEWARE
 * 
 * Purpose: Prevent abuse and brute force attacks
 * Strategy: Track requests per IP, return 429 if exceeded
 * 
 * Rate Limits:
 * - Auth endpoints: 5 requests per 15 minutes
 * - API endpoints: 30 requests per 1 minute
 * - Global: 100 requests per 1 minute
 */

import rateLimit from "express-rate-limit";

// ═══════════════════════════════════════════════════════
// AUTH RATE LIMITER (strict)
// ═══════════════════════════════════════════════════════
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    error: "Too many authentication attempts. Please try again later.",
    status: 429,
  },
  standardHeaders: false, // Disable the `RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV !== "production",
});

// ═══════════════════════════════════════════════════════
// API RATE LIMITER (moderate)
// ═══════════════════════════════════════════════════════
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per windowMs
  message: {
    error: "Too many requests. Please slow down.",
    status: 429,
  },
  standardHeaders: false,
  skip: (req) => process.env.NODE_ENV !== "production",
});

// ═══════════════════════════════════════════════════════
// GLOBAL RATE LIMITER (lenient)
// ═══════════════════════════════════════════════════════
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  message: {
    error: "Rate limit exceeded. Please try again later.",
    status: 429,
  },
  standardHeaders: false,
  skip: (req) => process.env.NODE_ENV !== "production",
});

export default {
  authLimiter,
  apiLimiter,
  globalLimiter,
};
