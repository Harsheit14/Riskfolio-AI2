import pool from "../config/db.js";

export async function createTransaction(userId, assetId, type, quantity, price) {
  const result = await pool.query(
    "INSERT INTO transactions (user_id, asset_id, type, quantity, price) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, asset_id, type, quantity, price",
    [userId, assetId, type, quantity, price]
  );
  return result.rows[0];
}

export async function getTransactionsByUser(userId) {
  const result = await pool.query(
    "SELECT id, user_id, asset_id, type, quantity, price, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
}
