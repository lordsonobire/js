#!/bin/bash

# Kill any existing node server or ssh tunnel
echo "Stopping old processes..."
pkill -f "node server/index.js"
pkill -f "ssh -R 80:localhost:3000"

echo "Starting Neon Arena Server..."
# Start server in background and redirect output to a log file
node server/index.js > server.log 2>&1 &
SERVER_PID=$!

echo "Server started (PID $SERVER_PID). Waiting for it to initialize..."
sleep 2

echo "Starting Public Tunnel (Serveo)..."
echo "----------------------------------------------------------------"
echo "COPY THE URL BELOW TO SHARE WITH FRIENDS:"
echo "----------------------------------------------------------------"

# Run Serveo
ssh -R 80:localhost:3000 serveo.net
