#!/bin/bash
# Comprehensive test script for n8n-owntracks

set -e

echo "=========================================="
echo "n8n-owntracks Integration Test Suite"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

function test_passed() {
    echo -e "${GREEN}✓ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

function test_failed() {
    echo -e "${RED}✗ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

function test_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Test 1: Check dependencies
echo "Test 1: Checking dependencies..."
if [ -d "node_modules" ] || [ -d "bun_modules" ]; then
    test_passed "Dependencies installed"
else
    test_failed "Dependencies not installed. Run: bun install"
    exit 1
fi

# Test 2: Check build
echo ""
echo "Test 2: Checking build..."
if [ -f "packages/backend/dist/index.js" ] && [ -f "packages/n8n-nodes-owntracks/dist/nodes/OwnTracks/OwnTracksTrigger.node.js" ]; then
    test_passed "Projects built successfully"
else
    test_info "Building projects..."
    bun run build
    if [ $? -eq 0 ]; then
        test_passed "Build successful"
    else
        test_failed "Build failed"
        exit 1
    fi
fi

# Test 3: Start backend
echo ""
echo "Test 3: Starting backend server..."
cd packages/backend
CONFIG_PATH=test-config.yaml bun dist/index.js > /tmp/test-backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

sleep 3

if ps -p $BACKEND_PID > /dev/null; then
    test_passed "Backend server started (PID: $BACKEND_PID)"
else
    test_failed "Backend server failed to start"
    cat /tmp/test-backend.log
    exit 1
fi

# Test 4: Health check
echo ""
echo "Test 4: Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:3000/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    test_passed "Health endpoint responding"
    test_info "Response: $(echo $HEALTH_RESPONSE | jq -c .)"
else
    test_failed "Health endpoint not responding"
    kill $BACKEND_PID
    exit 1
fi

# Test 5: POST location
echo ""
echo "Test 5: Testing POST /owntracks..."
POST_RESPONSE=$(curl -s -X POST http://127.0.0.1:3000/owntracks \
    -H "Content-Type: application/json" \
    -d '{"_type":"location","lat":51.5074,"lon":-0.1278,"tst":1234567890,"acc":10,"batt":85,"tid":"ab","device":"test-device"}')

if echo "$POST_RESPONSE" | grep -q '"success":true'; then
    test_passed "Location posted successfully"
    LOCATION_ID=$(echo "$POST_RESPONSE" | jq -r .id)
    test_info "Location ID: $LOCATION_ID"
else
    test_failed "Failed to post location"
    kill $BACKEND_PID
    exit 1
fi

# Test 6: GET locations
echo ""
echo "Test 6: Testing GET /locations..."
GET_RESPONSE=$(curl -s http://127.0.0.1:3000/locations)
if echo "$GET_RESPONSE" | grep -q '"success":true'; then
    COUNT=$(echo "$GET_RESPONSE" | jq -r .count)
    test_passed "Retrieved $COUNT location(s)"
else
    test_failed "Failed to retrieve locations"
    kill $BACKEND_PID
    exit 1
fi

# Test 7: GET specific location
echo ""
echo "Test 7: Testing GET /locations/{id}..."
SPECIFIC_RESPONSE=$(curl -s http://127.0.0.1:3000/locations/1)
if echo "$SPECIFIC_RESPONSE" | grep -q '"success":true'; then
    test_passed "Retrieved specific location"
    DEVICE=$(echo "$SPECIFIC_RESPONSE" | jq -r .data.device)
    test_info "Device: $DEVICE"
else
    test_failed "Failed to retrieve specific location"
    kill $BACKEND_PID
    exit 1
fi

# Test 8: POST multiple locations
echo ""
echo "Test 8: Testing multiple location posts..."
for i in {2..5}; do
    LAT="51.50$i"
    LON="-0.12$i"
    TST=$((1234567890 + i * 100))
    curl -s -X POST http://127.0.0.1:3000/owntracks \
        -H "Content-Type: application/json" \
        -d "{\"_type\":\"location\",\"lat\":$LAT,\"lon\":$LON,\"tst\":$TST,\"device\":\"test-device\"}" > /dev/null
done
test_passed "Posted 4 additional locations"

# Test 9: Verify total count
echo ""
echo "Test 9: Verifying total location count..."
FINAL_RESPONSE=$(curl -s http://127.0.0.1:3000/locations)
FINAL_COUNT=$(echo "$FINAL_RESPONSE" | jq -r .count)
if [ "$FINAL_COUNT" -eq 5 ]; then
    test_passed "Total count is correct: $FINAL_COUNT"
else
    test_failed "Expected 5 locations, got $FINAL_COUNT"
fi

# Test 10: Database stats
echo ""
echo "Test 10: Checking database statistics..."
HEALTH_FINAL=$(curl -s http://127.0.0.1:3000/health)
TOTAL_RECORDS=$(echo "$HEALTH_FINAL" | jq -r .database.totalRecords)
test_passed "Database contains $TOTAL_RECORDS records"

# Cleanup
echo ""
echo "Cleaning up..."
kill $BACKEND_PID 2>/dev/null
wait $BACKEND_PID 2>/dev/null || true
test_info "Backend server stopped"

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
fi
echo ""
