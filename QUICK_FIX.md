# 🚀 QUICK FIX REFERENCE

## THE PROBLEM IN ONE SENTENCE
**Your backend is running with fake in-memory data instead of connecting to PostgreSQL database.**

---

## THE FIX IN 5 COMMANDS

```bash
# 1. Start PostgreSQL
brew services start postgresql@15

# 2. Create database
psql -U postgres -h localhost -c "CREATE DATABASE \"Crypto_db\";"

# 3. Kill old backend
pkill -f "node index.js"

# 4. Start backend (will now FAIL with clear error if DB is broken, or START if DB is good)
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server && npm start

# 5. Test in another terminal
curl http://localhost:5001/api/health
```

---

## IF PASSWORD ERROR OCCURS

```bash
# Reset PostgreSQL password
psql -U postgres -h localhost
ALTER USER postgres WITH PASSWORD 'harsh';
\q

# Try backend again
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server && npm start
```

---

## WHAT YOU'LL SEE WHEN IT WORKS ✅

```
✅ Database connection successful
✅ Database timestamp: 2026-04-18T...
✅ RISKFOLIO-AI BACKEND (PRODUCTION-READY - PHASE 4 INFRASTRUCTURE)
📍 Server running on port 5001
```

---

## WHAT CHANGED IN THE CODE

### `server/config/db.js`
- ❌ OLD: Silently continues with mock data if DB connection fails
- ✅ NEW: **FAILS with clear error message** showing exactly what's wrong

This makes debugging 100x easier.

---

## VERIFY POSTGRESQL IS READY

```bash
# Check PostgreSQL is running
brew services list | grep postgres
# Should show: postgresql@15 ... started

# Test connection
psql -U postgres -h localhost -c "SELECT 1;"
# Should show: (1 row) with no errors

# Verify database exists
psql -U postgres -h localhost -l | grep Crypto_db
# Should show: Crypto_db | postgres | UTF8 ...
```

---

## FILES TO READ FOR DETAILS

1. **`PROBLEM_AND_SOLUTION.md`** - Full explanation with all steps
2. **`DATABASE_CONNECTION_ISSUE.md`** - Detailed diagnostic guide
3. **`setup-postgres.sh`** - Automated setup script

---

## STATUS

| Component | Status | Next Action |
|-----------|--------|-------------|
| Backend Code | ✅ FIXED | Start PostgreSQL |
| PostgreSQL | 🔴 UNKNOWN | Run: `brew services list` |
| Database | 🔴 UNKNOWN | Run: `psql -U postgres -l` |
| .env | ✅ READY | Keep as-is |

**START HERE:** `brew services start postgresql@15` then run backend
