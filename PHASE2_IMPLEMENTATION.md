# RiskfolioAI - Phase 2: Core Engine Documentation

## Overview

Phase 2 implements the complete transaction and portfolio computation engine. The system dynamically calculates portfolio metrics from transactions without storing portfolio state in the database.

## Architecture

### Data Flow

```
User Request
    ↓
Transaction Controller
    ↓
Transaction Repository (DB)
    ↓
Portfolio Service
    ├→ Transaction Repository (get holdings)
    ├→ Asset Repository (get metadata)
    └→ Price Service (fetch current prices)
        └→ CoinGecko API (with 60s cache)
    ↓
Structured JSON Response
```

### Key Design Decisions

1. **Dynamic Portfolio Calculation**: Portfolio is computed on-demand from transactions, never stored
2. **FIFO Cost Basis**: Simplified FIFO model for sell orders and P&L calculation
3. **In-Memory Price Caching**: 60-second cache prevents repeated API calls
4. **Hardcoded userId = 1**: Authentication skipped for Phase 2 (ready for addition later)
5. **Modular Architecture**: Routes → Controllers → Services → Repositories

---

## API Endpoints

### 1. Transaction Management

#### Create Transaction
```
POST /api/transactions
Content-Type: application/json

Request Body:
{
  "asset": "BTC",
  "type": "BUY",
  "quantity": 0.5,
  "price": 45000
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "user_id": "uuid-user",
    "asset_id": "uuid-asset",
    "type": "BUY",
    "quantity": 0.5,
    "price_at_transaction": 45000,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Transaction created successfully"
}

Status Codes:
- 201: Created
- 400: Missing/invalid fields
- 404: Asset not found
- 500: Server error
```

#### Get All Transactions
```
GET /api/transactions

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid-1234",
      "user_id": "uuid-user",
      "asset_id": "uuid-asset",
      "type": "BUY",
      "quantity": 0.5,
      "price_at_transaction": 45000,
      "created_at": "2024-01-15T10:30:00Z"
    },
    // ... more transactions
  ],
  "message": "Transactions retrieved successfully"
}

Status Codes:
- 200: OK
- 500: Server error
```

#### Get Single Transaction
```
GET /api/transactions/:id

Response:
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "user_id": "uuid-user",
    "asset_id": "uuid-asset",
    "type": "BUY",
    "quantity": 0.5,
    "price_at_transaction": 45000,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Transaction retrieved successfully"
}

Status Codes:
- 200: OK
- 400: Missing ID
- 404: Transaction not found
- 500: Server error
```

#### Update Transaction
```
PUT /api/transactions/:id
Content-Type: application/json

Request Body:
{
  "type": "BUY",
  "quantity": 0.75,
  "price": 46000
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid-1234",
    "user_id": "uuid-user",
    "asset_id": "uuid-asset",
    "type": "BUY",
    "quantity": 0.75,
    "price_at_transaction": 46000,
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Transaction updated successfully"
}

Status Codes:
- 200: OK
- 400: Missing/invalid fields
- 401: Unauthorized (not owner)
- 404: Transaction not found
- 500: Server error
```

#### Delete Transaction
```
DELETE /api/transactions/:id

Response:
{
  "success": true,
  "data": {
    "id": "uuid-1234"
  },
  "message": "Transaction deleted successfully"
}

Status Codes:
- 200: OK
- 400: Missing ID
- 401: Unauthorized (not owner)
- 404: Transaction not found
- 500: Server error
```

---

### 2. Portfolio Endpoints

#### Get Portfolio Value
```
GET /api/portfolio/value

Response:
{
  "success": true,
  "data": {
    "totalValue": 92500.50,
    "totalInvested": 85000.00,
    "pnl": 7500.50,
    "pnlPercentage": 8.82,
    "assets": [
      {
        "symbol": "BTC",
        "quantity": 0.5,
        "avgBuyPrice": 45000,
        "currentPrice": 46000,
        "currentValue": 23000,
        "pnl": 500,
        "pnlPercentage": 1.11
      },
      {
        "symbol": "ETH",
        "quantity": 2.5,
        "avgBuyPrice": 2800,
        "currentPrice": 2880,
        "currentValue": 7200,
        "pnl": 200,
        "pnlPercentage": 2.86
      }
    ]
  },
  "message": "Portfolio value retrieved successfully"
}
```

#### Get Holdings
```
GET /api/portfolio/holdings

Response:
{
  "success": true,
  "data": {
    "BTC": {
      "quantity": 0.5,
      "totalCostBasis": 22500,
      "avgBuyPrice": 45000,
      "assetId": "uuid-btc",
      "coingeckoId": "bitcoin"
    },
    "ETH": {
      "quantity": 2.5,
      "totalCostBasis": 7000,
      "avgBuyPrice": 2800,
      "assetId": "uuid-eth",
      "coingeckoId": "ethereum"
    }
  },
  "message": "Holdings retrieved successfully"
}
```

#### Get Portfolio Performance
```
GET /api/portfolio/performance

Response:
{
  "success": true,
  "data": {
    "totalReturnPercentage": 8.82,
    "totalInvested": 85000.00,
    "currentValue": 92500.50,
    "unrealizedPnL": 7500.50,
    "exposure": [
      {
        "symbol": "BTC",
        "allocationPercentage": 24.86,
        "value": 23000,
        "quantity": 0.5
      },
      {
        "symbol": "ETH",
        "allocationPercentage": 7.78,
        "value": 7200,
        "quantity": 2.5
      }
    ],
    "summary": {
      "winningAssets": 2,
      "losingAssets": 0,
      "totalAssets": 2
    }
  },
  "message": "Portfolio performance retrieved successfully"
}
```

---

## Database Schema

### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    quantity NUMERIC(20,8) NOT NULL CHECK (quantity > 0),
    price_at_transaction NUMERIC(20,8) NOT NULL CHECK (price_at_transaction > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_asset ON transactions(asset_id);
CREATE INDEX idx_transactions_user_asset ON transactions(user_id, asset_id);
```

---

## Implementation Details

### Transaction Controller (`transactionController.js`)

Handles all transaction CRUD operations:
- `createTransaction()`: Validates input, finds asset, creates transaction
- `getTransactions()`: Fetches all user transactions ordered by date DESC
- `getTransactionById()`: Validates ownership, returns single transaction
- `updateTransaction()`: Validates ownership, updates fields
- `deleteTransaction()`: Validates ownership, deletes transaction

**Error Handling**:
- Missing fields → 400 Bad Request
- Asset not found → 404 Not Found
- Ownership violation → 401 Unauthorized
- Database errors → 500 Internal Server Error

### Transaction Repository (`transactionRepository.js`)

Database operations with transaction safety (BEGIN/ROLLBACK/COMMIT):
- `createTransaction()`: Inserts with full validation
- `getTransactionsByUser()`: Fetches all user transactions
- `getTransactionById()`: Fetches single transaction with ownership check
- `updateTransaction()`: Updates with ownership check and validation
- `deleteTransaction()`: Deletes with ownership check

### Portfolio Service (`portfolioService.js`)

Computes portfolio metrics dynamically:

1. **getUserHoldings()**: 
   - Fetches all user transactions
   - Calculates net holdings per asset (BUY - SELL)
   - Uses FIFO cost basis for accounting
   - Returns holdings object with metadata

2. **getPortfolioValue()**:
   - Gets current holdings
   - Fetches current prices from CoinGecko (with caching)
   - Calculates total value, P&L, ROI
   - Returns structured asset list sorted by value

3. **getPortfolioPerformance()**:
   - Builds on portfolio value
   - Calculates asset allocation percentages
   - Counts winning/losing positions
   - Returns performance analytics

### Price Service (`priceService.js`)

Manages cryptocurrency prices:

**Features**:
- 60-second in-memory cache per coin set
- Fallback to cached stale data if API fails
- Validates all API responses
- Handles multiple coins in single request

**Cache Structure**:
```javascript
priceCache = {
  current: Map {
    "bitcoin,ethereum" → { data: {...}, timestamp: 1234567890 }
  },
  historical: Map {
    "bitcoin-30" → { data: [...], timestamp: 1234567890 }
  }
}
```

---

## Error Handling Strategy

### Transaction CRUD Errors

| Error | Status | Message |
|-------|--------|---------|
| Missing fields | 400 | "Missing required fields: ..." |
| Invalid type | 400 | "Type must be BUY or SELL" |
| Invalid quantity/price | 400 | "Quantity and price must be > 0" |
| Asset not found | 404 | "Asset BTC not found" |
| Transaction not found | 404 | "Transaction not found" |
| Ownership violation | 401 | "Unauthorized: Transaction does not belong to user" |
| Database error | 500 | "Failed to [operation]: [error]" |

### Portfolio Calculation Errors

| Error | Response |
|-------|----------|
| No transactions | Empty portfolio (totalValue: 0) |
| Missing asset metadata | Skipped in calculation |
| CoinGecko API down | Cached prices used (fallback) |
| Invalid price data | Error thrown (500) |

---

## Testing Guide

### Prerequisites

1. Database running with schema loaded
2. Assets created:
   ```sql
   INSERT INTO assets (symbol, name, coingecko_id) VALUES
   ('BTC', 'Bitcoin', 'bitcoin'),
   ('ETH', 'Ethereum', 'ethereum'),
   ('ADA', 'Cardano', 'cardano');
   ```

3. User exists (userId = 1)

### Test Scenarios

#### Scenario 1: Create and Fetch Transactions
```bash
# Create BUY transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "BTC",
    "type": "BUY",
    "quantity": 0.5,
    "price": 45000
  }'

# Create SELL transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "BTC",
    "type": "SELL",
    "quantity": 0.1,
    "price": 46000
  }'

# Fetch all transactions
curl -X GET http://localhost:5000/api/transactions

# Expected: Both transactions returned, ordered by date DESC
```

#### Scenario 2: Portfolio Value Calculation
```bash
# Fetch portfolio value
curl -X GET http://localhost:5000/api/portfolio/value

# Expected:
# - totalValue > 0 (quantity * currentPrice)
# - totalInvested > 0 (sum of all BUYs at cost)
# - pnl = totalValue - totalInvested
# - pnlPercentage = (pnl / totalInvested) * 100
# - assets sorted by value DESC
```

#### Scenario 3: Update Transaction
```bash
# Get transaction ID from GET /api/transactions
TXID="<uuid-from-list>"

# Update transaction
curl -X PUT http://localhost:5000/api/transactions/$TXID \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BUY",
    "quantity": 0.6,
    "price": 45500
  }'

# Verify portfolio recalculates with new quantity
curl -X GET http://localhost:5000/api/portfolio/value
```

#### Scenario 4: Delete Transaction
```bash
# Delete transaction
curl -X DELETE http://localhost:5000/api/transactions/$TXID

# Verify deleted
curl -X GET http://localhost:5000/api/transactions/$TXID
# Expected: 404 Not Found

# Verify portfolio updated
curl -X GET http://localhost:5000/api/portfolio/value
```

#### Scenario 5: Price Caching (60s)
```bash
# First request (hits API)
time curl -X GET http://localhost:5000/api/portfolio/value

# Second request within 60s (uses cache)
time curl -X GET http://localhost:5000/api/portfolio/value
# Expected: ~10x faster

# Third request after 60s (hits API again)
sleep 61
time curl -X GET http://localhost:5000/api/portfolio/value
```

---

## Code Structure

```
server/
├── controllers/
│   ├── authController.js
│   ├── portfolioController.js
│   ├── riskController.js
│   └── transactionController.js       ← NEW
├── repositories/
│   ├── assetRepository.js
│   ├── transactionRepository.js       ← EXTENDED
│   └── userRepository.js
├── routes/
│   ├── authRoutes.js
│   ├── portfolioRoutes.js
│   ├── riskRoutes.js
│   └── transactionRoutes.js           ← NEW
├── services/
│   ├── portfolioService.js            ← COMPLETE
│   ├── priceService.js                ← COMPLETE
│   └── riskService.js
├── config/
│   ├── db.js
│   ├── env.js
│   └── schema.sql
├── index.js                           ← UPDATED
└── .env
```

---

## Next Steps (Phase 3)

1. **JWT Authentication**: Replace hardcoded userId = 1 with JWT middleware
2. **Risk Metrics**: Implement volatility, Sharpe ratio, maximum drawdown
3. **Frontend Integration**: Connect React frontend to all endpoints
4. **Advanced Reporting**: Tax reports, performance attribution, alerts
5. **Cost Optimization**: Database query optimization, API rate limiting

---

## Notes

- All timestamps stored in UTC
- Prices always in USD
- Quantities and prices support 8 decimal places (crypto precision)
- Portfolio computation is O(n) where n = number of transactions
- CoinGecko free tier: 10-50 calls/minute (adequate with caching)
