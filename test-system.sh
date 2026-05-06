#!/bin/bash

# Pitchonix Comprehensive Health Check
# This script tests all major API endpoints and features

echo "======================================"
echo "  PITCHONIX COMPREHENSIVE TEST"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-""}
    local token=${5:-""}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$token" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
                -H "Authorization: Bearer $token")
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$url")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $(echo $body | head -c 100)"
        ((FAILED++))
    fi
}

echo "1. BACKEND HEALTH CHECKS"
echo "------------------------"

# Basic health check
test_endpoint "API Health" "http://localhost:3001/api"
test_endpoint "API Documentation" "http://localhost:3001/api/docs"

echo ""
echo "2. AUTHENTICATION"
echo "----------------"

# Login and get token
echo -n "Logging in... "
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@pitchonix.com","password":"admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Could not get auth token"
    ((FAILED++))
fi

test_endpoint "Get Current User" "http://localhost:3001/api/users/me" "GET" "" "$TOKEN"

echo ""
echo "3. PROJECTS API"
echo "---------------"

test_endpoint "List Projects" "http://localhost:3001/api/projects" "GET" "" "$TOKEN"
test_endpoint "Create Project" "http://localhost:3001/api/projects" "POST" \
    '{"name":"Test Project","documentType":"pitch_deck"}' "$TOKEN"

echo ""
echo "4. TEMPLATES API"
echo "----------------"

test_endpoint "List Templates" "http://localhost:3001/api/templates"
test_endpoint "Popular Templates" "http://localhost:3001/api/templates/popular"

echo ""
echo "5. SMART PDF BUILDER (PUBLIC)"
echo "-----------------------------"

test_endpoint "Analyze Content" "http://localhost:3001/api/pdf-studio/smart-builder/analyze" "POST" \
    '{"rawContent":"This is test content for analysis with sufficient length to trigger proper analysis"}'

test_endpoint "Enhance Content" "http://localhost:3001/api/pdf-studio/smart-builder/enhance-content" "POST" \
    '{"rawContent":"This is test content that needs enhancement","fixAll":true}'

echo ""
echo "6. SMART PDF BUILDER (AUTHENTICATED)"
echo "------------------------------------"

test_endpoint "Generate Document" "http://localhost:3001/api/pdf-studio/smart-builder/generate" "POST" \
    '{"rawContent":"Test content for document generation with authentication","config":{"title":"Test Doc"}}' "$TOKEN"

echo ""
echo "7. BRAND KITS"
echo "-------------"

test_endpoint "List Brand Kits" "http://localhost:3001/api/brand-kits" "GET" "" "$TOKEN"

echo ""
echo "8. FRONTEND HEALTH"
echo "------------------"

echo -n "Testing Frontend (localhost:3002)... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $FRONTEND_STATUS)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $FRONTEND_STATUS)"
    ((FAILED++))
fi

echo ""
echo "======================================"
echo "  TEST SUMMARY"
echo "======================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ SOME TESTS FAILED${NC}"
    exit 1
fi
