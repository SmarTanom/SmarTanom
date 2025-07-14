#!/bin/bash

# Docker entrypoint script for SmarTanom Expo app

set -e

echo "🚀 Starting SmarTanom Mobile App..."

# Function to check if a port is available
check_port() {
    local port=$1
    if netstat -tuln | grep -q ":$port "; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for dependencies
wait_for_dependencies() {
    echo "📦 Checking dependencies..."
    
    # Check if node_modules exists and has content
    if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
        echo "📥 Installing dependencies..."
        npm install
    else
        echo "✅ Dependencies already installed"
    fi
}

# Function to clear Expo cache if needed
clear_expo_cache() {
    if [ "$CLEAR_CACHE" = "true" ]; then
        echo "🧹 Clearing Expo cache..."
        npx expo r -c || true
    fi
}

# Function to start the development server
start_dev_server() {
    echo "🌐 Starting Expo development server..."
    
    # Set environment variables for Docker
    export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
    export REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
    
    # Start based on the command passed
    case "$1" in
        "web")
            echo "🌍 Starting web development server..."
            exec npx expo start --web
            ;;
        "tunnel")
            echo "🚇 Starting with tunnel..."
            exec npx expo start --tunnel
            ;;
        "lan")
            echo "🏠 Starting with LAN..."
            exec npx expo start --lan
            ;;
        "production-web")
            echo "🏭 Starting production web server..."
            exec npx expo start --web --no-dev --minify
            ;;
        *)
            echo "🔧 Starting default development server..."
            exec npx expo start --web
            ;;
    esac
}

# Function to show helpful information
show_info() {
    echo ""
    echo "📱 SmarTanom Mobile App is starting..."
    echo "🌐 Web interface will be available at: http://localhost:3000"
    echo "📱 Expo DevTools will be available at: http://localhost:19002"
    echo "🔧 Metro bundler will be available at: http://localhost:8081"
    echo ""
    echo "📋 Available commands:"
    echo "  - docker-compose up                    # Start development server"
    echo "  - docker-compose up smartanom-web     # Start production web server"
    echo "  - docker-compose exec smartanom-mobile bash  # Access container shell"
    echo ""
    echo "🔗 To connect your mobile device:"
    echo "  1. Install Expo Go app on your phone"
    echo "  2. Scan the QR code that will appear"
    echo "  3. Or use the tunnel option for remote access"
    echo ""
}

# Main execution
main() {
    show_info
    wait_for_dependencies
    clear_expo_cache
    
    # Check if we're running in development or production mode
    if [ "$NODE_ENV" = "production" ]; then
        start_dev_server "production-web"
    else
        # Check what command was passed
        if [ $# -eq 0 ]; then
            start_dev_server "web"
        else
            start_dev_server "$@"
        fi
    fi
}

# Handle signals gracefully
trap 'echo "🛑 Shutting down SmarTanom Mobile App..."; exit 0' SIGTERM SIGINT

# Run main function with all arguments
main "$@"
