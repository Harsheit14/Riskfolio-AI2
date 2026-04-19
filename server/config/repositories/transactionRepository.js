import pool from "../config/db.js";

export async function createTransaction(userId, assetId, type, quantity, price) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (type === "SELL") {
      const balanceResult = await client.query(
        `SELECT COALESCE(SUM(CASE 
          WHEN type = 'BUY' THEN quantity 
          WHEN type = 'SELL' THEN -quantity 
          ELSE 0 END), 0) as holdings
         FROM transactions 
         WHERE user_id = $1 AND asset_id = $2`,
        [userId, assetId]
      );
      const holdings = parseFloat(balanceResult.rows[0].holdings);
      if (holdings < quantity) {
        await client.query("ROLLBACK");
        throw new Error(`Insufficient holdings. Available: ${holdings}, Trying to sell: ${quantity}`);
      }
    }

    const result = await client.query(
      `INSERT INTO transactions 
       (user_id, asset_id, type, quantity, price_at_transaction)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
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
    `SELECT t.id, t.user_id, t.asset_id, t.type, t.quantity, t.price_at_transaction, t.created_at,
            a.symbol
     FROM transactions t
     JOIN assets a ON a.id = t.asset_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getTransactionById(userId, transactionId) {
  if (!userId || !transactionId) throw new Error("Missing userId or transactionId");
  const result = await pool.query(
    `SELECT t.id, t.user_id, t.asset_id, t.type, t.quantity, t.price_at_transaction, t.created_at,
            a.symbol
     FROM transactions t
     JOIN assets a ON a.id = t.asset_id
     WHERE t.id = $1 AND t.user_id = $2`,
    [transactionId, userId]
  );
  return result.rows[0];
}

export async function updateTransaction(userId, transactionId, type, quantity, price) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ownership = await client.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );
    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) {
      throw new Error("Unauthorized: Transaction does not belong to user");
    }
    const result = await client.query(
      `UPDATE transactions 
       SET type = $1, quantity = $2, price_at_transaction = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, asset_id, type, quantity, price_at_transaction, created_at`,
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
    await client.query("BEGIN");
    const ownership = await client.query(
      `SELECT user_id FROM transactions WHERE id = $1`,
      [transactionId]
    );
    if (!ownership.rows[0] || ownership.rows[0].user_id !== userId) {
      throw new Error("Unauthorized: Transaction does not belong to user");
    }
    const result = await client.query(
      `DELETE FROM transactions 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
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