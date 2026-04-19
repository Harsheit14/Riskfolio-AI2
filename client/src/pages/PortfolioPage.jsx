import { useState, useEffect } from "react";
import { usePortfolio } from "../hooks/usePortfolio";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import * as portfolioService from "../services/portfolioService";
import { getValidHoldings, logHoldingsSummary } from "../utils/holdingsUtils";

export default function PortfolioPage() {
  const { holdings, loading: portfolioLoading, refetch } = usePortfolio();
  const [formData, setFormData] = useState({ type: "BUY", symbol: "", quantity: "", price: "" });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, txId: null, loading: false });

  // Use shared utility to filter valid holdings
  const rawHoldings = Array.isArray(holdings) ? holdings : [];
  const safeHoldings = getValidHoldings(rawHoldings);
  
  // Log holdings summary for debugging
  logHoldingsSummary(rawHoldings, "Portfolio");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setTxLoading(true);
      const response = await portfolioService.getTransactions?.();
      if (Array.isArray(response?.data)) {
        setTransactions(response.data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.symbol.trim()) newErrors.symbol = "Symbol required";
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) newErrors.quantity = "Quantity must be > 0";
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = "Price must be > 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setErrors({});
    try {
      await portfolioService.addTransaction?.(
        formData.type,
        formData.symbol.toUpperCase(),
        parseFloat(formData.quantity),
        parseFloat(formData.price)
      );
      setToast({ type: "success", message: "Transaction added successfully!" });
      setFormData({ type: "BUY", symbol: "", quantity: "", price: "" });
      await Promise.all([refetch(), fetchTransactions()]);
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || "Failed to add transaction";
      setToast({ type: "error", message: errorMsg });
      console.error("[Transaction Error]", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteModal({ ...deleteModal, loading: true });
    try {
      await portfolioService.deleteTransaction?.(deleteModal.txId);
      setToast({ type: "success", message: "Transaction deleted successfully" });
      setDeleteModal({ isOpen: false, txId: null, loading: false });
      await Promise.all([fetchTransactions(), refetch()]);
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || "Failed to delete transaction";
      setToast({ type: "error", message: errorMsg });
      console.error("[Delete Error]", errorMsg);
      setDeleteModal({ isOpen: false, txId: null, loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Portfolio Management</h1>
          <p className="text-slate-400">Manage your assets and track transactions</p>
        </div>

        {/* Portfolio Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl bg-[#1a1d27] border border-indigo-500/30 p-6 shadow-xl">
            <p className="text-sm text-slate-400 font-medium mb-2">Total Holdings</p>
            <p className="text-3xl font-bold text-white">{portfolioLoading ? "..." : safeHoldings.length}</p>
            <p className="text-xs text-slate-500 mt-1">Assets in portfolio</p>
          </div>
          <div className="rounded-2xl bg-[#1a1d27] border border-green-500/30 p-6 shadow-xl">
            <p className="text-sm text-slate-400 font-medium mb-2">Total Invested</p>
            <p className="text-3xl font-bold text-white">
              {portfolioLoading ? "..." : "$" + (safeHoldings.reduce((sum, h) => sum + (Number(h.avgBuyPrice) * Number(h.quantity)) || 0, 0).toFixed(2))}
            </p>
            <p className="text-xs text-slate-500 mt-1">Cost basis</p>
          </div>
          <div className="rounded-2xl bg-[#1a1d27] border border-purple-500/30 p-6 shadow-xl">
            <p className="text-sm text-slate-400 font-medium mb-2">Current Value</p>
            <p className="text-3xl font-bold text-white">
              {portfolioLoading ? "..." : "$" + (safeHoldings.reduce((sum, h) => sum + (Number(h.currentValue) || 0), 0).toFixed(2))}
            </p>
            <p className="text-xs text-slate-500 mt-1">Market value</p>
          </div>
          <div className="rounded-2xl bg-[#1a1d27] border border-amber-500/30 p-6 shadow-xl">
            <p className="text-sm text-slate-400 font-medium mb-2">Total P&L</p>
            {portfolioLoading ? (
              <p className="text-3xl font-bold text-white">...</p>
            ) : (
              <>
                <p className={`text-3xl font-bold ${safeHoldings.reduce((sum, h) => sum + (Number(h.pnl) || 0), 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {safeHoldings.reduce((sum, h) => sum + (Number(h.pnl) || 0), 0) >= 0 ? "+" : ""}${Math.abs(safeHoldings.reduce((sum, h) => sum + (Number(h.pnl) || 0), 0)).toFixed(2)}
                </p>
                <p className={`text-xs ${safeHoldings.reduce((sum, h) => sum + (Number(h.pnl) || 0), 0) >= 0 ? "text-green-400" : "text-red-400"} mt-1`}>
                  {safeHoldings.reduce((sum, h) => sum + (Number(h.pnlPercentage) || 0), 0) > 0 ? "+" : ""}{(safeHoldings.reduce((sum, h) => sum + (Number(h.pnlPercentage) || 0), 0) / Math.max(safeHoldings.length, 1)).toFixed(2)}% return
                </p>
              </>
            )}
          </div>
        </div>

        {/* Add Transaction Form */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-6">Record Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <div className="flex gap-2">
                  {["BUY", "SELL"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        formData.type === t ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Asset Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="BTC, ETH, etc."
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {errors.symbol && <p className="text-xs text-red-400 mt-1">{errors.symbol}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0.5"
                  step="0.00001"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {errors.quantity && <p className="text-xs text-red-400 mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Price (USD)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="50000"
                  step="0.01"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-medium transition-all"
            >
              {loading ? "Adding..." : "Add Transaction"}
            </button>
          </form>
        </div>

        {/* Transaction History */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Transaction History</h2>
          {txLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height="h-12" />)}</div>
          ) : transactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No transactions yet</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Type</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Asset</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Quantity</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Price</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Total</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Date</th>
                    <th className="text-center py-3 px-3 text-slate-300 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === "BUY" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-medium">{tx.symbol || tx.asset_id}</td>
                      <td className="text-right py-3 px-3 text-slate-300">{(Number(tx.quantity) || 0).toFixed(4)}</td>
                      <td className="text-right py-3 px-3 text-slate-300">${(Number(tx.price_at_transaction) || 0).toFixed(2)}</td>
                      <td className="text-right py-3 px-3 text-white font-medium">${((Number(tx.quantity) || 0) * (Number(tx.price_at_transaction) || 0)).toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="text-center py-3 px-3">
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, txId: tx.id, loading: false })}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Holdings Breakdown */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Holdings Breakdown</h2>
          {portfolioLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <LoadingSkeleton key={i} height="h-12" />)}</div>
          ) : safeHoldings.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No holdings</p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Asset</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Quantity</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Cost Basis</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Current Value</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Unrealized P&L</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {safeHoldings.map((h, idx) => {
                    const pnl = Number(h.pnl) || 0;
                    const roi = (Number(h.pnlPercentage) || 0).toFixed(2);
                    return (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-3 text-white font-medium">{h.symbol?.toUpperCase()}</td>
                        <td className="text-right py-3 px-3 text-slate-300">{(Number(h.quantity) || 0).toFixed(4)}</td>
                        <td className="text-right py-3 px-3 text-slate-300">${((Number(h.avgBuyPrice) || 0) * (Number(h.quantity) || 0)).toFixed(2)}</td>
                        <td className="text-right py-3 px-3 text-white font-medium">${(Number(h.currentValue) || 0).toFixed(2)}</td>
                        <td className={`text-right py-3 px-3 font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)}
                        </td>
                        <td className={`text-right py-3 px-3 font-medium ${roi >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {roi >= 0 ? "+" : ""}{roi}%
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Transaction"
        message="This action cannot be undone."
        confirmText="Delete"
        isLoading={deleteModal.loading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, txId: null, loading: false })}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}