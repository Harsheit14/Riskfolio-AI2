-- ✅ Riskfolio-AI Database Schema
-- Run after creating database: psql -U postgres -d Crypto_db -f schema.sql

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    coingecko_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
    price_at_transaction NUMERIC(20, 8) NOT NULL CHECK (price_at_transaction > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- ✅ INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_asset_id ON transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_asset ON transactions(user_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_coingecko_id ON assets(coingecko_id);

-- ✅ INSERT SAMPLE CRYPTO ASSETS
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