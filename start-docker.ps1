#!/usr/bin/env powershell
# SmarTanom Docker Development Environment
# Port: 8001 | Database: PostgreSQL | Data: Fresh database

Write-Host "🐳 Starting SmarTanom Docker Development Environment" -ForegroundColor Green
Write-Host "Port: 8001 | Database: PostgreSQL" -ForegroundColor Yellow

# Stop any existing containers
Write-Host "🛑 Stopping any existing containers..." -ForegroundColor Cyan
docker-compose down

# Check if any process is using port 8001
Write-Host "🔍 Checking port 8001..." -ForegroundColor Cyan
$port8001 = netstat -ano | findstr :8001
if ($port8001) {
    Write-Host "⚠️  Port 8001 is in use. You may need to stop other services." -ForegroundColor Yellow
}

# Start Docker containers
Write-Host "🚀 Starting Docker containers..." -ForegroundColor Cyan
docker-compose up --build -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep 10

# Check container status
Write-Host "📊 Container Status:" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "🌐 Services available at:" -ForegroundColor Green
Write-Host "   Backend Admin: http://127.0.0.1:8001/admin/" -ForegroundColor Cyan
Write-Host "   Backend API:   http://127.0.0.1:8001/api/" -ForegroundColor Cyan
Write-Host "   Frontend:      http://127.0.0.1:5173/" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Note: This uses a fresh PostgreSQL database" -ForegroundColor Yellow
Write-Host "   You'll need to create a superuser and seed data" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 To create admin user:" -ForegroundColor Green
Write-Host "   docker-compose exec backend python manage.py createsuperuser" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 To view logs:" -ForegroundColor Green
Write-Host "   docker-compose logs -f" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 To stop:" -ForegroundColor Green
Write-Host "   docker-compose down" -ForegroundColor Cyan
