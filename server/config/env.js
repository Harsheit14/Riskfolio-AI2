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
    return process.env.JWT_SECRET || "default-secret-key";
  },
};

export default env;