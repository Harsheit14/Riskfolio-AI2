import pkg from "pg";
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:harsh@localhost:5432/Crypto_db";

const pool = new Pool({ connectionString });

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful");
    client.release();
  } catch (error) {
    console.error("❌ FATAL: Database connection failed:", error.message);
    process.exit(1);
  }
}

export default pool;
