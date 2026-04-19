import { useState, useEffect } from "react";
import * as riskService from "../services/riskService";
import { usePortfolio } from "./usePortfolio";

/**
 * useRisk hook
 * Fetches and manages risk analysis data
 * Automatically refetches when portfolio holdings change
 * 
 * @returns {Object} {
 *   riskReport: Risk report object with scores and metrics,
 *   loading: boolean,
 *   error: null | string,
 *   refetch: () => Promise (manually trigger refetch)
 * }
 */
export function useRisk() {
  const [riskReport, setRiskReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get holdings from portfolio hook to track changes
  const { holdings, loading: portfolioLoading } = usePortfolio();

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[useRisk] Fetching risk report with holdings:", holdings);
      
      const response = await riskService.getRiskReport();
      console.log("[useRisk] Risk report response:", response);
      
      setRiskReport(response?.data || null);
    } catch (err) {
      console.error("[useRisk] Error fetching risk report:", err?.message || err);
      console.error("[useRisk] Full error:", err);
      setRiskReport(null);
      setError(err?.response?.data?.error || err?.message || "Failed to load risk data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch risk data on mount and whenever holdings change
  useEffect(() => {
    if (!portfolioLoading && holdings && holdings.length > 0) {
      console.log("[useRisk] Holdings changed, refetching risk data");
      fetchRiskData();
    } else if (!portfolioLoading && (!holdings || holdings.length === 0)) {
      console.log("[useRisk] No holdings, clearing risk data");
      setRiskReport(null);
      setLoading(false);
    }
  }, [holdings, portfolioLoading]);

  const refetch = async () => {
    console.log("[useRisk] Manual refetch triggered");
    await fetchRiskData();
  };

  return {
    riskReport,
    loading,
    error,
    refetch,
  };
}
