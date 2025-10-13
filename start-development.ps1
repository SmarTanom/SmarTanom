#!/usr/bin/env pwsh
# ==============================================================================
# SmarTanom Quick Start Script - Windows PowerShell
# ==============================================================================
# This script sets up and starts both backend and frontend servers
# ==============================================================================

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  SmarTanom Quick Start" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ROOT_DIR = $PSScriptRoot
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = Join-Path $ROOT_DIR "frontend"

# Check if Python is installed
Write-Host "[1/8] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found! Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
Write-Host "[2/8] Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found! Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Setup Backend
Write-Host "[3/8] Setting up Django backend..." -ForegroundColor Yellow
Set-Location $BACKEND_DIR

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

# Activate virtual environment
Write-Host "  Activating virtual environment..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "  Installing Python dependencies..." -ForegroundColor Cyan
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env from template..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
    Write-Host "  ⚠ Please edit backend/.env with your configuration!" -ForegroundColor Yellow
}

# Run migrations
Write-Host "[4/8] Running database migrations..." -ForegroundColor Yellow
python manage.py migrate --noinput

# Check if superuser exists
Write-Host "[5/8] Checking superuser..." -ForegroundColor Yellow
$superuserExists = python -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(User.objects.filter(is_superuser=True).exists())" 2>$null
if ($superuserExists -ne "True") {
    Write-Host "  No superuser found. Creating one..." -ForegroundColor Cyan
    Write-Host "  ⚠ You'll be prompted for email" -ForegroundColor Yellow
    python manage.py createsuperuser
}

# Setup Frontend
Write-Host "[6/8] Setting up React frontend..." -ForegroundColor Yellow
Set-Location $FRONTEND_DIR

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env from template..." -ForegroundColor Cyan
    Copy-Item ".env.example" ".env"
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing Node dependencies (this may take a while)..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "  ✓ Node dependencies already installed" -ForegroundColor Green
}

# Start servers
Write-Host "[7/8] Starting development servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Servers Starting!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  Admin:    http://localhost:8000/admin" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in background job
Set-Location $BACKEND_DIR
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & .\.venv\Scripts\Activate.ps1
    python manage.py runserver
} -ArgumentList $BACKEND_DIR

Write-Host "[Backend] Starting Django server..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# Start frontend in current process
Set-Location $FRONTEND_DIR
Write-Host "[Frontend] Starting Vite dev server..." -ForegroundColor Cyan

try {
    npm run dev
} finally {
    # Cleanup: Stop backend job when frontend stops
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob
    Remove-Job $backendJob
    Write-Host "All servers stopped." -ForegroundColor Green
}
