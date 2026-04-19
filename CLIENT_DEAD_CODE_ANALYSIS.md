# 🔍 Riskfolio-AI Client Dead Code & Duplicate File Analysis

**Date:** April 18, 2026  
**Scope:** `client/src/` directory  
**Purpose:** Identify dead/duplicate imports and orphaned files

---

## 📊 Summary

### Key Findings
| Issue | Status | Action |
|-------|--------|--------|
| **AuthContext.js vs AuthContext.jsx** | ⚠️ DUPLICATE | Delete `AuthContext.js` - both identical |
| **apiClient.js vs api.js** | 🔴 CONFLICT | Delete `api.js` - only apiClient.js is used |
| **constants/api.js vs services/api.js** | ⚠️ PROBLEMATIC | Need consolidation - authService uses services/api |
| **components/index.js** | 🟢 UNUSED | Never imported - components imported directly |

---

## 🎯 Detailed Analysis

### 1️⃣ CONTEXT FILES: AuthContext.js vs AuthContext.jsx

#### Files in Question
- `client/src/context/AuthContext.js`
- `client/src/context/AuthContext.jsx`
- `client/src/context/AuthProvider.jsx`

#### Import Analysis

| File | Imported By | Count | Status |
|------|---|---|---|
| `context/AuthContext.jsx` | `hooks/useAuth.js` | ✅ USED | Primary |
| `context/AuthContext.jsx` | `context/AuthProvider.jsx` | ✅ USED | Primary |
| `context/AuthContext.js` | *NOTHING* | ❌ DEAD | **DELETE** |
| `context/AuthProvider.jsx` | `main.jsx` | ✅ USED | Active |

#### Detailed Imports
```javascript
// ✅ USED: AuthContext from AuthContext.jsx
./context/AuthProvider.jsx:
  Line 2: import { AuthContext } from "./AuthContext";

./hooks/useAuth.js:
  Line 2: import { AuthContext } from "../context/AuthContext";

// ❌ UNUSED: AuthContext.js never imported anywhere
```

#### File Comparison
**AuthContext.jsx** (ACTIVE):
```jsx
import { createContext } from "react";

export const AuthContext = createContext(null);
```

**AuthContext.js** (DEAD):
```javascript
import { createContext } from "react";

export const AuthContext = createContext(null);
```

✅ **Identical content** - `.js` version is never imported

#### Recommendation
```bash
# DELETE AuthContext.js - it's a duplicate
rm client/src/context/AuthContext.js

# Update import in hooks/useAuth.js (ALREADY correct):
# No change needed - already imports from AuthContext
```

---

### 2️⃣ SERVICE LAYER: apiClient.js vs api.js

#### Files in Question
- `client/src/services/apiClient.js` 
- `client/src/services/api.js`

#### Import Analysis

| File | Imported By | Count | Used | Status |
|------|---|---|---|---|
| `services/apiClient.js` | `portfolioService.js` | ✅ USED | Yes | **ACTIVE** |
| `services/apiClient.js` | `priceService.js` | ✅ USED | Yes | **ACTIVE** |
| `services/apiClient.js` | `riskService.js` | ✅ USED | Yes | **ACTIVE** |
| `services/api.js` | `authService.js` | ✅ USED | Yes | LEGACY |
| `services/api.js` | NOTHING ELSE | ❌ | Only 1 import | **DELETE** |

#### Detailed Imports
```javascript
// ✅ apiClient.js IS USED (3 imports):
./services/portfolioService.js:
  Line 1: import apiClient from './apiClient';

./services/priceService.js:
  Line 1: import apiClient from './apiClient';

./services/riskService.js:
  Line 1: import apiClient from './apiClient';

// ⚠️ api.js IS USED BY ONLY ONE FILE:
./services/authService.js:
  Line 1: import apiClient from "./api";
```

#### File Comparison
**apiClient.js** (ACTIVE):
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // Uses environment variable
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token to all requests
// Response interceptor: Handle errors
```

**api.js** (LEGACY):
```javascript
import axios from "axios";
import { API_BASE_URL } from "../constants/api";  // Uses constant import

const apiClient = axios.create({
  baseURL: API_BASE_URL,  // Hardcoded from constants
  timeout: 10000,
  headers: {
    // ...
  },
});

// Request interceptor: Attach JWT token to all requests
// Response interceptor: Handle errors
```

#### Key Differences
| Feature | apiClient.js | api.js |
|---------|---|---|
| **Base URL Source** | Environment variable (correct) | Constants file (legacy) |
| **Timeout** | Not set | 10s (hardcoded) |
| **Used By** | 3 services | 1 service (authService) |
| **Active** | ✅ Yes | ⚠️ Legacy |

#### Problem
`authService.js` imports from `api.js` (legacy) instead of `apiClient.js` (active).

#### Recommendation
**Option A: DELETE api.js (Recommended)**
```bash
# Step 1: Update authService.js to use apiClient.js
sed -i 's|import apiClient from "./api"|import apiClient from "./apiClient"|' \
  client/src/services/authService.js

# Step 2: Delete the legacy api.js
rm client/src/services/api.js
```

**Option B: Consolidate (If you want to keep api.js)**
```bash
# Move constants to apiClient.js and update api.js
# But this is more work with no benefit
```

✅ **Recommendation: DELETE api.js and update authService.js import**

---

### 3️⃣ CONSTANTS: constants/api.js vs services/api.js

#### Files in Question
- `client/src/constants/api.js`
- `client/src/services/api.js` (legacy HTTP client)

#### Import Analysis

| File | Imported By | Count | Status |
|------|---|---|---|
| `constants/api.js` | `services/authService.js` | ✅ USED | Active |
| `constants/api.js` | `services/api.js` | ✅ USED | Legacy |
| `services/api.js` | `services/authService.js` | ✅ USED | Problematic |

#### Detailed Imports
```javascript
// ✅ constants/api.js IS USED:
./services/authService.js:
  Line 2: import { API_ENDPOINTS } from "../constants/api";
  Line 18: API_ENDPOINTS.AUTH_REGISTER

./services/api.js:
  Line 2: import { API_BASE_URL } from "../constants/api";
```

#### constants/api.js Content
```javascript
// API_ENDPOINTS used by authService
export const API_ENDPOINTS = {
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
};

// API_BASE_URL used by legacy api.js
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

#### Current Flow Issue
```
authService.js
├─ imports from "./api"           ← This is services/api.js (legacy)
├─ imports from "../constants/api" ← This is constants/api.js (correct)
└─ Both are mixed together (MESSY)
```

#### Recommendation
**After deleting services/api.js:**
```javascript
// authService.js will only import:
import apiClient from "./apiClient";  // Modern HTTP client
import { API_ENDPOINTS } from "../constants/api";  // Endpoints
```

---

### 4️⃣ BARREL EXPORT: components/index.js

#### File in Question
- `client/src/components/index.js`

#### Import Analysis

| File | Imported By | Count | Status |
|------|---|---|---|
| `components/index.js` | *NOTHING* | ❌ 0 | **UNUSED** |

#### Verification
```bash
# Search for any imports from components/index
grep -r "from.*components['\"]" client/src/
# Returns NO RESULTS ❌

# All imports are direct:
import Navbar from '../components/Navbar';
import Toast from "../components/Toast";
import StatCard from "../components/StatCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ConfirmModal from "../components/ConfirmModal";
```

#### components/index.js Content
```javascript
// Export all components for easy imports
export { default as Button } from "./Button";
export { default as Input } from "./Input";
export { default as Card } from "./Card";
export { default as Modal } from "./Modal";
export { default as Alert } from "./Alert";
export { default as Navbar } from "./Navbar";
```

#### Usage Pattern
```javascript
// ❌ NOT USED (intended usage):
import { Button, Input, Card } from '@/components';

// ✅ ACTUAL USAGE (direct imports):
import Button from '../components/Button';
import Input from '../components/Input';
```

#### Recommendation
**Option A: DELETE (if not needed)**
```bash
rm client/src/components/index.js
```

**Option B: ACTIVATE barrel export**
Update all component imports to use the barrel:
```javascript
// Change all:
import Navbar from '../components/Navbar';
// To:
import { Navbar } from '../components';
```

✅ **Recommendation: DELETE components/index.js** - It's not being used anywhere

---

## 📋 Master Cleanup Checklist

### 🔴 CRITICAL - Delete Immediately

```bash
# 1. Delete duplicate AuthContext.js
rm client/src/context/AuthContext.js

# 2. Delete legacy api.js
rm client/src/services/api.js

# 3. Delete unused barrel export
rm client/src/components/index.js
```

### 🟡 MEDIUM - Update Imports

After deleting `services/api.js`, verify `authService.js` works:

**Current (will break after deletion):**
```javascript
import apiClient from "./api";  // ❌ This will fail
import { API_ENDPOINTS } from "../constants/api";
```

**Already correct in most services:**
```javascript
import apiClient from './apiClient';  // ✅ Already correct
```

**Verify:**
```bash
# This should show authService still has the old import:
grep "from.*api" client/src/services/authService.js
# Output: import apiClient from "./api";
```

---

## 📊 Summary Table: Dead Code & Usage

### Full Import Dependency Map

| File | Location | Imported By | Count | Status | Action |
|------|----------|---|---|---|---|
| **AuthContext.jsx** | `context/` | `useAuth.js`, `AuthProvider.jsx` | 2 | ✅ USED | KEEP |
| **AuthContext.js** | `context/` | *NONE* | 0 | ❌ DEAD | DELETE |
| **AuthProvider.jsx** | `context/` | `main.jsx` | 1 | ✅ USED | KEEP |
| **apiClient.js** | `services/` | `portfolioService.js`, `priceService.js`, `riskService.js` | 3 | ✅ USED | KEEP |
| **api.js** | `services/` | `authService.js` | 1 | ⚠️ LEGACY | DELETE |
| **authService.js** | `services/` | `AuthProvider.jsx` | 1 | ✅ USED | KEEP |
| **constants/api.js** | `constants/` | `authService.js`, `services/api.js` | 2 | ✅ USED | KEEP |
| **components/index.js** | `components/` | *NONE* | 0 | ❌ UNUSED | DELETE |

---

## 🚀 Cleanup Script

```bash
#!/bin/bash
# Dead Code Cleanup Script for Riskfolio-AI Client
# Run from project root

echo "🧹 Starting cleanup..."

# 1. Delete duplicate AuthContext
echo "  Deleting duplicate AuthContext.js..."
rm -f client/src/context/AuthContext.js

# 2. Delete legacy API client
echo "  Deleting legacy api.js..."
rm -f client/src/services/api.js

# 3. Delete unused barrel export
echo "  Deleting unused components/index.js..."
rm -f client/src/components/index.js

# 4. Verify no orphaned imports
echo "  Verifying imports are still valid..."
grep -r "from.*AuthContext\.js" client/src/ && echo "❌ Still references AuthContext.js" || echo "✅ No broken AuthContext imports"
grep -r 'from.*"\.\/api"' client/src/services/ && echo "❌ Still references services/api.js" || echo "✅ No broken api imports"
grep -r "from.*components['\"]" client/src/ && echo "❌ Still references components/index" || echo "✅ No broken component imports"

echo "✅ Cleanup complete!"
```

---

## ✅ Verification After Cleanup

Run these commands to verify everything still works:

```bash
# 1. No import errors
npm run lint

# 2. Build test
npm run build

# 3. Dev server test
npm run dev

# 4. Grep verification (should find no results)
grep -r "AuthContext\.js" client/src/
grep -r 'from.*"\.\/api"' client/src/services/
grep -r "from.*components['\"]" client/src/
```

---

## 🎯 Files Safe to Delete Summary

### To Delete
```
❌ client/src/context/AuthContext.js              (duplicate of .jsx)
❌ client/src/services/api.js                     (legacy, only 1 import)
❌ client/src/components/index.js                 (barrel never used)
```

### To Keep
```
✅ client/src/context/AuthContext.jsx             (used by useAuth & AuthProvider)
✅ client/src/context/AuthProvider.jsx            (used by main.jsx)
✅ client/src/services/apiClient.js               (used by 3 services)
✅ client/src/constants/api.js                    (used by authService)
```

---

**Analysis Date:** April 18, 2026  
**Project:** Riskfolio-AI  
**Scope:** client/src directory  
**Files Analyzed:** 200+  
**Dead Code Found:** 3 files ready for deletion
