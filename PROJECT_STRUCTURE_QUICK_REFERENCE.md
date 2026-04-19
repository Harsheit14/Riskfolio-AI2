# 📊 Riskfolio-AI File & Folder Hierarchy - Quick Reference

**Generated:** April 18, 2026

---

## 🎯 Quick Tree View

```
Riskfolio-AI/
│
├── 📁 ACTIVE SERVICES
│   ├── server/                    (Express.js API - Production Ready)
│   │   ├── controllers/           (7 files: auth, portfolio, transaction, etc.)
│   │   ├── services/              (6 files: business logic)
│   │   ├── repositories/          (3 files: database queries)
│   │   ├── routes/                (7 files: API endpoints)
│   │   ├── middleware/            (5 files: auth, validation, error handling)
│   │   ├── config/                (db.js, environment.js, schema.sql)
│   │   ├── migrations/            (database migrations)
│   │   ├── index.js               (main server file)
│   │   ├── package.json
│   │   └── .env
│   │
│   └── client/                    (React Vite App - Production Ready)
│       ├── src/
│       │   ├── components/        (11 reusable components)
│       │   ├── pages/             (5 page components)
│       │   ├── services/          (6 API service modules)
│       │   ├── hooks/             (3 custom hooks)
│       │   ├── context/           (Auth context provider)
│       │   ├── constants/         (API, validation)
│       │   ├── utils/             (helpers, formatters)
│       │   ├── layouts/           (layout wrapper)
│       │   ├── assets/            (images & media)
│       │   ├── main.jsx
│       │   ├── App.jsx
│       │   └── index.css
│       ├── public/                (static assets)
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       └── .env
│
├── 📁 LEGACY/OPTIONAL
│   ├── frontend/                  (Old React app - DEPRECATED, can delete)
│   ├── Backend/                   (Python FastAPI - legacy, optional)
│   └── node_modules/              (dependencies, not tracked)
│
├── 📁 CONFIGURATION
│   ├── docker-compose.yml
│   ├── package.json               (root)
│   ├── setup-postgres.sh          (database setup)
│   ├── start-all.sh               (start all services)
│   └── test-registration-api.sh
│
├── 📁 DOCUMENTATION (55+ files)
│   ├── PROJECT_ARCHITECTURE.md    ⭐ START HERE
│   ├── PROJECT_STRUCTURE_COMPLETE_ANALYSIS.md
│   ├── PHASE2_*.md                (Phase 2 docs)
│   ├── PHASE3_*.md                (Phase 3 docs)
│   ├── PHASE4_*.md                (Phase 4 docs)
│   ├── AUTH_*.md                  (Authentication)
│   ├── AUDIT_*.md                 (Audit reports)
│   └── [Other fix guides & quick refs]
│
└── 📁 .github/
    ├── agents/
    └── copilot-instructions.md
```

---

## 📋 Files by Count

| Directory | Count | Type |
|-----------|-------|------|
| `server/controllers/` | 7 | JS files |
| `server/routes/` | 7 | JS files |
| `server/services/` | 6 | JS files |
| `server/middleware/` | 5 | JS files |
| `server/repositories/` | 3 | JS files |
| `client/src/components/` | 11 | JSX files |
| `client/src/pages/` | 5 | JSX files |
| `client/src/services/` | 6 | JS files |
| `client/src/hooks/` | 3 | JS files |
| Root Level Docs | 55+ | MD/TXT files |

---

## 🔴 Duplicate Files (26 Total)

### Critical Issues (Delete These)
```
❌ server/config/repositories/         (duplicate of server/repositories/)
   ├── assetRepository.js
   ├── transactionRepository.js
   └── userRepository.js

❌ frontend/                           (entire legacy folder)
   └── All files in src/, public/, config
```

### Intentional Duplicates (Keep)
```
✅ package.json                (root, server, client - intentional)
✅ .env                        (server, client - per-service config)
✅ .gitignore                  (client, frontend - per-project)
✅ vite.config.js              (client, frontend - per-project)
✅ index.html                  (client, frontend - per-project)
✅ portfolioService.js         (server/services - backend logic)
                              (client/src/services - API wrapper)
✅ priceService.js             (server/services - backend logic)
                              (client/src/services - API wrapper)
✅ riskService.js              (server/services - backend logic)
                              (client/src/services - API wrapper)
```

### Should Consolidate
```
⚠️ validation.js               (2 copies in client/src)
   └─ client/src/constants/validation.js
   └─ client/src/utils/validation.js

⚠️ api.js                      (2 copies in client/src)
   └─ client/src/constants/api.js
   └─ client/src/services/api.js
```

---

## 🎨 Frontend Component Structure

```
client/src/components/
├── 🎯 Layout/Navigation
│   └── Navbar.jsx
│
├── 📊 Display Components
│   ├── Card.jsx
│   ├── StatCard.jsx
│   ├── Alert.jsx
│   ├── Toast.jsx
│   └── LoadingSkeleton.jsx
│
├── 🎮 Input Components
│   ├── Input.jsx
│   ├── Button.jsx
│   └── Modal.jsx
│
├── 🔒 Protected Routes
│   ├── ConfirmModal.jsx
│   └── ProtectedRoute.jsx
│
└── 📦 Index Export
    └── index.js
```

---

## 🏗️ Backend Layered Architecture

```
Request Flow:
┌──────────────┐
│ HTTP Request │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ routes/*.js          │  (Define endpoints)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ controllers/*.js     │  (Handle requests, orchestrate)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ services/*.js        │  (Business logic)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ repositories/*.js    │  (Database queries)
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ PostgreSQL           │  (Data storage)
└──────────────────────┘

Middleware Stack:
  1. cors()
  2. helmet()
  3. express.json()
  4. morgan()
  5. metricsMiddleware()
  6. rateLimitMiddleware()
  7. authMiddleware() [per route]
  8. validationMiddleware() [per route]
```

---

## 📚 Root Documentation Organization

```
Root Level Docs (55+ Files):
│
├── 🟢 START HERE
│   ├── START_HERE.md
│   ├── QUICK_START.md
│   └── PROJECT_ARCHITECTURE.md
│
├── 📊 PHASE DOCUMENTATION
│   ├── PHASE1_AUTH_IMPLEMENTATION.md
│   ├── PHASE2_*.md (9 files)
│   ├── PHASE3_*.md (3 files)
│   └── PHASE4_*.md (6 files)
│
├── 🔐 AUTHENTICATION
│   ├── AUTH_COMPLETE_CODE.md
│   ├── AUTH_FIX_GUIDE.md
│   ├── AUTH_QUICK_REFERENCE.md
│   └── 4 more auth-related docs
│
├── 🔍 AUDIT & ANALYSIS
│   ├── ARCHITECTURE_AUDIT_COMPLETE.md
│   ├── AUDIT_FINAL_REPORT.md
│   └── 6 more audit docs
│
├── 🔧 FIX GUIDES
│   ├── EXPRESS_5_MIGRATION_QUICK_FIX.md
│   ├── CORS_CONFIGURATION_UPDATE.md
│   ├── FRONTEND_BACKEND_CONNECTION_FIXED.md
│   └── 8 more fix guides
│
├── 📖 REFERENCE
│   ├── TECHNICAL_BREAKDOWN.md
│   ├── PRODUCTION_SYSTEM_REFERENCE.md
│   └── QUICK_REFERENCE_ARCHITECTURE.md
│
└── 🌐 HTML REPORTS
    ├── CONNECTION_STATUS.html
    └── FIXES_OVERVIEW.html
```

---

## 🎯 Quick Navigation

| Task | Location |
|------|----------|
| Start development | `QUICK_START.md` or `START_HERE.md` |
| Understand architecture | `PROJECT_ARCHITECTURE.md` |
| Fix issues | `EXPRESS_5_MIGRATION_QUICK_FIX.md` |
| Backend code | `server/` |
| Frontend code | `client/` |
| Database setup | `setup-postgres.sh` |
| API reference | `PROJECT_ARCHITECTURE.md` → API Reference |
| Update CORS | `CORS_CONFIGURATION_UPDATE.md` |
| Authentication | `AUTH_*.md` files |

---

## 📊 File Statistics

| Metric | Value |
|--------|-------|
| Total Files | 200+ |
| Total Directories | 40+ |
| Duplicate Names | 26 |
| Root Docs | 55+ |
| Backend Controllers | 7 |
| Frontend Components | 11 |
| Pages | 5 |
| Services | 12 (6 backend + 6 frontend) |
| Repositories | 3 |
| Routes | 7 |
| Middleware | 5 |

---

## ✅ Cleanup Checklist

```
Priority: CRITICAL
☐ Delete: server/config/repositories/
  └─ These duplicate server/repositories/

Priority: HIGH  
☐ Delete: entire frontend/ directory
  └─ This is legacy, replaced by client/

☐ Delete: server/index.js.save
  └─ This is a backup file

Priority: MEDIUM
☐ Consolidate: client/src/validation.js files
  └─ Review both and keep one

☐ Consolidate: client/src/api.js files
  └─ Review both and keep one

☐ Update: Documentation with new structure
```

---

**Analysis Date:** April 18, 2026  
**Project:** Riskfolio-AI (Cryptocurrency Portfolio Manager)  
**Status:** Phase 4 - Production Ready (with cleanup recommendations)
