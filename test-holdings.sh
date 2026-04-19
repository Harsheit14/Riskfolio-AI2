#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# HOLDINGS UNIFICATION - MANUAL TESTING SCRIPT
# ═══════════════════════════════════════════════════════════════════════════════

echo "🧪 HOLDINGS COMPUTATION TESTING SCRIPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:5174"

# Test results
PASS=0
FAIL=0

# ═══════════════════════════════════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

print_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
  echo -e "${GREEN}✅ PASS:${NC} $1"
  ((PASS++))
}

print_fail() {
  echo -e "${RED}❌ FAIL:${NC} $1"
  ((FAIL++))
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo 0
  else
    echo 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Verify Servers Running
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "STEP 1: Verify Servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

print_test "Backend on port 5000"
if [ $(check_port 5000) -eq 0 ]; then
  print_pass "Backend running"
else
  print_fail "Backend not running on port 5000"
fi

print_test "Frontend on port 5174"
if [ $(check_port 5174) -eq 0 ]; then
  print_pass "Frontend running"
else
  print_fail "Frontend not running on port 5174"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Check Files Exist
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "STEP 2: Verify Files Exist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_test "computeHoldings.js utility exists"
if [ -f "/Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server/utils/computeHoldings.js" ]; then
  print_pass "Utility file exists"
else
  print_fail "Utility file missing"
fi

print_test "holdingsCalculationService updated"
if grep -q "computeSimpleHoldings" "/Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server/services/holdingsCalculationService.js"; then
  print_pass "Service has computeSimpleHoldings"
else
  print_fail "Service missing computeSimpleHoldings"
fi

print_test "portfolioController updated"
if grep -q "computeSimpleHoldings" "/Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server/controllers/portfolioController.js"; then
  print_pass "Controller calls computeSimpleHoldings"
else
  print_fail "Controller not updated"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Check Backend Logs
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "STEP 3: Check Backend Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_test "Backend health check"
if curl -s "$API_URL/health" > /dev/null 2>&1; then
  print_pass "Backend responding to health check"
else
  print_fail "Backend health check failed"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Manual Testing Instructions
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "STEP 4: Manual Testing (Do These in Browser/UI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}TEST 1: XRP Visibility${NC}"
echo "  1. Open $FRONTEND_URL in browser"
echo "  2. Go to Portfolio page"
echo "  3. Add transaction: BUY 1000 XRP @ 0.50"
echo "  4. Check: XRP appears in holdings"
echo "  5. Check: Asset count increases"
echo "  → If XRP appears ✅"
echo "  → If XRP missing ❌"
echo ""

echo -e "${YELLOW}TEST 2: ETH Full Sell${NC}"
echo "  1. Portfolio page"
echo "  2. Existing ETH: BUY 10 ETH @ 2000"
echo "  3. Add transaction: SELL 10 ETH @ 3000"
echo "  4. Check: ETH disappears from holdings"
echo "  5. Check: Asset count decreases"
echo "  → If ETH removed ✅"
echo "  → If ETH still there ❌"
echo ""

echo -e "${YELLOW}TEST 3: Partial Sell${NC}"
echo "  1. Add: BUY 1000 XRP @ 0.50"
echo "  2. Add: SELL 400 XRP @ 0.70"
echo "  3. Check quantity: Should be 600"
echo "  4. Check cost basis: Should be 300"
echo "  5. Check avg price: Should be 0.50"
echo "  → If math correct ✅"
echo "  → If math wrong ❌"
echo ""

echo -e "${YELLOW}TEST 4: API Test${NC}"
echo "  Run in terminal:"
echo "  curl -H 'Authorization: Bearer TOKEN' \\"
echo "    $API_URL/api/portfolio/holdings"
echo ""
echo "  Should return:"
echo '  { "holdings": {"XRP": {...}}, "assetCount": 1 }'
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Backend Log Monitoring
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "STEP 5: Monitor Backend Logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Watch for log entries like:"
echo '  [computeSimpleHoldings] userId=12345'
echo '  [Computed Holdings]'
echo '    XRP: 600 @ avg $0.5 (cost: $300)'
echo ""

echo "Run this to tail logs:"
echo "  tail -f /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI/server/logs/*.log | grep -E 'Computed|computeSimple|Holdings'"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Summary
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "TEST SUMMARY"
echo "━━━━━━━━━━━━"
echo -e "Automated Checks: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ All automated checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Perform manual tests above"
  echo "  2. Check backend logs"
  echo "  3. Verify XRP appears/ETH disappears"
  echo "  4. Test API endpoints"
else
  echo -e "${RED}❌ Some checks failed. Fix issues before testing.${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
