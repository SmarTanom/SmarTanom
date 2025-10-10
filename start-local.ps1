#!/usr/bin/env powershell
# SmarTanom Local Development Server
# Port: 8000 | Database: SQLite | Data: Your mock data

Write-Host "🚀 Starting SmarTanom Local Development Server" -ForegroundColor Green
Write-Host "Port: 8000 | Database: SQLite" -ForegroundColor Yellow

# Check if backend directory exists
if (!(Test-Path "backend")) {
    Write-Host "❌ Error: Must run from SmarTanom root directory" -ForegroundColor Red
    exit 1
}

# Change to backend directory
Set-Location backend

# Check for virtual environment
if (!(Test-Path ".venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

# Run migrations
Write-Host "🗄️  Running migrations..." -ForegroundColor Cyan
python manage.py migrate

# Check for admin user
Write-Host "👤 Checking admin user..." -ForegroundColor Cyan
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings'); django.setup(); from django.contrib.auth import get_user_model; User = get_user_model(); admin_exists = User.objects.filter(is_superuser=True).exists(); print('✅ Admin user exists' if admin_exists else '❌ No admin user found')"

Write-Host ""
Write-Host "🌐 Server will be available at:" -ForegroundColor Green
Write-Host "   Admin: http://127.0.0.1:8000/admin/" -ForegroundColor Cyan
Write-Host "   API:   http://127.0.0.1:8000/api/" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔑 Admin Login:" -ForegroundColor Green
Write-Host "   Email: smartanom01@gmail.com" -ForegroundColor Cyan
Write-Host "   Pass:  smartanomadmin4r1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start Django development server
python manage.py runserver
