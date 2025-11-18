#!/bin/bash

# Test Script para AudioFlow API
# Fluxo: URL YouTube + Preset → ffmpeg → download

set -e

API_URL="http://localhost:8080"
PRESET="SLOWED"
YOUTUBE_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

echo "🎵 AudioFlow - Test Script"
echo "=================================="
echo "API URL: $API_URL"
echo "Preset: $PRESET"
echo "YouTube: $YOUTUBE_URL"
echo ""

# 1. Criar job
echo "1️⃣ Creating job..."
JOB_RESPONSE=$(curl -s -X POST "$API_URL/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$YOUTUBE_URL\",
    \"preset\": \"$PRESET\"
  }")

JOB_ID=$(echo "$JOB_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job"
  echo "Response: $JOB_RESPONSE"
  exit 1
fi

echo "✅ Job created: $JOB_ID"
echo ""

# 2. Polling status
echo "2️⃣ Waiting for processing..."
MAX_WAIT=300  # 5 minutos
ELAPSED=0
POLL_INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS_RESPONSE=$(curl -s -X GET "$API_URL/jobs/$JOB_ID")
  
  STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
  
  echo "  Status: $STATUS | Progress: $PROGRESS%"
  
  if [ "$STATUS" = "DONE" ]; then
    echo "✅ Processing completed!"
    break
  elif [ "$STATUS" = "ERROR" ]; then
    ERROR=$(echo "$STATUS_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "❌ Error: $ERROR"
    exit 1
  fi
  
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
  echo "❌ Timeout waiting for job"
  exit 1
fi

echo ""

# 3. Download
echo "3️⃣ Downloading file..."
OUTPUT_FILE="/tmp/output_${PRESET}_${JOB_ID}.mp3"

curl -s -X GET "$API_URL/jobs/$JOB_ID/download" \
  -H "Accept: audio/mpeg" \
  -o "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
  echo "✅ File downloaded: $OUTPUT_FILE ($FILE_SIZE bytes)"
else
  echo "❌ Failed to download file"
  exit 1
fi

echo ""
echo "=================================="
echo "✅ Test completed successfully!"
echo "Output: $OUTPUT_FILE"
