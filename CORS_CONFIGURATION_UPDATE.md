# ✅ CORS Configuration Update - Dynamic Frontend Ports

**Date:** April 18, 2026  
**Status:** ✅ Completed  
**Impact:** Allows backend to accept requests from multiple Vite dev server ports

---

## 📋 Summary of Changes

### Problem
The backend had a hardcoded CORS configuration that only allowed a single frontend port (`http://localhost:5173`). This caused CORS errors when the Vite dev server ran on alternate ports like 5174 or 5175.

### Solution
Updated the CORS configuration to:
1. Support multiple common Vite dev ports (5173, 5174, 5175, 3000)
2. Allow dynamic configuration via environment variables
3. Use a dynamic origin checking function instead of a string

---

## 📝 Files Modified

### 1. `server/index.js` (Lines 58-88)

**Before:**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
```

**After:**
```javascript
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
```

**Key Improvements:**
- ✅ Added `allowedOrigins` array with multiple ports
- ✅ Implemented dynamic `origin` callback function
- ✅ Allows requests with no origin (mobile apps, server-to-server)
- ✅ Respects environment variables (`CLIENT_URL`, `FRONTEND_URL`)

---

### 2. `server/.env`

**Before:**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**After:**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CLIENT_URL=http://localhost:5175
```

**Added Environment Variables:**
- `FRONTEND_URL=http://localhost:5173` - Primary frontend URL
- `CLIENT_URL=http://localhost:5175` - Secondary/fallback frontend URL

---

## 🎯 Supported Origins

The backend now accepts requests from:

| Port | Use Case | Status |
|------|----------|--------|
| 5173 | Default Vite port | ✅ Allowed |
| 5174 | Alternate Vite port | ✅ Allowed |
| 5175 | Another alternate Vite port | ✅ Allowed |
| 3000 | Common development port | ✅ Allowed |
| Custom (via env var) | Configurable | ✅ Dynamic |
| No origin | Mobile/server-to-server | ✅ Allowed |

---

## 🚀 How to Use

### Development (Local)
No changes needed! The backend now automatically supports multiple ports:

```bash
# Terminal 1 - Backend
cd server
node index.js  # or npm run dev

# Terminal 2 - Frontend (can run on any supported port)
cd client
npm run dev  # Automatically detects port (5173, 5174, 5175, etc.)
```

### Custom Frontend URL
To use a custom frontend URL, update `server/.env`:

```properties
# For a different port
CLIENT_URL=http://localhost:3001

# For production
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Production Deployment
Set environment variables when deploying:

```bash
export FRONTEND_URL=https://yourdomain.com
export CLIENT_URL=https://yourdomain.com
node index.js
```

---

## ✅ Verification

### Check if CORS is working
```bash
# Test CORS with a specific origin
curl -H "Origin: http://localhost:5174" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://localhost:5000/api/auth/login -v
```

**Expected Response:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5174
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Check server startup
```bash
cd server
node index.js
```

**Expected Output:**
```
✅ Environment validation passed (development)
Portfolio routes loaded
✅ Database connection successful
Server running on port 5000
```

---

## 🔒 Security Considerations

### What's Protected
- ✅ Only configured origins are allowed
- ✅ Credentials require explicit `credentials: true` in both frontend and backend
- ✅ All HTTP methods restricted to: GET, POST, PUT, DELETE, OPTIONS, PATCH
- ✅ Only `Content-Type` and `Authorization` headers allowed

### What's Not Protected (and why)
- ⚠️ Requests with no origin are allowed (required for mobile apps, Electron, server-to-server APIs)
- ⚠️ Open to all listed origins (whitelist approach - ensure you control the origins)

### Production Recommendations
1. **Remove `http://localhost:*` ports** from `allowedOrigins` in production
2. **Use specific domain names** instead of IP addresses
3. **Set `NODE_ENV=production`** to enable additional security headers
4. **Monitor CORS errors** in logs for potential unauthorized access attempts
5. **Review and rotate** `JWT_SECRET` regularly

---

## 📊 Impact Analysis

| Component | Before | After | Impact |
|-----------|--------|-------|--------|
| CORS Origins | 1 hardcoded | Multiple + dynamic | 🟢 Much more flexible |
| Port Flexibility | No | Yes (5173-5175, 3000) | 🟢 Reduced friction |
| Env Configuration | No | Yes (CLIENT_URL, FRONTEND_URL) | 🟢 Easier deployment |
| Security | Restrictive | Whitelist-based | 🟢 Still secure |
| Server Restart Required | N/A | ✅ After .env changes | 🟡 Minor |

---

## 🔄 Next Steps

### Short-term
- [ ] Test with frontend on different ports (5173, 5174, 5175)
- [ ] Verify CORS headers in network tab (DevTools)
- [ ] Test authentication flow across ports

### Medium-term
- [ ] Update documentation (PROJECT_ARCHITECTURE.md) with CORS info
- [ ] Add CORS testing to CI/CD pipeline
- [ ] Consider extracting CORS config to `config/cors.js`

### Long-term
- [ ] Implement dynamic origin loading from database (for multi-tenant)
- [ ] Add CORS metrics to health endpoint
- [ ] Create `.env.example` with all supported CORS origins

---

## 📚 Related Documentation

- See `PROJECT_ARCHITECTURE.md` → Infrastructure & DevOps → Port Configuration
- See `server/index.js` → Lines 55-88 (CORS configuration)
- Express CORS docs: https://github.com/expressjs/cors

---

**Changes Applied:** ✅ Complete  
**Backend Restart:** ✅ Required (run `node index.js` in server directory)  
**Frontend Restart:** ✅ May be required if already running  
**Database Migration:** ✅ Not required  
**Environment Variables:** ✅ Updated `.env`
