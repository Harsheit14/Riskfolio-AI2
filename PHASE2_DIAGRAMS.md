# Phase 2 - Architecture Diagrams & Data Flows

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Frontend)                          │
│                    React App (Future Integration)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                    HTTP/REST Requests
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                          EXPRESS SERVER                              │
│                       (Node.js on port 5000)                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        ROUTES LAYER                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  /api/transactions/:id                                       │   │
│  │  ├─ POST   → createTransaction()                            │   │
│  │  ├─ GET    → getTransactions()                              │   │
│  │  ├─ GET    → getTransactionById(id)                         │   │
│  │  ├─ PUT    → updateTransaction(id)                          │   │
│  │  └─ DELETE → deleteTransaction(id)                          │   │
│  │                                                               │   │
│  │  /api/portfolio/:endpoint                                    │   │
│  │  ├─ GET /value        → getPortfolioValue()                 │   │
│  │  ├─ GET /holdings     → getHoldings()                       │   │
│  │  └─ GET /performance  → getPerformance()                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                   Request Validation                                 │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                     CONTROLLER LAYER                         │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  transactionController.js                                   │   │
│  │  ├─ createTransaction() - Validate, call repo               │   │
│  │  ├─ getTransactions() - Call repo                           │   │
│  │  ├─ getTransactionById() - Validate, call repo              │   │
│  │  ├─ updateTransaction() - Validate, call repo               │   │
│  │  └─ deleteTransaction() - Validate, call repo               │   │
│  │                                                               │   │
│  │  portfolioController.js                                     │   │
│  │  ├─ getHoldings() - Call service                            │   │
│  │  ├─ getPortfolioValue() - Call service                      │   │
│  │  └─ getPerformance() - Call service                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│              Business Logic Execution                                │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                      SERVICE LAYER                           │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  portfolioService.js                                        │   │
│  │  ├─ getUserHoldings()        [Aggregate data]               │   │
│  │  ├─ getPortfolioValue()      [Compute metrics]              │   │
│  │  └─ getPortfolioPerformance() [Analytics]                   │   │
│  │        │                                                      │   │
│  │        └─→ priceService.js                                  │   │
│  │            ├─ getCurrentPrices() [Cache, API call]          │   │
│  │            └─ getHistoricalPrices() [Historical]            │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│            Data Retrieval & Transformation                           │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐   │
│  │                    REPOSITORY LAYER                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  transactionRepository.js                                   │   │
│  │  ├─ createTransaction(userId, assetId, ...)                 │   │
│  │  ├─ getTransactionsByUser(userId)                           │   │
│  │  ├─ getTransactionById(userId, id)                          │   │
│  │  ├─ updateTransaction(userId, id, ...)                      │   │
│  │  └─ deleteTransaction(userId, id)                           │   │
│  │                                                               │   │
│  │  assetRepository.js                                         │   │
│  │  ├─ getAllAssets()                                           │   │
│  │  ├─ getAssetBySymbol(symbol)                                │   │
│  │  └─ createAsset(symbol, name, coingeckoId)                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                             │                                        │
│                   SQL Queries (with TX safety)                       │
│                             │                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                         POSTGRESQL DATABASE                          │
│                    (localhost:5432, Crypto_db)                      │
├──────────────────────────────────────────────────────────────────────┤
│  users                  transactions              assets             │
│  ├─ id (PK)            ├─ id (PK)                ├─ id (PK)        │
│  ├─ email              ├─ user_id (FK)           ├─ symbol         │
│  ├─ password_hash      ├─ asset_id (FK)          ├─ name           │
│  └─ created_at         ├─ type (BUY/SELL)        ├─ coingecko_id   │
│                        ├─ quantity               └─ created_at     │
│                        ├─ price_at_transaction                     │
│                        └─ created_at                               │
│                                                                     │
│  Indexes:                                                          │
│  ├─ idx_transactions_user                                         │
│  ├─ idx_transactions_asset                                        │
│  └─ idx_transactions_user_asset                                   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                    (From priceService)
                           │
┌────────────────────────────▼────────────────────────────────────────┐
│                      EXTERNAL APIs                                   │
├──────────────────────────────────────────────────────────────────────┤
│  CoinGecko API (Free Tier)                                          │
│  ├─ /simple/price (Current prices)                                 │
│  │   └─ 60s in-memory cache                                        │
│  └─ /coins/{id}/market_chart (Historical)                          │
│      └─ 60s in-memory cache                                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Transaction Creation Flow

```
CLIENT REQUEST
    │
    └─→ POST /api/transactions
        {
          "asset": "BTC",
          "type": "BUY",
          "quantity": 0.5,
          "price": 45000
        }
            │
            ▼
        transactionController.createTransaction()
            │
            ├─→ Validate input
            │   ├─ Check asset exists
            │   ├─ Check type ∈ [BUY, SELL]
            │   ├─ Check quantity > 0
            │   ├─ Check price > 0
            │   └─ Return 400 if invalid
            │
            ├─→ assetRepository.getAssetBySymbol("BTC")
            │   └─ Query: SELECT * FROM assets WHERE symbol = 'BTC'
            │       ├─ Found → Get asset ID
            │       └─ Not found → Return 404
            │
            ├─→ transactionRepository.createTransaction()
            │   │
            │   ├─→ BEGIN TRANSACTION (DB safety)
            │   │
            │   ├─→ INSERT INTO transactions
            │   │   (user_id, asset_id, type, quantity, price_at_transaction)
            │   │   VALUES (1, <asset_id>, 'BUY', 0.5, 45000)
            │   │
            │   ├─→ COMMIT (if success)
            │   │
            │   └─→ ROLLBACK (if error)
            │
            └─→ Return 201 Created
                {
                  "id": "uuid-1234",
                  "user_id": "uuid-user",
                  "asset_id": "uuid-asset",
                  "type": "BUY",
                  "quantity": 0.5,
                  "price_at_transaction": 45000,
                  "created_at": "2024-01-15T10:30:00Z"
                }
```

---

## Portfolio Value Calculation Flow

```
CLIENT REQUEST
    │
    └─→ GET /api/portfolio/value
            │
            ▼
        portfolioController.getPortfolioValue()
            │
            ├─→ portfolioService.getPortfolioValue(userId=1)
            │   │
            │   ├─→ portfolioService.getUserHoldings(userId=1)
            │   │   │
            │   │   ├─→ transactionRepository.getTransactionsByUser(1)
            │   │   │   └─ Query: SELECT * FROM transactions WHERE user_id = 1
            │   │   │       Returns: [
            │   │   │         {id: 1, type: BUY, asset: bitcoin, qty: 0.5, price: 45000},
            │   │   │         {id: 2, type: SELL, asset: bitcoin, qty: 0.1, price: 46000}
            │   │   │       ]
            │   │   │
            │   │   ├─→ Calculate Net Holdings
            │   │   │   ├─ BTC: 0.5 (BUY) - 0.1 (SELL) = 0.4
            │   │   │   ├─ Cost Basis: (0.5 × 45000) - (0.1 × 45000) = 18000
            │   │   │   └─ Avg Buy Price: 18000 / 0.4 = 45000
            │   │   │
            │   │   ├─→ assetRepository.getAllAssets()
            │   │   │   └─ Query: SELECT * FROM assets
            │   │   │       Returns: [{id: a1, symbol: BTC, coingecko_id: bitcoin}, ...]
            │   │   │
            │   │   └─→ Return: {
            │   │       "BTC": {
            │   │         quantity: 0.4,
            │   │         totalCostBasis: 18000,
            │   │         avgBuyPrice: 45000,
            │   │         coingeckoId: "bitcoin"
            │   │       }
            │   │     }
            │   │
            │   ├─→ priceService.getCurrentPrices(["bitcoin"])
            │   │   │
            │   │   ├─→ Create cache key: "bitcoin"
            │   │   │
            │   │   ├─→ Check cache
            │   │   │   ├─ If cached && < 60s old → Return cached price
            │   │   │   └─ If expired or missing → Call API
            │   │   │
            │   │   ├─→ Call CoinGecko API
            │   │   │   GET /simple/price?ids=bitcoin&vs_currencies=usd
            │   │   │   Response: {"bitcoin": {"usd": 46000}}
            │   │   │
            │   │   ├─→ Store in cache with timestamp
            │   │   │
            │   │   └─→ Return: {"bitcoin": 46000}
            │   │
            │   ├─→ Calculate Portfolio Metrics
            │   │   ├─ For each asset:
            │   │   │  ├─ currentValue = 0.4 × 46000 = 18400
            │   │   │  ├─ pnl = 18400 - 18000 = 400
            │   │   │  ├─ pnlPercentage = (400 / 18000) × 100 = 2.22%
            │   │   │
            │   │   ├─ totalValue = 18400
            │   │   ├─ totalInvested = 18000
            │   │   ├─ totalPnL = 400
            │   │   ├─ totalROI% = 2.22%
            │   │
            │   └─→ Return: {
            │       "totalValue": 18400,
            │       "totalInvested": 18000,
            │       "pnl": 400,
            │       "pnlPercentage": 2.22,
            │       "assets": [
            │         {
            │           "symbol": "BTC",
            │           "quantity": 0.4,
            │           "avgBuyPrice": 45000,
            │           "currentPrice": 46000,
            │           "currentValue": 18400,
            │           "pnl": 400,
            │           "pnlPercentage": 2.22
            │         }
            │       ]
            │     }
            │
            └─→ Return 200 OK with portfolio data
```

---

## Price Caching Logic

```
priceService.getCurrentPrices(["bitcoin", "ethereum"])
    │
    ├─→ Sort coin IDs: ["bitcoin", "ethereum"]
    │   Create cache key: "bitcoin,ethereum"
    │
    ├─→ Check priceCache.current.get("bitcoin,ethereum")
    │   │
    │   ├─ If found AND timestamp + 60000ms > Date.now()
    │   │   └─→ CACHE HIT: Return cached.data immediately (~1ms)
    │   │
    │   └─ If not found OR timestamp expired
    │       │
    │       ├─→ Call CoinGecko API
    │       │   GET https://api.coingecko.com/api/v3/simple/price
    │       │   ?ids=bitcoin,ethereum
    │       │   &vs_currencies=usd
    │       │
    │       ├─→ Parse response: {"bitcoin": {"usd": 46000}, "ethereum": {"usd": 2880}}
    │       │
    │       ├─→ Store in cache
    │       │   priceCache.current.set("bitcoin,ethereum", {
    │       │     data: {bitcoin: 46000, ethereum: 2880},
    │       │     timestamp: Date.now()
    │       │   })
    │       │
    │       └─→ Return prices: {bitcoin: 46000, ethereum: 2880}
    │
    └─→ If API fails AND cache exists
        └─→ Graceful fallback: Return stale cached prices
```

---

## Error Handling Flow

```
CREATE TRANSACTION Error Scenarios
│
├─→ Missing/Invalid Input (400 Bad Request)
│   │
│   ├─ Missing fields → "Missing required fields: asset, type, quantity, price"
│   ├─ Invalid type → "Type must be BUY or SELL"
│   ├─ Invalid quantity → "Quantity and price must be greater than 0"
│   └─ Invalid price → "Quantity and price must be greater than 0"
│
├─→ Asset Not Found (404 Not Found)
│   │
│   ├─ Query: SELECT * FROM assets WHERE symbol = 'INVALID'
│   ├─ Result: No rows
│   └─ Response: "Asset INVALID not found. Please create asset first."
│
├─→ Database Error (500 Internal Server Error)
│   │
│   ├─ On INSERT failure
│   ├─ ROLLBACK transaction
│   └─ Response: "Failed to create transaction: [error message]"
│
└─→ Ownership Verification (401 Unauthorized) [for UPDATE/DELETE]
    │
    ├─ Check: SELECT user_id FROM transactions WHERE id = ?
    ├─ If user_id ≠ requested userId
    └─ Response: "Unauthorized: Transaction does not belong to user"
```

---

## Database Transaction Safety

```
transactionRepository.createTransaction()
    │
    ├─→ client.query("BEGIN")
    │   └─ Start database transaction
    │
    ├─→ client.query("INSERT INTO transactions ...")
    │   ├─ If successful → Continue
    │   └─ If error → Jump to ROLLBACK
    │
    ├─→ client.query("COMMIT")
    │   └─ Confirm all changes (atomic)
    │
    └─→ ON ERROR: client.query("ROLLBACK")
        └─ Undo all changes (no partial state)

Benefit:
├─ All-or-nothing execution (atomic)
├─ No data inconsistency
├─ Safe for concurrent requests
└─ Ready for multi-server deployment
```

---

## Request/Response Cycle

```
REQUEST TIMELINE
│
├─ T=0ms: Client sends HTTP POST
│
├─ T=1ms: Express receives request
│
├─ T=2ms: Route dispatches to controller
│
├─ T=3-5ms: Controller validates input
│         (Payload validation)
│
├─ T=6-10ms: Controller calls repository
│          (Database query execution)
│
├─ T=11-20ms: Repository executes SQL
│           ├─ BEGIN TRANSACTION
│           ├─ INSERT/UPDATE/DELETE
│           └─ COMMIT
│
├─ T=21-50ms: Service processes result (if needed)
│           (Calculations, transformations)
│
├─ T=51ms: Response formatted as JSON
│
└─ T=52ms: HTTP 201/200/400/401/500 sent to client

Typical Total Time:
├─ CRUD operations: 10-50ms
├─ Portfolio calculation (with cache): 50-100ms
├─ Portfolio calculation (no cache): 200-500ms (API call)
└─ Price cache hit: 1-5ms
```

---

## Data Model Relationships

```
users (1) ────────── (many) transactions
   │                           │
   │ id (PK)                   ├─ id (PK)
   ├─ email                    ├─ user_id (FK)
   ├─ password_hash            ├─ asset_id (FK)
   └─ created_at               ├─ type
                               ├─ quantity
                               ├─ price_at_transaction
                               └─ created_at

assets (1) ────────── (many) transactions
   │                          │
   ├─ id (PK)                 ├─ id (PK)
   ├─ symbol (UNIQUE)         ├─ user_id (FK)
   ├─ name                     ├─ asset_id (FK)
   ├─ coingecko_id (UNIQUE)    ├─ type
   └─ created_at              ├─ quantity
                              ├─ price_at_transaction
                              └─ created_at

Constraints:
├─ FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
├─ FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
├─ CHECK (type IN ('BUY', 'SELL'))
├─ CHECK (quantity > 0)
└─ CHECK (price_at_transaction > 0)

Indexes:
├─ PRIMARY KEY (id)
├─ UNIQUE (users.email)
├─ UNIQUE (assets.symbol)
├─ UNIQUE (assets.coingecko_id)
├─ idx_transactions_user
├─ idx_transactions_asset
└─ idx_transactions_user_asset
```

---

## Caching Strategy Timeline

```
MINUTE 1:
├─ T=0s: Request portfolio value
│ └─ Price cache MISS → Call CoinGecko API (200-500ms)
│    ├─ API returns: {bitcoin: 46000, ethereum: 2880}
│    └─ Store in cache with timestamp = 0s
│
├─ T=5s: Request portfolio value again
│ └─ Price cache HIT (timestamp 5s < 60s) → Return cached (1ms)
│
├─ T=25s: Request portfolio value again
│ └─ Price cache HIT (timestamp 25s < 60s) → Return cached (1ms)
│
├─ T=59s: Request portfolio value again
│ └─ Price cache HIT (timestamp 59s < 60s) → Return cached (1ms)

MINUTE 2:
├─ T=60s: Request portfolio value again
│ └─ Price cache MISS (timestamp 60s ≥ 60s) → Call CoinGecko API again
│    └─ Repeats the caching cycle
│
└─ Result: 1 API call per coin set per 60 seconds
           (vs. 60+ calls if no cache)
           = 98%+ API call reduction
```

---

**Generated**: January 2024
**Version**: Phase 2 Complete
