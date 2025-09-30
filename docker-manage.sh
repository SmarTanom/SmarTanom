#!/bin/bash

# SmarTanom Docker Management Script
# This script provides easy commands to manage your Docker setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Show help
show_help() {
    echo "SmarTanom Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev              Start backend + frontend (default docker-compose.yml)"
    echo "  full             Start all services including mobile (docker-compose.dev.yml)"
    echo "  mobile-only      Start only mobile app (docker-compose.expo.yml)"
    echo "  prod             Start production setup (docker-compose.prod.yml)"
    echo "  build            Build all Docker images"
    echo "  build-backend    Build only backend image"
    echo "  build-frontend   Build only frontend image"
    echo "  build-mobile     Build only mobile image"
    echo "  stop             Stop all running containers"
    echo "  down             Stop and remove containers, networks"
    echo "  logs             Show logs from all services"
    echo "  logs-backend     Show backend logs"
    echo "  logs-frontend    Show frontend logs"
    echo "  logs-mobile      Show mobile logs"
    echo "  clean            Remove unused images and volumes"
    echo "  reset            Full reset - remove all containers, volumes, and rebuild"
    echo "  status           Show status of all containers"
    echo "  shell-backend    Open shell in backend container"
    echo "  shell-frontend   Open shell in frontend container"
    echo "  shell-mobile     Open shell in mobile container"
    echo "  help             Show this help message"
}

# Build functions
build_all() {
    print_info "Building all Docker images..."
    docker-compose -f docker-compose.dev.yml build --parallel
    print_success "All images built successfully!"
}

build_backend() {
    print_info "Building backend image..."
    docker-compose build backend
    print_success "Backend image built successfully!"
}

build_frontend() {
    print_info "Building frontend image..."
    docker-compose build frontend
    print_success "Frontend image built successfully!"
}

build_mobile() {
    print_info "Building mobile image..."
    docker-compose -f docker-compose.expo.yml build expo
    print_success "Mobile image built successfully!"
}

# Start functions
start_dev() {
    print_info "Starting development environment (backend + frontend)..."
    docker-compose up -d
    print_success "Development environment started!"
    print_info "Backend: http://localhost:8000"
    print_info "Frontend: http://localhost:5173"
}

start_full() {
    print_info "Starting full development environment (backend + frontend + mobile)..."
    docker-compose -f docker-compose.dev.yml up -d
    print_success "Full development environment started!"
    print_info "Backend: http://localhost:8000"
    print_info "Frontend: http://localhost:5173"
    print_info "Mobile: http://localhost:19006 (Expo web)"
}

start_mobile_only() {
    print_info "Starting mobile app only..."
    docker-compose -f docker-compose.expo.yml up -d
    print_success "Mobile app started!"
    print_info "Mobile: http://localhost:19006"
}

start_prod() {
    print_info "Starting production environment..."
    docker-compose -f docker-compose.prod.yml up -d
    print_success "Production environment started!"
}

# Utility functions
show_logs() {
    if [ "$1" = "backend" ]; then
        docker-compose logs -f backend
    elif [ "$1" = "frontend" ]; then
        docker-compose logs -f frontend
    elif [ "$1" = "mobile" ]; then
        docker-compose -f docker-compose.expo.yml logs -f expo
    else
        docker-compose -f docker-compose.dev.yml logs -f
    fi
}

stop_all() {
    print_info "Stopping all containers..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.expo.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    print_success "All containers stopped!"
}

down_all() {
    print_info "Stopping and removing containers..."
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.expo.yml down --remove-orphans 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    print_success "All containers removed!"
}

clean_docker() {
    print_info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    print_success "Docker cleanup completed!"
}

reset_all() {
    print_warning "This will remove ALL containers, volumes, and rebuild everything!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Resetting everything..."
        down_all
        docker system prune -af
        docker volume prune -f
        build_all
        print_success "Reset completed!"
    else
        print_info "Reset cancelled."
    fi
}

show_status() {
    print_info "Container Status:"
    docker ps -a --filter "name=smartanom"
    echo ""
    print_info "Network Status:"
    docker network ls --filter "name=smartanom"
    echo ""
    print_info "Volume Status:"
    docker volume ls --filter "name=smartanom"
}

open_shell() {
    if [ "$1" = "backend" ]; then
        docker-compose exec backend sh
    elif [ "$1" = "frontend" ]; then
        docker-compose exec frontend sh
    elif [ "$1" = "mobile" ]; then
        docker-compose -f docker-compose.expo.yml exec expo sh
    else
        print_error "Please specify: backend, frontend, or mobile"
    fi
}

# Main script logic
check_docker

case "${1:-dev}" in
    "dev")
        start_dev
        ;;
    "full")
        start_full
        ;;
    "mobile-only")
        start_mobile_only
        ;;
    "prod")
        start_prod
        ;;
    "build")
        build_all
        ;;
    "build-backend")
        build_backend
        ;;
    "build-frontend")
        build_frontend
        ;;
    "build-mobile")
        build_mobile
        ;;
    "stop")
        stop_all
        ;;
    "down")
        down_all
        ;;
    "logs")
        show_logs
        ;;
    "logs-backend")
        show_logs backend
        ;;
    "logs-frontend")
        show_logs frontend
        ;;
    "logs-mobile")
        show_logs mobile
        ;;
    "clean")
        clean_docker
        ;;
    "reset")
        reset_all
        ;;
    "status")
        show_status
        ;;
    "shell-backend")
        open_shell backend
        ;;
    "shell-frontend")
        open_shell frontend
        ;;
    "shell-mobile")
        open_shell mobile
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
