import { useState, useEffect } from "react";
import StatCard from "../components/StatCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { useRisk } from "../hooks/useRisk";
import apiClient from "../services/apiClient";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { getValidHoldings, getValidAssetCount, logHoldingsSummary } from "../utils/holdingsUtils";

export default function DashboardPage() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState(null);
  const { riskReport, loading: riskLoading } = useRisk();
  const [chartData, setChartData] = useState([]);

  // Fetch portfolio summary on mount
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setPortfolioLoading(true);
        setPortfolioError(null);
        const response = await apiClient.get('/portfolio/summary');
        const data = response.data.data;
        setPortfolioData(data);
      } catch (err) {
        console.error("[Dashboard] Portfolio fetch error:", err?.message || err);
        setPortfolioError(err?.response?.data?.message || err?.message || "Failed to load portfolio");
        setPortfolioData(null);
      } finally {
        setPortfolioLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Fetch portfolio trend data from backend
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const response = await apiClient.get('/portfolio/trend?days=30');
        const trendData = response.data.data.trend || [];
        
        // Format data for chart - convert YYYY-MM-DD to "Mon, DD" format
        const formattedData = trendData.map((item) => {
          const date = new Date(item.date + 'T00:00:00Z'); // Add time to ensure UTC
          const displayDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return {
            date: displayDate,
            value: item.value,
          };
        });
        
        setChartData(formattedData);
      } catch (err) {
        console.error("[Dashboard] Trend fetch error:", err?.message || err);
        // Fall back to empty chart data
        setChartData([]);
      }
    };
    fetchTrend();
  }, []);

  // Extract data from portfolio summary
  const holdings = portfolioData?.assets || [];

  // ==================================================================================
  // STEP 1: FILTER VALID HOLDINGS (quantity > 0) - USING SHARED UTILITY
  // ==================================================================================
  const validHoldings = getValidHoldings(holdings);
  
  logHoldingsSummary(holdings, "Dashboard");
  console.log("[Dashboard] Valid holdings details:", validHoldings.map(h => ({
    symbol: h.symbol,
    quantity: h.quantity,
    currentValue: h.currentValue
  })));

  // ==================================================================================
  // STEP 2: CALCULATE TOTAL VALUE FROM VALID HOLDINGS
  // ==================================================================================
  const totalValue = validHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
  
  console.log("[Dashboard] Total portfolio value (recalculated):", totalValue);

  // ==================================================================================
  // STEP 3: CALCULATE PERCENTAGES FOR EACH HOLDING
  // ==================================================================================
  const breakdown = validHoldings.map(h => ({
    symbol: h.symbol,
    percentage: totalValue > 0 ? ((Number(h.currentValue) || 0) / totalValue * 100).toFixed(2) : 0,
    value: Number(h.currentValue) || 0
  }));
  
  console.log("[Dashboard] Breakdown calculated:", breakdown);

  // ==================================================================================
  // STEP 4: COMPUTE VALUES FROM HOLDINGS ARRAY - USE SHARED UTILITY FOR COUNT
  // ==================================================================================
  const totalPnL = validHoldings.reduce((sum, h) => sum + (Number(h.pnl) || 0), 0);
  const assetCount = getValidAssetCount(validHoldings);
  
  // Calculate P&L percentage from totalValue and totalPnL
  const pnlPercentage = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

  const pnlTrend = totalPnL >= 0 ? "up" : "down";
  const riskScore = riskReport?.riskScore || riskReport?.risk_score || 0;
  const riskColor = riskScore <= 33 ? "green" : riskScore <= 66 ? "amber" : "red";
  // Enhanced color palette with more distinct colors to prevent duplication
  const COLORS = ["#8b5cf6", "#ec4899", "#22c55e", "#f59e0b", "#3b82f6", "#06b6d4", "#f43f5e", "#a855f7", "#14b8a6", "#eab308"];
  
  // ==================================================================================
  // STEP 5: FIX PIE CHART DATA - USE PERCENTAGES INSTEAD OF RAW VALUES
  // ==================================================================================
  const pieData = breakdown.slice(0, 6).map((item) => ({
    name: item.symbol,
    value: parseFloat(item.percentage)
  }));
  
  console.log("[Dashboard] Pie chart data:", pieData);

  return (
    <div className="min-h-screen bg-[#0f1117] pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {portfolioError && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-sm text-red-200">⚠️ Portfolio Error: {portfolioError}</p>
          </div>
        )}

        {riskLoading === false && !riskReport && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/20 border border-amber-500/30">
            <p className="text-sm text-amber-200">⚠️ Risk data unavailable. Please refresh the page.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Portfolio Value" value={portfolioLoading ? "..." : `$${(typeof totalValue === 'number' ? totalValue : 0).toFixed(2)}`} trend={totalPnL >= 0 ? "up" : "down"} trendPercent={totalPnL} color="indigo" />
          <StatCard title="Unrealized P&L" value={portfolioLoading ? "..." : `$${Math.abs(typeof totalPnL === 'number' ? totalPnL : 0).toFixed(2)}`} subtitle={totalPnL >= 0 ? "Profit" : "Loss"} trend={totalPnL >= 0 ? "up" : "down"} trendPercent={typeof pnlPercentage === 'number' ? pnlPercentage : 0} color={totalPnL >= 0 ? "green" : "red"} />
          <StatCard title="Assets Held" value={portfolioLoading ? "..." : (typeof assetCount === 'number' ? assetCount : 0)} subtitle="Different assets" color="indigo" />
          <StatCard title="Risk Score" value={riskLoading ? "..." : `${(typeof riskScore === 'number' ? riskScore : 0)}/100`} color={riskColor} />
        </div>

        <div className="mb-8">
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Holdings</h2>
            {portfolioLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height="h-12" />)}</div>
            ) : !Array.isArray(validHoldings) || validHoldings.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No holdings yet. Add your first transaction.</p>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-3 text-slate-300 font-semibold">Asset</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">Qty</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">Avg Price</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">Current</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">Value</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">Allocation</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">P&L</th>
                      <th className="text-right py-3 px-3 text-slate-300 font-semibold">P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validHoldings.map((holding, idx) => {
                      const pnl = holding.pnl || 0;
                      const pnlPercent = (holding.pnlPercentage || 0).toFixed(2);
                      // Find allocation percentage from breakdown
                      const allocationPercent = breakdown.find(b => b.symbol === holding.symbol)?.percentage || 0;
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                                {holding.symbol?.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-medium text-white">{holding.symbol?.toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-3 text-slate-300">{(holding.quantity || 0).toFixed(4)}</td>
                          <td className="text-right py-3 px-3 text-slate-300">${(holding.avgBuyPrice || 0).toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-slate-300">${(holding.currentPrice || 0).toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-white font-medium">${(holding.currentValue || 0).toFixed(2)}</td>
                          <td className="text-right py-3 px-3 text-white font-medium">{allocationPercent}%</td>
                          <td className={`text-right py-3 px-3 font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                          </td>
                          <td className={`text-right py-3 px-3 font-medium ${pnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pnlPercent >= 0 ? "+" : ""}{pnlPercent}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Allocation</h2>
              {portfolioLoading ? (
                <LoadingSkeleton height="h-64" />
              ) : pieData.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No data</p>
              ) : (
                <div className="w-full h-[250px] overflow-hidden">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)" }} labelStyle={{ color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">Holdings Breakdown</h2>
              {portfolioLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height="h-10" />)}</div>
              ) : breakdown.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No holdings breakdown available</p>
              ) : (
                <div className="space-y-3">
                  {breakdown.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-slate-300 font-medium">{item.symbol?.toUpperCase()}</span>
                      </div>
                      <span className="text-white font-semibold">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Portfolio Trend (30 days)</h2>
          {portfolioLoading ? (
            <LoadingSkeleton height="h-64" />
          ) : chartData.length === 0 ? (
            <p className="text-center text-slate-400 py-16">No data available</p>
          ) : (
            <div className="w-full h-[300px] overflow-hidden">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1d27", border: "1px solid rgba(255,255,255,0.1)" }} labelStyle={{ color: "#fff" }} formatter={(value) => `$${value.toFixed(2)}`} />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={true} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
