import pool from "../config/db.js";

export async function getAllAssets() {
  const result = await pool.query(
    "SELECT id, symbol, name, coingecko_id FROM assets ORDER BY symbol"
  );
  return result.rows;
}

export async function getAssetBySymbol(symbol) {
  const result = await pool.query(
    "SELECT id, symbol, name, coingecko_id FROM assets WHERE symbol = $1",
    [symbol.toUpperCase()]
  );
  return result.rows[0];
}

export async function createAsset(symbol, name, coingeckoId) {
  const result = await pool.query(
    "INSERT INTO assets (symbol, name, coingecko_id) VALUES ($1, $2, $3) RETURNING id, symbol, name, coingecko_id",
    [symbol.toUpperCase(), name, coingeckoId]
  );
  return result.rows[0];
}
