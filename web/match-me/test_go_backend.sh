#!/bin/bash
# Test Go Backend
# 1. Register
# 2. Login
# 3. Update Profile (Helsinki, Female, Looking for Chat)
# 4. Get Recommendations
# 5. Check Privacy

API_URL="http://localhost:3000"
EMAIL="test-go-user-2@example.com"
PASSWORD="password123"

echo "1. Registering..."
curl -s -X POST $API_URL/auth/register -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}" -H "Content-Type: application/json"
echo ""

echo "2. Logging in..."
TOKEN=$(curl -s -X POST $API_URL/auth/login -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}" -H "Content-Type: application/json" | jq -r '.token')
echo "Token: $TOKEN"

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "Login failed"
    exit 1
fi

echo "3. Updating Profile..."
# Multipart form data
curl -s -X PUT $API_URL/me \
  -H "Authorization: Bearer $TOKEN" \
  -F "first_name=Test" \
  -F "last_name=User" \
  -F "location=Helsinki" \
  -F "gender=Female" \
  -F "looking_for=Chat" \
  -F "interests=[\"Tech\", \"Music\"]" \
  -F "preferences={\"preferredLocation\":\"Helsinki\", \"gender\":\"Everyone\"}" \
  | jq .

echo ""

echo "4. Get Recommendations..."
RESPONSE=$(curl -s -X GET $API_URL/recommendations -H "Authorization: Bearer $TOKEN")
echo "Raw Response: $RESPONSE"
echo "$RESPONSE" | jq .
echo ""

