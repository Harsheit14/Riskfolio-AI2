import pkg from "pg";
const { Pool } = pkg;

// 🔥 Hardcoded config (temporary but stable)
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "Crypto_db",
  password: "harsh",
  port: 5432,
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to PostgreSQL database");
    client.release();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
export { pool };