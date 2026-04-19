# Riskfolio-AI Backend Comprehensive Audit Report

**Date:** April 18, 2026  
**Audit Scope:** Complete backend validation (Node.js/Express + PostgreSQL)  
**Database Status:** ⚠️ Not connected (hardcoded credentials, database may not exist)  
**Server Status:** ✅ Running on port 5000 with mock data fallback

---

## 🔴 SECTION 1: CRITICAL ISSUES (Blocking Backend Functionality)

### 1.1 **CRITICAL: Database Export Inconsistency**
**File:** `server/config/db.js`  
**Severity:** 🔴 CRITICAL  
**Problem:**
- `db.js` exports `connectDB` as default and `pool` as named export
- `userRepository.js` imports `pool` as default: `import pool from "../config/db.js"`
- This creates undefined behavior - `pool` will be the `connectDB` function, not the Pool instance
- All user repository queries will fail with "pool.query is not a function"

**Current Code (WRONG):**
```javascript
// db.js
export default connectDB;
export { pool };

// userRepository.js
import pool from "../config/db.js"; // ❌ Gets connectDB function, not pool
```

**Fix Required:**
```javascript
// db.js - Change export order
export { pool };
export default connectDB;

// assetRepository.js - Same issue
import { pool } from "../config/db.js"; // ✅ Use named import
```

**Impact:** Registration fails, all portfolio operations fail, authentication partially works (login doesn't use DB operations)

---

### 1.2 **CRITICAL: Hardcoded Database Credentials**
**File:** `server/config/db.js`  
**Severity:** 🔴 CRITICAL (Security)  
**Problem:**
```javascript
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Crypto_db",
  password: "harsh",  // ❌ Hardcoded password in code
  port: 5432,
});
```
- Credentials exposed in git history
- No use of environment variables
- Password visible in code

**Fix Required:**
```javascript
import env from "./env.js";

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Crypto_db",
  password: process.env.DB_PASSWORD,  // From .env only
  port: process.env.DB_PORT || 5432,
});
```

**Update .env:**
```
DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
```

---

### 1.3 **CRITICAL: Missing Database Schema**
**Status:** 🔴 CRITICAL  
**Problem:**
- No `schema.sql` file found or verified
- Tables `users`, `transactions`, `assets` assumed but not confirmed
- No migrations system in place
- Database connection fails with error: "database connection failed, but continuing in development mode"

**What's Missing:**
```sql
-- schema.sql (MUST CREATE)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  coingecko_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  quantity DECIMAL(20, 8) NOT NULL,
  price_at_transaction DECIMAL(20, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_assets_symbol ON assets(symbol);
```

---

### 1.4 **CRITICAL: Missing Authentication for Transactions**
**File:** `server/routes/transactionRoutes.js`  
**Problem:** Transaction controller doesn't validate that user owns the transaction being updated/deleted
```javascript
// transactionController.js - Vulnerable code
export async function updateTransaction(req, res) {
  const { id } = req.params; // User could modify ANY transaction
  // Missing: verify req.user.userId owns this transaction
}
```

**Fix Required:** Add user ownership verification
```javascript
export async function updateTransaction(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  const transaction = await transactionRepository.getTransactionById(userId, id);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found"
    });
  }
  // Proceed with update...
}
```

---

## 🟠 SECTION 2: MAJOR ISSUES (Break Functionality/Security)

### 2.1 **MAJOR: Risk Calculation Has Issues**
**File:** `server/services/riskService.js`  
**Severity:** 🟠 MAJOR (Incorrect calculations)  
**Problems:**
1. `calculateVolatility()` uses daily simple returns but doesn't annualize (returns are in decimal form, not %)
2. `calculateMaxDrawdown()` returns raw decimal but labeled as percentage in frontend
3. Risk score formula `volatility * 0.6 + drawdown * 0.4` mixes different scales

**Current (WRONG):**
```javascript
function calculateVolatility(prices) {
  // Returns ~0.02 for 2% daily volatility
  // Should be annualized: 0.02 * Math.sqrt(365) ≈ 0.38 (38% annual)
  return Math.sqrt(variance); // ❌ Not annualized
}

function calculateMaxDrawdown(prices) {
  return maxDrawdown; // Returns 0.28 (meaning 28% but treated as 28 in score)
}
```

**Fix Required:**
```javascript
function calculateVolatility(prices) {
  // ... calculate daily returns ...
  const dailyVol = Math.sqrt(variance);
  return dailyVol * Math.sqrt(365) * 100; // ✅ Annualized %, returns ~38
}

function calculateMaxDrawdown(prices) {
  // ... calculate drawdown ...
  return (maxDrawdown * 100); // ✅ Return as percentage: 28
}

export async function getPortfolioRisk(userId) {
  // ...
  const riskScore = (portfolioVolatility * 0.6) + (portfolioDrawdown * 0.4);
  // ✅ Both now in same scale (%)
}
```

**Impact:** Frontend displays incorrect risk metrics

---

### 2.2 **MAJOR: Portfolio P&L Not Accounting for Realized Gains**
**File:** `server/services/portfolioService.js`  
**Problem:** 
- Only tracks unrealized P&L (current value - cost basis)
- Doesn't calculate realized P&L from SELL transactions
- `getPortfolioPerformance()` returns `realizedPnL: 0` hardcoded

**Missing Logic:**
```javascript
export async function getRealizedPnL(userId) {
  const transactions = await transactionRepository.getTransactionsByUser(userId);
  
  let realizedPnL = 0;
  const costBasisMap = new Map(); // Track cost basis per asset
  
  for (const tx of transactions) {
    const { asset_id, type, quantity, price_at_transaction } = tx;
    
    if (type === "BUY") {
      const current = costBasisMap.get(asset_id) || 0;
      costBasisMap.set(asset_id, current + (quantity * price_at_transaction));
    } else if (type === "SELL") {
      const costBasis = costBasisMap.get(asset_id) || 0;
      const avgCost = costBasis / quantity;
      realizedPnL += (quantity * price_at_transaction) - (quantity * avgCost);
    }
  }
  
  return realizedPnL;
}
```

**Impact:** Performance metrics are incomplete

---

### 2.3 **MAJOR: No Input Validation for Quantity/Price**
**File:** `server/controllers/transactionController.js`  
**Problem:**
```javascript
if (quantity <= 0 || price <= 0) {
  // Validation exists, but doesn't prevent:
  // - Negative quantities after normalization
  // - Floating point errors (e.g., 0.0000001)
  // - Excessive precision (e.g., 99999.99999999)
}
```

**Fix Required:**
```javascript
if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
  return res.status(400).json({ message: "Invalid quantity or price" });
}

if (quantity <= 0 || price <= 0) {
  return res.status(400).json({ message: "Quantity and price must be positive" });
}

// Limit precision to 8 decimals for crypto, 2 for fiat
if (quantity > Math.pow(10, 18)) {
  return res.status(400).json({ message: "Quantity exceeds maximum" });
}

if (!/^\d+(\.\d{1,8})?$/.test(quantity.toString())) {
  return res.status(400).json({ message: "Quantity has too many decimal places" });
}
```

---

### 2.4 **MAJOR: Race Condition in Transaction SELL**
**File:** `server/repositories/transactionRepository.js`  
**Problem:**
- No check if user has enough quantity to SELL
- Multiple concurrent SELL requests could overdraw holdings

**Current (VULNERABLE):**
```javascript
export async function createTransaction(userId, assetId, type, quantity, price) {
  await client.query("BEGIN");
  
  // Insert transaction without checking balance
  const result = await client.query(
    `INSERT INTO transactions ...`,
    [userId, assetId, type, quantity, price]
  );
  
  await client.query("COMMIT");
  // ❌ No balance validation
}
```

**Fix Required:**
```javascript
export async function createTransaction(userId, assetId, type, quantity, price) {
  await client.query("BEGIN");
  
  if (type === "SELL") {
    // Lock and check balance
    const balance = await client.query(
      `SELECT COALESCE(SUM(CASE 
        WHEN type = 'BUY' THEN quantity 
        WHEN type = 'SELL' THEN -quantity 
        ELSE 0 END), 0) as holdings
       FROM transactions 
       WHERE user_id = $1 AND asset_id = $2
       FOR UPDATE`,
      [userId, assetId]
    );
    
    if (balance.rows[0].holdings < quantity) {
      await client.query("ROLLBACK");
      throw new Error("Insufficient holdings to sell");
    }
  }
  
  const result = await client.query(`INSERT INTO transactions ...`);
  await client.query("COMMIT");
}
```

---

### 2.5 **MAJOR: Missing CORS for Preflight Requests**
**File:** `server/index.js`  
**Problem:**
- CORS configured but app doesn't handle OPTIONS method explicitly
- Complex requests (with Authorization header) need preflight handling

**Current (INCOMPLETE):**
```javascript
app.use(cors({
  origin: [...],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
// ✅ Actually, this IS correct - cors() handles OPTIONS automatically
```

**Status:** ✅ This is actually OK, `cors()` handles it

---

### 2.6 **MAJOR: JWT Secret Exposed in Console**
**File:** `server/config/env.js`  
**Problem:**
```javascript
get JWT_SECRET() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("❌ JWT_SECRET must be set in environment variables");
  }
  return secret;
}
```

**Fix:** Never throw errors that expose where secrets should come from
```javascript
get JWT_SECRET() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("FATAL: Missing JWT_SECRET configuration");
    process.exit(1);
  }
  return secret;
}
```

---

## 🟡 SECTION 3: MISCONFIGURATIONS

### 3.1 **MISCONFIGURATION: Database Connection Not Required to Start**
**File:** `server/index.js`  
**Problem:**
```javascript
try {
  await connectDB(); // Connection fails
  console.log("✅ Database connection successful");
} catch (dbError) {
  console.warn("⚠️  Database connection failed, but continuing...");
  // ❌ Server continues even if DB is down!
}

app.listen(env.PORT, () => {
  // Server starts even with no DB
});
```

**Risk:** Operations silently fail, users see 500 errors without understanding why

**Fix:**
```javascript
try {
  await connectDB();
  console.log("✅ Database connected");
} catch (dbError) {
  console.error("❌ FATAL: Cannot start server without database");
  console.error(dbError);
  process.exit(1);
}
```

---

### 3.2 **MISCONFIGURATION: Missing Request ID/Tracing**
**File:** `server/index.js`  
**Problem:** No request IDs for correlating logs across microservices (future-proofing)

**Fix:**
```javascript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

### 3.3 **MISCONFIGURATION: No Rate Limiting**
**File:** Missing entirely  
**Problem:**
- No protection against brute force attacks on `/api/auth/login`
- No protection against API abuse
- CoinGecko API calls not rate limited

**Missing Middleware:**
```bash
npm install express-rate-limit
```

**Implementation:**
```javascript
import rateLimit from 'express-rate-limit';

// Login rate limit: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, authController.login);

// General API limit: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', apiLimiter);
```

---

### 3.4 **MISCONFIGURATION: No Helmet.js (Security Headers)**
**File:** Missing entirely  
**Problem:** No security headers (X-Frame-Options, X-Content-Type-Options, etc.)

**Missing Dependency:**
```bash
npm install helmet
```

**Implementation:**
```javascript
import helmet from 'helmet';
app.use(helmet());
```

---

### 3.5 **MISCONFIGURATION: Error Responses Inconsistent**
**Problem:** Different response formats across controllers

**Current (INCONSISTENT):**
```javascript
// authController.js
res.json({ data: { token }, message: "..." });

// portfolioController.js
res.json({ success: true, data: holdings });

// transactionController.js
res.json({ success: false, message: "..." });
```

**Fix:** Use consistent format everywhere
```javascript
// standardResponse.js
export function success(res, statusCode, data, message) {
  res.status(statusCode).json({
    success: true,
    data,
    message
  });
}

export function error(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    error: message
  });
}

// Usage
success(res, 200, holdings, "Holdings retrieved");
error(res, 401, "Invalid credentials");
```

---

## 🔵 SECTION 4: MISSING FEATURES

### 4.1 **MISSING: Logout Endpoint**
**File:** `server/routes/authRoutes.js`  
**Problem:** No `/api/auth/logout` endpoint (though logout is client-side only, having one helps with future token blacklisting)

---

### 4.2 **MISSING: Password Reset/Forgot Password**
**File:** Not implemented  
**Problem:** Users can't reset forgotten passwords

---

### 4.3 **MISSING: User Profile Endpoint**
**File:** Not implemented  
**Problem:** No way to fetch current user info or update profile

---

### 4.4 **MISSING: Asset Auto-Creation**
**File:** `server/controllers/transactionController.js`  
**Problem:**
```javascript
const assets = await assetRepository.getAssetBySymbol(asset);
if (!assets) {
  return res.status(404).json({
    success: false,
    message: `Asset ${asset} not found. Please create asset first.`, // ❌ User can't create
  });
}
```

**Fix:** Auto-create asset with CoinGecko lookup
```javascript
let asset = await assetRepository.getAssetBySymbol(assetSymbol);

if (!asset) {
  // Try to fetch from CoinGecko
  const coingeckoId = await priceService.getCoingeckoId(assetSymbol);
  if (!coingeckoId) {
    return res.status(404).json({
      error: `Asset ${assetSymbol} not found on CoinGecko`
    });
  }
  
  asset = await assetRepository.createAsset(
    assetSymbol,
    assetSymbol, // name
    coingeckoId
  );
}
```

---

### 4.5 **MISSING: Transaction History Pagination**
**File:** `server/repositories/transactionRepository.js`  
**Problem:** Returns ALL transactions (scalability issue)

**Fix:**
```javascript
export async function getTransactionsByUser(userId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  const result = await pool.query(
    `SELECT id, user_id, asset_id, type, quantity, price_at_transaction, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  const count = await pool.query(
    `SELECT COUNT(*) FROM transactions WHERE user_id = $1`,
    [userId]
  );
  
  return {
    data: result.rows,
    total: parseInt(count.rows[0].count),
    page,
    pages: Math.ceil(count.rows[0].count / limit)
  };
}
```

---

### 4.6 **MISSING: Dividend/Staking Income Tracking**
**File:** Not implemented  
**Problem:** Only tracks BUY/SELL, no income transactions

---

### 4.7 **MISSING: Portfolio Historical Snapshots**
**File:** Not implemented  
**Problem:** Can't see portfolio value over time (only current state)

---

## ✅ SECTION 5: RECOMMENDED FIXES (Priority Order)

### **PRIORITY 1: Critical (Do First)**

#### Fix 1.1: Export Pool Correctly
**File:** `server/config/db.js`
```javascript
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Crypto_db",
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

export { pool }; // ✅ Named export
export default connectDB;
```

#### Fix 1.2: Update Repositories
**File:** `server/repositories/userRepository.js`
```javascript
import { pool } from "../config/db.js"; // ✅ Change to named import

export async function createUser(email, passwordHash) {
  const result = await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
    [email, passwordHash]
  );
  return result.rows[0];
}
```

**File:** `server/repositories/assetRepository.js`
```javascript
import { pool } from "../config/db.js"; // ✅ Change to named import
```

#### Fix 1.3: Update .env
```
PORT=5000
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey
JWT_EXPIRES_IN=7d
NODE_ENV=development

DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
```

#### Fix 1.4: Create Database Schema
**File:** `server/config/schema.sql`
```sql
-- See schema in section 1.3 above
```

**Run schema:**
```bash
psql -U postgres -d Crypto_db -a -f server/config/schema.sql
```

#### Fix 1.5: Require Database on Startup
**File:** `server/index.js`
```javascript
const startServer = async () => {
  try {
    // Database is REQUIRED
    await connectDB();
    console.log("✅ Database connection successful");

    app.listen(env.PORT, () => {
      console.log(`✅ Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ FATAL: Failed to start server:", error.message);
    process.exit(1);
  }
};
```

---

### **PRIORITY 2: Security (Do Second)**

#### Fix 2.1: Add Rate Limiting
**File:** `server/index.js`
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts"
});

app.post('/api/auth/login', authLimiter, authController.login);
app.post('/api/auth/register', authLimiter, authController.register);
```

#### Fix 2.2: Add Helmet.js
```bash
npm install helmet
```

```javascript
import helmet from 'helmet';
app.use(helmet());
```

#### Fix 2.3: Add Transaction Ownership Validation
**File:** `server/controllers/transactionController.js`
```javascript
export async function updateTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { type, quantity, price } = req.body;

    // ✅ Verify ownership
    const transaction = await transactionRepository.getTransactionById(userId, id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    const updated = await transactionRepository.updateTransaction(userId, id, type, quantity, price);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

---

### **PRIORITY 3: Major Bugs (Do Third)**

#### Fix 3.1: Fix Risk Calculations
**File:** `server/services/riskService.js`
```javascript
function calculateVolatility(prices) {
  if (!prices || prices.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] === 0) continue;
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, r) => a + r, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  
  // ✅ Annualize and convert to percentage
  return (dailyVol * Math.sqrt(365) * 100);
}

function calculateMaxDrawdown(prices) {
  if (!prices || prices.length === 0) return 0;

  let peak = prices[0];
  let maxDrawdown = 0;

  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > peak) peak = prices[i];
    const drawdown = peak === 0 ? 0 : (peak - prices[i]) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // ✅ Return as percentage
  return (maxDrawdown * 100);
}
```

#### Fix 3.2: Add Input Validation
**File:** `server/controllers/transactionController.js`
```javascript
export async function createTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { asset, type, quantity, price } = req.body;

    // ✅ Enhanced validation
    if (!asset || !type || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      return res.status(400).json({
        success: false,
        message: "Quantity and price must be numbers"
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity and price must be positive"
      });
    }

    if (quantity > Math.pow(10, 18)) {
      return res.status(400).json({
        success: false,
        message: "Quantity too large"
      });
    }

    // Proceed...
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
```

#### Fix 3.3: Prevent SELL Overdraft
**File:** `server/repositories/transactionRepository.js`
```javascript
export async function createTransaction(userId, assetId, type, quantity, price) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (type === "SELL") {
      // ✅ Check balance with row lock
      const balance = await client.query(
        `SELECT COALESCE(SUM(CASE 
          WHEN type = 'BUY' THEN quantity 
          WHEN type = 'SELL' THEN -quantity 
          ELSE 0 END), 0) as holdings
         FROM transactions 
         WHERE user_id = $1 AND asset_id = $2
         FOR UPDATE`,
        [userId, assetId]
      );

      const holdings = parseFloat(balance.rows[0].holdings);
      if (holdings < quantity) {
        await client.query("ROLLBACK");
        throw new Error(`Insufficient holdings. Have: ${holdings}, Trying to sell: ${quantity}`);
      }
    }

    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, asset_id, type, quantity, price_at_transaction)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, assetId, type, quantity, price]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

---

### **PRIORITY 4: Enhancements (Nice to Have)**

#### Fix 4.1: Consistent Response Format
Create `server/utils/response.js`:
```javascript
export const success = (data, message = "Success") => ({
  success: true,
  data,
  message
});

export const error = (message, statusCode = 500) => ({
  success: false,
  error: message,
  statusCode
});
```

#### Fix 4.2: Auto-Create Assets
```javascript
export async function createTransaction(req, res) {
  try {
    const { asset, type, quantity, price } = req.body;
    
    // ✅ Auto-create asset
    let assetRecord = await assetRepository.getAssetBySymbol(asset);
    
    if (!assetRecord) {
      try {
        const coingeckoId = await priceService.getCoingeckoId(asset);
        assetRecord = await assetRepository.createAsset(asset, asset, coingeckoId);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: `Asset ${asset} not found`
        });
      }
    }
    
    // Continue with transaction...
  } catch (error) {
    // ...
  }
}
```

---

## 📊 SUMMARY TABLE

| Issue | Severity | File | Fix Time | Impact |
|-------|----------|------|----------|--------|
| Pool export error | 🔴 CRITICAL | db.js, repositories | 5 min | Backend completely non-functional |
| Hardcoded credentials | 🔴 CRITICAL | db.js | 10 min | Security breach |
| Missing schema | 🔴 CRITICAL | schema.sql | 20 min | No database |
| Vulnerable SELL | 🟠 MAJOR | transactionRepository | 30 min | Users can overdraft |
| Risk calculation | 🟠 MAJOR | riskService | 20 min | Wrong metrics |
| No rate limiting | 🟠 MAJOR | index.js | 10 min | Brute force attacks possible |
| No Helmet | 🟠 MAJOR | index.js | 5 min | Missing security headers |
| DB optional startup | 🟡 MISCONFIGURATION | index.js | 10 min | Silent failures |
| Input validation weak | 🟡 MISCONFIGURATION | transactionController | 15 min | Type errors possible |

---

## 🎯 NEXT STEPS

1. ✅ **TODAY:** Fix db.js exports (Priority 1.1-1.2)
2. ✅ **TODAY:** Create and run schema.sql (Priority 1.4)
3. ✅ **TODAY:** Update .env (Priority 1.3)
4. ✅ **TOMORROW:** Add rate limiting & Helmet (Priority 2.1-2.2)
5. ✅ **TOMORROW:** Fix SELL overdraft (Priority 3.3)
6. ✅ **THIS WEEK:** Fix risk calculations (Priority 3.1)
7. ✅ **THIS WEEK:** Enhance input validation (Priority 3.2)

---

**Report Generated:** April 18, 2026  
**Status:** Backend partially functional (auth works, portfolio/risk will fail due to db.js bug)
