import pool from "../config/db.js";
import { computeHoldings } from "../utils/computeHoldings.js";

export async function createTransaction(userId, assetId, type, quantity, price) {
  const client = await pool.connect();
  try {
    if (!["BUY", "SELL"].includes(type)) throw new Error("Invalid transaction type");
    if (!userId || !assetId) throw new Error("Missing userId or assetId");
    
    // Ensure quantity and price are numbers
    quantity = Number(quantity);
    price = Number(price);
    
    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      throw new Error("Quantity and price must be valid numbers");
    }
    if (quantity <= 0 || price <= 0) {
      throw new Error("Quantity and price must be greater than 0");
    }

    await client.query("BEGIN");

    if (type === "SELL") {
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Get all transactions to compute holdings accurately
      // ═══════════════════════════════════════════════════════════════════════
      const txResult = await client.query(
        `SELECT t.id, t.asset_id, t.type, t.quantity, t.price_at_transaction, t.created_at, a.symbol 
         FROM transactions t 
         LEFT JOIN assets a ON a.id = t.asset_id 
         WHERE t.user_id = $1 
         ORDER BY t.created_at ASC`,
        [userId]
      );
      
      const allTransactions = txResult.rows;
      console.log(`[SELL VALIDATION] User ${userId}: ${allTransactions.length} transactions found`);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: Compute holdings using unified logic
      // ═══════════════════════════════════════════════════════════════════════
      const holdings = computeHoldings(allTransactions);
      console.log(`[SELL VALIDATION] Computed holdings:`, holdings);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: Get the asset symbol for this assetId
      // ═══════════════════════════════════════════════════════════════════════
      const assetResult = await client.query(
        `SELECT symbol FROM assets WHERE id = $1`,
        [assetId]
      );
      
      if (!assetResult.rows[0]) {
        await client.query("ROLLBACK");
        throw new Error(`Asset ID ${assetId} not found`);
      }
      
      const assetSymbol = assetResult.rows[0].symbol;
      const availableQty = holdings[assetSymbol]?.quantity || 0;
      
      console.log(`[SELL VALIDATION] Asset: ${assetSymbol} (ID: ${assetId}), Available: ${availableQty}, Selling: ${quantity}`);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 4: Validate sufficient holdings
      // ═══════════════════════════════════════════════════════════════════════
      if (availableQty < quantity) {
        await client.query("ROLLBACK");
        console.error(`[SELL VALIDATION ERROR] ${assetSymbol}: Insufficient holdings. Have: ${availableQty}, Trying to sell: ${quantity}`);
        throw new Error(
          `Insufficient holdings for ${assetSymbol}. Available: ${availableQty}, Trying to sell: ${quantity}`
        );
      }
      
      console.log(`[SELL VALIDATION] ✅ Validation passed for ${assetSymbol}`);
    }

    const result = await client.query(
      `INSERT INTO transactions (user_id, asset_id, type, quantity, price_at_transaction) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
      [userId, assetId, type, quantity, price]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getTransactionsByUser(userId) {
  if (!userId) throw new Error("Missing userId");
  const result = await pool.query(
    `SELECT t.id, t.user_id, t.asset_id, t.type, t.quantity, t.price_at_transaction, t.created_at, a.symbol FROM transactions t LEFT JOIN assets a ON a.id = t.asset_id WHERE t.user_id = $1 ORDER BY t.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getTransactionById(userId, transactionId) {
  if (!userId || !transactionId) throw new Error("Missing userId or transactionId");
  const result = await pool.query(
    `SELECT t.id, t.user_id, t.asset_id, t.type, t.quantity, t.price_at_transaction, t.created_at, a.symbol FROM transactions t LEFT JOIN assets a ON a.id = t.asset_id WHERE t.id = $1 AND t.user_id = $2`,
    [transactionId, userId]
  );
  return result.rows[0];
}

export async function updateTransaction(userId, transactionId, type, quantity, price) {
  const client = await pool.connect();
  try {
    if (!["BUY", "SELL"].includes(type)) throw new Error("Invalid transaction type");
    if (!userId || !transactionId) throw new Error("Missing userId or transactionId");
    if (quantity <= 0 || price <= 0) throw new Error("Quantity and price must be greater than 0");

    await client.query("BEGIN");
    const ownership = await client.query(`SELECT user_id FROM transactions WHERE id = $1`, [transactionId]);
    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) throw new Error("Unauthorized");

    const result = await client.query(
      `UPDATE transactions SET type = $1, quantity = $2, price_at_transaction = $3 WHERE id = $4 AND user_id = $5 RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
      [type, quantity, price, transactionId, userId]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteTransaction(userId, transactionId) {
  const client = await pool.connect();
  try {
    if (!userId || !transactionId) throw new Error("Missing userId or transactionId");

    await client.query("BEGIN");
    const ownership = await client.query(`SELECT user_id FROM transactions WHERE id = $1`, [transactionId]);
    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) throw new Error("Unauthorized");

    const result = await client.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [transactionId, userId]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
