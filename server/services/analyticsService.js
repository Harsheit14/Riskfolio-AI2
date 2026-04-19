/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PHASE 7: ADVANCED FINANCIAL ANALYTICS SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Quantitative financial metrics and risk analysis
 * Features:
 * - Daily returns calculation
 * - Volatility (standard deviation)
 * - Sharpe ratio (risk-adjusted return)
 * - Maximum drawdown analysis
 * - Portfolio risk profiling
 * - Statistical safeguards for numerical stability
 * 
 * Mathematical Formulas:
 * - Daily Return: r_t = (P_t - P_{t-1}) / P_{t-1}
 * - Volatility: σ = √(Σ(r_i - μ)² / (n-1))
 * - Sharpe Ratio: (μ_return - r_f) / σ
 * - Max Drawdown: (Trough - Peak) / Peak (from running maximum)
 * 
 * @module analyticsService
 */

/**
 * Helper: Round to N decimal places
 * @param {Number} value - Value to round
 * @param {Number} decimals - Number of decimal places
 * @returns {Number} Rounded value
 */
function roundTo(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Helper: Check if value is valid number
 * @param {Number} value - Value to check
 * @returns {Boolean} True if valid finite number
 */
function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Calculate daily returns from price history
 * 
 * Daily return formula:
 * r_t = (P_t - P_{t-1}) / P_{t-1}
 * 
 * Key Safety Features:
 * - Validates all prices are positive
 * - Handles gaps in data (assumes continuous trading)
 * - Filters invalid entries
 * - Returns empty array if insufficient data
 * 
 * @param {Array} priceHistory - Array of {timestamp, price}
 * @returns {Array} Array of daily returns [{timestamp, return}]
 * 
 * @example
 * const prices = [
 *   {timestamp: 1000, price: 100},
 *   {timestamp: 2000, price: 105},
 *   {timestamp: 3000, price: 103}
 * ];
 * const returns = calculateReturns(prices);
 * // Returns: [{timestamp: 2000, return: 0.05}, {timestamp: 3000, return: -0.019}]
 */
export function calculateReturns(priceHistory) {
  try {
    // Input validation
    if (!Array.isArray(priceHistory)) {
      console.warn("⚠️  Invalid price history: not an array");
      return [];
    }

    if (priceHistory.length < 2) {
      console.warn("⚠️  Insufficient data for returns calculation (need ≥2 prices)");
      return [];
    }

    // Filter valid entries (price must be positive number)
    const validPrices = priceHistory.filter(
      (entry) => entry && isValidNumber(entry.price)
    );

    if (validPrices.length < 2) {
      console.warn("⚠️  No valid price entries");
      return [];
    }

    // Sort by timestamp (ascending)
    const sorted = [...validPrices].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate returns
    const returns = [];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i - 1];

      const price_today = current.price;
      const price_yesterday = previous.price;

      // Avoid division by zero
      if (price_yesterday === 0) {
        console.warn(`⚠️  Zero price detected at timestamp ${previous.timestamp}`);
        continue;
      }

      const dailyReturn = (price_today - price_yesterday) / price_yesterday;

      // Sanity check for extreme returns (>1000% in a day is suspicious)
      if (Math.abs(dailyReturn) > 10) {
        console.warn(
          `⚠️  Extreme return detected: ${(dailyReturn * 100).toFixed(2)}% at ${current.timestamp}`
        );
        // Still include it, but log for debugging
      }

      returns.push({
        timestamp: current.timestamp,
        return: roundTo(dailyReturn, 4),
      });
    }

    return returns;
  } catch (error) {
    console.error(`❌ Error calculating returns: ${error.message}`);
    return [];
  }
}

/**
 * Calculate volatility (standard deviation of returns)
 * 
 * Volatility measures price fluctuation:
 * σ = √(Σ(r_i - μ)² / (n-1))
 * 
 * Where:
 * - r_i = individual returns
 * - μ = mean return
 * - n = number of returns
 * - (n-1) = Bessel's correction for sample std dev
 * 
 * Key Safety Features:
 * - Uses sample std dev (n-1) not population (n)
 * - Handles constant prices (zero volatility)
 * - Returns 0 for single data point
 * - Validates all inputs
 * 
 * @param {Array} returns - Array of returns (numbers)
 * @returns {Object} {volatility: number (decimal)}
 * 
 * @example
 * const returns = [0.05, -0.019, 0.02, 0.015];
 * const vol = calculateVolatility(returns);
 * // Returns: {volatility: 0.0298}
 */
export function calculateVolatility(returns) {
  try {
    // Input validation
    if (!Array.isArray(returns)) {
      console.warn("⚠️  Invalid returns: not an array");
      return { volatility: 0 };
    }

    // Need at least 2 data points for meaningful volatility
    if (returns.length < 2) {
      console.warn("⚠️  Insufficient data for volatility calculation (need ≥2 returns)");
      return { volatility: 0 };
    }

    // Filter valid numbers
    const validReturns = returns.filter(
      (r) => typeof r === "number" && Number.isFinite(r)
    );

    if (validReturns.length < 2) {
      return { volatility: 0 };
    }

    // Calculate mean return
    const mean = validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;

    // Calculate variance (sum of squared deviations)
    const squaredDeviations = validReturns.map((r) => Math.pow(r - mean, 2));
    const variance = squaredDeviations.reduce((sum, sq) => sum + sq, 0) / (validReturns.length - 1);

    // Standard deviation (square root of variance)
    const volatility = Math.sqrt(variance);

    return {
      volatility: roundTo(volatility, 4),
    };
  } catch (error) {
    console.error(`❌ Error calculating volatility: ${error.message}`);
    return { volatility: 0 };
  }
}

/**
 * Calculate Sharpe Ratio (risk-adjusted return)
 * 
 * Sharpe Ratio measures excess return per unit of risk:
 * Sharpe = (mean_return - r_f) / std_dev
 * 
 * Where:
 * - mean_return = average daily return
 * - r_f = risk-free rate (assume 0 for crypto)
 * - std_dev = volatility (standard deviation)
 * 
 * Interpretation:
 * - > 1.0: Good risk-adjusted return
 * - > 2.0: Excellent risk-adjusted return
 * - < 0: Portfolio underperforming risk-free asset
 * 
 * Key Safety Features:
 * - Handles zero volatility (returns 0)
 * - Annualizes based on trading days (252 per year for daily data)
 * - Validates all inputs
 * - Returns 0 for insufficient data
 * 
 * @param {Array} returns - Array of returns (numbers)
 * @param {Number} riskFreeRate - Risk-free rate (default 0)
 * @returns {Object} {sharpeRatio: number}
 * 
 * @example
 * const returns = [0.01, 0.015, -0.005, 0.02];
 * const sharpe = calculateSharpeRatio(returns);
 * // Returns: {sharpeRatio: 2.5}
 */
export function calculateSharpeRatio(returns, riskFreeRate = 0) {
  try {
    // Input validation
    if (!Array.isArray(returns)) {
      console.warn("⚠️  Invalid returns: not an array");
      return { sharpeRatio: 0 };
    }

    if (returns.length < 2) {
      console.warn("⚠️  Insufficient data for Sharpe ratio calculation");
      return { sharpeRatio: 0 };
    }

    // Filter valid numbers
    const validReturns = returns.filter(
      (r) => typeof r === "number" && Number.isFinite(r)
    );

    if (validReturns.length < 2) {
      return { sharpeRatio: 0 };
    }

    // Calculate mean return
    const meanReturn = validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;

    // Calculate volatility (standard deviation)
    const { volatility } = calculateVolatility(validReturns);

    // Avoid division by zero
    if (volatility === 0) {
      console.warn("⚠️  Zero volatility detected, Sharpe ratio undefined");
      return { sharpeRatio: 0 };
    }

    // Calculate Sharpe ratio (daily)
    const sharpeDaily = (meanReturn - riskFreeRate) / volatility;

    // Annualize for interpretation (252 trading days per year)
    const sharpeAnnualized = sharpeDaily * Math.sqrt(252);

    return {
      sharpeRatio: roundTo(sharpeAnnualized, 2),
    };
  } catch (error) {
    console.error(`❌ Error calculating Sharpe ratio: ${error.message}`);
    return { sharpeRatio: 0 };
  }
}

/**
 * Calculate Maximum Drawdown
 * 
 * Maximum Drawdown measures the largest peak-to-trough decline:
 * MaxDD = (Trough - Peak) / Peak
 * 
 * Where:
 * - Peak = running maximum value to date
 * - Trough = current value
 * - Expressed as percentage (e.g., -0.35 for 35% drawdown)
 * 
 * Key Safety Features:
 * - Handles all-positive prices (zero drawdown)
 * - Avoids division by zero
 * - Returns as decimal (multiply by 100 for percentage)
 * - Validates all inputs
 * 
 * @param {Array} priceHistory - Array of {timestamp, price}
 * @returns {Object} {maxDrawdown: number (decimal, negative)}
 * 
 * @example
 * const prices = [
 *   {timestamp: 1000, price: 100},
 *   {timestamp: 2000, price: 150},  // Peak
 *   {timestamp: 3000, price: 90},   // Trough (-40%)
 *   {timestamp: 4000, price: 110}
 * ];
 * const dd = calculateMaxDrawdown(prices);
 * // Returns: {maxDrawdown: -0.40}
 */
export function calculateMaxDrawdown(priceHistory) {
  try {
    // Input validation
    if (!Array.isArray(priceHistory)) {
      console.warn("⚠️  Invalid price history: not an array");
      return { maxDrawdown: 0 };
    }

    if (priceHistory.length < 2) {
      console.warn("⚠️  Insufficient data for drawdown calculation");
      return { maxDrawdown: 0 };
    }

    // Filter valid entries
    const validPrices = priceHistory.filter(
      (entry) => entry && isValidNumber(entry.price)
    );

    if (validPrices.length < 2) {
      return { maxDrawdown: 0 };
    }

    // Sort by timestamp (ascending)
    const sorted = [...validPrices].sort((a, b) => a.timestamp - b.timestamp);

    let maxDrawdown = 0; // Track the worst drawdown (most negative)
    let runningMax = sorted[0].price; // Running peak

    for (let i = 1; i < sorted.length; i++) {
      const currentPrice = sorted[i].price;

      // Update running maximum
      if (currentPrice > runningMax) {
        runningMax = currentPrice;
      }

      // Calculate drawdown from current peak
      const drawdown = (currentPrice - runningMax) / runningMax;

      // Track worst drawdown (most negative)
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      maxDrawdown: roundTo(maxDrawdown, 4),
    };
  } catch (error) {
    console.error(`❌ Error calculating max drawdown: ${error.message}`);
    return { maxDrawdown: 0 };
  }
}

/**
 * Calculate Portfolio Risk Profile
 * 
 * Combines multiple risk metrics to classify portfolio:
 * - Low: Stable, low volatility, small drawdowns
 * - Medium: Moderate volatility and drawdowns
 * - High: High volatility and/or large drawdowns
 * 
 * Classification Logic:
 * - Volatility: < 0.02 (2%) = Low, < 0.05 = Medium, else High
 * - Drawdown: > -0.20 (20%) = High priority, > -0.40 = Very high
 * - Diversification: Multiple assets reduces risk
 * 
 * Key Safety Features:
 * - Handles missing metrics gracefully
 * - Weights volatility and drawdown
 * - Returns reasonable defaults
 * - Never crashes on invalid input
 * 
 * @param {Object} metrics - {volatility, maxDrawdown, assetCount}
 * @returns {Object} {riskLevel: "Low"|"Medium"|"High", riskScore: number}
 * 
 * @example
 * const metrics = {
 *   volatility: 0.025,
 *   maxDrawdown: -0.15,
 *   assetCount: 3
 * };
 * const profile = calculatePortfolioRiskProfile(metrics);
 * // Returns: {riskLevel: "Low", riskScore: 3}
 */
export function calculatePortfolioRiskProfile(metrics = {}) {
  try {
    const {
      volatility = 0,
      maxDrawdown = 0,
      assetCount = 1,
    } = metrics;

    // Validate metrics
    const vol = typeof volatility === "number" && Number.isFinite(volatility)
      ? Math.abs(volatility)
      : 0;

    const dd = typeof maxDrawdown === "number" && Number.isFinite(maxDrawdown)
      ? Math.abs(maxDrawdown)
      : 0;

    const assets = Math.max(1, Math.floor(assetCount || 1));

    // Calculate risk score (0-10 scale)
    let riskScore = 0;

    // Volatility component (0-4 points)
    if (vol < 0.01) {
      riskScore += 0; // Negligible
    } else if (vol < 0.02) {
      riskScore += 1; // Very low
    } else if (vol < 0.05) {
      riskScore += 2; // Low
    } else if (vol < 0.10) {
      riskScore += 3; // Medium
    } else {
      riskScore += 4; // High
    }

    // Drawdown component (0-4 points)
    if (dd < 0.10) {
      riskScore += 0; // Negligible
    } else if (dd < 0.20) {
      riskScore += 1; // Low drawdown
    } else if (dd < 0.40) {
      riskScore += 2; // Medium drawdown
    } else if (dd < 0.60) {
      riskScore += 3; // High drawdown
    } else {
      riskScore += 4; // Severe drawdown
    }

    // Diversification bonus (0-2 points reduction)
    let diversificationBonus = 0;
    if (assets >= 2) diversificationBonus += 0.5;
    if (assets >= 3) diversificationBonus += 0.5;
    if (assets >= 5) diversificationBonus += 0.5;

    riskScore = Math.max(0, riskScore - diversificationBonus);

    // Classify risk level
    let riskLevel;
    if (riskScore <= 2) {
      riskLevel = "Low";
    } else if (riskScore <= 5) {
      riskLevel = "Medium";
    } else {
      riskLevel = "High";
    }

    return {
      riskLevel,
      riskScore: roundTo(riskScore, 1),
    };
  } catch (error) {
    console.error(`❌ Error calculating risk profile: ${error.message}`);
    return {
      riskLevel: "Unknown",
      riskScore: 0,
    };
  }
}

/**
 * Calculate comprehensive analytics for a time series
 * 
 * Combines all metrics into single endpoint
 * Handles edge cases and invalid data gracefully
 * 
 * @param {Array} priceHistory - Price data [{timestamp, price}]
 * @param {Object} portfolioMetrics - {assetCount, allocation}
 * @returns {Object} Complete analytics package
 * 
 * @example
 * const analytics = await getComprehensiveAnalytics(priceHistory);
 * // Returns: {
 * //   returns: [...],
 * //   volatility: 0.025,
 * //   sharpeRatio: 2.3,
 * //   maxDrawdown: -0.15,
 * //   riskLevel: "Medium",
 * //   metrics: {...}
 * // }
 */
export async function getComprehensiveAnalytics(priceHistory = [], portfolioMetrics = {}) {
  try {
    // Calculate returns
    const returns = calculateReturns(priceHistory);

    // Extract return values only (for volatility/Sharpe calculations)
    const returnValues = returns.map((r) => r.return);

    // Calculate individual metrics
    const volatilityData = calculateVolatility(returnValues);
    const sharpeData = calculateSharpeRatio(returnValues);
    const drawdownData = calculateMaxDrawdown(priceHistory);
    const riskProfile = calculatePortfolioRiskProfile({
      volatility: volatilityData.volatility,
      maxDrawdown: drawdownData.maxDrawdown,
      assetCount: portfolioMetrics.assetCount,
    });

    return {
      // Time series
      returns,
      returnsCount: returns.length,

      // Risk metrics
      volatility: volatilityData.volatility,
      sharpeRatio: sharpeData.sharpeRatio,
      maxDrawdown: drawdownData.maxDrawdown,

      // Risk classification
      riskLevel: riskProfile.riskLevel,
      riskScore: riskProfile.riskScore,

      // Metadata
      dataPoints: priceHistory.length,
      calculatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error in comprehensive analytics: ${error.message}`);
    return {
      returns: [],
      returnsCount: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      riskLevel: "Unknown",
      riskScore: 0,
      dataPoints: 0,
      calculatedAt: new Date().toISOString(),
      error: error.message,
    };
  }
}

/**
 * Calculate historical volatility trends
 * 
 * Shows how volatility changes over time
 * Useful for volatility clustering analysis
 * 
 * @param {Array} returns - Array of returns
 * @param {Number} windowSize - Rolling window size (e.g., 30 for 30-day)
 * @returns {Array} Rolling volatility [{timestamp, volatility}]
 */
export function calculateRollingVolatility(returns = [], windowSize = 30) {
  try {
    if (!Array.isArray(returns) || returns.length < windowSize) {
      return [];
    }

    const rolling = [];

    for (let i = windowSize; i <= returns.length; i++) {
      const window = returns.slice(i - windowSize, i);

      // Ensure we have return objects with return property
      const returnValues = window.map((r) => {
        return typeof r === "object" ? r.return : r;
      }).filter((r) => typeof r === "number" && Number.isFinite(r));

      if (returnValues.length >= 2) {
        const volData = calculateVolatility(returnValues);
        rolling.push({
          index: i,
          volatility: volData.volatility,
        });
      }
    }

    return rolling;
  } catch (error) {
    console.error(`❌ Error calculating rolling volatility: ${error.message}`);
    return [];
  }
}

/**
 * Calculate Value at Risk (VaR) - 95% confidence
 * 
 * Estimates maximum expected loss at 95% confidence level
 * Using historical simulation method
 * 
 * @param {Array} returns - Array of returns
 * @param {Number} confidenceLevel - Confidence level (default 0.95)
 * @returns {Object} {var95: number}
 */
export function calculateValueAtRisk(returns = [], confidenceLevel = 0.95) {
  try {
    if (!Array.isArray(returns) || returns.length < 20) {
      console.warn("⚠️  Insufficient data for VaR calculation (need ≥20)");
      return { var95: 0 };
    }

    // Extract values
    const returnValues = returns.map((r) => {
      return typeof r === "object" ? r.return : r;
    }).filter((r) => typeof r === "number" && Number.isFinite(r));

    // Sort returns (ascending, so worst first)
    const sorted = [...returnValues].sort((a, b) => a - b);

    // Calculate percentile index
    const percentileIndex = Math.ceil(sorted.length * (1 - confidenceLevel)) - 1;
    const var95 = sorted[Math.max(0, percentileIndex)];

    return {
      var95: roundTo(var95, 4),
    };
  } catch (error) {
    console.error(`❌ Error calculating VaR: ${error.message}`);
    return { var95: 0 };
  }
}

/**
 * Calculate Conditional Value at Risk (CVaR)
 * 
 * Average of worst case losses beyond VaR threshold
 * More conservative than VaR
 * 
 * @param {Array} returns - Array of returns
 * @param {Number} confidenceLevel - Confidence level (default 0.95)
 * @returns {Object} {cvar95: number}
 */
export function calculateConditionalValueAtRisk(returns = [], confidenceLevel = 0.95) {
  try {
    if (!Array.isArray(returns) || returns.length < 20) {
      return { cvar95: 0 };
    }

    // Extract values
    const returnValues = returns.map((r) => {
      return typeof r === "object" ? r.return : r;
    }).filter((r) => typeof r === "number" && Number.isFinite(r));

    // Sort returns (ascending)
    const sorted = [...returnValues].sort((a, b) => a - b);

    // Calculate tail threshold
    const tailSize = Math.ceil(sorted.length * (1 - confidenceLevel));
    const tail = sorted.slice(0, tailSize);

    // Average of tail (conditional expectation)
    const cvar = tail.reduce((sum, r) => sum + r, 0) / tail.length;

    return {
      cvar95: roundTo(cvar, 4),
    };
  } catch (error) {
    console.error(`❌ Error calculating CVaR: ${error.message}`);
    return { cvar95: 0 };
  }
}

/**
 * Calculate Sortino Ratio (downside-adjusted Sharpe)
 * 
 * Uses only downside volatility (negative returns)
 * More relevant for portfolio risk assessment
 * 
 * @param {Array} returns - Array of returns
 * @param {Number} targetReturn - Target return (default 0)
 * @returns {Object} {sortinoRatio: number}
 */
export function calculateSortinoRatio(returns = [], targetReturn = 0) {
  try {
    if (!Array.isArray(returns) || returns.length < 2) {
      return { sortinoRatio: 0 };
    }

    // Extract values
    const returnValues = returns.map((r) => {
      return typeof r === "object" ? r.return : r;
    }).filter((r) => typeof r === "number" && Number.isFinite(r));

    if (returnValues.length < 2) {
      return { sortinoRatio: 0 };
    }

    // Mean return
    const meanReturn = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;

    // Downside deviation (only negative returns below target)
    const downSideReturns = returnValues.filter((r) => r < targetReturn);

    if (downSideReturns.length === 0) {
      // All returns above target (positive scenario)
      return { sortinoRatio: roundTo(meanReturn * Math.sqrt(252), 2) };
    }

    const downSideVariance = downSideReturns
      .map((r) => Math.pow(r - targetReturn, 2))
      .reduce((sum, sq) => sum + sq, 0) / downSideReturns.length;

    const downSideDeviation = Math.sqrt(downSideVariance);

    if (downSideDeviation === 0) {
      return { sortinoRatio: 0 };
    }

    const sortinoDaily = (meanReturn - targetReturn) / downSideDeviation;
    const sortinoAnnualized = sortinoDaily * Math.sqrt(252);

    return {
      sortinoRatio: roundTo(sortinoAnnualized, 2),
    };
  } catch (error) {
    console.error(`❌ Error calculating Sortino ratio: ${error.message}`);
    return { sortinoRatio: 0 };
  }
}
