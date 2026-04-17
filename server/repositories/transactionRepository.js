import { pool } from "../config/db.js";

/**
 * Create a transaction safely (BUY/SELL)
 */
export async function createTransaction(userId, assetId, type, quantity, price) {
  const client = await pool.connect();

  try {
    // -------------------------
    // VALIDATION
    // -------------------------
    const allowedTypes = ["BUY", "SELL"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Invalid transaction type");
    }

    if (!userId || !assetId) {
      throw new Error("Missing userId or assetId");
    }

    if (quantity <= 0 || price <= 0) {
      throw new Error("Quantity and price must be greater than 0");
    }

    // -------------------------
    // START TRANSACTION
    // -------------------------
    await client.query("BEGIN");

    // -------------------------
    // INSERT TRANSACTION
    // -------------------------
    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, asset_id, type, quantity, price_at_transaction)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
      [userId, assetId, type, quantity, price]
    );

    // -------------------------
    // COMMIT
    // -------------------------
    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    // rollback on failure
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all transactions for a user
 */
export async function getTransactionsByUser(userId) {
  if (!userId) {
    throw new Error("Missing userId");
  }

  const result = await pool.query(
    `SELECT id, user_id, asset_id, type, quantity, price_at_transaction, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(userId, transactionId) {
  if (!userId || !transactionId) {
    throw new Error("Missing userId or transactionId");
  }

  const result = await pool.query(
    `SELECT id, user_id, asset_id, type, quantity, price_at_transaction, created_at
     FROM transactions
     WHERE id = $1 AND user_id = $2`,
    [transactionId, userId]
  );

  return result.rows[0];
}

/**
 * Update transaction
 */
export async function updateTransaction(userId, transactionId, type, quantity, price) {
  const client = await pool.connect();

  try {
    // -------------------------
    // VALIDATION
    // -------------------------
    const allowedTypes = ["BUY", "SELL"];

    if (!allowedTypes.includes(type)) {
      throw new Error("Invalid transaction type");
    }

    if (!userId || !transactionId) {
      throw new Error("Missing userId or transactionId");
    }

    if (quantity <= 0 || price <= 0) {
      throw new Error("Quantity and price must be greater than 0");
    }

    // -------------------------
    // START TRANSACTION
    // -------------------------
    await client.query("BEGIN");

    // Verify ownership
    const ownership = await client.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) {
      throw new Error("Unauthorized: Transaction does not belong to user");
    }

    // -------------------------
    // UPDATE TRANSACTION
    // -------------------------
    const result = await client.query(
      `UPDATE transactions 
       SET type = $1, quantity = $2, price_at_transaction = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
      [type, quantity, price, transactionId, userId]
    );

    // -------------------------
    // COMMIT
    // -------------------------
    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    // rollback on failure
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete transaction
 */
export async function deleteTransaction(userId, transactionId) {
  const client = await pool.connect();

  try {
    if (!userId || !transactionId) {
      throw new Error("Missing userId or transactionId");
    }

    // -------------------------
    // START TRANSACTION
    // -------------------------
    await client.query("BEGIN");

    // Verify ownership
    const ownership = await client.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) {
      throw new Error("Unauthorized: Transaction does not belong to user");
    }

    // -------------------------
    // DELETE TRANSACTION
    // -------------------------
    const result = await client.query(
      `DELETE FROM transactions 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [transactionId, userId]
    );

    // -------------------------
    // COMMIT
    // -------------------------
    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    // rollback on failure
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}