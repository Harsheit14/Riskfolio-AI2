import { useState, useEffect } from "react";
import * as portfolioService from "../services/portfolioService";

export function usePortfolio() {
  const [holdings, setHoldings] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Single API call to /portfolio/summary
      const response = await portfolioService.getPortfolioSummary();
      const data = response?.data || {};

      // Use assets array directly from summary
      const assetsArray = Array.isArray(data.assets) ? data.assets : [];

      setHoldings(assetsArray);
      setAssetCount(assetsArray.length);
      setTotalValue(Number(data.totalValue) || 0);
      setTotalPnL(Number(data.totalPnL) || 0);

    } catch (err) {
      console.error("[usePortfolio] Error:", err?.message || err);
      setHoldings([]);
      setTotalValue(0);
      setTotalPnL(0);
      setAssetCount(0);
      setError(err?.response?.data?.message || err?.message || "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  return {
    holdings,
    totalValue,
    totalPnL,
    assetCount,
    loading,
    error,
    refetch: fetchPortfolioData,
  };
}
