# 🔍 COMPREHENSIVE CONFIGURATION & INTEGRATION AUDIT

**Project:** Riskfolio-AI  
**Date:** 17 April 2026  
**Auditor:** Senior Full-Stack Engineer

---

## ⚠️ SECTION 1: CRITICAL ISSUES (Must Fix Immediately)

### 🔴 Issue 1.1: PORT MISMATCH - Server and Client API URL Conflict

**Severity:** CRITICAL  
**Status:** 🔴 BLOCKING PRODUCTION

**Problem:**
- `server/.env`: PORT=**5000**
- `client/.env`: VITE_API_URL=http://localhost:**5001**/api
- `server/index.js`: Defaults to port from `env.PORT` which reads from `.env` as 5000
- **Actual runtime:** Backend currently running on 5001 (manual PORT=5001)

**Evidence:**
```
server/.env:              PORT=5000
client/.env:              VITE_API_URL=http://localhost:5001/api
server/config/env.js:     get PORT() { return process.env.PORT || 5000; }
```

**Impact:**
- Frontend will always try to connect to port 5001
- If server starts on port 5000 (as configured), requests fail
- Current setup only works because manual `PORT=5001` is used
- On production, this will fail without explicit PORT override

**Root Cause:**
After you fixed CORS and added the client .env, you changed the port to 5001 to avoid conflicts with macOS system services (ControlCenter on 5000), but:
1. Server `.env` still specifies PORT=5000
2. Client `.env` specifies port 5001
3. These are out of sync

**Fix:** Choose ONE port and use it consistently:

**Option A (Recommended): Use Port 5001 Everywhere**
```bash
# server/.env
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey

# client/.env  
VITE_API_URL=http://localhost:5001/api
```

**Option B: Use Port 5000 (Requires macOS fix)**
```bash
# server/.env
PORT=5000
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey

# client/.env
VITE_API_URL=http://localhost:5000/api

# Then restart: PORT=5000 node index.js (or handle ControlCenter conflict)
```

---

### 🔴 Issue 1.2: DEAD CODE - Unused apiClient.js File

**Severity:** CRITICAL (Code Confusion Risk)  
**Status:** 🔴 DANGEROUS

**Problem:**
```
Two competing API client files exist:
1. client/src/services/api.js      ← ✅ CORRECT (uses VITE_API_URL)
2. client/src/services/apiClient.js ← ❌ HARDCODED (uses localhost:5000)
```

**Evidence - apiClient.js:**
```javascript
// client/src/services/apiClient.js
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',  // ❌ HARDCODED, NOT ENV-BASED
  headers: {
    'Content-Type': 'application/json',
  },
});
export default apiClient;
```

**Evidence - api.js (Correct):**
```javascript
// client/src/services/api.js
import { API_BASE_URL } from "../constants/api";
const apiClient = axios.create({
  baseURL: API_BASE_URL,  // ✅ USES ENV VAR
  // ... interceptors included
});
export default apiClient;
```

**Which one is used?**
```
authService.js → imports from "./api" → Uses api.js (CORRECT) ✅
```

**Risk:**
- If someone accidentally imports from `apiClient.js`, requests go to hardcoded port 5000
- Codebase has duplicate, inconsistent implementations
- Future developers may use wrong file
- Dead code is technical debt

**Fix:** DELETE the old file

```bash
rm /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client/src/services/apiClient.js
```

---

### 🔴 Issue 1.3: DATABASE CREDENTIALS HARDCODED & EXPOSED

**Severity:** CRITICAL (Security)  
**Status:** 🔴 SECURITY RISK

**Problem:**
```javascript
// server/config/db.js
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Crypto_db",
  password: "harsh",  // ❌ HARDCODED IN SOURCE CODE
  port: 5432,
});
```

**Risks:**
1. Credentials visible in git history forever
2. Password exposed in repo if shared
3. If repo made public, database is compromised
4. Does NOT use `process.env` variables

**Should be:**
```javascript
// server/config/db.js
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Crypto_db",
  password: process.env.DB_PASSWORD,  // ✅ FROM ENV ONLY
  port: process.env.DB_PORT || 5432,
});
```

**Fix:** See Section 4 below.

---

## ⚠️ SECTION 2: MISCONFIGURATIONS

### 🟡 Issue 2.1: Inconsistent Port Configuration Pattern

**Severity:** HIGH (Maintainability)

**Problem:**
Backend port is read from `env.js` getter which reads `process.env.PORT`, but:

```javascript
// server/index.js
import env from "./config/env.js";
app.listen(env.PORT, () => { ... });

// server/config/env.js
const env = {
  get PORT() {
    return process.env.PORT || 5000;  // Fallback to 5000
  },
};
```

**Why it's confusing:**
- `.env` file says PORT=5000
- `env.js` defaults to 5000 if not in process.env
- But runtime PORT can be overridden via `PORT=5001 node index.js`
- Three different ways to set the port = ambiguous

**Impact:**
- Developer might change `.env` and forget PORT is overridden at runtime
- Documentation unclear about how to configure port
- Easy to introduce bugs with port mismatches

---

### 🟡 Issue 2.2: Missing Request Body Size Limit

**Severity:** MEDIUM (Security)

**Problem:**
```javascript
// server/index.js
app.use(express.json());
// ❌ NO SIZE LIMIT - Large requests can crash server
```

**Fix:**
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
```

---

### 🟡 Issue 2.3: CORS Configuration Too Permissive for Production

**Severity:** MEDIUM

**Current config:**
```javascript
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ],
  credentials: true,  // ⚠️ Credentials=true + specific origins is correct for dev
}));
```

**Issues:**
1. Only localhost origins (acceptable for dev)
2. But `credentials: true` requires specific origin, not wildcard (good)
3. No environment-based switching for production

**Fix for production:**
```javascript
const corsOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

---

### 🟡 Issue 2.4: Missing Error Handling for Undefined Environment Variables

**Severity:** MEDIUM

**Problem:**
```javascript
// server/config/env.js
get JWT_SECRET() {
  return process.env.JWT_SECRET || "default-secret-key";  // ❌ WEAK DEFAULT
}
```

**Risk:**
- If JWT_SECRET not in .env, falls back to weak hardcoded key
- No warning logged that this is happening
- Security risk if default is used in production

**Fix:**
```javascript
get JWT_SECRET() {
  if (!process.env.JWT_SECRET) {
    console.warn("⚠️ JWT_SECRET not set in .env, using insecure default");
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be set in production");
    }
  }
  return process.env.JWT_SECRET || "dev-key-change-me";
}
```

---

## 🔴 SECTION 3: MISSING IMPLEMENTATIONS

### ❌ Issue 3.1: No Request Validation Middleware

**Severity:** HIGH (Data Integrity)

**Missing:**
- No schema validation for request bodies
- Controller directly accesses `req.body` without validation
- Email format checked with regex, but no comprehensive validation

**Impact:**
- Invalid data gets processed
- No consistent error messages
- Database could receive malformed data

**Should implement:**
```bash
npm install joi  # or zod
```

---

### ❌ Issue 3.2: No Authentication Middleware

**Severity:** CRITICAL

**Missing:**
```javascript
// server/middleware/auth.js - DOES NOT EXIST
export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: "No token" });
  // Verify JWT...
};
```

**Current state:**
- Registration returns `mock-jwt-token` (hardcoded)
- No protected routes actually verify tokens
- Any endpoint can be called without auth

**Impact:**
- Entire auth system is fake/incomplete
- No actual security

---

### ❌ Issue 3.3: No Rate Limiting

**Severity:** HIGH (Security)

**Missing:**
- No rate limiting on `/api/auth/register`
- Can be brute-forced or abused

**Should add:**
```bash
npm install express-rate-limit
```

---

### ❌ Issue 3.4: No Input Sanitization

**Severity:** MEDIUM (Security)

**Missing:**
- Email not trimmed/lowercased
- Password length not checked
- No SQL injection protection (though using parameterized queries would help)

---

### ❌ Issue 3.5: No Logging Framework

**Severity:** MEDIUM (Observability)

**Current:**
- Manual `console.log()` statements scattered everywhere
- No structured logging
- No log levels (debug, info, warn, error)
- No log aggregation for production

**Should use:**
```bash
npm install winston  # or pino
```

---

### ❌ Issue 3.6: No Error Boundaries in Frontend

**Severity:** LOW

**Missing:**
- React Error Boundaries not implemented
- Uncaught errors crash entire app

---

## ✅ SECTION 4: RECOMMENDED FIXES (With Code)

### Fix 1: Resolve Port Configuration (CRITICAL)

**File: `server/.env`**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey
DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
```

**File: `client/.env`**
```properties
VITE_API_URL=http://localhost:5001/api
```

**Verify:** Both use 5001

---

### Fix 2: Delete Dead Code (CRITICAL)

```bash
rm /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client/src/services/apiClient.js
```

---

### Fix 3: Secure Database Configuration (CRITICAL)

**File: `server/config/db.js`**

**Replace hardcoded credentials:**
```javascript
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Crypto_db",
  password: process.env.DB_PASSWORD,  // ✅ NO DEFAULT - MUST BE SET
  port: parseInt(process.env.DB_PORT || "5432"),
  // Connection pool options
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    if (process.env.NODE_ENV === "production") {
      throw error;  // Fail in production if DB can't connect
    }
    console.warn("⚠️ Continuing in development mode without database");
  }
};

export default connectDB;
export { pool };
```

---

### Fix 4: Add Request Size Limits (HIGH)

**File: `server/index.js`**

Add after `import cors from "cors";`:
```javascript
// Body size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
```

---

### Fix 5: Environment-Based CORS Configuration (HIGH)

**File: `server/index.js`**

Replace CORS config:
```javascript
const corsOrigins = 
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL || "https://riskfolio.example.com"]
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
      ];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
}));
```

---

### Fix 6: Improve Environment Variable Validation (MEDIUM)

**File: `server/config/env.js`**

```javascript
const env = {
  get PORT() {
    const port = process.env.PORT || 5001;
    console.log(`[env.js] Server will run on port ${port}`);
    return port;
  },
  
  get DATABASE_URL() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl && process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL must be set in production");
    }
    return dbUrl;
  },
  
  get JWT_SECRET() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn("⚠️ JWT_SECRET not set, using development default");
      if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in production");
      }
    }
    return secret || "dev-secret-key-change-me";
  },
  
  get NODE_ENV() {
    return process.env.NODE_ENV || "development";
  },
  
  get FRONTEND_URL() {
    return process.env.FRONTEND_URL || "http://localhost:5173";
  },
};

export default env;
```

---

### Fix 7: Add Input Validation (HIGH)

**New file: `server/middleware/validation.js`**

```javascript
export const validateRegisterInput = (req, res, next) => {
  const { email, password } = req.body;

  // Check required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
      code: "MISSING_FIELDS",
    });
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
      code: "INVALID_EMAIL",
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters",
      code: "WEAK_PASSWORD",
    });
  }

  // Attach normalized email for use in controller
  req.body.email = normalizedEmail;
  next();
};
```

**Update: `server/routes/authRoutes.js`**

```javascript
import express from "express";
import * as authController from "../controllers/authController.js";
import { validateRegisterInput } from "../middleware/validation.js";

const router = express.Router();

router.post("/register", validateRegisterInput, authController.register);
router.post("/login", authController.login);

export default router;
```

---

### Fix 8: Add Request ID for Tracing (MEDIUM)

**File: `server/index.js`**

Add after imports:
```javascript
import { v4 as uuidv4 } from "uuid";
```

Then add middleware after CORS:
```javascript
// Request ID for tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
});
```

Update package.json:
```bash
npm install uuid
```

---

## 📋 AUDIT SUMMARY TABLE

| Issue | Severity | Status | Impact | Fix Priority |
|-------|----------|--------|--------|--------------|
| 1.1: Port mismatch | CRITICAL | 🔴 | Requests fail if PORT not manually set | IMMEDIATE |
| 1.2: Dead apiClient.js | CRITICAL | 🔴 | Code confusion, wrong port used | IMMEDIATE |
| 1.3: Hardcoded DB creds | CRITICAL | 🔴 | Security breach risk | IMMEDIATE |
| 2.1: Inconsistent port config | HIGH | 🟡 | Maintainability issues | HIGH |
| 2.2: No request size limit | MEDIUM | 🟡 | DoS vulnerability | MEDIUM |
| 2.3: CORS config | MEDIUM | 🟡 | Prod issues | MEDIUM |
| 2.4: Missing env validation | MEDIUM | 🟡 | Silent failures | MEDIUM |
| 3.1: No input validation | HIGH | ❌ | Invalid data | HIGH |
| 3.2: No auth middleware | CRITICAL | ❌ | No security | CRITICAL |
| 3.3: No rate limiting | HIGH | ❌ | Abuse risk | HIGH |
| 3.4: No sanitization | MEDIUM | ❌ | Security | MEDIUM |
| 3.5: No logging framework | MEDIUM | ❌ | Observability | MEDIUM |
| 3.6: No error boundaries | LOW | ❌ | UX issue | LOW |

---

## 🎯 IMMEDIATE ACTION PLAN (Next 30 minutes)

1. ✅ Fix port mismatch (server/.env + client/.env)
2. ✅ Delete dead apiClient.js
3. ✅ Move DB credentials to env vars
4. ✅ Add input validation middleware
5. ✅ Add request size limits
6. ✅ Test end-to-end registration flow

---

## 📞 VERIFICATION CHECKLIST

After applying fixes:

- [ ] Server starts on port 5001 without manual PORT override
- [ ] Client can make requests to http://localhost:5001/api
- [ ] Registration endpoint returns 201 Created
- [ ] CORS headers present in response
- [ ] No references to hardcoded localhost:5000 remain
- [ ] apiClient.js file deleted
- [ ] DB credentials in .env, not in code
- [ ] Input validation rejects invalid emails
- [ ] Request has X-Request-ID header
- [ ] Error responses have consistent structure
