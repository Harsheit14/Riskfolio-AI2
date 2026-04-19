#!/bin/bash

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Registration API...${NC}\n"

# Test 1: Health check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}\n"
else
    echo -e "${RED}❌ Health check failed (HTTP $HEALTH)${NC}\n"
    exit 1
fi

# Test 2: Registration with valid data
echo -e "${YELLOW}Test 2: Registration with Valid Data${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123"}')

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Registration successful${NC}\n"
else
    echo -e "${RED}❌ Registration failed${NC}\n"
fi

# Test 3: Registration with missing email
echo -e "${YELLOW}Test 3: Registration with Missing Email${NC}"
MISSING_EMAIL=$(curl -s -X POST http://localhost:5000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"password":"TestPass123"}')

echo "Response: $MISSING_EMAIL"

if echo "$MISSING_EMAIL" | grep -q "MISSING_FIELDS"; then
    echo -e "${GREEN}✅ Validation working${NC}\n"
else
    echo -e "${RED}❌ Validation not working${NC}\n"
fi

# Test 4: CORS preflight check
echo -e "${YELLOW}Test 4: CORS Preflight Check${NC}"
CORS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:5000/api/auth/register \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST")

if [ "$CORS" = "204" ] || [ "$CORS" = "200" ]; then
    echo -e "${GREEN}✅ CORS enabled${NC}\n"
else
    echo -e "${RED}❌ CORS not working (HTTP $CORS)${NC}\n"
fi

echo -e "${GREEN}All tests completed!${NC}"
