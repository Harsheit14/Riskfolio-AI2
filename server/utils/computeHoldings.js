/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SINGLE SOURCE OF TRUTH: Holdings Computation Utility
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Compute portfolio holdings from transaction list
 * Used by: All controllers (dashboard, portfolio, risk) to ensure data consistency
 * 
 * Algorithm: FIFO aggregation
 * - Loop through all transactions (sorted by date)
 * - For BUY: add quantity and cost
 * - For SELL: subtract quantity and cost
 * - Remove assets with quantity <= 0
 */

/**
 * Compute holdings from transactions using FIFO aggregation
 * 
 * @param {Array} transactions - List of transaction objects with:
 *   - symbol (asset symbol from join with assets table)
 *   - type ('BUY' or 'SELL')
 *   - quantity (number)
 *   - price_at_transaction (price at time of transaction)
 * 
 * @returns {Object} Holdings map: { symbol: { quantity, avgPrice, totalCost } }
 * 
 * Example:
 * Input: [
 *   { symbol: 'XRP', type: 'BUY', quantity: 1000, price_at_transaction: 0.50 },
 *   { symbol: 'XRP', type: 'SELL', quantity: 400, price_at_transaction: 0.70 },
 * ]
 * Output: {
 *   'XRP': { quantity: 600, avgPrice: 0.50, totalCost: 300 }
 * }
 */
export function computeHoldings(transactions) {
  const holdings = {};

  // Handle empty transactions
  if (!transactions || transactions.length === 0) {
    return holdings;
  }

  // Sort by created_at to ensure chronological order (FIFO)
  const sortedTx = [...transactions].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateA - dateB;
  });

  // Process each transaction
  for (const tx of sortedTx) {
    const { symbol, type, created_at } = tx;

    const quantity = parseFloat(tx.quantity);
    const price_at_transaction = parseFloat(tx.price_at_transaction);

    if (!symbol || isNaN(quantity) || quantity <= 0) continue;

    if (!holdings[symbol]) {
      holdings[symbol] = {
        quantity: 0,
        totalCost: 0,
        avgPrice: 0,
        transactions: [],
      };
    }

    const holding = holdings[symbol];
    const transactionCost = quantity * price_at_transaction;

    // Debug log for ETH
    if (symbol === "ETH") {
      console.log(`[ETH DEBUG] Before ${type}: qty=${holding.quantity}, cost=${holding.totalCost}`);
    }

    if (type === "BUY") {
      // ───────────────────────────────────────────────────────────────────
      // BUY: Add quantity and cost
      // ───────────────────────────────────────────────────────────────────
      holding.quantity += quantity;
      holding.totalCost += transactionCost;

      // Recalculate average price
      if (holding.quantity > 0) {
        holding.avgPrice = Math.round((holding.totalCost / holding.quantity) * 10000) / 10000;
      }

      // Track transaction for debugging
      holding.transactions.push({
        type: "BUY",
        quantity,
        price: price_at_transaction,
        date: created_at,
        runningQty: holding.quantity,
      });

      if (symbol === "ETH") {
        console.log(`[ETH DEBUG] After BUY +${quantity}: qty=${holding.quantity}, avgPrice=${holding.avgPrice}`);
      }
    } else if (type === "SELL") {
      // ───────────────────────────────────────────────────────────────────
      // SELL: Subtract quantity and cost
      // Validation: Cannot sell more than held
      // ───────────────────────────────────────────────────────────────────
      const quantityBefore = holding.quantity;

      // Validate: Check if we have enough to sell
      if (holding.quantity < quantity) {
        console.error(
          `[ERROR] ${symbol}: Cannot sell ${quantity} - only have ${holding.quantity} held. Date: ${created_at}`
        );
        // Don't process this SELL - skip it to prevent negative holdings
        continue;
      }

      holding.quantity -= quantity;
      
      // Subtract proportional cost
      if (holding.quantity >= 0 && holding.avgPrice > 0) {
        holding.totalCost -= quantity * holding.avgPrice;
        holding.totalCost = Math.max(0, holding.totalCost); // Prevent negative due to rounding
        
        // Recalculate average price
        if (holding.quantity > 0) {
          holding.avgPrice = Math.round((holding.totalCost / holding.quantity) * 10000) / 10000;
        } else {
          holding.avgPrice = 0;
        }
      }

      // Track transaction for debugging
      holding.transactions.push({
        type: "SELL",
        quantity,
        price: price_at_transaction,
        date: created_at,
        runningQty: holding.quantity,
      });

      if (symbol === "ETH") {
        console.log(`[ETH DEBUG] After SELL -${quantity}: qty=${holding.quantity} (was ${quantityBefore}), avgPrice=${holding.avgPrice}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DEBUG: Log ETH transaction history
  // ═══════════════════════════════════════════════════════════════════════
  if (holdings["ETH"]) {
    console.log(`\n[ETH TRANSACTION HISTORY]`);
    console.log(`  Transactions for ETH:`);
    holdings["ETH"].transactions.forEach((tx, idx) => {
      console.log(`    ${idx + 1}. ${tx.type} ${tx.quantity} @ ${tx.price} → qty=${tx.runningQty}`);
    });
    console.log(`  Final ETH: quantity=${holdings["ETH"].quantity}, cost=${holdings["ETH"].totalCost}, avgPrice=${holdings["ETH"].avgPrice}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Remove zero-quantity holdings & clean debug data
  // ═══════════════════════════════════════════════════════════════════════
  const finalHoldings = {};
  for (const symbol in holdings) {
    if (holdings[symbol].quantity > 0.000001) {
      finalHoldings[symbol] = {
        quantity: holdings[symbol].quantity,
        avgPrice: holdings[symbol].avgPrice,
        totalCost: holdings[symbol].totalCost,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FINAL DEBUG LOG
  // ═══════════════════════════════════════════════════════════════════════
  console.log(`\n[COMPUTE HOLDINGS] Processing complete`);
  console.log(`  Input transactions: ${transactions.length}`);
  console.log(`  Final holdings count: ${Object.keys(finalHoldings).length}`);
  console.log(`  Holdings:`, finalHoldings);

  return finalHoldings;
}

/**
 * Get asset count from holdings
 * 
 * @param {Object} holdings - Holdings map from computeHoldings()
 * @returns {number} Count of assets held
 */
export function getAssetCount(holdings) {
  return Object.keys(holdings || {}).length;
}

/**
 * Log holdings for debugging
 */
export function logHoldings(holdings, label = "Holdings") {
  console.log(`\n[${label}]`);
  if (!holdings || Object.keys(holdings).length === 0) {
    console.log("  (empty)");
    return;
  }
  for (const [symbol, data] of Object.entries(holdings)) {
    console.log(`  ${symbol}: ${data.quantity} @ avg $${data.avgPrice} (cost: $${data.totalCost})`);
  }
}
