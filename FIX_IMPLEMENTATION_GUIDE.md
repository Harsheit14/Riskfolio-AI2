# 🔧 IMPLEMENTATION GUIDE - Apply These Fixes

> This document contains exact code changes to apply immediately

---

## STEP 1: Fix Port Mismatch (5 seconds)

### File: `server/.env`

**Current:**
```properties
PORT=5000
```

**Change to:**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey
```

**Why:** Matches client/.env configuration and avoids ControlCenter conflict

**Verify:** Both files now specify 5001
```bash
grep PORT server/.env       # Should output: PORT=5001
grep VITE_API_URL client/.env  # Should output: VITE_API_URL=http://localhost:5001/api
```

---

## STEP 2: Delete Dead Code (10 seconds)

### File: `client/src/services/apiClient.js`

**Action:** DELETE THIS FILE

```bash
rm /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client/src/services/apiClient.js
```

**Verify:** File should not exist
```bash
ls -la client/src/services/
# Should show: api.js, authService.js, but NOT apiClient.js
```

---

## STEP 3: Secure Database Configuration (3 minutes)

### File: `server/config/db.js`

**Current (VULNERABLE):**
```javascript
import pkg from "pg";
const { Pool } = pkg;

// 🔥 Hardcoded config (temporary but stable)
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Crypto_db",
  password: "harsh",
  port: 5432,
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

export default connectDB;
export { pool };
```

**Replace with:**
```javascript
import pkg from "pg";
const { Pool } = pkg;

// ✅ Environment-based configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "Crypto_db",
  password: process.env.DB_PASSWORD,  // Must be in .env
  port: parseInt(process.env.DB_PORT || "5432"),
  // Connection pool configuration
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Idle timeout
  connectionTimeoutMillis: 2000,  // Connection timeout
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    
    // In production, fail fast. In dev, continue with mock data
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("⚠️  Continuing in development mode without database");
  }
};

export default connectDB;
export { pool };
```

**Why:**
- Credentials no longer in code
- Different credentials per environment
- Safe to commit to git
- Production can use different database

**Then update: `server/.env`**

Add these database configuration lines:
```properties
DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
```

**Final .env should have:**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey
DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
NODE_ENV=development
```

---

## STEP 4: Add Request Size Limits (1 minute)

### File: `server/index.js`

**Find this line:**
```javascript
app.use(express.json());
```

**Replace with:**
```javascript
// Body parsing middleware with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
```

**Why:** Prevents DoS attacks from large request bodies

---

## STEP 5: Add Input Validation Middleware (2 minutes)

### New File: `server/middleware/validation.js`

**Create this file:**
```javascript
/**
 * Validation middleware for auth endpoints
 */

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

  // Normalize email (trim and lowercase)
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

  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least one uppercase letter",
      code: "WEAK_PASSWORD",
    });
  }

  if (!/[a-z]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least one lowercase letter",
      code: "WEAK_PASSWORD",
    });
  }

  if (!/[0-9]/.test(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least one number",
      code: "WEAK_PASSWORD",
    });
  }

  // Attach normalized email for use in controller
  req.body.email = normalizedEmail;
  next();
};

export const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
      code: "MISSING_FIELDS",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  req.body.email = normalizedEmail;
  next();
};
```

### Update: `server/routes/authRoutes.js`

**Current:**
```javascript
import express from "express";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;
```

**Replace with:**
```javascript
import express from "express";
import * as authController from "../controllers/authController.js";
import { validateRegisterInput, validateLoginInput } from "../middleware/validation.js";

const router = express.Router();

// Apply validation middleware before controllers
router.post("/register", validateRegisterInput, authController.register);
router.post("/login", validateLoginInput, authController.login);

export default router;
```

**Why:**
- Input validation before controller
- Consistent validation across endpoints
- Clear error messages
- Email normalization (case-insensitive)

---

## STEP 6: Environment-Based CORS (2 minutes)

### File: `server/index.js`

**Find:**
```javascript
// ✅ CORS Configuration - Allow frontend requests
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", // Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

**Replace with:**
```javascript
// ✅ CORS Configuration - Environment-aware
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

**Why:**
- Different CORS for production vs development
- Easy to configure for different environments
- No hardcoded production URLs in code

---

## STEP 7: Improve Environment Variables (2 minutes)

### File: `server/config/env.js`

**Current:**
```javascript
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
```

**Replace with:**
```javascript
/**
 * Environment configuration with validation
 * Centralizes all env vars and ensures they're set correctly
 */

const env = {
  get PORT() {
    const port = process.env.PORT || 5001;
    console.log(`[env.js] Server will run on port ${port}`);
    return port;
  },

  get DATABASE_URL() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl && process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL must be set in production environment");
    }
    if (!dbUrl) {
      console.warn("[env.js] DATABASE_URL not set, using development mode");
    }
    return dbUrl;
  },

  get JWT_SECRET() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.warn("[env.js] ⚠️ JWT_SECRET not set, using development default");
      if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be set in production");
      }
    }
    return secret || "dev-secret-key-change-me-in-production";
  },

  get NODE_ENV() {
    return process.env.NODE_ENV || "development";
  },

  get FRONTEND_URL() {
    return process.env.FRONTEND_URL || "http://localhost:5173";
  },

  // Database configuration getters
  get DB_USER() {
    return process.env.DB_USER || "postgres";
  },

  get DB_HOST() {
    return process.env.DB_HOST || "localhost";
  },

  get DB_NAME() {
    return process.env.DB_NAME || "Crypto_db";
  },

  get DB_PASSWORD() {
    const pwd = process.env.DB_PASSWORD;
    if (!pwd) {
      console.warn("[env.js] DB_PASSWORD not set");
      if (process.env.NODE_ENV === "production") {
        throw new Error("DB_PASSWORD must be set in production");
      }
    }
    return pwd;
  },

  get DB_PORT() {
    return parseInt(process.env.DB_PORT || "5432");
  },
};

export default env;
```

**Why:**
- Centralized environment validation
- Clear error messages if required vars missing
- Environment-specific defaults
- Easy to track what's required

---

## STEP 8: Verify Everything Works

### 1. Update .env files

```bash
# server/.env
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=supersecretkey
DB_USER=postgres
DB_PASSWORD=harsh
DB_HOST=localhost
DB_NAME=Crypto_db
DB_PORT=5432
NODE_ENV=development

# client/.env
VITE_API_URL=http://localhost:5001/api
```

### 2. Restart both servers

**Terminal 1:**
```bash
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server
node index.js
# Should print: ✅ Server running on port 5001
```

**Terminal 2:**
```bash
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client
npm run dev
# Should print: ✅ Local: http://localhost:5173/
```

### 3. Test registration

**Terminal 3:**
```bash
# Test with valid input
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Expected response (201 Created):
# {"success":true,"data":{"id":1,"email":"test@example.com","token":"mock-jwt-token"},"message":"User registered successfully"}

# Test with invalid email
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"Password123"}'

# Expected response (400 Bad Request):
# {"success":false,"message":"Invalid email format","code":"INVALID_EMAIL"}

# Test with weak password
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak"}'

# Expected response (400 Bad Request):
# {"success":false,"message":"Password must be at least 8 characters","code":"WEAK_PASSWORD"}
```

### 4. Test in browser

1. Open http://localhost:5173/register
2. Try to register with:
   - Email: test@example.com
   - Password: ValidPass123
   - Confirm: ValidPass123
3. Should redirect to dashboard
4. Check browser console for logs

---

## Summary of Changes

| Step | File | Change | Time |
|------|------|--------|------|
| 1 | server/.env | Change PORT to 5001 | 5 sec |
| 2 | client/src/services/apiClient.js | DELETE | 10 sec |
| 3 | server/config/db.js | Use env vars instead of hardcoded | 3 min |
| 3 | server/.env | Add DB env vars | 1 min |
| 4 | server/index.js | Add body size limits | 1 min |
| 5 | server/middleware/validation.js | NEW FILE | 2 min |
| 5 | server/routes/authRoutes.js | Add validation middleware | 1 min |
| 6 | server/index.js | Environment-based CORS | 2 min |
| 7 | server/config/env.js | Improve env validation | 2 min |
| 8 | Both | Test everything | 5 min |

**Total Time: ~20 minutes**

---

## Verification Checklist

After applying all fixes:

- [ ] Server starts on port 5001
- [ ] Frontend can reach backend
- [ ] Registration with valid data returns 201
- [ ] Registration with invalid email returns 400
- [ ] Registration with weak password returns 400
- [ ] Token stored in localStorage
- [ ] Redirect to dashboard works
- [ ] No hardcoded credentials in code
- [ ] apiClient.js file deleted
- [ ] Validation middleware active
- [ ] Error messages have error codes
- [ ] Browser DevTools shows request to localhost:5001
- [ ] CORS headers in response
