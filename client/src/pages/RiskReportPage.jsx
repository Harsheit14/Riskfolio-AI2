import { useRisk } from "../hooks/useRisk";
import { usePortfolio } from "../hooks/usePortfolio";
import LoadingSkeleton from "../components/LoadingSkeleton";
import { getValidHoldings, hasValidHoldings, logHoldingsSummary } from "../utils/holdingsUtils";

export default function RiskReportPage() {
  const { riskReport, loading: riskLoading, error: riskError, refetch: refetchRisk } = useRisk();
  const { holdings, loading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = usePortfolio();

  // Combine errors
  const error = riskError || portfolioError;

  // Log for debugging
  console.log("[RiskReportPage] Holdings:", holdings);
  console.log("[RiskReportPage] Risk Report:", riskReport);
  console.log("[RiskReportPage] Risk Loading:", riskLoading);
  console.log("[RiskReportPage] Portfolio Loading:", portfolioLoading);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={async () => {
                await refetchPortfolio();
                await refetchRisk();
              }}
              className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validate holdings data - USE SHARED UTILITY
  const rawHoldings = Array.isArray(holdings) ? holdings : [];
  const validHoldings = getValidHoldings(rawHoldings);
  const hasHoldingsData = hasValidHoldings(rawHoldings);

  logHoldingsSummary(rawHoldings, "RiskReport");

  // Extract risk metrics from backend response
  // Backend returns: { success, data: { volatility, concentration, riskScore, classification, assets } }
  const riskData = riskReport || {};
  const riskScore = Number(riskData.riskScore || 0);
  const volatility = Number(riskData.volatility || 0);
  const concentration = Number(riskData.concentration || 0);
  const classification = riskData.classification || "LOW";
  
  const riskLevel = riskScore <= 33 ? "LOW" : riskScore <= 66 ? "MEDIUM" : "HIGH";
  const riskColor = riskScore <= 33 ? "green" : riskScore <= 66 ? "amber" : "red";
  const riskBorderColor = riskScore <= 33 ? "border-green-500/30" : riskScore <= 66 ? "border-amber-500/30" : "border-red-500/30";
  
  // Metrics from backend (with validation)
  const portfolioVolatility = volatility || 0;
  const diversification = 100 - concentration; // Calculate from concentration
  
  console.log("[RiskReportPage] Risk Score:", riskScore);
  console.log("[RiskReportPage] Portfolio Volatility:", portfolioVolatility);
  console.log("[RiskReportPage] Concentration:", concentration);
  console.log("[RiskReportPage] Diversification:", diversification);
  console.log("[RiskReportPage] Classification:", classification);
  
  // Calculate per-asset risk data from validHoldings
  const totalValue = validHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0);
  const assetRisks = hasHoldingsData
    ? validHoldings.map((holding) => ({
        symbol: holding.symbol,
        volatility: portfolioVolatility, // Use portfolio volatility as baseline
        portfolio_weight: totalValue > 0 ? ((Number(holding.currentValue) || 0) / totalValue) * 100 : 0,
        risk_score: riskScore, // Use overall risk score
      }))
    : [];

  return (
    <div className="min-h-screen bg-[#0f1117] pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Volatility */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Portfolio Volatility</h3>
          {riskLoading || portfolioLoading ? (
            <LoadingSkeleton height="h-32" />
          ) : !hasHoldingsData ? (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">--</div>
              <p className="text-xs text-slate-400 mb-4">No holdings data</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{portfolioVolatility.toFixed(1)}%</div>
              <p className="text-xs text-slate-400 mb-4">Annualized volatility</p>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: portfolioVolatility < 30 ? "#10b981" : portfolioVolatility < 60 ? "#f59e0b" : "#ef4444", color: "white" }}>
                {portfolioVolatility < 30 ? "Low" : portfolioVolatility < 60 ? "Medium" : "High"}
              </div>
            </div>
          )}
        </div>

        {/* Concentration */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Concentration Risk</h3>
          {riskLoading || portfolioLoading ? (
            <LoadingSkeleton height="h-32" />
          ) : !hasHoldingsData ? (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">--</div>
              <p className="text-xs text-slate-400 mb-4">No holdings data</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{concentration.toFixed(1)}%</div>
              <p className="text-xs text-slate-400 mb-4">Largest position weight</p>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: concentration < 30 ? "#10b981" : concentration < 60 ? "#f59e0b" : "#ef4444", color: "white" }}>
                {concentration < 30 ? "Low" : concentration < 60 ? "Medium" : "High"}
              </div>
            </div>
          )}
        </div>

        {/* Risk Score */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Composite Risk</h3>
          {riskLoading || portfolioLoading ? (
            <LoadingSkeleton height="h-32" />
          ) : !hasHoldingsData ? (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">--</div>
              <p className="text-xs text-slate-400 mb-4">No holdings data</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{riskScore}/100</div>
              <p className="text-xs text-slate-400 mb-4">Overall portfolio risk</p>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: riskColor === "green" ? "#10b981" : riskColor === "amber" ? "#f59e0b" : "#ef4444", color: "white" }}>
                {riskLevel}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Risk Classification */}
        <div className={`rounded-2xl bg-[#1a1d27] border-l-4 border-r border-t border-b border-white/5 p-6 shadow-xl mb-8 ${riskBorderColor}`} style={{ borderLeftColor: riskColor === "green" ? "#10b981" : riskColor === "amber" ? "#f59e0b" : "#ef4444" }}>
          <h2 className="text-lg font-bold text-white mb-3">Risk Classification: {hasHoldingsData ? riskLevel : "No Data"}</h2>
          {riskLoading || portfolioLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <LoadingSkeleton key={i} height="h-4" />)}</div>
          ) : !hasHoldingsData ? (
            <p className="text-slate-300 text-sm leading-relaxed">
              No holdings data available. Add transactions to see risk analysis.
            </p>
          ) : (
            <div>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                {riskLevel === "LOW"
                  ? "Your portfolio carries LOW risk. It is well-diversified across stable assets with minimal volatility. Suitable for conservative investors."
                  : riskLevel === "MEDIUM"
                  ? "Your portfolio carries MEDIUM risk. It has moderate concentration with balanced volatility. Suitable for investors with balanced risk tolerance."
                  : "Your portfolio carries HIGH risk. It is heavily concentrated in volatile assets. Suitable for aggressive investors only."}
              </p>
              <div className="grid grid-cols-3 gap-4 text-xs mt-4">
                <div>
                  <p className="text-slate-400">Diversification</p>
                  <p className="text-white font-bold">{(diversification * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-slate-400">Concentration</p>
                  <p className="text-white font-bold">{(concentration * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-slate-400">Holdings</p>
                  <p className="text-white font-bold">{holdings.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Per-Asset Risk Table */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Per-Asset Risk Analysis</h2>
          {riskLoading || portfolioLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height="h-12" />)}</div>
          ) : !hasHoldingsData ? (
            <p className="text-center text-slate-400 py-8">No asset data. Add transactions to begin risk analysis.</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Asset</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Volatility</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Holdings %</th>
                    <th className="text-center py-3 px-3 text-slate-300 font-semibold">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {assetRisks.map((asset, idx) => {
                    const assetRiskLevel = asset.risk_score <= 33 ? "LOW" : asset.risk_score <= 66 ? "MEDIUM" : "HIGH";
                    const assetRiskColor = asset.risk_score <= 33 ? "#10b981" : asset.risk_score <= 66 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-3 text-white font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                              {asset.symbol?.slice(0, 1).toUpperCase()}
                            </div>
                            {asset.symbol?.toUpperCase()}
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 text-slate-300">{asset.volatility?.toFixed(1)}%</td>
                        <td className="text-right py-3 px-3 text-slate-300">{asset.portfolio_weight?.toFixed(2)}%</td>
                        <td className="text-center py-3 px-3">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${assetRiskColor}20`, color: assetRiskColor }}>
                            {assetRiskLevel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Diversification Score */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl mt-8">
          <h2 className="text-lg font-bold text-white mb-4">Diversification Score</h2>
          {riskLoading || portfolioLoading ? (
            <LoadingSkeleton height="h-24" />
          ) : !hasHoldingsData ? (
            <div>
              <p className="text-xs text-slate-400">No holdings to analyze</p>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: "0%" }} />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Highly Concentrated</span>
                <span className="text-sm font-bold text-white">{(diversification * 100).toFixed(0)}/100</span>
                <span className="text-sm text-slate-400">Well Diversified</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-500" style={{ width: `${diversification * 100}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-3">
                {diversification < 0.3
                  ? "Your portfolio is highly concentrated. Consider adding more diverse assets to reduce risk."
                  : diversification < 0.6
                  ? "Your portfolio has moderate diversification. You may benefit from adding more asset types."
                  : "Your portfolio is well-diversified. Good risk management with multiple holdings."}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Total Holdings</p>
                  <p className="text-lg font-bold text-white">{holdings.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Largest Position</p>
                  <p className="text-lg font-bold text-white">{(concentration * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
