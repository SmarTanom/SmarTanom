# SmarTanom Docker Management Script for Windows PowerShell
# This script provides easy commands to manage your Docker setup

param(
    [Parameter(Position=0)]
    [string]$Command = "dev"
)

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker Desktop first."
        exit 1
    }
}

# Show help
function Show-Help {
    Write-Host "SmarTanom Docker Management Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\docker-manage.ps1 [COMMAND]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev              Start backend + frontend (default docker-compose.yml)"
    Write-Host "  full             Start all services including mobile (docker-compose.dev.yml)"
    Write-Host "  mobile-only      Start only mobile app (docker-compose.expo.yml)"
    Write-Host "  prod             Start production setup (docker-compose.prod.yml)"
    Write-Host "  build            Build all Docker images"
    Write-Host "  build-backend    Build only backend image"
    Write-Host "  build-frontend   Build only frontend image"
    Write-Host "  build-mobile     Build only mobile image"
    Write-Host "  stop             Stop all running containers"
    Write-Host "  down             Stop and remove containers, networks"
    Write-Host "  logs             Show logs from all services"
    Write-Host "  logs-backend     Show backend logs"
    Write-Host "  logs-frontend    Show frontend logs"
    Write-Host "  logs-mobile      Show mobile logs"
    Write-Host "  clean            Remove unused images and volumes"
    Write-Host "  reset            Full reset - remove all containers, volumes, and rebuild"
    Write-Host "  status           Show status of all containers"
    Write-Host "  shell-backend    Open shell in backend container"
    Write-Host "  shell-frontend   Open shell in frontend container"
    Write-Host "  shell-mobile     Open shell in mobile container"
    Write-Host "  help             Show this help message"
}

# Build functions
function Invoke-BuildAll {
    Write-Info "Building all Docker images..."
    docker-compose -f docker-compose.dev.yml build --parallel
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All images built successfully!"
    } else {
        Write-Error "Build failed!"
        exit 1
    }
}

function Invoke-BackendBuild {
    Write-Info "Building backend image..."
    docker-compose build backend
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Backend image built successfully!"
    } else {
        Write-Error "Backend build failed!"
        exit 1
    }
}

function Invoke-FrontendBuild {
    Write-Info "Building frontend image..."
    docker-compose build frontend
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend image built successfully!"
    } else {
        Write-Error "Frontend build failed!"
        exit 1
    }
}

function Invoke-MobileBuild {
    Write-Info "Building mobile image..."
    docker-compose -f docker-compose.expo.yml build expo
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Mobile image built successfully!"
    } else {
        Write-Error "Mobile build failed!"
        exit 1
    }
}

# Start functions
function Start-Dev {
    Write-Info "Starting development environment (backend + frontend)..."
    docker-compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Development environment started!"
        Write-Info "Backend: http://localhost:8000"
        Write-Info "Frontend: http://localhost:5173"
    } else {
        Write-Error "Failed to start development environment!"
        exit 1
    }
}

function Start-Full {
    Write-Info "Starting full development environment (backend + frontend + mobile)..."
    docker-compose -f docker-compose.dev.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Full development environment started!"
        Write-Info "Backend: http://localhost:8000"
        Write-Info "Frontend: http://localhost:5173"
        Write-Info "Mobile: http://localhost:19006 (Expo web)"
    } else {
        Write-Error "Failed to start full environment!"
        exit 1
    }
}

function Start-MobileOnly {
    Write-Info "Starting mobile app only..."
    docker-compose -f docker-compose.expo.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Mobile app started!"
        Write-Info "Mobile: http://localhost:19006"
    } else {
        Write-Error "Failed to start mobile app!"
        exit 1
    }
}

function Start-Prod {
    Write-Info "Starting production environment..."
    docker-compose -f docker-compose.prod.yml up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production environment started!"
    } else {
        Write-Error "Failed to start production environment!"
        exit 1
    }
}

# Utility functions
function Show-Logs {
    param($Service = $null)

    if ($Service -eq "backend") {
        docker-compose logs -f backend
    }
    elseif ($Service -eq "frontend") {
        docker-compose logs -f frontend
    }
    elseif ($Service -eq "mobile") {
        docker-compose -f docker-compose.expo.yml logs -f expo
    }
    else {
        docker-compose -f docker-compose.dev.yml logs -f
    }
}

function Stop-All {
    Write-Info "Stopping all containers..."
    docker-compose down 2>$null
    docker-compose -f docker-compose.dev.yml down 2>$null
    docker-compose -f docker-compose.expo.yml down 2>$null
    docker-compose -f docker-compose.prod.yml down 2>$null
    Write-Success "All containers stopped!"
}

function Stop-AllContainers {
    Write-Info "Stopping and removing containers..."
    docker-compose down --remove-orphans 2>$null
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>$null
    docker-compose -f docker-compose.expo.yml down --remove-orphans 2>$null
    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>$null
    Write-Success "All containers removed!"
}

function Clear-DockerResources {
    Write-Info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    Write-Success "Docker cleanup completed!"
}

function Reset-All {
    Write-Warning "This will remove ALL containers, volumes, and rebuild everything!"
    $confirmation = Read-Host "Are you sure? (y/N)"
    if ($confirmation -match "^[Yy]$") {
        Write-Info "Resetting everything..."
        Stop-AllContainers
        docker system prune -af
        docker volume prune -f
        Invoke-BuildAll
        Write-Success "Reset completed!"
    } else {
        Write-Info "Reset cancelled."
    }
}

function Show-Status {
    Write-Info "Container Status:"
    docker ps -a --filter "name=smartanom"
    Write-Host ""
    Write-Info "Network Status:"
    docker network ls --filter "name=smartanom"
    Write-Host ""
    Write-Info "Volume Status:"
    docker volume ls --filter "name=smartanom"
}

function Open-Shell {
    param($Service)

    if ($Service -eq "backend") {
        docker-compose exec backend sh
    }
    elseif ($Service -eq "frontend") {
        docker-compose exec frontend sh
    }
    elseif ($Service -eq "mobile") {
        docker-compose -f docker-compose.expo.yml exec expo sh
    }
    else {
        Write-Error "Please specify: backend, frontend, or mobile"
    }
}

# Main script logic
Test-Docker

switch ($Command.ToLower()) {
    "dev" { Start-Dev }
    "full" { Start-Full }
    "mobile-only" { Start-MobileOnly }
    "prod" { Start-Prod }
    "build" { Invoke-BuildAll }
    "build-backend" { Invoke-BackendBuild }
    "build-frontend" { Invoke-FrontendBuild }
    "build-mobile" { Invoke-MobileBuild }
    "stop" { Stop-All }
    "down" { Stop-AllContainers }
    "logs" { Show-Logs }
    "logs-backend" { Show-Logs -Service "backend" }
    "logs-frontend" { Show-Logs -Service "frontend" }
    "logs-mobile" { Show-Logs -Service "mobile" }
    "clean" { Clear-DockerResources }
    "reset" { Reset-All }
    "status" { Show-Status }
    "shell-backend" { Open-Shell -Service "backend" }
    "shell-frontend" { Open-Shell -Service "frontend" }
    "shell-mobile" { Open-Shell -Service "mobile" }
    "help" { Show-Help }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host ""
        Show-Help
        exit 1
    }
}
