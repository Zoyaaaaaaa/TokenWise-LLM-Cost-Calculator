#!/bin/bash

# LLM Pricing Calculator - Run Both Frontend & Backend
# This script starts both the FastAPI backend and Next.js frontend

set -e

echo "=========================================="
echo "LLM Pricing Calculator - Full Stack Start"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed${NC}"
    echo "Please install Python 3.9+ from https://python.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"
echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"
echo ""

# Setup and start backend
echo -e "${YELLOW}Setting up Python backend...${NC}"
cd scripts

# Check if venv exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install/upgrade Python dependencies
echo "Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet \
    fastapi==0.104.1 \
    uvicorn==0.24.0 \
    google-generativeai==0.3.0 \
    tavily-python==0.3.0 \
    python-dotenv==1.0.0 \
    pydantic==2.5.0

cd ..

# Start backend in background
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""
echo -e "${YELLOW}Starting FastAPI backend on http://localhost:8000...${NC}"
cd scripts
python3 fastapi-backend.py &
BACKEND_PID=$!
cd ..

sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Failed to start FastAPI backend${NC}"
    exit 1
fi
echo -e "${GREEN}✓ FastAPI backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Setup and start frontend
echo -e "${YELLOW}Setting up Node.js frontend...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    pnpm install --quiet
fi

echo -e "${GREEN}✓ Frontend dependencies ready${NC}"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    echo "PYTHON_BACKEND_URL=http://localhost:8000" > .env.local
fi

echo -e "${YELLOW}Starting Next.js frontend on http://localhost:3000...${NC}"
pnpm dev &
FRONTEND_PID=$!

sleep 2

echo ""
echo -e "${GREEN}=========================================="
echo "✓ System Started Successfully!"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Frontend:${NC}  http://localhost:3000"
echo -e "${GREEN}Backend:${NC}   http://localhost:8000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    deactivate 2>/dev/null || true
    echo -e "${GREEN}✓ Servers stopped${NC}"
    exit 0
}

# Setup trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
