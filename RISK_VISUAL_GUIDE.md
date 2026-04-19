# 📊 RISK ANALYSIS SYSTEM - VISUAL GUIDE

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER PORTFOLIO                          │
│                  (Holdings + Transactions)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  RISK SERVICE                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Get Portfolio Summary                             │   │
│  │    • Get holdings for each asset                     │   │
│  │    • Calculate allocation % for each                 │   │
│  │    • Identify safe assets (BTC, ETH)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │ 2. Fetch Market Data (MARKET DATA SERVICE)           │    │
│  │    • Fetch rank (position in market cap)             │    │
│  │    • Fetch marketCap (in USD)                        │    │
│  │    • Fetch price (for validation)                    │    │
│  │    • Cache in Redis (1 hour)                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │ 3. Calculate Risk Scores                             │    │
│  │    ┌──────────────────────────────────────────┐     │    │
│  │    │ Rank Risk (0.1 - 0.9)                    │     │    │
│  │    │ Rank 1-2    → 0.1  (BTC, ETH)           │     │    │
│  │    │ Rank 3-10   → 0.3  (Top 10)             │     │    │
│  │    │ Rank 11-50  → 0.6  (Top 50)             │     │    │
│  │    │ Rank 51+    → 0.9  (Beyond)             │     │    │
│  │    └──────────────────────────────────────────┘     │    │
│  │    ┌──────────────────────────────────────────┐     │    │
│  │    │ MarketCap Risk (0.1 - 0.9)               │     │    │
│  │    │ >$500B      → 0.1  (Mega cap)            │     │    │
│  │    │ >$100B      → 0.3  (Large cap)           │     │    │
│  │    │ >$10B       → 0.6  (Mid cap)             │     │    │
│  │    │ <$10B       → 0.9  (Small cap)           │     │    │
│  │    └──────────────────────────────────────────┘     │    │
│  │    ┌──────────────────────────────────────────┐     │    │
│  │    │ Allocation Risk (0.2 - 0.8)              │     │    │
│  │    │ >70% BTC/ETH    → 0.2  (Conservative)    │     │    │
│  │    │ >40% BTC/ETH    → 0.5  (Moderate)        │     │    │
│  │    │ <40% BTC/ETH    → 0.8  (Aggressive)      │     │    │
│  │    └──────────────────────────────────────────┘     │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │ 4. Compute Weighted Averages                         │    │
│  │    avgRankRisk = Σ(rankRisk × allocation)           │    │
│  │    avgMarketCapRisk = Σ(marketCapRisk × allocation) │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │ 5. Final Risk Score                                  │    │
│  │    riskScore = (0.4×avgRankRisk) +                   │    │
│  │                (0.3×avgMarketCapRisk) +              │    │
│  │                (0.3×allocationRisk)                  │    │
│  │                × 100                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │ 6. Classify Risk Level                               │    │
│  │    ≤ 30    → "Low Risk" ✅                           │    │
│  │    31-70   → "Moderate Risk" ⚠️                      │    │
│  │    ≥ 71    → "High Risk" ⚠️                          │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────┬──────────────────┐
        │                │                  │
        ▼                ▼                  ▼
   Dashboard       Risk Report       Portfolio Page
   (Score shown)   (Full metrics)    (Portfolio view)
```

---

## Risk Score Ranges

```
┌──────────────────────────────────────────────────────────────┐
│                    RISK SPECTRUM                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  0    10    20    30  |  40    50    60    70  |  80    90  100
│  ├─────────────────────────────────────────────────────────► │
│  ▓▓▓▓▓▓▓▓▓▓▓▓         ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒         ░░░░░░░░░░░ │
│  ▓▓▓▓▓▓▓▓▓▓▓▓  LOW   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  HIGH   ░░░░░░░░░░░ │
│  ▓▓▓▓▓▓▓▓▓▓▓▓  RISK  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  RISK   ░░░░░░░░░░░ │
│                                                              │
│  Examples:                                                   │
│  • 100% BTC:              ~13  (very safe)                  │
│  • BTC + ETH:             ~15  (safe)                       │
│  • Mixed portfolio:        ~45  (balanced)                   │
│  • Altcoin heavy:         ~75  (risky)                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Formula Visualization

```
RISK SCORE FORMULA

┌──────────────────────────────────────────────────────┐
│                                                      │
│  Risk = (0.4 × R) + (0.3 × M) + (0.3 × A)           │
│                                                      │
│  Where:                                              │
│    R = Average Rank Risk                             │
│    M = Average MarketCap Risk                        │
│    A = Allocation Risk                               │
│                                                      │
│  Weights:                                            │
│    40% - Asset Rank (most important)                 │
│    30% - Market Cap (liquidity, stability)           │
│    30% - Allocation (portfolio strategy)             │
│                                                      │
│  Result: Multiplied by 100 to get 0-100 scale       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────┐
│ User Portfolio  │
│  0.5 BTC        │
│  5 ETH          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Portfolio Service           │
│ • Get holdings              │
│ • Calculate allocations     │
│ • Get asset list            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Market Data Service         │
│ ┌─────────────────────────┐ │
│ │ For BTC:                │ │
│ │  Cache? → No            │ │
│ │  API Call → CoinGecko   │ │
│ │  Result:                │ │
│ │    rank = 1             │ │
│ │    marketCap = $2.1T    │ │
│ │  Store in Redis (1h)    │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ For ETH:                │ │
│ │  Cache? → No            │ │
│ │  API Call → CoinGecko   │ │
│ │  Result:                │ │
│ │    rank = 2             │ │
│ │    marketCap = $450B    │ │
│ │  Store in Redis (1h)    │ │
│ └─────────────────────────┘ │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Risk Calculation            │
│ • rankRisk = 0.1 (both)     │
│ • marketCapRisk:            │
│   BTC = 0.1                 │
│   ETH = 0.3                 │
│ • allocationRisk = 0.2      │
│ • Final: 15.16              │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Response to Client               │
│ {                                │
│   riskScore: 15.16,              │
│   riskLevel: "Low Risk",         │
│   metrics: { ... details ... }   │
│ }                                │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Display to User                  │
│ Dashboard: Shows risk score      │
│ Risk Report: Shows breakdown     │
│ Portfolio: Shows holdings        │
└──────────────────────────────────┘
```

---

## Risk Scoring Breakdown

### Asset 1: Bitcoin (BTC)

```
┌─────────────────────────────────────────────────┐
│ BITCOIN                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│ Market Data:                                    │
│   • Rank:          1                            │
│   • MarketCap:     $2,100,000,000,000          │
│   • Allocation:    64.1% of portfolio           │
│   • Safe Asset:    YES ✅                       │
│                                                 │
│ Risk Scoring:                                   │
│   • Rank Risk:     0.1  (rank ≤ 2)             │
│   • MarketCap Risk: 0.1  (cap > $500B)         │
│                                                 │
│ Contribution to Portfolio:                      │
│   • rankRisk contribution:       0.1 × 0.641   │
│   • marketCapRisk contribution:  0.1 × 0.641   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Asset 2: Ethereum (ETH)

```
┌─────────────────────────────────────────────────┐
│ ETHEREUM                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ Market Data:                                    │
│   • Rank:          2                            │
│   • MarketCap:     $450,000,000,000            │
│   • Allocation:    35.9% of portfolio           │
│   • Safe Asset:    YES ✅                       │
│                                                 │
│ Risk Scoring:                                   │
│   • Rank Risk:     0.1  (rank ≤ 10)            │
│   • MarketCap Risk: 0.3  (cap > $100B, < $500B)│
│                                                 │
│ Contribution to Portfolio:                      │
│   • rankRisk contribution:       0.1 × 0.359   │
│   • marketCapRisk contribution:  0.3 × 0.359   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Portfolio Summary

```
┌─────────────────────────────────────────────────┐
│ PORTFOLIO TOTALS                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ Safe Allocation:      100% ✅ (BTC + ETH only)  │
│ Concentration:        64.1% (BTC largest)      │
│ Diversification:      35.9% (medium)           │
│                                                 │
│ Risk Calculations:                              │
│                                                 │
│   avgRankRisk      = 0.1 × 0.641 + 0.1 × 0.359│
│                    = 0.1                        │
│                                                 │
│   avgMarketCapRisk = 0.1 × 0.641 + 0.3 × 0.359│
│                    = 0.172                      │
│                                                 │
│   allocationRisk   = 0.2  (>70% BTC/ETH)       │
│                                                 │
│ Final Risk Score:                               │
│   = (0.4 × 0.1) + (0.3 × 0.172) + (0.3 × 0.2) │
│   = 0.04 + 0.0516 + 0.06                       │
│   = 0.1516 × 100                               │
│   = 15.16                                       │
│                                                 │
│ Result: LOW RISK ✅                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Cache Strategy

```
┌──────────────────────────────────────────────────┐
│ MARKET DATA FETCH                                │
├──────────────────────────────────────────────────┤
│                                                  │
│ First Request for Bitcoin:                       │
│   └─ Check Redis? NO                             │
│   └─ Check In-Memory? NO                         │
│   └─ Call API → CoinGecko                        │
│   └─ Store in Redis (1 hour TTL)                 │
│   └─ Store in Memory                             │
│   └─ Return data                                 │
│                                                  │
│ Second Request (within 1 hour):                  │
│   └─ Check Redis? YES                            │
│   └─ Return from Redis                           │
│   └─ (API call skipped!)                         │
│                                                  │
│ Second Request (after 1 hour):                   │
│   └─ Check Redis? NO (expired)                   │
│   └─ Call API → CoinGecko                        │
│   └─ Update Redis (1 hour TTL)                   │
│   └─ Return data                                 │
│                                                  │
│ Rate Limiting:                                   │
│   └─ Min 3 seconds between API calls             │
│   └─ Prevents 429 (too many requests) errors     │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Comparison: OLD vs NEW

```
┌────────────────────────────────────────────────┐
│ OLD SYSTEM                                     │
├────────────────────────────────────────────────┤
│ Data Source:   None                            │
│ BTC Risk:      Random ~50                      │
│ ETH Risk:      Random ~50                      │
│ LINK Risk:     Random ~50                      │
│ SHIB Risk:     Random ~50                      │
│ Result:        All look the same?              │
│ Problem:       No market context               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ NEW SYSTEM                                     │
├────────────────────────────────────────────────┤
│ Data Source:   CoinGecko API                   │
│ BTC Risk:      0.1 (rank 1, low risk)          │
│ ETH Risk:      0.1 (rank 2, low risk)          │
│ LINK Risk:     0.6 (rank 20, med risk)         │
│ SHIB Risk:     0.9 (rank 100+, high risk)      │
│ Result:        Different scores make sense ✅  │
│ Benefit:       Uses real market data           │
└────────────────────────────────────────────────┘
```

---

**Status**: 🟢 PRODUCTION READY

Visual guide complete. System operational. Ready for use!
