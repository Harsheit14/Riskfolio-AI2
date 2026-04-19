# 📊 Riskfolio-AI Import Trace Summary Table

**Quick Reference for Dead Code & Duplicate Files**

---

## Context Files Analysis

| File | Imported By | Safe to Delete? | Reason |
|------|---|---|---|
| `context/AuthContext.jsx` | `hooks/useAuth.js`, `context/AuthProvider.jsx` | ❌ NO | Primary implementation, actively used |
| `context/AuthContext.js` | NONE | ✅ **YES - DELETE** | Duplicate of AuthContext.jsx, never imported |
| `context/AuthProvider.jsx` | `main.jsx` | ❌ NO | Entry point for auth context |

**Details:**
- `AuthContext.jsx` and `AuthContext.js` are identical content
- Only `AuthContext.jsx` is being imported
- `AuthContext.js` is dead code

---

## Services: HTTP Client Files

| File | Imported By | Count | Safe to Delete? | Reason |
|------|---|---|---|---|
| `services/apiClient.js` | `portfolioService.js`, `priceService.js`, `riskService.js` | 3 | ❌ NO | Modern, active HTTP client (uses env vars) |
| `services/api.js` | `authService.js` | 1 | ✅ **YES - DELETE** | Legacy, only 1 import, use apiClient.js instead |

**Details:**
- `apiClient.js` uses environment variables (correct approach)
- `api.js` uses hardcoded constants (legacy approach)
- `authService.js` must be updated to import from `apiClient.js` instead of `api.js`

**Action Required After Deletion:**
```javascript
// In authService.js, change:
import apiClient from "./api";        // ❌ Delete this
// To:
import apiClient from "./apiClient";  // ✅ Use this instead
```

---

## Constants/API Configuration

| File | Imported By | Safe to Delete? | Reason |
|------|---|---|---|
| `constants/api.js` | `authService.js`, `services/api.js` | ❌ NO | Provides API_ENDPOINTS and API_BASE_URL |
| `services/api.js` | (see above) | ✅ **YES - DELETE** | When services/api.js is deleted, only authService uses constants/api.js |

**Details:**
- `constants/api.js` contains: `API_ENDPOINTS` (used) and `API_BASE_URL` (only used by legacy api.js)
- After deletion of `services/api.js`, `constants/api.js` will still be needed for API_ENDPOINTS

---

## Component Barrel Export

| File | Imported By | Safe to Delete? | Reason |
|------|---|---|---|
| `components/index.js` | NONE | ✅ **YES - DELETE** | Barrel export exists but is never used anywhere |

**Details:**
- All components are imported directly (e.g., `import Navbar from '../components/Navbar'`)
- No file imports from `components/index.js`
- The barrel export pattern is not used in this codebase

---

## Complete Deletion Checklist

### 🔴 DELETE (3 files)
- [ ] `client/src/context/AuthContext.js` - Duplicate, never imported
- [ ] `client/src/services/api.js` - Legacy, use apiClient.js instead
- [ ] `client/src/components/index.js` - Unused barrel export

### 🟡 UPDATE AFTER DELETION (1 file)
- [ ] `client/src/services/authService.js` - Change import from `"./api"` to `"./apiClient"`

### ✅ KEEP (7 files)
- [x] `client/src/context/AuthContext.jsx` - Active, used by hooks and provider
- [x] `client/src/context/AuthProvider.jsx` - Entry point for auth
- [x] `client/src/services/apiClient.js` - Active HTTP client
- [x] `client/src/hooks/useAuth.js` - Uses AuthContext
- [x] `client/src/constants/api.js` - Provides endpoints
- [x] All other service files - Used by components/pages
- [x] All component files - Used directly

---

## Quick Bash Commands

### Show which files import what:
```bash
# AuthContext usage
grep -r "from.*AuthContext" client/src/ --include="*.js" --include="*.jsx"

# API client usage
grep -r "from.*api" client/src/services/ --include="*.js" --include="*.jsx"

# Components/index usage
grep -r "from.*components['\"]" client/src/ --include="*.js" --include="*.jsx"
```

### Safe deletion:
```bash
# Delete duplicate context file
rm client/src/context/AuthContext.js

# Delete legacy API client
rm client/src/services/api.js

# Delete unused barrel export
rm client/src/components/index.js

# Update authService to use correct import
sed -i 's/from "\.\/api"/from ".\/apiClient"/g' client/src/services/authService.js
```

---

**Analysis Date:** April 18, 2026  
**Total Files Analyzed:** 200+  
**Dead Code Files Found:** 3  
**Duplicate Files:** 2  
**Status:** ✅ Ready for cleanup
