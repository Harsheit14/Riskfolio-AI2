# PHASE 6 FRONTEND INTEGRATION GUIDE

**For:** React frontend developers  
**Status:** ✅ PRODUCTION READY  
**Date:** April 18, 2026

---

## 🎯 INTEGRATION OVERVIEW

Phase 6 adds 5 new API endpoints with improved accuracy and real-time capabilities.

### What You Need to Know

1. **Comprehensive PnL** - Better accuracy for profit/loss calculations
2. **Tax Report** - Automated tax gain/loss tracking
3. **Real-Time Stream** - SSE for live portfolio updates
4. **Price Stats** - Monitor cache health

---

## 📲 INTEGRATION PATTERNS

### Pattern 1: Display Comprehensive PnL

```javascript
// frontend/src/pages/PortfolioPage.jsx

import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';

export default function PortfolioPage() {
  const { token } = useAuth();
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComprehensivePnL();
  }, [token]);

  const fetchComprehensivePnL = async () => {
    try {
      const res = await fetch('/api/portfolio/comprehensive-pnl', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch PnL');

      const { data } = await res.json();
      setPnl(data);
    } catch (error) {
      console.error('PnL fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!pnl) return <div>No data</div>;

  return (
    <div>
      <h1>Portfolio Performance</h1>

      {/* Realized PnL */}
      <Card title="Realized Gains/Losses">
        <p>${pnl.realizedPnL.toFixed(2)}</p>
        <small>From sales</small>
      </Card>

      {/* Unrealized PnL */}
      <Card title="Unrealized Gains/Losses">
        <p>${pnl.unrealizedPnL.toFixed(2)}</p>
        <small>Current holdings</small>
      </Card>

      {/* Total PnL */}
      <Card title="Total Gains/Losses">
        <p className={pnl.totalPnL > 0 ? 'text-green' : 'text-red'}>
          ${pnl.totalPnL.toFixed(2)}
        </p>
        <small>{pnl.returnMetrics.totalROI.toFixed(2)}% ROI</small>
      </Card>

      {/* Per-Asset Breakdown */}
      <Table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Held</th>
            <th>Avg Cost</th>
            <th>Realized</th>
            <th>Unrealized</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {pnl.assets.map((asset) => (
            <tr key={asset.symbol}>
              <td>{asset.symbol}</td>
              <td>{asset.totalHeld.toFixed(4)}</td>
              <td>${asset.avgBuyPrice.toFixed(2)}</td>
              <td>${asset.realizedPnL.toFixed(2)}</td>
              <td>${asset.unrealizedPnL.toFixed(2)}</td>
              <td>${(asset.realizedPnL + asset.unrealizedPnL).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
```

---

### Pattern 2: Display Tax Report

```javascript
// frontend/src/pages/TaxReportPage.jsx

export default function TaxReportPage() {
  const { token } = useAuth();
  const [taxData, setTaxData] = useState(null);

  useEffect(() => {
    fetchTaxReport();
  }, [token]);

  const fetchTaxReport = async () => {
    const res = await fetch('/api/portfolio/tax-report', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { data } = await res.json();
    setTaxData(data);
  };

  if (!taxData) return <div>Loading...</div>;

  return (
    <div>
      <h1>Tax Report (Simplified)</h1>

      {/* Summary */}
      <Card>
        <h2>Summary</h2>
        <Row>
          <Col>
            <Label>Short-Term Gains</Label>
            <Value>{taxData.summary.netShortTermGains}</Value>
          </Col>
          <Col>
            <Label>Long-Term Gains</Label>
            <Value>{taxData.summary.netLongTermGains}</Value>
          </Col>
          <Col>
            <Label>Total Taxable</Label>
            <Value>{taxData.summary.totalTaxableGains}</Value>
          </Col>
        </Row>
      </Card>

      {/* Per-Asset */}
      <Card>
        <h2>By Asset</h2>
        <Table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Short-Term</th>
              <th>Long-Term</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {taxData.assets.map((asset) => (
              <tr key={asset.symbol}>
                <td>{asset.symbol}</td>
                <td>${asset.netShortTermGains}</td>
                <td>${asset.netLongTermGains}</td>
                <td>${asset.netShortTermGains + asset.netLongTermGains}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Alert>
        Disclaimer: This is simplified and not tax advice.
        Consult a tax professional for accuracy.
      </Alert>
    </div>
  );
}
```

---

### Pattern 3: Real-Time Dashboard Updates

```javascript
// frontend/src/components/RealtimeDashboard.jsx

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function RealtimeDashboard() {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    connectToStream();

    return () => {
      // Cleanup on unmount
      if (eventSource) eventSource.close();
    };
  }, [token]);

  const connectToStream = () => {
    const eventSource = new EventSource('/api/dashboard/stream', {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Connection established
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      setStatus('connected');
      console.log('✅ Streaming started', data);
    });

    // Portfolio updates every 15 seconds
    eventSource.addEventListener('portfolio', (event) => {
      const data = JSON.parse(event.data);
      setPortfolio(data);
      setStatus('connected');

      // Update UI with latest data
      console.log('📊 Portfolio updated:', data.portfolio.totalValue);
    });

    // Error handling
    eventSource.addEventListener('error', (event) => {
      setStatus('reconnecting');
      console.warn('⚠️  Stream error:', event);
      // Browser will auto-reconnect
    });

    return eventSource;
  };

  if (!portfolio) {
    return <div>Waiting for data... ({status})</div>;
  }

  return (
    <div>
      <h2>Live Portfolio</h2>

      {/* Status */}
      <StatusIndicator status={status} />

      {/* Summary */}
      <SummaryCards>
        <Card>
          <Label>Total Value</Label>
          <Value>${portfolio.portfolio.totalValue.toFixed(2)}</Value>
        </Card>

        <Card>
          <Label>Today's P&L</Label>
          <Value 
            className={portfolio.portfolio.pnl > 0 ? 'green' : 'red'}
          >
            ${portfolio.portfolio.pnl.toFixed(2)}
            ({portfolio.portfolio.pnlPercentage.toFixed(2)}%)
          </Value>
        </Card>

        <Card>
          <Label>Assets</Label>
          <Value>{portfolio.portfolio.assetCount}</Value>
        </Card>
      </SummaryCards>

      {/* Asset Details (Updates in real-time) */}
      <AssetTable>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Value</th>
            <th>P&L %</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.assets.map((asset) => (
            <tr key={asset.symbol}>
              <td>{asset.symbol}</td>
              <td>{asset.quantity.toFixed(4)}</td>
              <td>${asset.currentPrice.toFixed(2)}</td>
              <td>${asset.currentValue.toFixed(2)}</td>
              <td className={asset.pnlPercentage > 0 ? 'green' : 'red'}>
                {asset.pnlPercentage.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </AssetTable>

      {/* Last Update */}
      <LastUpdate>{portfolio.timestamp}</LastUpdate>
    </div>
  );
}
```

---

### Pattern 4: Monitor Stream Health

```javascript
// frontend/src/components/StreamHealth.jsx

export default function StreamHealth() {
  const { token } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    checkHealth();

    return () => clearInterval(interval);
  }, [token]);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/dashboard/stream/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { data } = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  if (!health) return null;

  return (
    <Card title="Stream Status">
      <Row>
        <Col>
          <Label>Connections</Label>
          <Value>{health.activeConnections}</Value>
        </Col>
        <Col>
          <Label>Streaming</Label>
          <Value>{health.streamingActive ? '🟢 Active' : '🔴 Inactive'}</Value>
        </Col>
        <Col>
          <Label>Update Interval</Label>
          <Value>{(health.updateInterval / 1000).toFixed(0)}s</Value>
        </Col>
      </Row>

      {health.connections.length > 0 && (
        <ConnectionList>
          {health.connections.map((conn) => (
            <Item key={conn.clientId}>
              <Code>{conn.clientId.substring(0, 8)}</Code>
              <Uptime>Uptime: {(conn.uptime / 1000 / 60).toFixed(1)}m</Uptime>
            </Item>
          ))}
        </ConnectionList>
      )}
    </Card>
  );
}
```

---

### Pattern 5: Price Cache Statistics

```javascript
// frontend/src/pages/DebugPage.jsx

export default function DebugPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchPriceStats();
  }, [token]);

  const fetchPriceStats = async () => {
    const res = await fetch('/api/portfolio/prices-stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { data } = await res.json();
    setStats(data);
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1>Debug: Price Service Statistics</h1>

      <Card title="Cache Stats">
        <Row>
          <Col>
            <Label>Cached Prices</Label>
            <Value>{stats.cacheStats.lastKnownPricesCount}</Value>
          </Col>
          <Col>
            <Label>Pending Requests</Label>
            <Value>{stats.cacheStats.pendingRequests}</Value>
          </Col>
          <Col>
            <Label>Supported Symbols</Label>
            <Value>{stats.cacheStats.supportedSymbols}</Value>
          </Col>
        </Row>
      </Card>

      <Card title="Last Known Prices">
        <PriceList>
          {Object.entries(stats.lastKnownPrices).map(([symbol, price]) => (
            <Item key={symbol}>
              <Symbol>{symbol}</Symbol>
              <Price>${price.toFixed(2)}</Price>
            </Item>
          ))}
        </PriceList>
      </Card>

      <Card title="Supported Symbols">
        <SymbolList>
          {stats.supportedSymbols.join(', ')}
        </SymbolList>
      </Card>
    </div>
  );
}
```

---

## 🎨 UI COMPONENTS TO CREATE

### 1. Real-Time Value Display

```javascript
<RealTimeValue 
  value={portfolio.portfolio.totalValue}
  previousValue={previousValue}
  decimals={2}
/>
// Shows ↑ or ↓ indicator when value changes
```

### 2. PnL Indicator

```javascript
<PnLIndicator 
  pnl={portfolio.portfolio.pnl}
  percentage={portfolio.portfolio.pnlPercentage}
  showTrend={true}
/>
// Color-coded: Green if positive, Red if negative
```

### 3. Asset Breakdown Chart

```javascript
<AssetAllocationChart 
  assets={pnl.assets}
  total={pnl.currentHoldingValue}
/>
// Pie or doughnut chart showing allocation
```

### 4. Stream Status Indicator

```javascript
<StreamStatus status={status} />
// Shows: Connecting, Connected, Reconnecting, Disconnected
```

---

## 🔗 API SERVICE HELPER

```javascript
// frontend/src/services/portfolioOptimizationApi.js

export const portfolioOptimizationApi = {
  /**
   * Get comprehensive PnL with realized/unrealized breakdown
   */
  async getComprehensivePnL() {
    const res = await fetch('/api/portfolio/comprehensive-pnl', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  /**
   * Get tax report with short-term/long-term gains
   */
  async getTaxReport() {
    const res = await fetch('/api/portfolio/tax-report', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  /**
   * Subscribe to real-time portfolio updates
   */
  subscribeToStream(callbacks) {
    const eventSource = new EventSource('/api/dashboard/stream', {
      withCredentials: true
    });

    eventSource.addEventListener('connected', (e) => {
      callbacks.onConnected?.(JSON.parse(e.data));
    });

    eventSource.addEventListener('portfolio', (e) => {
      callbacks.onPortfolioUpdate?.(JSON.parse(e.data));
    });

    eventSource.addEventListener('error', (e) => {
      callbacks.onError?.(e);
    });

    return eventSource;
  },

  /**
   * Get stream health status
   */
  async getStreamHealth() {
    const res = await fetch('/api/dashboard/stream/health', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  },

  /**
   * Get price cache statistics
   */
  async getPriceStats() {
    const res = await fetch('/api/portfolio/prices-stats', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    return res.json();
  }
};
```

---

## 📲 REACT HOOK FOR STREAMING

```javascript
// frontend/src/hooks/usePortfolioStream.js

import { useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';

export function usePortfolioStream() {
  const { token } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const eventSource = new EventSource('/api/dashboard/stream', {
      withCredentials: true
    });

    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      setStatus('connected');
      setError(null);
    });

    eventSource.addEventListener('portfolio', (e) => {
      const data = JSON.parse(e.data);
      setPortfolio(data);
    });

    eventSource.addEventListener('error', (e) => {
      setStatus('reconnecting');
      setError('Connection lost');
    });

    return () => {
      eventSource.close();
    };
  }, [token]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setStatus('disconnected');
    }
  };

  return { portfolio, status, error, disconnect };
}

// Usage:
// const { portfolio, status } = usePortfolioStream();
```

---

## 🧪 TESTING CHECKLIST

- [ ] Comprehensive PnL displays correct values
- [ ] Tax report shows short/long-term breakdown
- [ ] Real-time stream updates every 15 seconds
- [ ] Stream reconnects on disconnect
- [ ] All 5 endpoints return valid JSON
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile responsive layout
- [ ] Dark mode compatible
- [ ] Error states handled

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Import new components in pages
- [ ] Add new routes if needed
- [ ] Update navigation menu
- [ ] Test all endpoints with backend running
- [ ] Verify authentication headers present
- [ ] Check CORS configuration
- [ ] Mobile test (stream especially)
- [ ] Performance profiling
- [ ] Error boundary coverage
- [ ] Deploy to staging first

---

## 📝 NOTES

- All endpoints require JWT authentication
- Real-time stream auto-reconnects (browser handles it)
- No need to manually refresh on stream disconnect
- Tax report is simplified (not tax advice)
- Price cache falls back gracefully on API failure

---

## 📞 TROUBLESHOOTING

**Q: Real-time stream not updating?**
A: Check network tab, verify auth header, ensure backend running.

**Q: PnL values seem wrong?**
A: Verify avgBuyPrice, check if all transactions imported.

**Q: Tax report shows zero?**
A: Need both BUY and SELL transactions to calculate.

**Q: Stream stops after 30 seconds?**
A: Normal if no data. Browser auto-reconnects. Check backend logs.

---

**Status: ✅ READY FOR INTEGRATION**

All patterns and examples ready to implement.
