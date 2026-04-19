# 🎯 EXACT TERMINAL COMMANDS - Copy & Paste Ready

---

## COMMAND 1: Start Backend Server
### Terminal 1 / Tab 1

**Copy this entire line:**

```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/server && npm start
```

**What you should see:**
```
Server running on http://localhost:5000
```

---

## COMMAND 2: Start Frontend Server  
### Terminal 2 / Tab 2

**Copy this entire line:**

```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev
```

**What you should see:**
```
VITE v5.0.0 ready in 1234 ms

➜  Local:   http://localhost:5174/
➜  press h to show help
```

---

## STEP-BY-STEP INSTRUCTIONS

### Step 1: Open Terminal 1
- Open new terminal window/tab
- Paste this command:
```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/server && npm start
```
- Press Enter
- Wait 2-3 seconds for backend to start

### Step 2: Open Terminal 2  
- Open another terminal window/tab
- Paste this command:
```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev
```
- Press Enter
- Wait 2-3 seconds for frontend to compile

### Step 3: Open Browser
- Open http://localhost:5174
- Page should load without errors

### Step 4: Test
See TESTING CHECKLIST section below

---

## TESTING CHECKLIST

Once website loads, test each:

### Test 1: Pie Chart Colors (Dashboard)
1. Click "Dashboard" tab
2. Look at pie chart
3. Verify each slice has DIFFERENT color
4. ✅ Pass if no color is repeated

### Test 2: Asset Count (All Pages)
1. Note count on Dashboard ("Assets Held: X")
2. Go to Portfolio page - check asset count
3. Go to Risk Report page - check asset count
4. ✅ Pass if ALL THREE COUNTS ARE IDENTICAL

### Test 3: Risk Page Rendering
1. Click "Risk Report" tab
2. Wait 1-2 seconds for data
3. ✅ Pass if page loads (no 500 error, no "error" message)

### Test 4: Console Logs (Browser F12)
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for these messages:
   ```
   [Dashboard] Holdings Summary: {total: X, valid: Y, zero: Z, validAssets: [...]}
   [Portfolio] Holdings Summary: {total: X, valid: Y, zero: Z, validAssets: [...]}
   [RiskReport] Holdings Summary: {total: X, valid: Y, zero: Z, validAssets: [...]}
   ```
4. ✅ Pass if all three have same "valid" count

---

## TROUBLESHOOTING

### "Port 5000 already in use"
Run this in Terminal 1 first:
```
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9; sleep 2; echo "✅ Port 5000 cleared"
```
Then run the backend command again.

### "Port 5174 already in use"
Run this in Terminal 2 first:
```
lsof -i :5174 | grep LISTEN | awk '{print $2}' | xargs kill -9; sleep 2; echo "✅ Port 5174 cleared"
```
Then run the frontend command again.

### "Both ports stuck"
Run this (any terminal):
```
pkill -9 node; pkill -9 npm; sleep 2; echo "✅ All processes killed"
```
Then start both fresh with the commands above.

### Website shows blank page
- Wait 3-5 seconds more (still loading)
- Check browser console (F12) for errors
- Check terminal output for error messages

### Risk page shows 500 error
- This shouldn't happen - backend fix prevents it
- Check server terminal for error logs
- Report the error message

---

## QUICK REFERENCE

**Backend URL**: http://localhost:5000  
**Frontend URL**: http://localhost:5174  
**Terminal 1 Command**:
```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/server && npm start
```

**Terminal 2 Command**:
```
cd ~/Development/Riskfolio-AI/Riskfolio-AI/client && npm run dev
```

---

## EXPECTED RESULTS

| Component | Expected |
|-----------|----------|
| Pie Chart | 10 unique colors (no duplicates) |
| Dashboard Count | X assets |
| Portfolio Count | X assets (same as Dashboard) |
| Risk Report Count | X assets (same as Dashboard) |
| Risk Page | Loads without error |
| Console Logs | Matching valid counts |

---

## SUCCESS CRITERIA

✅ All tests pass  
✅ No errors in console  
✅ Asset counts identical across pages  
✅ Pie chart colors unique  
✅ Risk page renders  

**If all above ✅: FIXES SUCCESSFUL** 🎉

---

**Ready? Copy the Terminal 1 command and paste it now!** 🚀
