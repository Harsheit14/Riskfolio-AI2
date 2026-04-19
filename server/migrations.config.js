/**
 * Database Migration Configuration
 * 
 * This file configures node-pg-migrate to work with Riskfolio-AI
 * 
 * Usage:
 *   npm run migrate          # Run pending migrations
 *   npm run migrate:down     # Rollback last migration (in package.json)
 *   npm run migrate:redo     # Redo last migration (in package.json)
 * 
 * Environment Variables:
 *   DATABASE_URL: Connection string for PostgreSQL
 *   Example: postgres://user:password@localhost:5432/Crypto_db
 */

export default {
  // Migration files directory
  migrationsTable: "pgmigrations",
  
  // Check if migrations table exists before running
  checkOrder: true,
  
  // Use transactions for safety
  transactionPerMigration: true,
  
  // Directory containing migration files
  dir: "migrations",
  
  // File naming convention for migrations
  // Using timestamps: {timestamp}_{name}.js
  // Format: YYYYMMDDHHMMSS
  migrationsPattern: "^(\\d+)_.+\\.js$",
  
  // Use when running through CLI
  database: {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "Crypto_db",
  },
};
