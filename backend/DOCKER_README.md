# SmarTanom Backend - Docker Setup

## Backend Docker Configuration

This directory contains the Docker setup for the SmarTanom backend Django application.

## Available Docker Configurations

### 1. Development Setup (Recommended for local development)
```bash
# Start with Docker Compose
docker-compose up --build

# Or start specific services
docker-compose up postgres redis  # Database and Redis only
docker-compose up backend         # Backend only (requires DB)
```

### 2. Production Setup
```bash
# Using production compose file
docker-compose -f docker-compose.prod.yml up --build
```

## Docker Services

### Backend Service
- **Image**: Custom Django application
- **Port**: 8000
- **Environment**: PostgreSQL + Redis
- **Features**: Auto-migrations, hot reload (dev), static files

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: smartanom_dev
- **Credentials**: smartanom / dev_password_change_in_production

### Redis Cache
- **Image**: redis:7-alpine
- **Port**: 6379
- **Usage**: Caching, session storage, task queue

## Environment Configuration

### Development (.env)
```bash
# Copy and customize
cp .env.dev.example .env

# Key variables
SECRET_KEY=your-secret-key
DEBUG=1
POSTGRES_DB=smartanom_dev
POSTGRES_USER=smartanom
POSTGRES_PASSWORD=secure_password
```

### Production (.env.prod)
```bash
# Copy and customize
cp .env.prod.example .env.prod

# Key production variables
SECRET_KEY=super-secure-secret-key
DEBUG=0
POSTGRES_PASSWORD=very-secure-production-password
ALLOWED_HOSTS=yourdomain.com
```

## Quick Start Commands

### First Time Setup
```bash
# 1. Copy environment file
cp .env.dev.example .env

# 2. Build and start all services
docker-compose up --build

# 3. Create superuser (in another terminal)
docker-compose exec backend python manage.py createsuperuser

# 4. Generate mock data (optional)
docker-compose exec backend python manage.py seed_mock_data
```

### Daily Development
```bash
# Start services
docker-compose up

# Stop services
docker-compose down

# View logs
docker-compose logs backend
docker-compose logs postgres

# Execute commands in backend
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py migrate
```

## Accessing Services

- **Backend API**: http://localhost:8000
- **Admin Interface**: http://localhost:8000/admin/
- **Health Check**: http://localhost:8000/api/health/
- **PostgreSQL**: localhost:5432 (from host)
- **Redis**: localhost:6379 (from host)

## Volume Mounts (Development)

The development setup mounts your local code:
- `./backend:/app` - Backend source code
- `postgres_data:/var/lib/postgresql/data` - Database persistence
- `redis_data:/data` - Redis persistence

## Production Notes

### Security Checklist
- [ ] Change all default passwords
- [ ] Set strong SECRET_KEY
- [ ] Configure ALLOWED_HOSTS
- [ ] Set DEBUG=0
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configure backup strategy

### Performance
- Uses multi-stage builds for smaller images
- PostgreSQL with optimized settings
- Redis with memory limits
- Gunicorn WSGI server for production

## Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U smartanom -d smartanom_dev

# Reset database
docker-compose down -v
docker-compose up postgres
```

**Permission errors:**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :8000  # Backend
lsof -i :5432  # PostgreSQL

# Change ports in docker-compose.yml if needed
```

### Useful Commands

```bash
# View running containers
docker-compose ps

# Execute shell in backend
docker-compose exec backend sh

# Database shell
docker-compose exec postgres psql -U smartanom -d smartanom_dev

# View all logs
docker-compose logs -f

# Rebuild single service
docker-compose build backend
docker-compose up backend

# Clean up
docker-compose down -v  # Remove volumes too
docker system prune     # Clean unused images/containers
```

## Development Workflow

### Code Changes
1. Edit code locally
2. Changes auto-reload in development mode
3. For model changes: `docker-compose exec backend python manage.py makemigrations`
4. Apply migrations: `docker-compose exec backend python manage.py migrate`

### Database Management
```bash
# Create migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Generate test data
docker-compose exec backend python manage.py seed_mock_data --clear
```

### Testing
```bash
# Run all tests
docker-compose exec backend python manage.py test

# Run specific app tests
docker-compose exec backend python manage.py test apps.devices

# Check system health
docker-compose exec backend python manage.py check --deploy
```

## File Structure

```
docker/
├── Dockerfile.backend.dev    # Development backend image
├── Dockerfile.backend        # Production backend image
├── nginx.conf               # Nginx configuration
├── supervisord.conf         # Process management
├── start.sh                 # Production startup script
└── init.sql                 # Database initialization

docker-compose.yml           # Development services
docker-compose.prod.yml      # Production services
.env.dev.example            # Development environment template
.env.prod.example           # Production environment template
```

This Docker setup provides a complete development and production environment for the SmarTanom backend!
