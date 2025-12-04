#!/bin/bash

# Test script for API endpoints
# Make sure the dev server is running: npm run dev

API_URL="http://localhost:3000/api"

echo "================================"
echo "Testing Job Aggregation API"
echo "================================"
echo ""

# Test 1: Basic search
echo "Test 1: Basic search (q=engineer)"
echo "---"
curl -s "$API_URL/search?q=engineer" | jq '.jobs | length'
echo ""

# Test 2: Search with filters
echo "Test 2: Search with location filter"
echo "---"
curl -s "$API_URL/search?q=engineer&location=San%20Francisco" | jq '.total'
echo ""

# Test 3: Remote jobs only
echo "Test 3: Remote jobs only"
echo "---"
curl -s "$API_URL/search?remote=true&limit=10" | jq '.jobs | length'
echo ""

# Test 4: Filter by company
echo "Test 4: Filter by company (Anthropic)"
echo "---"
curl -s "$API_URL/search?company=Anthropic" | jq '.total'
echo ""

# Test 5: Pagination
echo "Test 5: Pagination (limit=5)"
echo "---"
curl -s "$API_URL/search?q=engineer&limit=5" | jq '{total, limit, hasMore, nextCursor}'
echo ""

# Test 6: Rate limit headers
echo "Test 6: Rate limit headers"
echo "---"
curl -I -s "$API_URL/search?q=test" | grep -i "x-ratelimit"
echo ""

# Test 7: Invalid input
echo "Test 7: Invalid input (query too long)"
echo "---"
curl -s "$API_URL/search?q=$(python3 -c 'print("a"*101)')" | jq '.error'
echo ""

# Test 8: Health check
echo "Test 8: Health check"
echo "---"
curl -s "$API_URL/health" | jq '{status, timestamp}'
echo ""

# Test 9: Rate limiting (make 21 requests)
echo "Test 9: Rate limiting (making 21 requests...)"
echo "---"
for i in {1..21}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/search?q=test$i")
  if [ "$response" == "429" ]; then
    echo "✓ Rate limit triggered at request $i (HTTP 429)"
    break
  fi
done
echo ""

echo "================================"
echo "Tests completed!"
echo "================================"
