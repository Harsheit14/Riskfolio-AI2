/**
 * ✅ AI SERVICE - Phase 10: Insight and Recommendation Layer (Rule-Based)
 *
 * Purpose: Generate intelligent insights and recommendations based on portfolio analytics
 * Type: Deterministic, rule-based system (no ML/external APIs)
 * Output: Actionable insights and portfolio recommendations
 *
 * Characteristics:
 * - Lightweight and fast (no network calls)
 * - Deterministic output (same input = same output)
 * - Safe for missing/incomplete data (graceful degradation)
 * - Production-ready with clear, actionable messages
 *
 * Integration:
 * - Called from getDashboard() in dashboardController
 * - Receives portfolio data (value, allocation, analytics)
 * - Returns { insights: [...], recommendations: [...] }
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION & THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

const THRESHOLDS = {
  // Concentration thresholds (%)
  CONCENTRATION_SEVERE: 60,    // > 60% = severe concentration
  CONCENTRATION_HIGH: 45,      // > 45% = high concentration
  CONCENTRATION_MODERATE: 30,  // > 30% = moderate concentration

  // Volatility thresholds (annual %)
  VOLATILITY_EXTREME: 100,     // > 100% = extreme volatility
  VOLATILITY_HIGH: 75,         // > 75% = high volatility
  VOLATILITY_MODERATE: 50,     // > 50% = moderate volatility

  // Sharpe ratio thresholds (risk-adjusted return)
  SHARPE_EXCELLENT: 2.0,       // > 2.0 = excellent risk-adjusted returns
  SHARPE_GOOD: 1.5,            // > 1.5 = good risk-adjusted returns
  SHARPE_FAIR: 1.0,            // > 1.0 = fair risk-adjusted returns
  SHARPE_POOR: 0.5,            // > 0.5 = poor risk-adjusted returns

  // Drawdown thresholds (%)
  DRAWDOWN_SEVERE: 50,         // > 50% = severe drawdown experienced
  DRAWDOWN_HIGH: 30,           // > 30% = high drawdown experienced
  DRAWDOWN_MODERATE: 15,       // > 15% = moderate drawdown experienced

  // Portfolio composition
  MIN_RECOMMENDED_ASSETS: 3,   // Should have at least 3 assets
  MIN_DIVERSIFIED_ASSETS: 5,   // 5+ assets considered well diversified

  // Risk score interpretation
  HIGH_RISK_SCORE: 70,         // Risk score > 70 = portfolio is risky
};

// ═══════════════════════════════════════════════════════════════════════════
// INSIGHT GENERATION (Descriptive, analytical)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate insights based on portfolio data
 *
 * Input: {
 *   totalValue: number (USD),
 *   allocation: [{symbol, percentage, value}, ...],
 *   volatility: number (annual %, optional),
 *   sharpeRatio: number (optional),
 *   maxDrawdown: number (%, optional),
 *   riskScore: number (0-100, optional)
 * }
 *
 * Output: [string] - Array of insight messages
 *
 * @param {Object} portfolioData - Complete portfolio analytics
 * @returns {Array<string>} Array of insights
 */
export function generateInsights(portfolioData) {
  const insights = [];

  if (!portfolioData) {
    return insights;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. ALLOCATION & CONCENTRATION INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  if (portfolioData.allocation && Array.isArray(portfolioData.allocation)) {
    const topAsset = portfolioData.allocation[0];

    if (topAsset) {
      const topPercentage = topAsset.percentage;

      if (topPercentage > THRESHOLDS.CONCENTRATION_SEVERE) {
        insights.push(
          `⚠️ Severe concentration detected: ${topAsset.symbol} represents ${topPercentage.toFixed(1)}% of your portfolio. This creates significant risk if ${topAsset.symbol} experiences a downturn.`
        );
      } else if (topPercentage > THRESHOLDS.CONCENTRATION_HIGH) {
        insights.push(
          `⚠️ High concentration in ${topAsset.symbol} (${topPercentage.toFixed(1)}% of portfolio). Consider diversifying to reduce concentration risk.`
        );
      } else if (topPercentage > THRESHOLDS.CONCENTRATION_MODERATE) {
        insights.push(
          `ℹ️ Portfolio shows moderate concentration in ${topAsset.symbol} (${topPercentage.toFixed(1)}%). Monitor this position.`
        );
      }
    }

    // Check diversification
    const assetCount = portfolioData.allocation.length;
    if (assetCount < THRESHOLDS.MIN_RECOMMENDED_ASSETS) {
      insights.push(
        `📊 Limited diversification: You hold only ${assetCount} asset${assetCount === 1 ? '' : 's'}. Consider adding more assets to spread risk.`
      );
    } else if (assetCount >= THRESHOLDS.MIN_DIVERSIFIED_ASSETS) {
      insights.push(
        `✅ Well-diversified portfolio: You hold ${assetCount} assets, providing good risk distribution.`
      );
    }

    // Top 3 holdings summary
    if (assetCount > 0) {
      const top3 = portfolioData.allocation.slice(0, 3);
      const top3Allocation = top3.reduce((sum, asset) => sum + asset.percentage, 0);
      insights.push(
        `📍 Top holdings: Your top 3 assets (${top3.map(a => a.symbol).join(', ')}) account for ${top3Allocation.toFixed(1)}% of portfolio value.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. VOLATILITY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.volatility === 'number') {
    const volatility = portfolioData.volatility;

    if (volatility > THRESHOLDS.VOLATILITY_EXTREME) {
      insights.push(
        `🔴 Extreme volatility detected: Annual volatility is ${volatility.toFixed(1)}%. Portfolio experiences high price swings.`
      );
    } else if (volatility > THRESHOLDS.VOLATILITY_HIGH) {
      insights.push(
        `🟠 High volatility: Annual volatility of ${volatility.toFixed(1)}% indicates significant price fluctuations.`
      );
    } else if (volatility > THRESHOLDS.VOLATILITY_MODERATE) {
      insights.push(
        `🟡 Moderate volatility: Annual volatility of ${volatility.toFixed(1)}% is typical for crypto portfolios.`
      );
    } else if (volatility > 0) {
      insights.push(
        `🟢 Low volatility: Annual volatility of ${volatility.toFixed(1)}% indicates a relatively stable portfolio.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. RISK-ADJUSTED RETURN INSIGHTS (Sharpe Ratio)
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.sharpeRatio === 'number') {
    const sharpe = portfolioData.sharpeRatio;

    if (sharpe > THRESHOLDS.SHARPE_EXCELLENT) {
      insights.push(
        `💎 Excellent risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} indicates strong returns relative to risk taken.`
      );
    } else if (sharpe > THRESHOLDS.SHARPE_GOOD) {
      insights.push(
        `👍 Good risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} shows solid return-to-risk balance.`
      );
    } else if (sharpe > THRESHOLDS.SHARPE_FAIR) {
      insights.push(
        `ℹ️ Fair risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} indicates acceptable but not exceptional returns per unit of risk.`
      );
    } else if (sharpe > THRESHOLDS.SHARPE_POOR) {
      insights.push(
        `⚠️ Low risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} suggests returns don't adequately compensate for risk.`
      );
    } else if (sharpe >= 0) {
      insights.push(
        `❌ Poor risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} is very low. Portfolio returns are not compensating for volatility.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. DRAWDOWN INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.maxDrawdown === 'number') {
    const drawdown = portfolioData.maxDrawdown;

    if (drawdown > THRESHOLDS.DRAWDOWN_SEVERE) {
      insights.push(
        `📉 Severe drawdown experienced: Maximum drawdown of ${drawdown.toFixed(1)}% shows portfolio has lost more than half its peak value at some point.`
      );
    } else if (drawdown > THRESHOLDS.DRAWDOWN_HIGH) {
      insights.push(
        `📉 High drawdown: Maximum drawdown of ${drawdown.toFixed(1)}% indicates significant historical losses from peak.`
      );
    } else if (drawdown > THRESHOLDS.DRAWDOWN_MODERATE) {
      insights.push(
        `📉 Moderate drawdown: Maximum drawdown of ${drawdown.toFixed(1)}% is typical for volatile portfolios.`
      );
    } else if (drawdown > 0) {
      insights.push(
        `✅ Low drawdown: Maximum drawdown of ${drawdown.toFixed(1)}% shows relatively good downside protection.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. OVERALL RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.riskScore === 'number') {
    const riskScore = portfolioData.riskScore;

    if (riskScore > THRESHOLDS.HIGH_RISK_SCORE) {
      insights.push(
        `⚠️ High-risk portfolio: Risk score of ${riskScore.toFixed(0)}/100. Portfolio is skewed toward risky assets or has high concentration.`
      );
    } else if (riskScore < 30) {
      insights.push(
        `✅ Conservative portfolio: Risk score of ${riskScore.toFixed(0)}/100. Well-diversified with lower volatility characteristics.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. PORTFOLIO SIZE INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.totalValue === 'number') {
    const value = portfolioData.totalValue;

    if (value === 0) {
      insights.push(
        `📭 Empty portfolio: No active holdings. Start by adding your first position.`
      );
    } else if (value < 100) {
      insights.push(
        `💬 Small portfolio: At $${value.toFixed(2)}, consider your portfolio as experimental until you have meaningful positions.`
      );
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECOMMENDATION GENERATION (Prescriptive, actionable)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate actionable recommendations based on portfolio data
 *
 * Input: Same format as generateInsights
 *
 * Output: [string] - Array of recommendation messages
 *
 * @param {Object} portfolioData - Complete portfolio analytics
 * @returns {Array<string>} Array of actionable recommendations
 */
export function generateRecommendations(portfolioData) {
  const recommendations = [];

  if (!portfolioData) {
    return recommendations;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. DIVERSIFICATION RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (portfolioData.allocation && Array.isArray(portfolioData.allocation)) {
    const assetCount = portfolioData.allocation.length;
    const topAsset = portfolioData.allocation[0];

    if (assetCount === 1 && topAsset) {
      recommendations.push(
        `🎯 Add diversification: You have only 1 asset (${topAsset.symbol}). Add at least 2-3 more assets to reduce single-asset risk.`
      );
    } else if (assetCount === 2) {
      recommendations.push(
        `🎯 Increase diversification: With 2 assets, you have basic coverage. Add 1-3 more complementary assets for better risk distribution.`
      );
    } else if (assetCount === 3) {
      recommendations.push(
        `🎯 Consider adding more assets: While 3 assets is decent, having 5+ assets provides better diversification.`
      );
    }

    // Concentration-based recommendations
    if (topAsset && topAsset.percentage > THRESHOLDS.CONCENTRATION_SEVERE) {
      recommendations.push(
        `⚠️ Reduce ${topAsset.symbol} concentration: Currently at ${topAsset.percentage.toFixed(1)}% of portfolio. Consider rebalancing to reduce position to under 50%.`
      );
    } else if (topAsset && topAsset.percentage > THRESHOLDS.CONCENTRATION_HIGH) {
      recommendations.push(
        `📊 Rebalance portfolio: ${topAsset.symbol} at ${topAsset.percentage.toFixed(1)}% is elevated. Consider trimming to 30-40% range.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. VOLATILITY & RISK MANAGEMENT RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.volatility === 'number') {
    const volatility = portfolioData.volatility;

    if (volatility > THRESHOLDS.VOLATILITY_EXTREME) {
      recommendations.push(
        `🛡️ Reduce volatility: Current volatility of ${volatility.toFixed(1)}% is very high. Consider adding stablecoins or lower-volatility assets like BTC.`
      );
    } else if (volatility > THRESHOLDS.VOLATILITY_HIGH) {
      recommendations.push(
        `🛡️ Moderate portfolio volatility: Consider adding established assets (BTC, ETH) or stablecoins to reduce overall portfolio swings.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. PERFORMANCE & RETURN RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.sharpeRatio === 'number') {
    const sharpe = portfolioData.sharpeRatio;

    if (sharpe < THRESHOLDS.SHARPE_FAIR) {
      recommendations.push(
        `📈 Improve risk-adjusted returns: Sharpe ratio of ${sharpe.toFixed(2)} is low. Review allocation to high-conviction holdings or reduce overall portfolio volatility.`
      );
    } else if (sharpe < THRESHOLDS.SHARPE_GOOD) {
      recommendations.push(
        `📈 Optimize for better risk-adjusted returns: Consider rebalancing toward higher-quality assets or increasing diversification.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. DRAWDOWN RECOVERY RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.maxDrawdown === 'number') {
    const drawdown = portfolioData.maxDrawdown;

    if (drawdown > THRESHOLDS.DRAWDOWN_SEVERE) {
      recommendations.push(
        `🔄 Implement drawdown protection: Maximum drawdown of ${drawdown.toFixed(1)}% is severe. Consider adding portfolio insurance (stablecoins) or stop-loss strategies.`
      );
    } else if (drawdown > THRESHOLDS.DRAWDOWN_HIGH) {
      recommendations.push(
        `🔄 Add downside protection: Consider allocating 10-20% to stablecoins as a hedge against future drawdowns.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. OVERALL PORTFOLIO BALANCE RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (typeof portfolioData.riskScore === 'number') {
    const riskScore = portfolioData.riskScore;

    if (riskScore > 80) {
      recommendations.push(
        `⚖️ Rebalance to lower risk: Risk score of ${riskScore.toFixed(0)}/100 is very high. Diversify across more assets or reduce exposure to high-volatility tokens.`
      );
    } else if (riskScore > 65) {
      recommendations.push(
        `⚖️ Consider a more balanced approach: Reduce concentration and add more assets to achieve better risk distribution.`
      );
    } else if (riskScore < 20 && portfolioData.totalValue && portfolioData.totalValue > 100) {
      recommendations.push(
        `📈 Conservative allocation detected: You have low portfolio risk. Consider if you're comfortable with this level or want more growth potential.`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. GENERAL BEST PRACTICES
  // ═══════════════════════════════════════════════════════════════════════

  if (portfolioData.allocation && Array.isArray(portfolioData.allocation) && portfolioData.allocation.length > 0) {
    recommendations.push(
      `💡 Regular rebalancing: Review your portfolio quarterly to maintain your target allocation and take profits/losses strategically.`
    );

    recommendations.push(
      `💡 Define your strategy: Align your asset allocation with your risk tolerance, investment timeline, and financial goals.`
    );
  }

  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate complete AI insights and recommendations
 *
 * Combines insights (descriptive) and recommendations (prescriptive) into a
 * single structured response for dashboard integration.
 *
 * @param {Object} portfolioData - Complete portfolio analytics
 * @returns {Object} { insights: [...], recommendations: [...] }
 */
export function generateInsightsAndRecommendations(portfolioData) {
  try {
    // Safe defaults: return empty arrays if no data
    if (!portfolioData) {
      return {
        insights: [],
        recommendations: [],
      };
    }

    // Generate insights and recommendations
    const insights = generateInsights(portfolioData);
    const recommendations = generateRecommendations(portfolioData);

    return {
      insights,
      recommendations,
    };
  } catch (error) {
    // Graceful error handling: return empty arrays if something goes wrong
    console.warn('[AI Service] Error generating insights and recommendations:', error.message);
    return {
      insights: [],
      recommendations: [],
    };
  }
}

export default {
  generateInsights,
  generateRecommendations,
  generateInsightsAndRecommendations,
};
