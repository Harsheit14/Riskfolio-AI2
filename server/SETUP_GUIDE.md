# Riskfolio-AI Backend Setup & Run Guide

## Prerequisites

- **Node.js** v18+ (with npm)
- **PostgreSQL** v12+
- **Git**

---

## PHASE 1: Database Setup

### Step 1: Create Database

```bash
createdb Crypto_db
```

**Verify:**
```bash
psql -U postgres -l | grep Crypto_db
```

### Step 2: Create Schema & Tables

Navigate to server directory:
```bash
cd server
```

Run the schema:
```bash
psql -U postgres -d Crypto_db -f config/schema.sql
```

**Verify tables created:**
```bash
psql -U postgres -d Crypto_db -c "\dt"
```

You should see:
```
 users
 assets
 transactions
```

---

## PHASE 2: Backend Installation & Configuration

### Step 1: Install Dependencies

```bash
cd server
npm install
```

**Installed packages:**
- express (web framework)
- pg (PostgreSQL client)
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- cors (cross-origin requests)
- dotenv (environment variables)

### Step 2: Verify .env File

```bash
cat .env
```

Should contain:
```
PORT=5000
DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

**⚠️  IMPORTANT:**
- For production, change `JWT_SECRET` to a strong random value
- Never commit real secrets to git

### Step 3: Test Database Connection

```bash
npm start
```

Expected output:
```
✅ Database connection successful
✅ Server running on port 5000
ℹ️  API Base: http://localhost:5000/api
```

If connection fails:
```
❌ FATAL: Cannot start server - [error message]
```

Common issues:
1. **PostgreSQL not running:** `brew services start postgresql`
2. **Database doesn't exist:** `createdb Crypto_db`
3. **Schema not created:** `psql -U postgres -d Crypto_db -f config/schema.sql`
4. **Wrong password:** Check `.env` DATABASE_URL

---

## PHASE 3: Test Endpoints

Keep server running, open new terminal:

### Test 1: Server Health

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{ "status": "OK" }
```

### Test 2: Register New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Expected response:
```json
{
  "data": {
    "message": "User created successfully"
  }
}
```

**Possible errors:**
- `400 Bad Request` - Missing email/password or password < 8 chars
- `409 Conflict` - User already exists

### Test 3: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Expected response (save the token):
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Test 4: Create Transaction (Protected Route)

Replace `<YOUR_TOKEN>` with token from Test 3:

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "asset": "BTC",
    "type": "BUY",
    "quantity": 0.5,
    "price": 45000
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "asset_id": 1,
    "type": "BUY",
    "quantity": 0.5,
    "price_at_transaction": 45000,
    "created_at": "2026-04-18T12:00:00.000Z"
  },
  "message": "Transaction created successfully"
}
```

### Test 5: Get Portfolio Holdings (Protected Route)

```bash
curl -X GET http://localhost:5000/api/portfolio/holdings \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "BTC": {
      "quantity": 0.5,
      "totalCostBasis": 22500,
      "avgBuyPrice": 45000,
      "assetId": 1,
      "coingeckoId": "bitcoin"
    }
  },
  "message": "Holdings retrieved successfully"
}
```

### Test 6: Test SELL with Insufficient Balance (Should Fail)

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "asset": "BTC",
    "type": "SELL",
    "quantity": 1.0,
    "price": 50000
  }'
```

Expected error response:
```json
{
  "error": "Insufficient holdings. Available: 0.5, Trying to sell: 1"
}
```

✅ **This confirms SELL validation is working!**

---

## Quick Reference: All Endpoints

### Public Routes (No Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Sign in and get JWT token |

### Protected Routes (Auth Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/transactions` | Create BUY/SELL transaction |
| `GET` | `/api/transactions` | Get transaction history |
| `GET` | `/api/portfolio/holdings` | Get current holdings |
| `GET` | `/api/portfolio/value` | Get portfolio value & P&L |
| `GET` | `/api/portfolio/performance` | Get performance metrics |
| `GET` | `/api/risk` | Get risk report |

---

## Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# If not, start it
brew services start postgresql

# Test connection
psql -U postgres -d Crypto_db -c "SELECT 1"
```

### Issue: "No such table: users"

**Solution:**
```bash
# Run schema again
psql -U postgres -d Crypto_db -f server/config/schema.sql

# Verify
psql -U postgres -d Crypto_db -c "\dt"
```

### Issue: "Invalid token" on protected routes

**Solution:**
1. Make sure token is from recent login
2. Token expires in 7 days (JWT_EXPIRES_IN in .env)
3. Include `Authorization: Bearer <token>` header

### Issue: Server crashes on startup

**Solution:**
1. Check .env file exists and has DATABASE_URL
2. Check database exists: `psql -U postgres -l`
3. Check schema is created: `psql -U postgres -d Crypto_db -c "\dt"`
4. Check PostgreSQL credentials in DATABASE_URL match your setup

---

## Development Workflow

### Run with Auto-Reload (Recommended)

```bash
npm run dev
```

Requires `nodemon` (already in devDependencies)

### Manual Mode

```bash
npm start
```

### View Logs

Server logs go to console:
```
✅ Server running on port 5000
[2026-04-18T12:00:00.000Z] POST /api/auth/login
```

---

## What's Fixed in This Version

✅ Database connection properly required on startup  
✅ Environment variables loaded from .env  
✅ Pool exports correctly (no more connection errors)  
✅ SELL transactions validated (prevents overdraft)  
✅ Risk calculations annualized  
✅ Input validation on quantity/price  
✅ Consistent error responses  
✅ Database schema with proper constraints  
✅ Foreign key relationships enforced  
✅ Indexes created for performance  

---

## Next Steps

1. **Frontend Integration:** Connect React frontend to these endpoints
2. **Real Crypto Prices:** Implement CoinGecko API integration
3. **Testing:** Add unit/integration tests
4. **Deployment:** Deploy to production (Heroku, AWS, DigitalOcean, etc.)
5. **Security:** Add rate limiting, input sanitization, helmet.js

---

## Support

For issues, check:
1. `.env` file configuration
2. PostgreSQL running (`pg_isready`)
3. Database schema exists (`\dt` in psql)
4. Network connectivity (curl http://localhost:5000/api/health)

**Server Health Status:** The `/api/health` endpoint should always return `{ status: "OK" }`
