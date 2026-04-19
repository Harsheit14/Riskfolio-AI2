# Unrealized P&L - Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                          │
│              (DashboardPage Component)                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ State: portfolioData                                 │  │
│  │ - totalValue, totalInvested, totalPnL,              │  │
│  │ - pnlPercentage (← NEW)                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ useEffect() → fetch /portfolio/summary              │  │
│  │                                                      │  │
│  │ const pnlPercentage = portfolioData?.pnlPercentage  │  │
│  │                                 || 0;               │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ <StatCard>                                           │  │
│  │   title="Unrealized P&L"                            │  │
│  │   value="${totalPnL.toFixed(2)}"                    │  │
│  │   trendPercent={pnlPercentage}  (← NEW)             │  │
│  │   trend={up|down}  (← NEW)                          │  │
│  │   color={green|red}                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │
                    GET /api/portfolio/summary
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend                          │
│            (portfolioController.js)                         │
│                                                             │
│  getPortfolioSummary(req, res)                             │
│  ├─ Get userId from JWT token                             │
│  ├─ Call portfolioService.getPortfolioSummary(userId)     │
│  └─ Return: { success, data, message }                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │
┌─────────────────────────────────────────────────────────────┐
│              Portfolio Service                              │
│        (portfolioService.js)                               │
│                                                             │
│ getPortfolioSummary(userId):                              │
│                                                             │
│  1. Fetch transactions from DB                            │
│     └─ SELECT * FROM transactions WHERE user_id = $1     │
│                                                             │
│  2. Group by asset & aggregate                            │
│     ├─ For each BUY: quantity += qty, invested += total  │
│     └─ For each SELL: quantity -= qty                    │
│                                                             │
│  3. Filter assets with quantity > 0                       │
│                                                             │
│  4. Fetch real-time prices                                │
│     └─ priceService.getCurrentPrices([coins...])         │
│                                                             │
│  5. Calculate per-asset values                            │
│     ├─ currentValue = quantity × currentPrice            │
│     ├─ assetPnL = currentValue - invested                │
│     └─ assetPnLPercentage = (assetPnL / invested) × 100  │
│                                                             │
│  6. Aggregate portfolio totals                            │
│     ├─ totalValue = sum(all currentValue)                │
│     ├─ totalInvested = sum(all invested)                 │
│     ├─ totalPnL = sum(all assetPnL)                      │
│     └─ pnlPercentage = (totalPnL / totalInvested) × 100  │
│             ↑ (← NEW - WAS MISSING)                       │
│                                                             │
│  7. Round to 2 decimals via round2()                      │
│                                                             │
│  8. Return complete portfolio summary:                     │
│     {                                                      │
│       totalValue,                                         │
│       totalInvested,                                      │
│       totalPnL,                                           │
│       pnlPercentage,  ← NEW FIELD                         │
│       assets: [...]                                       │
│     }                                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑
         │              │              │
    Transactions    Assets         Prices
         │              │              │
         ↓              ↓              ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL   │  │ PostgreSQL   │  │ Gecko API    │
│              │  │              │  │ (cached)     │
│ transactions │  │ assets       │  │              │
│ table        │  │ table        │  │ Real-time    │
│              │  │              │  │ prices       │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Data Flow Diagram

```
User Action: Portfolio data needed
                    │
                    ↓
        ┌───────────────────────┐
        │ DashboardPage.jsx      │
        │ (React Component)      │
        └───────────┬───────────┘
                    │
                    │ useEffect()
                    │
                    ↓
        ┌───────────────────────┐
        │ apiClient.get()        │
        │ ('/portfolio/summary') │
        └───────────┬───────────┘
                    │
                    │ HTTP GET
                    │
                    ↓ 
        ┌───────────────────────────────┐
        │ Backend: portfolioController  │
        │ getPortfolioSummary()         │
        └───────────┬───────────────────┘
                    │
                    │ Calls
                    ↓
        ┌───────────────────────────────┐
        │ Backend: portfolioService     │
        │ getPortfolioSummary()         │
        └───────────┬───────────────────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
         ↓          ↓          ↓
    ┌────────┐ ┌────────┐ ┌─────────┐
    │Trans   │ │Assets  │ │ Prices  │
    │actions │ │Metadata│ │Service  │
    │ DB     │ │ DB     │ │ (Real-  │
    │        │ │        │ │  time)  │
    └────────┘ └────────┘ └─────────┘
         │          │          │
         └──────────┼──────────┘
                    │
                    ↓ (All data gathered)
        ┌──────────────────────────────┐
        │ Calculate:                   │
        │ 1. Group transactions        │
        │ 2. Aggregate quantities      │
        │ 3. Sum investments           │
        │ 4. Calculate values          │
        │ 5. Compute P&L               │
        │ 6. Calculate percentage ← NEW│
        │ 7. Round to 2 decimals       │
        └──────────┬───────────────────┘
                    │
                    ↓
        ┌──────────────────────────────┐
        │ Return Response:             │
        │ {                            │
        │   totalValue: 26500.00,      │
        │   totalInvested: 25000.00,   │
        │   totalPnL: 1500.00,         │
        │   pnlPercentage: 6.00, ← NEW │
        │   assets: [...]              │
        │ }                            │
        └──────────┬───────────────────┘
                    │
                    │ HTTP Response
                    │
                    ↓
        ┌───────────────────────────────┐
        │ Frontend: DashboardPage.jsx   │
        │                               │
        │ setPortfolioData(response)    │
        │ const pnlPercentage = ← NEW   │
        │   portfolioData              │
        │   ?.pnlPercentage || 0       │
        └──────────┬────────────────────┘
                    │
                    │ Render
                    ↓
        ┌───────────────────────────────┐
        │ <StatCard>                    │
        │ title="Unrealized P&L"        │
        │ value="$1,500.00"             │
        │ trendPercent=6.00  ← NEW      │
        │ trend="up"         ← NEW      │
        │ color="green"                 │
        └───────────────────────────────┘
                    │
                    ↓
        ┌───────────────────────────────┐
        │ Display on Dashboard:         │
        │                               │
        │ ┌─────────────────────────┐   │
        │ │ Unrealized P&L          │   │
        │ ├─────────────────────────┤   │
        │ │ $1,500.00       ↑ 6%    │   │
        │ ├─────────────────────────┤   │
        │ │ Profit                  │   │
        │ └─────────────────────────┘   │
        │ (Green background)            │
        └───────────────────────────────┘
```

---

## Calculation Flow (Detailed)

```
┌─ STEP 1: Fetch Transactions ─────────────────────────┐
│                                                       │
│  Transaction History:                                 │
│  ┌──────────────────────────────────┐               │
│  │ ID │ Asset │ Type │ Qty │ Price │               │
│  ├──────────────────────────────────┤               │
│  │ 1  │ BTC  │ BUY  │ 0.5 │ 30000 │               │
│  │ 2  │ ETH  │ BUY  │ 5   │ 2000  │               │
│  │ 3  │ BTC  │ BUY  │ 0.3 │ 32000 │               │
│  │ 4  │ ETH  │ SELL │ 2   │ 2500  │               │
│  └──────────────────────────────────┘               │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 2: Group by Asset & Aggregate ─────────────────┐
│                                                       │
│  BTC Asset:                                           │
│  ├─ Total BUY: 0.5 + 0.3 = 0.8 BTC                  │
│  ├─ Total SELL: 0 BTC                               │
│  ├─ Net Quantity: 0.8 BTC ✓                         │
│  └─ Invested: (0.5 × 30000) + (0.3 × 32000)        │
│     └─ = 15000 + 9600 = 24600 USD                   │
│                                                       │
│  ETH Asset:                                           │
│  ├─ Total BUY: 5 ETH                                │
│  ├─ Total SELL: 2 ETH                               │
│  ├─ Net Quantity: 5 - 2 = 3 ETH ✓                   │
│  └─ Invested: 5 × 2000 = 10000 USD                  │
│     (Note: SELL doesn't reduce invested)            │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 3: Fetch Current Prices ───────────────────────┐
│                                                       │
│  Real-time Prices (from priceService):               │
│  ├─ BTC: $35,000                                    │
│  └─ ETH: $1,800                                     │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 4: Calculate Per-Asset Values ─────────────────┐
│                                                       │
│  BTC:                                                │
│  ├─ Current Value = 0.8 × 35000 = 28000 USD        │
│  ├─ P&L = 28000 - 24600 = 3400 USD                 │
│  └─ P&L % = (3400 / 24600) × 100 = 13.82%          │
│                                                       │
│  ETH:                                                │
│  ├─ Current Value = 3 × 1800 = 5400 USD            │
│  ├─ P&L = 5400 - 10000 = -4600 USD                 │
│  └─ P&L % = (-4600 / 10000) × 100 = -46.00%        │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 5: Aggregate Portfolio Totals ─────────────────┐
│                                                       │
│  Total Calculation:                                   │
│  ├─ Total Value = 28000 + 5400 = 33400 USD ✓       │
│  ├─ Total Invested = 24600 + 10000 = 34600 USD ✓   │
│  ├─ Total P&L = 33400 - 34600 = -1200 USD ✓        │
│  │                                                   │
│  └─ Total P&L % = (-1200 / 34600) × 100             │
│                                                       │
│     = -3.47%  ← Result                              │
│                                                       │
│     (Portfolio is in loss)                          │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 6: Format Output ──────────────────────────────┐
│                                                       │
│  Apply round2() to all values:                        │
│  ├─ totalValue: 33400.00                            │
│  ├─ totalInvested: 34600.00                         │
│  ├─ totalPnL: -1200.00                              │
│  ├─ pnlPercentage: -3.47                            │
│  └─ assets: [BTC item, ETH item]                    │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 7: Return to Frontend ────────────────────────┐
│                                                       │
│  API Response (JSON):                                │
│  {                                                   │
│    "success": true,                                 │
│    "data": {                                        │
│      "totalValue": 33400.00,                        │
│      "totalInvested": 34600.00,                     │
│      "totalPnL": -1200.00,                          │
│      "pnlPercentage": -3.47,  ← NEW FIELD           │
│      "assets": [                                    │
│        {                                            │
│          "symbol": "BTC",                           │
│          "quantity": 0.8,                           │
│          "currentPrice": 35000.00,                  │
│          "currentValue": 28000.00,                  │
│          "pnl": 3400.00,                            │
│          "pnlPercentage": 13.82                     │
│        },                                           │
│        {                                            │
│          "symbol": "ETH",                           │
│          "quantity": 3,                             │
│          "currentPrice": 1800.00,                   │
│          "currentValue": 5400.00,                   │
│          "pnl": -4600.00,                           │
│          "pnlPercentage": -46.00                    │
│        }                                            │
│      ]                                              │
│    },                                               │
│    "message": "Portfolio summary retrieved..."      │
│  }                                                  │
│                                                       │
└───────────────────────────────────────────────────────┘
                        │
                        ↓
┌─ STEP 8: Frontend Displays (No Calculation) ────────┐
│                                                       │
│  DashboardPage.jsx reads:                            │
│  const pnlPercentage = -3.47  (direct from API)     │
│  const totalPnL = -1200.00    (direct from API)     │
│                                                       │
│  Renders:                                            │
│  <StatCard                                          │
│    title="Unrealized P&L"                          │
│    value="$1,200.00"         (absolute value)      │
│    trendPercent={-3.47}      (percentage)          │
│    trend="down"              (because < 0)         │
│    color="red"               (because < 0)         │
│    subtitle="Loss"           (because < 0)         │
│  />                                                 │
│                                                       │
│  Display:                                            │
│  ┌────────────────────────┐                         │
│  │ Unrealized P&L         │                         │
│  ├────────────────────────┤                         │
│  │ $1,200.00      ↓ 3.47% │                         │
│  ├────────────────────────┤                         │
│  │ Loss                   │                         │
│  └────────────────────────┘                         │
│  (Red background)                                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## State & Props Flow

```
DashboardPage Component:
│
├─ State: portfolioData
│  ├─ totalValue: 33400.00
│  ├─ totalInvested: 34600.00
│  ├─ totalPnL: -1200.00
│  ├─ pnlPercentage: -3.47  ← NEW (extracted from API)
│  └─ assets: [...]
│
├─ Computed Values:
│  ├─ holdings = portfolioData?.assets || []
│  ├─ totalValue = portfolioData?.totalValue || 0
│  ├─ totalPnL = portfolioData?.totalPnL || 0
│  ├─ pnlPercentage = portfolioData?.pnlPercentage || 0  ← NEW
│  └─ assetCount = holdings.length
│
└─ Props passed to StatCard (P&L):
   ├─ title="Unrealized P&L"
   ├─ value="$1,200.00"                    (Math.abs(totalPnL))
   ├─ subtitle={totalPnL >= 0 ? "Profit" : "Loss"}
   ├─ trend={totalPnL >= 0 ? "up" : "down"}         ← NEW
   ├─ trendPercent={pnlPercentage}                   ← NEW
   └─ color={totalPnL >= 0 ? "green" : "red"}
```

---

## Key Points

✅ **Single Source of Truth**: All calculations in backend
✅ **No Frontend Math**: Frontend only reads and displays
✅ **Real-time Data**: Uses live prices from priceService
✅ **Edge Case Handling**: Prevents division by zero, NaN
✅ **Financial Precision**: Rounded to 2 decimal places
✅ **Deterministic**: Same input always produces same output
✅ **Consistent**: Uses same logic as Portfolio Value

