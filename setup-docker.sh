#!/bin/bash

# SmarTanom Docker Setup Script
# This script helps set up the Docker environment for first-time users

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Docker installation
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed!"
        echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running!"
        echo "Please start Docker Desktop and try again."
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Function to check Docker Compose
check_docker_compose() {
    print_status "Checking Docker Compose..."
    
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available!"
        echo "Please install Docker Compose or use Docker Desktop which includes it."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Function to create environment file
setup_env_file() {
    print_status "Setting up environment file..."
    
    if [ ! -f .env ]; then
        if [ -f .env.docker.example ]; then
            cp .env.docker.example .env
            print_success "Created .env file from template"
        else
            print_warning ".env.docker.example not found, creating basic .env file"
            cat > .env << EOF
NODE_ENV=development
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
EXPO_CLI_NO_DOCTOR=1
CLEAR_CACHE=false
EOF
            print_success "Created basic .env file"
        fi
    else
        print_warning ".env file already exists, skipping creation"
    fi
}

# Function to check project structure
check_project_structure() {
    print_status "Checking project structure..."
    
    required_files=("Dockerfile" "docker-compose.yml" "smartanom-mobile/package.json")
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "Project structure is valid"
}

# Function to build Docker images
build_images() {
    print_status "Building Docker images..."
    
    if command_exists docker-compose; then
        docker-compose build
    else
        docker compose build
    fi
    
    print_success "Docker images built successfully"
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start the development server:"
    echo "   ${GREEN}docker-compose up${NC}"
    echo ""
    echo "2. Access the application:"
    echo "   • Web: ${BLUE}http://localhost:3000${NC}"
    echo "   • Expo DevTools: ${BLUE}http://localhost:19002${NC}"
    echo ""
    echo "3. For mobile testing:"
    echo "   • Install Expo Go app on your phone"
    echo "   • Scan the QR code from the terminal or DevTools"
    echo ""
    echo "4. Useful commands:"
    echo "   • ${GREEN}docker-compose up -d${NC}     # Run in background"
    echo "   • ${GREEN}docker-compose logs -f${NC}   # View logs"
    echo "   • ${GREEN}docker-compose down${NC}      # Stop containers"
    echo "   • ${GREEN}make help${NC}                # See all available commands"
    echo ""
    echo "📖 For more information, see DOCKER_README.md"
}

# Function to run setup
main() {
    echo "🐳 SmarTanom Docker Setup"
    echo "========================="
    echo ""
    
    check_docker
    check_docker_compose
    check_project_structure
    setup_env_file
    
    read -p "Do you want to build the Docker images now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_images
    else
        print_warning "Skipping image build. Run 'docker-compose build' when ready."
    fi
    
    show_next_steps
}

# Handle script interruption
trap 'echo ""; print_error "Setup interrupted"; exit 1' INT

# Run main function
main "$@"
