# LLM Pricing Calculator - Run Both Frontend & Backend (Windows)
# This script starts both the FastAPI backend and Next.js frontend

Write-Host "=========================================="
Write-Host "LLM Pricing Calculator - Full Stack Start"
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed" -ForegroundColor Red
    Write-Host "Please install Python 3.9+ from https://python.org/"
    exit 1
}

$nodeVersion = (node --version) 2>&1
$pythonVersion = (python --version) 2>&1

Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
Write-Host ""

# Setup Python backend
Write-Host "Setting up Python backend..." -ForegroundColor Yellow
Set-Location scripts

# Check if venv exists, create if not
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

# Activate venv
& "venv\Scripts\Activate.ps1"

# Install Python dependencies
Write-Host "Installing Python dependencies..."
python -m pip install --quiet --upgrade pip
python -m pip install --quiet `
    fastapi==0.104.1 `
    uvicorn==0.24.0 `
    google-generativeai==0.3.0 `
    tavily-python==0.3.0 `
    python-dotenv==1.0.0 `
    pydantic==2.5.0

Set-Location ..

Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Start backend
Write-Host "Starting FastAPI backend on http://localhost:8000..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "scripts/fastapi-backend.py" -PassThru -WindowStyle Normal | Out-Null

Start-Sleep -Seconds 2

Write-Host "✓ FastAPI backend started" -ForegroundColor Green
Write-Host ""

# Setup Node.js frontend
Write-Host "Setting up Node.js frontend..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..."
    pnpm install --quiet
}

Write-Host "✓ Frontend dependencies ready" -ForegroundColor Green
Write-Host ""

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local..."
    Add-Content -Path ".env.local" -Value "PYTHON_BACKEND_URL=http://localhost:8000"
}

# Start frontend
Write-Host "Starting Next.js frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process -FilePath "pnpm" -ArgumentList "dev" -PassThru -WindowStyle Normal | Out-Null

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=========================================="
Write-Host "✓ System Started Successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend:  http://localhost:3000" -ForegroundColor Green
Write-Host "Backend:   http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Yellow
