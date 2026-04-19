# 🚀 Terminal Commands to Run Riskfolio-AI

## Quick Start (Run These Commands)

### Option 1: Run in Separate Terminals (Recommended)

**Terminal 1 - Backend Server:**
```bash
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server
npm start
```

**Terminal 2 - Frontend Server:**
```bash
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client
npm run dev
```

---

### Option 2: Run Both in Background (One Terminal)

```bash
# Kill any existing processes first
pkill -9 node; sleep 2

# Start backend in background
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server && npm start 2>&1 &

# Wait for backend to start
sleep 3

# Start frontend in background
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev 2>&1 &

# Wait for frontend to start
sleep 2

echo "✅ Both servers started!"
echo "🌐 Frontend: http://localhost:5173"
echo "📡 Backend: http://localhost:5000"
```

---

### Option 3: One-Liner (Copy & Paste)

```bash
pkill -9 node; sleep 2 && cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server && npm start 2>&1 &sleep 3 && cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev 2>&1 &sleep 2 && echo "✅ Servers running!"
```

---

## ✅ Verify Servers Are Running

### Check Backend
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### Check Frontend
```bash
curl http://localhost:5173
```

**Expected Response:** HTML page starts loading

### Check Specific Ports
```bash
# Check if port 5000 is listening (backend)
lsof -i :5000

# Check if port 5173 is listening (frontend)
lsof -i :5173
```

---

## 🌐 Access the Application

| Component | URL | Purpose |
|-----------|-----|---------|
| Frontend | http://localhost:5173 | UI - Login and Dashboard |
| Backend API | http://localhost:5000 | API Endpoint |
| Backend Health | http://localhost:5000/api/health | Server Status |
| Risk Report API | http://localhost:5000/api/risk/report | Risk Calculation |

---

## 🛑 Stop Servers

### Stop All Node Processes
```bash
pkill -9 node
```

### Stop Only Backend (Port 5000)
```bash
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Stop Only Frontend (Port 5173)
```bash
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

## 🔄 Restart Servers

```bash
# Kill everything
pkill -9 node; sleep 2

# Start backend
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server && npm start 2>&1 &

# Start frontend
sleep 3 && cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev 2>&1 &

echo "✅ Restarted!"
```

---

## 📊 View Logs

### Backend Logs
```bash
# View recent backend logs
tail -50 ~/.pm2/logs/index-out.log 2>/dev/null || echo "PM2 logs not found"

# Or watch real-time (if server is running in foreground)
# Just look at the terminal window
```

### Frontend Logs
```bash
# Watch frontend in separate terminal
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client
npm run dev
```

### Check Risk Report Logs
```bash
# Add transaction, then check backend logs for:
# [riskService] FINAL RISK ANALYSIS
# [useRisk] Fetching risk report
```

---

## 🧪 Test the Application

### Test 1: Frontend Loading
```bash
curl -s http://localhost:5173 | head -20
```

### Test 2: Backend Health
```bash
curl -s http://localhost:5000/api/health | json_pp
```

### Test 3: Risk Report (with authentication token)
```bash
# Replace YOUR_TOKEN with actual JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/risk/report
```

---

## 📝 Common Issues & Fixes

### Issue: Port Already in Use
```bash
# Kill existing process on port
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Then restart
```

### Issue: Dependencies Missing
```bash
# Reinstall for backend
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server
npm install

# Reinstall for frontend
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/client
npm install
```

### Issue: Module Not Found
```bash
# Make sure you're in correct directory
pwd  # Should show: .../Riskfolio-AI/server or .../Riskfolio-AI/client

# Then clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📋 Step-by-Step Setup

```bash
# 1. Navigate to project root
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI

# 2. Install backend dependencies
cd server
npm install
cd ..

# 3. Install frontend dependencies  
cd client
npm install
cd ..

# 4. Start backend (Terminal 1)
cd server
npm start

# 5. Start frontend (Terminal 2)
cd client
npm run dev

# 6. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

---

## ⚡ Quick Command Reference

```bash
# Kill all node processes
pkill -9 node

# Start backend only
cd ~/Development/Riskfolio-AI/Riskfolio-AI/server && npm start

# Start frontend only
cd ~/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev

# Check if servers running
ps aux | grep node | grep -v grep

# Check specific port
lsof -i :5000
lsof -i :5173

# View backend logs
tail -f ~/.pm2/logs/index-out.log

# Reinstall dependencies
npm ci

# Clean rebuild
rm -rf node_modules && npm install

# Build frontend for production
npm run build
```

---

## 🎯 Expected Output

### Backend Starting
```
✅ Environment validation passed (development)
✅ Database connection successful
✅ Redis connected
✅ RISKFOLIO-AI BACKEND (PRODUCTION-READY)
📍 Server running on port 5000
```

### Frontend Starting
```
VITE v8.0.8  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## 🌟 After Starting

1. ✅ Open http://localhost:5173 in browser
2. ✅ Login with test credentials
3. ✅ Go to Dashboard - should load
4. ✅ Add transaction to test
5. ✅ Go to Portfolio - should update
6. ✅ Go to Risk Report - should auto-update
7. ✅ Open DevTools (F12) - should see `[useRisk]` and `[RiskReportPage]` logs
8. ✅ Check server terminal - should see `[riskService]` logs

---

## 📚 Directory Structure

```
Riskfolio-AI/
├── server/                    ← Backend (npm start)
│   ├── index.js
│   ├── package.json
│   ├── package-lock.json
│   ├── node_modules/
│   └── ...
├── client/                    ← Frontend (npm run dev)
│   ├── package.json
│   ├── package-lock.json
│   ├── node_modules/
│   ├── vite.config.js
│   └── src/
└── ...
```

---

**Status**: ✅ **Ready to Run**

Choose one option above and start the servers! 🚀
