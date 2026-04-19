// ✅ Environment variables are already loaded in index.js
// This file exports them as getters so they're read from process.env at access time

// ✅ Validate required environment variables when accessed
const env = {
  get PORT() {
    return process.env.PORT || 5000;
  },
  get DATABASE_URL() {
    const dbUrl = process.env.DATABASE_URL;
    console.log("[env.js getter] DATABASE_URL =", dbUrl ? "✓ SET" : "❌ NOT SET");
    return dbUrl;
  },
  get JWT_SECRET() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("❌ JWT_SECRET must be set in environment variables");
    }
    return secret;
  },
  get JWT_EXPIRES_IN() {
    return process.env.JWT_EXPIRES_IN || "7d";
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || "development";
  },
};

export default env;