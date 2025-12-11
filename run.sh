#!/bin/bash

# run.sh - Kills previous processes and starts AI Study services
# Backend: Port 3000
# Frontend: Port 3001

echo "🛑 Cleaning up old processes..."

# Kill processes on ports 3000-3004 to be safe
lsof -ti:3000,3001,3002,3003,3004 | xargs kill -9 2>/dev/null

# Kill by process name fallback
pkill -f "nest start" 2>/dev/null
pkill -f "next dev" 2>/dev/null

echo "✅ Cleanup complete."
echo ""
echo "🚀 Starting AI Study services..."

# Get project root
PROJECT_DIR=$(pwd)

# Start Backend
echo "  Starting AI Study Backend (Port 3000)..."
osascript -e "tell app \"Terminal\" to do script \"cd ${PROJECT_DIR}/packages/api && npm run dev\""

# Start Frontend
echo "  Starting AI Study Frontend (Port 3001)..."
osascript -e "tell app \"Terminal\" to do script \"cd ${PROJECT_DIR}/packages/web && PORT=3001 npm run dev\""

echo ""
echo "✅ Services started in new terminals!"
echo "---------------------------------------------------"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo "---------------------------------------------------"