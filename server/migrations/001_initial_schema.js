/* eslint-disable no-unused-vars */
/**
 * Riskfolio-AI Database Migration 001
 * Initial Schema with Users, Assets, and Transactions tables
 * 
 * node-pg-migrate format:
 * - up(pgm): Migration logic
 * - down(pgm): Rollback logic
 */

exports.up = (pgm) => {
  // ═══════════════════════════════════════════════════════
  // ✅ USERS TABLE
  // ═══════════════════════════════════════════════════════
  pgm.createTable("users", {
    id: "id",
    email: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: "text",
      notNull: true,
    },
    created_at: {
      type: "timestamp",
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ═══════════════════════════════════════════════════════
  // ✅ ASSETS TABLE
  // ═══════════════════════════════════════════════════════
  pgm.createTable("assets", {
    id: "id",
    symbol: {
      type: "varchar(20)",
      notNull: true,
      unique: true,
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    coingecko_id: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },
    created_at: {
      type: "timestamp",
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ═══════════════════════════════════════════════════════
  // ✅ TRANSACTIONS TABLE
  // ═══════════════════════════════════════════════════════
  pgm.createTable("transactions", {
    id: "id",
    user_id: {
      type: "integer",
      notNull: true,
      references: '"users"',
      onDelete: "cascade",
    },
    asset_id: {
      type: "integer",
      notNull: true,
      references: '"assets"',
    },
    type: {
      type: "varchar(10)",
      notNull: true,
      check: '"type" IN (\'BUY\', \'SELL\')',
    },
    quantity: {
      type: "numeric(20, 8)",
      notNull: true,
      check: '"quantity" > 0',
    },
    price_at_transaction: {
      type: "numeric(20, 8)",
      notNull: true,
      check: '"price_at_transaction" > 0',
    },
    created_at: {
      type: "timestamp",
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  // ═══════════════════════════════════════════════════════
  // ✅ INDEXES
  // ═══════════════════════════════════════════════════════
  pgm.createIndex("transactions", "user_id", { name: "idx_transactions_user_id" });
  pgm.createIndex("transactions", "asset_id", { name: "idx_transactions_asset_id" });
  pgm.createIndex("transactions", ["user_id", "asset_id"], { name: "idx_transactions_user_asset" });
  pgm.createIndex("transactions", "created_at", { name: "idx_transactions_created_at", direction: "DESC" });
  pgm.createIndex("users", "email", { name: "idx_users_email" });
  pgm.createIndex("assets", "symbol", { name: "idx_assets_symbol" });
  pgm.createIndex("assets", "coingecko_id", { name: "idx_assets_coingecko_id" });

  // ═══════════════════════════════════════════════════════
  // ✅ INITIAL DATA - CRYPTO ASSETS
  // ═══════════════════════════════════════════════════════
  pgm.sql(`
    INSERT INTO assets (symbol, name, coingecko_id) VALUES
      ('BTC', 'Bitcoin', 'bitcoin'),
      ('ETH', 'Ethereum', 'ethereum'),
      ('BNB', 'Binance Coin', 'binancecoin'),
      ('XRP', 'Ripple', 'ripple'),
      ('ADA', 'Cardano', 'cardano'),
      ('SOL', 'Solana', 'solana'),
      ('DOGE', 'Dogecoin', 'dogecoin'),
      ('MATIC', 'Polygon', 'matic-network')
    ON CONFLICT (symbol) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // ═══════════════════════════════════════════════════════
  // ✅ DROP TABLES IN REVERSE ORDER
  // ═══════════════════════════════════════════════════════
  pgm.dropTable("transactions", { ifExists: true });
  pgm.dropTable("assets", { ifExists: true });
  pgm.dropTable("users", { ifExists: true });
};
