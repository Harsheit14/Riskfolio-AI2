/**
 * ✅ TRANSACTION SERVICE
 * 
 * Purpose: Handle BUY/SELL operations with database transactions
 * Strategy: Use PostgreSQL transactions to prevent race conditions
 * 
 * Pattern:
 * 1. BEGIN transaction
 * 2. SELECT FOR UPDATE (lock rows)
 * 3. Validate SELL quantity
 * 4. INSERT transaction
 * 5. COMMIT
 * 
 * On error: ROLLBACK and release lock
 */

import pool from "../config/db.js";

/**
 * Execute transaction safely with automatic rollback
 * 
 * @param {function} callback - Function to execute within transaction
 * @returns {Promise} Result of callback
 */
async function executeTransaction(callback) {
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query("BEGIN");

    // Execute callback within transaction
    const result = await callback(client);

    // Commit transaction
    await client.query("COMMIT");

    return result;
  } catch (error) {
    // Rollback on any error
    await client.query("ROLLBACK");

    throw error;
  } finally {
    // Always release connection
    client.release();
  }
}

/**
 * Create BUY transaction (with validation)
 * 
 * @param {number} userId - User ID
 * @param {number} assetId - Asset ID
 * @param {number} quantity - Quantity to buy
 * @param {number} priceAtTransaction - Price per unit
 * @returns {Promise<object>} Created transaction
 */
export async function createBuyTransaction(
  userId,
  assetId,
  quantity,
  priceAtTransaction
) {
  return executeTransaction(async (client) => {
    // Validate input
    if (quantity <= 0) throw new Error("Quantity must be positive");
    if (priceAtTransaction <= 0) throw new Error("Price must be positive");

    // Insert transaction
    const result = await client.query(
      `INSERT INTO transactions (user_id, asset_id, type, quantity, price_at_transaction, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, assetId, "BUY", quantity, priceAtTransaction]
    );

    console.log(`✅ BUY transaction created for user ${userId}, asset ${assetId}`);

    return result.rows[0];
  });
}

/**
 * Create SELL transaction (with balance validation)
 * 
 * @param {number} userId - User ID
 * @param {number} assetId - Asset ID
 * @param {number} quantity - Quantity to sell
 * @param {number} priceAtTransaction - Price per unit
 * @returns {Promise<object>} Created transaction
 */
export async function createSellTransaction(
  userId,
  assetId,
  quantity,
  priceAtTransaction
) {
  return executeTransaction(async (client) => {
    // Validate input
    if (quantity <= 0) throw new Error("Quantity must be positive");
    if (priceAtTransaction <= 0) throw new Error("Price must be positive");

    // Get current holdings WITH UPDATE LOCK
    const holdingsResult = await client.query(
      `SELECT COALESCE(SUM(
         CASE WHEN type = 'BUY' THEN quantity 
         WHEN type = 'SELL' THEN -quantity 
         ELSE 0 END), 0) as holdings
       FROM transactions 
       WHERE user_id = $1 AND asset_id = $2
       FOR UPDATE`,
      [userId, assetId]
    );

    const currentHoldings = parseFloat(holdingsResult.rows[0].holdings);

    // Validate SELL quantity
    if (currentHoldings < quantity) {
      throw new Error(
        `Insufficient holdings. Current: ${currentHoldings}, Attempting to sell: ${quantity}`
      );
    }

    // Insert SELL transaction
    const result = await client.query(
      `INSERT INTO transactions (user_id, asset_id, type, quantity, price_at_transaction, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [userId, assetId, "SELL", quantity, priceAtTransaction]
    );

    console.log(
      `✅ SELL transaction created for user ${userId}, asset ${assetId}. Holdings: ${currentHoldings} → ${
        currentHoldings - quantity
      }`
    );

    return result.rows[0];
  });
}

/**
 * Create generic transaction (BUY or SELL)
 * Dispatches to appropriate handler
 */
export async function createTransaction(
  userId,
  assetId,
  type,
  quantity,
  priceAtTransaction
) {
  if (type === "BUY") {
    return createBuyTransaction(userId, assetId, quantity, priceAtTransaction);
  } else if (type === "SELL") {
    return createSellTransaction(userId, assetId, quantity, priceAtTransaction);
  } else {
    throw new Error("Invalid transaction type. Must be BUY or SELL.");
  }
}

/**
 * Update transaction (with transaction safety)
 * Only allows updates to own transactions
 */
export async function updateTransaction(transactionId, userId, updates) {
  return executeTransaction(async (client) => {
    // First verify ownership
    const ownerResult = await client.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (ownerResult.rows.length === 0) {
      throw new Error("Transaction not found");
    }

    if (ownerResult.rows[0].user_id !== userId) {
      throw new Error("Unauthorized: Cannot update other user's transaction");
    }

    // Build update query
    const allowedFields = ["quantity", "price_at_transaction"];
    const updateClauses = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        updateClauses.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    }

    if (updateClauses.length === 0) {
      throw new Error("No valid fields to update");
    }

    // Add ID and user_id as final parameters
    values.push(transactionId);
    values.push(userId);

    // Execute update
    const result = await client.query(
      `UPDATE transactions 
       SET ${updateClauses.join(", ")}, updated_at = NOW()
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    console.log(`✅ Transaction ${transactionId} updated`);

    return result.rows[0];
  });
}

/**
 * Delete transaction (with transaction safety)
 * Only allows deletion of own transactions
 */
export async function deleteTransaction(transactionId, userId) {
  return executeTransaction(async (client) => {
    // Verify ownership and delete
    const result = await client.query(
      `DELETE FROM transactions 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Transaction not found or unauthorized"
      );
    }

    console.log(`✅ Transaction ${transactionId} deleted`);

    return result.rows[0];
  });
}

export default {
  executeTransaction,
  createTransaction,
  createBuyTransaction,
  createSellTransaction,
  updateTransaction,
  deleteTransaction,
};
