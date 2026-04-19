#!/bin/bash

# Kill any existing processes on ports 5000 and 5173
echo "🔄 Cleaning up existing processes..."
pkill -f "node index.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2

echo ""
echo "🚀 Starting backend server on port 5000..."
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server
npm start &
BACKEND_PID=$!

sleep 3

echo ""
echo "🚀 Starting frontend dev server on port 5173..."
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client
npm run dev &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ Backend running on port 5000 (PID: $BACKEND_PID)"
echo "✅ Frontend running on port 5173 (PID: $FRONTEND_PID)"
echo ""
echo "📱 Open http://localhost:5173 in your browser"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait
