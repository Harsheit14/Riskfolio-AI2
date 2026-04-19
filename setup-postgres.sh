#!/bin/bash

# 🔧 Riskfolio-AI PostgreSQL Setup Script
# This script sets up PostgreSQL with the correct credentials

echo "🚀 Riskfolio-AI PostgreSQL Setup"
echo "=================================="

# Step 1: Check if PostgreSQL is running
echo -e "\n📍 Checking PostgreSQL status..."
if brew services list 2>/dev/null | grep -q "postgresql"; then
  if brew services list | grep postgresql | grep -q "started"; then
    echo "✅ PostgreSQL is running"
  else
    echo "⚠️  PostgreSQL is installed but not running"
    echo "Starting PostgreSQL..."
    brew services start postgresql@15
    echo "✅ PostgreSQL started"
  fi
else
  echo "❌ PostgreSQL not found with Homebrew"
  echo "Install PostgreSQL: brew install postgresql@15"
  exit 1
fi

# Step 2: Wait for PostgreSQL to be ready
sleep 2

# Step 3: Check if we can connect
echo -e "\n📍 Testing PostgreSQL connection..."
if psql -U postgres -h localhost -c "SELECT 1;" 2>/dev/null > /dev/null; then
  echo "✅ PostgreSQL is accessible"
else
  echo "❌ Cannot connect to PostgreSQL as postgres user"
  echo "Try resetting password..."
fi

# Step 4: List existing databases
echo -e "\n📍 Existing databases:"
psql -U postgres -h localhost -l 2>/dev/null | grep -E "Crypto_db|postgres"

# Step 5: Create database if not exists
echo -e "\n📍 Creating database 'Crypto_db'..."
psql -U postgres -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = 'Crypto_db'" | grep -q 1 || psql -U postgres -h localhost -c "CREATE DATABASE \"Crypto_db\";"
echo "✅ Database 'Crypto_db' is ready"

# Step 6: Verify connection
echo -e "\n📍 Testing connection to Crypto_db..."
if psql -U postgres -h localhost -d Crypto_db -c "SELECT NOW();" 2>/dev/null; then
  echo "✅ Connection successful!"
else
  echo "❌ Connection failed"
fi

# Step 7: Display final connection string
echo -e "\n✅ Setup complete!"
echo "=================================="
echo "Connection string for .env:"
echo "DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db"
echo "=================================="
echo -e "\nNext steps:"
echo "1. Verify .env has: DATABASE_URL=postgresql://postgres:harsh@localhost:5432/Crypto_db"
echo "2. Start backend: cd server && npm start"
echo "3. If password error, reset it:"
echo "   psql -U postgres -h localhost"
echo "   ALTER USER postgres WITH PASSWORD 'harsh';"
echo "   \\q"
