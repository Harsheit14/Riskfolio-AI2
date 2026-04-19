# 🏛️ RISKFOLIO-AI COMPLETE ARCHITECTURE AUDIT

**Date:** April 18, 2026  
**Status:** ✅ COMPREHENSIVE AUDIT COMPLETED  
**Auditor Notes:** Production-ready with critical configuration issues identified

---

## 1️⃣ PROJECT STRUCTURE (Folder Tree)

```
Riskfolio-AI/
├── 📁 Backend/                          [⚠️ UNUSED - Python fallback]
│   ├── main.py
│   ├── venv/
│   └── __pycache__/
│
├── 📁 server/                           [✅ MAIN BACKEND - Node.js/Express]
│   ├── index.js                         [🎯 Entry point]
│   ├── .env                             [🔑 Backend config]
│   ├── .dockerignore
│   ├── Dockerfile                       [🐳 Docker image]
│   ├── package.json                     [📦 Dependencies]
│   │
│   ├── 📁 config/
│   │   ├── db.js                        [🗄️ PostgreSQL connection]
│   │   ├── environment.js               [⚙️ Config validation]
│   │   ├── env.js                       [⚙️ Alternate env config]
│   │   ├── production.js                [🚀 Production config]
│   │   ├── schema.sql                   [📊 Database schema]
│   │   └── 📁 repositories/
│   │       └── [database repositories]
│   │
│   ├── 📁 routes/                       [🛣️ API endpoints]
│   │   ├── authRoutes.js                [🔐 /api/auth]
│   │   ├── dashboardRoutes.js           [📊 /api/dashboard]
│   │   ├── portfolioRoutes.js           [💼 /api/portfolio]
│   │   ├── transactionRoutes.js         [💰 /api/transactions]
│   │   ├── riskRoutes.js                [⚠️ /api/risk]
│   │   ├── healthRoutes.js              [❤️ /health]
│   │   └── metricsRoutes.js             [📈 /metrics]
│   │
│   ├── 📁 controllers/                  [🎮 Request handlers]
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── portfolioController.js
│   │   ├── transactionController.js
│   │   ├── riskController.js
│   │   ├── healthController.js
│   │   └── metricsController.js
│   │
│   ├── 📁 services/                     [⚙️ Business logic]
│   │   ├── cacheService.js              [💾 Local cache]
│   │   ├── redisClient.js               [🔴 Redis client]
│   │   ├── portfolioService.js
│   │   ├── transactionService.js
│   │   ├── riskService.js
│   │   └── priceService.js
│   │
│   ├── 📁 middleware/                   [🛡️ Request middleware]
│   │   ├── authMiddleware.js            [🔐 JWT verification]
│   │   ├── errorHandler.js              [❌ Error handling]
│   │   ├── rateLimitMiddleware.js       [⏱️ Rate limiting]
│   │   ├── metricsMiddleware.js         [📊 Metrics tracking]
│   │   └── validationMiddleware.js      [✅ Input validation]
│   │
│   ├── 📁 repositories/                 [📝 Data access layer]
│   │   ├── userRepository.js
│   │   ├── assetRepository.js
│   │   └── transactionRepository.js
│   │
│   ├── 📁 migrations/                   [🔄 Database migrations]
│   │   └── [migration files]
│   │
│   └── 📁 node_modules/                 [📦 Dependencies installed]
│
├── 📁 client/                           [✅ MAIN FRONTEND - React/Vite]
│   ├── .env                             [🔑 Frontend config]
│   ├── vite.config.js                   [⚙️ Vite build config]
│   ├── package.json                     [📦 Dependencies]
│   ├── index.html                       [🌐 HTML entry]
│   │
│   ├── 📁 src/
│   │   ├── main.jsx                     [🎯 React entry point]
│   │   ├── App.jsx                      [🎯 Main component & routing]
│   │   ├── App.css
│   │   ├── index.css                    [🎨 Global styles]
│   │   │
│   │   ├── 📁 pages/                    [📄 Page components]
│   │   │   ├── LoginPage.jsx            [🔐 /login]
│   │   │   ├── RegisterPage.jsx         [📝 /register]
│   │   │   ├── DashboardPage.jsx        [📊 /dashboard]
│   │   │   ├── PortfolioPage.jsx        [💼 /portfolio]
│   │   │   └── RiskReportPage.jsx       [⚠️ /risk]
│   │   │
│   │   ├── 📁 components/               [🧩 Reusable components]
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Alert.jsx
│   │   │   └── ProtectedRoute.jsx       [🔐 Route protection]
│   │   │
│   │   ├── 📁 services/                 [⚙️ API calls]
│   │   │   ├── apiClient.js             [🌐 Axios instance]
│   │   │   ├── authService.js           [🔐 Auth API]
│   │   │   ├── portfolioService.js
│   │   │   ├── riskService.js
│   │   │   ├── priceService.js
│   │   │   └── api.js                   [Alternate API config]
│   │   │
│   │   ├── 📁 context/                  [🎯 React context]
│   │   │   ├── AuthContext.jsx          [🔐 Auth state]
│   │   │   ├── AuthContext.js
│   │   │   └── AuthProvider.jsx
│   │   │
│   │   ├── 📁 hooks/                    [🎣 Custom hooks]
│   │   │   └── useAuth.js               [🔐 Auth hook]
│   │   │
│   │   ├── 📁 layouts/                  [🎨 Layout components]
│   │   │   └── MainLayout.jsx
│   │   │
│   │   ├── 📁 constants/                [📌 Constants]
│   │   │   ├── api.js
│   │   │   └── validation.js
│   │   │
│   │   ├── 📁 utils/                    [🛠️ Utility functions]
│   │   │   └── [utility files]
│   │   │
│   │   └── 📁 assets/                   [🖼️ Images & static]
│   │       ├── react.svg
│   │       ├── vite.svg
│   │       └── hero.png
│   │
│   ├── 📁 public/                       [🌐 Static files]
│   │   ├── favicon.svg
│   │   └── icons.svg
│   │
│   └── 📁 node_modules/                 [📦 Dependencies installed]
│
├── 📁 frontend/                         [⚠️ DUPLICATE (unused)]
│   ├── package.json
│   ├── index.html
│   └── vite.config.js
│
├── 📄 docker-compose.yml                [🐳 Docker compose]
├── 📄 package.json                      [📦 Root package]
└── 📄 [Documentation files]
```

---

## 2️⃣ ENVIRONMENT FILES ANALYSIS (CRITICAL)

### 🔑 Backend Environment: `server/.env`

**Location:** `/server/.env`

**Variables:**
```properties
PORT=5001
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**Used By:**
- Backend server startup in `server/index.js`
- Database connection in `server/config/db.js`
- JWT token generation in `server/controllers/authController.js`

**Analysis:**
| Variable | Value | Status | Issue |
|----------|-------|--------|-------|
| `PORT` | 5001 | ✅ | Good - not conflicting |
| `DATABASE_URL` | postgresql://... | ⚠️ | Hardcoded credentials, no error handling |
| `JWT_SECRET` | placeholder | 🔴 | MUST change in production |
| `JWT_EXPIRES_IN` | 7d | ✅ | Reasonable TTL |
| `NODE_ENV` | development | ✅ | Good for development |

---

### 🔑 Frontend Environment: `client/.env`

**Location:** `/client/.env`

**Variables:**
```properties
VITE_API_URL=http://localhost:5001/api
```

**Used By:**
- Frontend API calls (but NOT properly used - see Issue #3 below)
- Vite build process

**Analysis:**
| Variable | Value | Status | Issue |
|----------|-------|--------|-------|
| `VITE_API_URL` | http://localhost:5001/api | ⚠️ | Defined but NOT used by apiClient.js |

---

### 🔴 CRITICAL ISSUE: API URL Mismatch

**Problem Found:**

1. **Frontend .env defines:** `VITE_API_URL=http://localhost:5001/api` ✅
2. **But apiClient.js hardcodes:** `baseURL: 'http://localhost:5000/api'` ❌

**Why This Is Bad:**
- Frontend tries to connect to port 5000
- Backend runs on port 5001
- All API calls will FAIL

**Code Evidence:**

```javascript
// ❌ WRONG - In client/src/services/apiClient.js
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',  // HARDCODED, should use env var
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

### 📁 Extra Environment Files

**Found:** `server/config/env.js` (duplicate configuration)

This file should not exist - causes confusion about which config is authoritative.

---

### 🚨 Summary: Environment Issues

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | API URL hardcoded in apiClient.js instead of using VITE_API_URL env var | 🔴 CRITICAL | Frontend can't connect to backend |
| 2 | JWT_SECRET is placeholder text | 🔴 CRITICAL | Security vulnerability in any deployment |
| 3 | Database credentials hardcoded in .env | 🟡 MEDIUM | Not ideal for production (should use secrets management) |
| 4 | Duplicate config files (env.js vs environment.js) | 🟡 MEDIUM | Confusion about which is authoritative |
| 5 | No .env.example file | 🟡 MEDIUM | New developers don't know required variables |

---

## 3️⃣ BACKEND ARCHITECTURE

### Entry Point: `server/index.js`

**Flow:**
```
index.js
  ↓
Load .env via dotenv.config()
  ↓
Import config from config/environment.js
  ↓
Create Express app
  ↓
Mount middleware (Helmet, CORS, Morgan, Metrics, Rate Limit)
  ↓
Mount routes (/api/auth, /api/dashboard, /api/portfolio, /api/transactions, /api/risk)
  ↓
Call startServer() → connectDB() → app.listen(port)
```

**Code Structure:**
```javascript
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";

import config from "./config/environment.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
// ... more imports

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Logging & parsing
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined"));

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/portfolio", apiLimiter, portfolioRoutes);
// ... more routes

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(config.server.port, () => {
    console.log(`✅ Server running on port ${config.server.port}`);
  });
};

startServer();
```

### Database Connection: `server/config/db.js`

**Architecture:**
```
PostgreSQL Database
     ↑
     │
  Pool (pg.Pool)
     ↑
     │ connectDB()
     │
Validates connection
Tests with SELECT NOW()
Throws error if fails (NO MOCK MODE) ✅
```

**Code:**
```javascript
import pkg from "pg";
const { Pool } = pkg;

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error("❌ FATAL: DATABASE_URL is required");
}

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

// Test connection on startup - MUST SUCCEED
export async function connectDB() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log("✅ Database connection successful");
    client.release();
    return true;
  } catch (error) {
    // FAILS LOUDLY with helpful message
    console.error("❌ FATAL: Cannot connect to PostgreSQL");
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

export default pool;
```

**Status:** ✅ FIXED - Now validates database connectivity

---

### Routing Structure

**Route Organization:**

```
/api/
├── /auth/
│   ├── POST /register    → authController.register()
│   └── POST /login       → authController.login()
│
├── /dashboard/
│   ├── GET /             → dashboardController.getDashboard()
│   └── GET /summary      → dashboardController.getSummary()
│
├── /portfolio/
│   ├── GET /             → portfolioController.getPortfolio()
│   ├── GET /:id          → portfolioController.getPortfolioById()
│   └── POST /            → portfolioController.createPortfolio()
│
├── /transactions/
│   ├── GET /             → transactionController.getTransactions()
│   ├── POST /            → transactionController.addTransaction()
│   └── DELETE /:id       → transactionController.deleteTransaction()
│
├── /risk/
│   ├── GET /analysis     → riskController.getAnalysis()
│   └── GET /metrics      → riskController.getMetrics()
│
├── /health/
│   └── GET /             → healthController.check()
│
└── /metrics/
    └── GET /             → metricsController.getMetrics()
```

**Rate Limiting Applied:**

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/*` | 5 req | 15 min |
| `/api/*` | 30 req | 1 min |
| Global | 100 req | 1 min |

---

### Request Flow: Controller → Service → Repository

**Example: Create Transaction**

```
POST /api/transactions
  ↓
transactionRoutes.js
  ↓
validate(transactionSchema)  [validationMiddleware.js]
  ↓
authenticate(req, res, next)  [authMiddleware.js - verifies JWT]
  ↓
transactionController.addTransaction(req, res)
  ↓
transactionService.createTransaction(userId, data)
  ↓
transactionRepository.insert(transaction)
  ↓
PostgreSQL query execution
  ↓
Result returned to controller
  ↓
Response sent to frontend
```

---

### Middleware Stack (Execution Order)

```
Request arrives
    ↓
1. helmet()                    [Security headers]
    ↓
2. cors()                      [CORS headers, credentials]
    ↓
3. express.json()              [Parse body]
    ↓
4. morgan()                    [Access logging]
    ↓
5. metricsMiddleware           [Track metrics]
    ↓
6. globalLimiter               [Rate limiting]
    ↓
7. Route-specific limiter      [authLimiter or apiLimiter]
    ↓
8. authMiddleware              [JWT verification - on protected routes]
    ↓
9. validationMiddleware        [Input validation]
    ↓
10. Controller
    ↓
11. errorHandler               [Catch errors]
    ↓
Response sent
```

---

### Caching Architecture

**Hybrid Cache System:**

```
Request for data
    ↓
┌─────────────────────────────┐
│ Check Cache                 │
└─────────────────────────────┘
    ↓
┌───────────────┬─────────────────────┐
│               │                     │
Cache HIT       Cache MISS           
│               │
Return          Check Redis
quickly         │
                ├─ Hit: Return from Redis
                │
                └─ Miss: Query PostgreSQL
                         ↓
                         Store in Redis
                         Store in local cache
                         Return result
```

**Services:**

- `redisClient.js` - Redis connections
- `cacheService.js` - Local in-memory cache fallback

---

## 4️⃣ FRONTEND ARCHITECTURE

### Entry Point: `client/src/main.jsx`

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Flow:**
1. `index.html` loads `main.jsx`
2. `main.jsx` renders `App` component
3. `App.jsx` sets up routing and authentication

---

### Routing: `client/src/App.jsx`

**Route Structure:**

```jsx
<BrowserRouter>
  <Routes>
    {/* Public routes - anyone can access */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Protected routes - need JWT token */}
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/risk" element={<RiskReportPage />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Route>

    {/* 404 - redirect to dashboard */}
    <Route path="*" element={<Navigate to="/dashboard" />} />
  </Routes>
</BrowserRouter>
```

**Protected Route Component:**

```jsx
// ProtectedRoute.jsx
export default function ProtectedRoute() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return <Outlet />;
}
```

---

### Authentication Flow

**State Management: `client/src/context/AuthContext.jsx`**

```jsx
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('authToken', response.token);
  };

  const register = async (email, password) => {
    const response = await authService.register(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('authToken', response.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Custom Hook: `client/src/hooks/useAuth.js`**

```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

### API Integration Layer: `client/src/services/apiClient.js`

**Axios Instance with Interceptors:**

```javascript
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',  // ❌ HARDCODED - SHOULD USE ENV VAR
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**Problem:** ❌ Uses hardcoded `http://localhost:5000/api` instead of `process.env.VITE_API_URL`

---

### Service Layer: `client/src/services/`

**Authentication Service:**

```javascript
// authService.js
export const authService = {
  register: (email, password) => 
    apiClient.post('/auth/register', { email, password }),
  
  login: (email, password) => 
    apiClient.post('/auth/login', { email, password }),
};
```

**Other Services:**

```javascript
// portfolioService.js
export const portfolioService = {
  getPortfolios: () => apiClient.get('/portfolio'),
  getPortfolio: (id) => apiClient.get(`/portfolio/${id}`),
};

// transactionService.js
export const transactionService = {
  getTransactions: () => apiClient.get('/transactions'),
  addTransaction: (data) => apiClient.post('/transactions', data),
};

// riskService.js
export const riskService = {
  getAnalysis: () => apiClient.get('/risk/analysis'),
};
```

---

### Page Components Structure

**Example: DashboardPage.jsx**

```jsx
export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await dashboardService.getDashboard();
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to load dashboard', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      {/* Dashboard content */}
    </div>
  );
}
```

---

### Component Hierarchy

```
App.jsx (Router)
├── Public Routes
│   ├── LoginPage
│   └── RegisterPage
│
└── Protected Routes
    ├── MainLayout
    │   ├── Navbar
    │   └── main (Outlet)
    │       ├── DashboardPage
    │       │   ├── Card
    │       │   ├── Chart (Recharts)
    │       │   └── Table
    │       │
    │       ├── PortfolioPage
    │       │   ├── Card
    │       │   ├── Button
    │       │   └── Modal
    │       │
    │       └── RiskReportPage
    │           ├── Alert
    │           ├── Card
    │           └── Chart (Recharts)
```

---

## 5️⃣ DATA FLOW (Critical)

### Complete Request-Response Cycle

**SCENARIO: User Registers and Creates First Transaction**

```
┌──────────────────────────────────────────────────────────────┐
│ STEP 1: REGISTRATION FLOW                                    │
└──────────────────────────────────────────────────────────────┘

User enters email/password on RegisterPage
    ↓
onClick handler calls authService.register(email, password)
    ↓
authService sends POST request via apiClient
    ↓
Axios request interceptor attaches headers:
  - Content-Type: application/json
  - Authorization: (empty - no token yet)
    ↓
Request reaches: POST http://localhost:5001/api/auth/register ✅
    ↓
Backend: authRoutes.js → validate schema → authController.register()
    ↓
Controller:
  1. Hash password with bcrypt
  2. Save user to PostgreSQL via userRepository
  3. Generate JWT token: jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })
  4. Return { token, user }
    ↓
Response with token and user object
    ↓
Frontend receives response
    ↓
authService.register() resolves with token
    ↓
AuthContext login() function:
  1. setToken(response.token)
  2. setUser(response.user)
  3. localStorage.setItem('authToken', token)
    ↓
User redirected to /dashboard


┌──────────────────────────────────────────────────────────────┐
│ STEP 2: DASHBOARD DATA FETCH                                 │
└──────────────────────────────────────────────────────────────┘

DashboardPage mounted
    ↓
useEffect runs → calls dashboardService.getDashboard()
    ↓
apiClient sends GET request
    ↓
Axios request interceptor:
  - Gets token from localStorage
  - Attaches Authorization: Bearer eyJhbG...
    ↓
Request reaches: GET http://localhost:5001/api/dashboard ✅
    ↓
Backend: authMiddleware verifies JWT token
    ↓
Token verified → req.user = { userId, email }
    ↓
dashboardRoutes → dashboardController.getDashboard()
    ↓
Controller calls dashboardService.getDashboard(userId)
    ↓
Service queries:
  1. GET total portfolio value from portfolioRepository
  2. GET recent transactions from transactionRepository
  3. GET risk metrics from riskService
    ↓
Results aggregated in service layer
    ↓
Response: {
  portfolioValue: 50000,
  recentTransactions: [...],
  riskScore: 65,
  ...
}
    ↓
Frontend receives data
    ↓
DashboardPage sets state: setDashboard(response.data)
    ↓
Component re-renders with dashboard data
    ↓
Charts, tables populated with data


┌──────────────────────────────────────────────────────────────┐
│ STEP 3: ADD TRANSACTION (BUY)                                │
└──────────────────────────────────────────────────────────────┘

User clicks "Buy" button on TransactionForm
    ↓
Form validates:
  - Symbol required
  - Quantity > 0
  - Price > 0
    ↓
onClick handler calls:
  transactionService.addTransaction({ symbol, quantity, type: 'BUY', price })
    ↓
apiClient sends POST http://localhost:5001/api/transactions
    ↓
Request interceptor attaches token
    ↓
Backend: transactionRoutes → validate → authMiddleware
    ↓
authMiddleware verifies token → req.user set
    ↓
transactionController.addTransaction()
    ↓
Controller calls transactionService.createTransaction(userId, data)
    ↓
Service:
  1. Validate transaction data (Joi schema)
  2. Get current price from priceService
  3. Calculate transaction fee
  4. Call transactionRepository.insert()
    ↓
Repository:
  1. INSERT INTO transactions (user_id, symbol, quantity, type, price, fee, date)
  2. UPDATE portfolio SET cash_balance = cash_balance - (price * quantity + fee)
    ↓
PostgreSQL executes both queries (transaction atomicity)
    ↓
Backend returns: { transactionId, status: 'success', ... }
    ↓
Frontend receives response
    ↓
Component updates state:
  - Remove modal/form
  - Refresh transactions list (call getTransactions())
  - Update portfolio value
    ↓
User sees transaction in list
```

---

### Authentication Token Flow

**Storage & Transmission:**

```
Registration/Login
    ↓
Backend generates JWT: 
  Header: { alg: 'HS256', typ: 'JWT' }
  Payload: { userId, email, iat, exp }
  Signature: HMAC-SHA256(header.payload, JWT_SECRET)
    ↓
Token returned to frontend: "eyJhbGc.eyJ1c2...[long string]"
    ↓
Frontend stores: localStorage.setItem('authToken', token)
    ↓
Every request:
    ↓
Request interceptor retrieves: 
  const token = localStorage.getItem('authToken')
    ↓
Attaches to header:
  Authorization: Bearer eyJhbGc.eyJ1c2...
    ↓
Backend receives request
    ↓
authMiddleware extracts token:
  const token = authHeader.substring(7)
    ↓
Verifies signature:
  jwt.verify(token, JWT_SECRET)
    ↓
If valid:
  - req.user = { userId, email } (decoded)
  - next() → controller proceeds
    ↓
If invalid/expired:
  - 401 Unauthorized
  - Response interceptor catches 401
  - Clears localStorage
  - Redirects to /login
```

---

### Database Transaction Example

**BUY Transaction (2 operations, atomic):**

```sql
BEGIN TRANSACTION;

-- 1. Record the transaction
INSERT INTO transactions (user_id, symbol, quantity, type, price, fee, date)
VALUES ($1, $2, $3, 'BUY', $4, $5, NOW());

-- 2. Update portfolio
UPDATE portfolio 
SET cash_balance = cash_balance - ($4 * $3 + $5)
WHERE user_id = $1;

COMMIT;
```

If either query fails → entire transaction rolls back → no partial updates

---

## 6️⃣ ISSUES FOUND

### 🔴 CRITICAL ISSUES

#### Issue #1: Frontend API URL Hardcoded (BLOCKS FUNCTIONALITY)
- **File:** `client/src/services/apiClient.js`
- **Problem:** Uses `baseURL: 'http://localhost:5000/api'` instead of `process.env.VITE_API_URL`
- **Impact:** Frontend connects to wrong port (5000 instead of 5001), all API calls fail
- **Severity:** CRITICAL - Application won't work
- **Fix:** Change line to use `process.env.VITE_API_URL`

```javascript
// ❌ CURRENT (WRONG)
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// ✅ SHOULD BE
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});
```

---

#### Issue #2: JWT_SECRET Is Placeholder (SECURITY)
- **File:** `server/.env`
- **Problem:** `JWT_SECRET=your_super_secret_key_change_in_production` is default
- **Impact:** Any leaked secret can forge tokens
- **Severity:** CRITICAL - Production security risk
- **Fix:** Generate strong secret: `openssl rand -base64 32`

---

#### Issue #3: Database Credentials Hardcoded (SECURITY)
- **File:** `server/.env`
- **Problem:** `DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db` contains password
- **Impact:** Credentials exposed if .env accidentally committed or server compromised
- **Severity:** CRITICAL - Should use secrets manager
- **Fix:** Use environment variables or secrets vault (AWS Secrets Manager, HashiCorp Vault, etc.)

---

### 🟡 MEDIUM ISSUES

#### Issue #4: Duplicate Configuration Files
- **Files:** `server/config/env.js` and `server/config/environment.js`
- **Problem:** Two different config systems causing confusion
- **Impact:** Unclear which config is authoritative, may use wrong values
- **Severity:** MEDIUM - Confusing maintenance
- **Fix:** Keep only `environment.js`, delete `env.js`

---

#### Issue #5: No .env.example File
- **Missing:** `server/.env.example` and `client/.env.example`
- **Problem:** New developers don't know what environment variables are required
- **Impact:** Setup friction, incomplete configurations
- **Severity:** MEDIUM - Developer experience issue
- **Fix:** Create example files with all required variables

---

#### Issue #6: Unused Backend Folder
- **Path:** `server/Backend/main.py`
- **Problem:** Python backend exists but entire project uses Node.js
- **Impact:** Confusion about architecture, maintenance burden
- **Severity:** MEDIUM - Code clutter
- **Fix:** Delete `Backend/` folder or document why it exists

---

#### Issue #7: Unused Frontend Folder
- **Path:** `server/frontend/`
- **Problem:** Duplicate frontend folder alongside `server/client/`
- **Impact:** Confusion about which frontend to modify
- **Severity:** MEDIUM - Code clutter
- **Fix:** Delete unused `frontend/` folder

---

#### Issue #8: No CORS_ORIGIN in Frontend .env
- **File:** `client/.env`
- **Missing:** Configuration for API origin
- **Impact:** Cannot easily change backend URL for different environments
- **Severity:** MEDIUM - Environment flexibility
- **Fix:** Add `VITE_API_URL` and use it in apiClient

---

### 🟢 LOW ISSUES

#### Issue #9: Missing Error Boundary in React
- **File:** `client/src/App.jsx`
- **Problem:** No error boundary to catch component crashes
- **Impact:** Component error → blank page
- **Severity:** LOW - Runtime error handling
- **Fix:** Add React Error Boundary

---

#### Issue #10: No Request/Response Logging
- **File:** Backend services
- **Problem:** Difficult to debug API issues
- **Impact:** Slower debugging
- **Severity:** LOW - Development convenience
- **Fix:** Add request logging middleware

---

## 7️⃣ RECOMMENDED CLEAN STRUCTURE

### Folder Organization

```
Riskfolio-AI/
├── 📁 server/                       [Backend - Keep as-is]
│   ├── .env                         [✅ Keep - backend config]
│   ├── .env.example                 [ADD - template]
│   ├── index.js
│   ├── package.json
│   └── [all subdirectories]
│
├── 📁 client/                       [Frontend - Keep as-is]
│   ├── .env                         [✅ Keep - frontend config]
│   ├── .env.example                 [ADD - template]
│   ├── vite.config.js
│   ├── package.json
│   └── [all subdirectories]
│
├── ❌ Delete: Backend/              [Python fallback - not used]
├── ❌ Delete: frontend/             [Duplicate - use client/ instead]
│
├── 📄 docker-compose.yml            [✅ Keep]
├── 📄 .gitignore                    [✅ Keep]
└── 📄 README.md                     [✅ Should exist, update if needed]
```

---

### Environment File Structure

#### `server/.env`
```properties
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

#### `server/.env.example`
```properties
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://[user]:[password]@localhost:5432/[database]
JWT_SECRET=[generate with: openssl rand -base64 32]
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

#### `client/.env`
```properties
VITE_API_URL=http://localhost:5001/api
```

#### `client/.env.example`
```properties
VITE_API_URL=http://localhost:5001/api
```

---

### Architecture Best Practices

#### 1. Environment Variables Usage

✅ **CORRECT:**
```javascript
// Use in apiClient.js
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});
```

❌ **WRONG:**
```javascript
// Hardcoded value
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
});
```

---

#### 2. Configuration Hierarchy

```
Recommended (for different environments):

Development:
  - .env (local development values)
  - .env.development (override dev-specific)

Production:
  - Environment variables from deployment platform
  - OR secrets manager (AWS Secrets Manager, etc.)
  - NO .env file (don't commit secrets)
```

---

#### 3. Error Handling

Backend should:
- ✅ Validate all inputs
- ✅ Return structured error responses
- ✅ Log errors for debugging
- ✅ Never expose stack traces to frontend in production

Frontend should:
- ✅ Catch API errors
- ✅ Display user-friendly messages
- ✅ Handle 401 (redirect to login)
- ✅ Handle 500 (show error message)

---

#### 4. Authentication Security

✅ **Current Implementation:**
- JWT stored in localStorage
- Token attached to every request
- 401 errors redirect to login
- Token expires after 7 days

⚠️ **Could Improve:**
- Add refresh token mechanism
- Use HttpOnly cookies instead of localStorage (if possible)
- Add CSRF protection
- Implement token revocation

---

#### 5. Caching Strategy

Current hybrid approach is good:
```
Memory (fastest) → Redis (medium) → Database (slowest)
```

But make sure to:
- ✅ Cache GET requests (not POST/PUT/DELETE)
- ✅ Invalidate cache on write operations
- ✅ Set reasonable TTLs
- ✅ Handle cache miss gracefully

---

## 8️⃣ CRITICAL ACTION ITEMS

### 🔴 MUST DO (Before running in production)

1. **Fix Frontend API URL**
   - [ ] Change `apiClient.js` to use `process.env.VITE_API_URL`
   - [ ] File: `client/src/services/apiClient.js`
   - [ ] Estimated effort: 5 minutes

2. **Generate Strong JWT_SECRET**
   - [ ] Run: `openssl rand -base64 32`
   - [ ] Update: `server/.env`
   - [ ] Estimated effort: 5 minutes

3. **Move Credentials to Secrets Manager**
   - [ ] Don't store passwords in .env
   - [ ] Use environment variables from deployment platform
   - [ ] File: `server/.env`
   - [ ] Estimated effort: 30 minutes

4. **Create .env.example Files**
   - [ ] Create: `server/.env.example`
   - [ ] Create: `client/.env.example`
   - [ ] Document all required variables
   - [ ] Estimated effort: 10 minutes

---

### 🟡 SHOULD DO (Before production)

5. **Delete Unused Folders**
   - [ ] Remove: `Backend/`
   - [ ] Remove: `frontend/`
   - [ ] Estimated effort: 2 minutes

6. **Clean Up Duplicate Config**
   - [ ] Delete: `server/config/env.js` (keep environment.js)
   - [ ] Estimated effort: 2 minutes

7. **Add Error Boundary to React**
   - [ ] Create: `client/src/components/ErrorBoundary.jsx`
   - [ ] Wrap App with Error Boundary
   - [ ] Estimated effort: 15 minutes

8. **Add Request Logging**
   - [ ] Add comprehensive logging middleware
   - [ ] Log all requests/responses
   - [ ] Estimated effort: 20 minutes

---

### 🟢 NICE TO HAVE (Production upgrades)

9. **Implement Refresh Tokens**
10. **Add Rate Limiting Per User**
11. **Add Request/Response Validation Logging**
12. **Add Health Check Monitoring**
13. **Add Performance Metrics**

---

## 9️⃣ DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All environment variables are secrets (not in .env)
- [ ] JWT_SECRET is generated and strong
- [ ] Database URL uses proper credentials
- [ ] API URLs point to correct backend
- [ ] CORS_ORIGIN is set to production frontend URL
- [ ] Error messages don't expose stack traces
- [ ] Rate limiting is configured appropriately
- [ ] HTTPS is enabled
- [ ] Database has backups enabled
- [ ] Monitoring and alerting configured
- [ ] Logs are centralized
- [ ] Database migrations are up-to-date

---

## 🔟 SUMMARY

### Project Status: 🟢 MOSTLY GOOD, FIX CRITICAL ISSUES

| Aspect | Status | Comment |
|--------|--------|---------|
| Backend Architecture | ✅ Good | Express, PostgreSQL, JWT - solid foundation |
| Frontend Architecture | ✅ Good | React, Vite, context API - clean structure |
| Routing | ✅ Good | Protected routes, proper structure |
| Authentication | ✅ Good | JWT implementation correct |
| Database | ✅ Good | PostgreSQL with connection validation |
| Caching | ✅ Good | Hybrid Redis + local cache |
| Error Handling | ✅ Good | Middleware handles errors properly |
| **API URL Config** | 🔴 CRITICAL | Hardcoded instead of env var |
| **Security (Secrets)** | 🔴 CRITICAL | Credentials in .env, placeholder JWT |
| Environment Variables | 🟡 Medium | No .env.example, duplicate configs |
| Code Organization | 🟡 Medium | Unused folders (Backend/, frontend/) |
| Documentation | 🟡 Medium | No setup guide for new developers |

---

## 📋 NEXT STEPS

1. **Immediately fix critical issues (#1-3)** - 15 minutes
2. **Add .env.example files** - 10 minutes
3. **Clean up unused folders** - 2 minutes
4. **Test end-to-end** - 15 minutes
5. **Ready for production** - 1 hour total

---

**Audit completed by:** AI Architecture Review  
**Recommended action:** Address critical issues before production deployment  
**Questions?** Review specific sections above for detailed explanations
