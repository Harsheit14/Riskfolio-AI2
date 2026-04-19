# Unrealized P&L Implementation - Quick Reference

## 🎯 What Was Implemented

The Unrealized P&L (Profit/Loss) calculation now:
- ✅ Calculates ONLY in the backend
- ✅ Uses real transaction data (BUY and SELL)
- ✅ Updates with real-time prices
- ✅ Displays both dollar value and percentage in Dashboard
- ✅ Handles edge cases (no holdings, missing prices)
- ✅ Prevents NaN/undefined errors

---

## 📝 Changes Made

### 1. Backend: `/server/services/portfolioService.js`

**Change 1: Empty portfolio response** (Line 257-262)
```javascript
// NOW INCLUDES pnlPercentage
return {
  totalValue: 0,
  totalInvested: 0,
  totalPnL: 0,
  pnlPercentage: 0,  // ← ADDED
  assets: [],
};
```

**Change 2: Portfolio-level P&L percentage** (Line 370-373, before return)
```javascript
// Calculate portfolio-level P&L percentage
const pnlPercentage = totalInvested > 0
  ? round2((totalPnL / totalInvested) * 100)
  : 0;
```

**Change 3: Updated return statement** (Line 375-380)
```javascript
// NOW INCLUDES pnlPercentage in response
return {
  totalValue: round2(totalValue),
  totalInvested: round2(totalInvested),
  totalPnL: round2(totalPnL),
  pnlPercentage,  // ← ADDED
  assets: assetResults,
};
```

### 2. Frontend: `/client/src/pages/DashboardPage.jsx`

**Change 1: Extract pnlPercentage** (Line 54)
```javascript
// BEFORE
const totalPnL = portfolioData?.totalPnL || 0;

// AFTER
const totalPnL = portfolioData?.totalPnL || 0;
const pnlPercentage = portfolioData?.pnlPercentage || 0;  // ← ADDED
```

**Change 2: Update StatCard** (Line 83)
```javascript
// BEFORE
<StatCard title="Unrealized P&L" 
  value={...} 
  subtitle={...} 
  color={...} 
/>

// AFTER
<StatCard title="Unrealized P&L" 
  value={...} 
  subtitle={...} 
  trend={totalPnL >= 0 ? "up" : "down"}  // ← ADDED
  trendPercent={typeof pnlPercentage === 'number' ? pnlPercentage : 0}  // ← ADDED
  color={...} 
/>
```

---

## 🧮 Calculation Formula

```
For each asset:
  net_quantity = total_buy_quantity - total_sell_quantity
  invested = sum(buy_quantity × buy_price)
  current_value = net_quantity × current_price
  asset_pnl = current_value - invested

Portfolio level:
  total_invested = sum(all invested)
  total_current_value = sum(all current_value)
  total_pnl = total_current_value - total_invested
  pnl_percentage = (total_pnl / total_invested) × 100
```

---

## 📊 Example Calculation

**Portfolio with 2 assets:**

Asset 1 (Bitcoin):
- 0.5 BTC @ $30,000 = $15,000 invested
- Current price: $35,000
- Current value: 0.5 × $35,000 = $17,500
- P&L: $17,500 - $15,000 = **+$2,500**

Asset 2 (Ethereum):
- 5 ETH @ $2,000 = $10,000 invested
- Current price: $1,800
- Current value: 5 × $1,800 = $9,000
- P&L: $9,000 - $10,000 = **-$1,000**

**Portfolio Total:**
- Total Invested: $25,000
- Total Current Value: $26,500
- **Total P&L: $1,500 (Profit)**
- **P&L %: 6% Return**

---

## 🔍 Where Each Value Comes From

| Value | Source | Calculation |
|-------|--------|-------------|
| `totalValue` | Backend | sum(quantity × currentPrice) for all holdings |
| `totalInvested` | Backend | sum(BUY quantity × BUY price) for all assets |
| `totalPnL` | Backend | totalValue - totalInvested |
| `pnlPercentage` | Backend | (totalPnL / totalInvested) × 100 |
| Display | Frontend | Reads from API response, NO recomputation |

---

## 🛡️ Safety Features

- **Type checking**: `typeof pnlPercentage === 'number'`
- **Default values**: `|| 0` fallbacks
- **Division by zero prevention**: `totalInvested > 0 ? ... : 0`
- **Missing price handling**: `prices[...] || 0`
- **Financial rounding**: `round2()` ensures 2 decimal places
- **Edge cases**: Empty portfolio returns 0 for all values

---

## 📡 API Response

```json
GET /api/portfolio/summary

{
  "success": true,
  "data": {
    "totalValue": 26500.00,
    "totalInvested": 25000.00,
    "totalPnL": 1500.00,           // ← NEW
    "pnlPercentage": 6.00,         // ← NEW
    "assets": [
      {
        "symbol": "BTC",
        "quantity": 0.5,
        "avgBuyPrice": 30000.00,
        "currentPrice": 35000.00,
        "currentValue": 17500.00,
        "pnl": 2500.00,
        "pnlPercentage": 16.67
      },
      ...
    ]
  }
}
```

---

## 🎨 Dashboard Display

The "Unrealized P&L" card now shows:

```
┌─────────────────────────┐
│ Unrealized P&L          │
├─────────────────────────┤
│ $1,500.00       ↑ 6%    │
├─────────────────────────┤
│ Profit                  │
└─────────────────────────┘
```

- **Green card** for profit (P&L > 0)
- **Red card** for loss (P&L < 0)
- **Dollar amount** = absolute value of P&L
- **Trend indicator** = up arrow for profit, down for loss
- **Percentage** = P&L as % of invested amount

---

## ✅ Verification Checklist

- [x] Backend calculates totalPnL correctly
- [x] Backend calculates pnlPercentage correctly
- [x] Backend returns both values in API response
- [x] Frontend reads totalPnL from response
- [x] Frontend reads pnlPercentage from response
- [x] Frontend passes pnlPercentage to StatCard
- [x] No frontend recomputation
- [x] No syntax errors
- [x] Type safety enforced
- [x] Edge cases handled
- [x] Financial rounding applied

---

## 🚀 How to Verify in Production

1. **Start servers**:
   ```bash
   # Terminal 1
   cd ~/Development/Riskfolio-AI/Riskfolio-AI/server && npm run dev
   
   # Terminal 2
   cd ~/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev
   ```

2. **Open Dashboard**: `http://localhost:5173/dashboard`

3. **Check "Unrealized P&L" card**:
   - Value shows as $X,XXX.XX
   - Percentage shows as ±X.XX%
   - Color is green (profit) or red (loss)
   - Trend arrow points up or down

4. **Add a transaction**:
   - Create a BUY transaction
   - Watch P&L update in real-time
   - Values should match manual calculation

5. **Check browser console**: No errors should appear

---

## 🔗 Files Changed

| File | Changes | Lines |
|------|---------|-------|
| `/server/services/portfolioService.js` | Added pnlPercentage to response | +6 |
| `/client/src/pages/DashboardPage.jsx` | Extract & display pnlPercentage | +2 |

**Total changes**: 8 lines added, 0 lines removed

---

## 📚 Related Documentation

- Full implementation details: `UNREALIZED_PNL_IMPLEMENTATION.md`
- Portfolio Value logic: Same backend function
- Price Service: `priceService.js` (real-time prices)
- Transaction Repository: `transactionRepository.js` (data source)

