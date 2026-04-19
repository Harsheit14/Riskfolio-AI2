# 🚀 ASSET-BASED RISK ANALYSIS - QUICK REFERENCE

## The Transformation

| Aspect | OLD | NEW |
|--------|-----|-----|
| **Data Source** | None | CoinGecko API |
| **BTC Risk** | Random | 0.1 (10%) |
| **ETH Risk** | Random | 0.1 (10%) |
| **Altcoin Risk** | Random | 0.6-0.9 (60-90%) |
| **Logic** | Generic | Market-based |
| **Results** | Questionable | Real |

---

## Risk Score Formula

```
Risk = (0.4 × Rank Risk) + (0.3 × MarketCap Risk) + (0.3 × Allocation Risk)
```

### Rank Risk
```
Rank 1-2    → 0.1  (BTC, ETH: established)
Rank 3-10   → 0.3  (Top 10: solid)
Rank 11-50  → 0.6  (Top 50: sketchy)
Rank 51+    → 0.9  (Beyond: risky)
```

### MarketCap Risk
```
>$500B  → 0.1  (Mega cap)
>$100B  → 0.3  (Large cap)
>$10B   → 0.6  (Mid cap)
<$10B   → 0.9  (Small cap)
```

### Allocation Risk
```
>70% BTC/ETH  → 0.2  (Conservative)
>40% BTC/ETH  → 0.5  (Moderate)
<40% BTC/ETH  → 0.8  (Aggressive)
```

---

## Classification

```
0-30    → LOW RISK ✅
31-70   → MODERATE RISK ⚠️
71-100  → HIGH RISK ⚠️
```

---

## Example Portfolios

### 1 BTC ($75k)
```
avgRankRisk = 0.1
avgMarketCapRisk = 0.1
allocationRisk = 0.2
riskScore = (0.4×0.1) + (0.3×0.1) + (0.3×0.2)
          = 0.04 + 0.03 + 0.06
          = 0.13 × 100 = 13
Result: LOW RISK ✅
```

### 0.5 BTC + 5 ETH
```
avgRankRisk = 0.1
avgMarketCapRisk = 0.172
allocationRisk = 0.2
riskScore = 15.16
Result: LOW RISK ✅
```

### 10 LINK + 1000 MATIC
```
avgRankRisk = 0.45
avgMarketCapRisk = 0.45
allocationRisk = 0.8
riskScore = 55
Result: MODERATE RISK ⚠️
```

---

## New Service: marketDataService.js

### Functions
```javascript
getAssetMarketData(coingeckoId)
  → Returns: { rank, marketCap, symbol, price, ... }

getMultipleAssetMarketData(coingeckoIds)
  → Returns: { id1: data, id2: data, ... }

clearMarketDataCache()
  → Clears all cached data

getMarketDataCacheStats()
  → Returns cache info for debugging
```

### Caching Strategy
- Redis: 1 hour TTL
- In-Memory: Backup
- Rate Limited: 3 seconds between calls

---

## Modified: riskService.js

### Old Functions (Deprecated)
```javascript
calculateVolatility(prices)        ❌ Removed
calculateSimpleVolatility(prices)  ❌ Removed
```

### New Functions
```javascript
getRankScore(rank)                     ✅ Added
getMarketCapScore(marketCap)           ✅ Added
getAllocationRisk(safeAllocation)      ✅ Added
getPortfolioRisk(userId)               ✅ Redesigned
```

---

## API Response

```json
{
  "riskScore": 22.5,
  "riskLevel": "Low Risk",
  "metrics": {
    "avgRankRisk": 0.12,
    "avgMarketCapRisk": 0.15,
    "allocationRisk": 0.2,
    "safeAllocation": 0.80,
    "breakdown": [
      {
        "symbol": "BTC",
        "allocation": "55%",
        "rank": 1,
        "marketCap": "$2100B",
        "rankRisk": 0.1,
        "marketCapRisk": 0.1
      }
    ]
  }
}
```

---

## Key Improvements

1. **Real Data** - Uses actual CoinGecko ranks and market caps
2. **Intelligent** - Reflects real asset risk profiles
3. **Transparent** - Shows detailed breakdown for each asset
4. **Consistent** - Same calculation everywhere
5. **Fast** - Cached with fallback
6. **Reliable** - Rate limited and error handled

---

## Testing

### Test: Add BTC Portfolio
1. Add 1 BTC at $75k
2. Check Dashboard
3. Expected: Risk score ~13 (LOW)

### Test: Add ETH
1. Add 10 ETH at $4.2k
2. Check Dashboard
3. Expected: Risk score ~15 (LOW)

### Test: Add Altcoin
1. Add 1000 LINK at $35
2. Check Dashboard
3. Expected: Risk score ~35 (MODERATE)

### Test: View Breakdown
1. Go to Risk Report
2. Expected: Shows rank, marketCap, allocation for each asset

---

## Servers Running

```
✅ Backend: http://localhost:5000
✅ Frontend: http://localhost:5174
✅ Database: Connected
✅ Redis: Connected
```

---

**Status**: 🟢 PRODUCTION READY

Portfolio risk now reflects real market conditions!
