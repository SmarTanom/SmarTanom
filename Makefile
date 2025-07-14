# SmarTanom Docker Management Makefile

.PHONY: help build up down restart logs shell clean install tunnel web production

# Default target
help: ## Show this help message
	@echo "🐳 SmarTanom Docker Commands"
	@echo "=============================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the Docker containers
	@echo "🔨 Building SmarTanom containers..."
	docker-compose build

up: ## Start the development server
	@echo "🚀 Starting SmarTanom development server..."
	docker-compose up

up-d: ## Start the development server in background
	@echo "🚀 Starting SmarTanom development server in background..."
	docker-compose up -d

down: ## Stop and remove containers
	@echo "🛑 Stopping SmarTanom containers..."
	docker-compose down

restart: ## Restart the containers
	@echo "🔄 Restarting SmarTanom containers..."
	docker-compose restart

logs: ## View container logs
	@echo "📋 Viewing SmarTanom logs..."
	docker-compose logs -f

shell: ## Access container shell
	@echo "🐚 Accessing SmarTanom container shell..."
	docker-compose exec smartanom-mobile bash

clean: ## Clean up containers, networks, and volumes
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v
	docker system prune -f

clean-all: ## Clean up everything including images
	@echo "🧹 Cleaning up all Docker resources..."
	docker-compose down --rmi all -v
	docker system prune -af

install: ## Install new npm package (usage: make install PACKAGE=package-name)
	@echo "📦 Installing $(PACKAGE)..."
	docker-compose exec smartanom-mobile npm install $(PACKAGE)

tunnel: ## Start with tunnel mode for remote access
	@echo "🚇 Starting with tunnel mode..."
	docker-compose exec smartanom-mobile expo start --tunnel

web: ## Start web-only development server
	@echo "🌐 Starting web development server..."
	docker-compose exec smartanom-mobile expo start --web

production: ## Start production web server
	@echo "🏭 Starting production web server..."
	docker-compose --profile production up smartanom-web

rebuild: ## Rebuild containers from scratch
	@echo "🔨 Rebuilding containers from scratch..."
	docker-compose build --no-cache

status: ## Show container status
	@echo "📊 Container status:"
	docker-compose ps

clear-cache: ## Clear Expo cache
	@echo "🧹 Clearing Expo cache..."
	docker-compose exec smartanom-mobile expo r -c

# Development shortcuts
dev: up ## Alias for 'up'
stop: down ## Alias for 'down'
log: logs ## Alias for 'logs'
