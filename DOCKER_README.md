# 🐳 SmarTanom Docker Setup

Complete Docker containerization for the SmarTanom hydroponic monitoring system, providing easy development environment setup and production deployment.

## 🚀 Quick Start

### Development Environment

1. **Clone and setup**:
   ```bash
   git clone https://github.com/SmarTanom/SmarTanom.git
   cd SmarTanom
   ```

2. **Copy environment file**:
   ```bash
   cp .env.dev.example .env
   ```

3. **Start development environment**:
   ```bash
   docker-compose up -d
   ```

4. **Run initial setup**:
   ```bash
   # Run database migrations
   docker-compose exec backend python manage.py migrate

   # Create superuser (optional)
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Admin: http://localhost:8000/admin

6. **(Optional) Start Mobile (Expo) Dev Server**:
   ```powershell
   docker compose -f docker-compose.expo.yml up --build
   ```
   - Expo Web: http://localhost:19006
   - Metro (native): port 19000 (QR code in container logs)
   - Logs/WebSocket: 19001

   To stop: `docker compose -f docker-compose.expo.yml down`

### Production Deployment

1. **Copy and configure environment file**:
   ```bash
   cp .env.production.template .env.production
   # Edit .env.production with your production settings
   ```

2. **Deploy production stack**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d --build
   ```

3. **Verify deployment**:
   ```bash
   docker-compose -f docker-compose.production.yml ps
   docker-compose -f docker-compose.production.yml logs backend
   ```

4. **Health check**:
   ```bash
   curl -f http://localhost:8000/healthz
   # Should return: {"status":"ok","db":true}
   ```

1. **Setup environment**:
   ```bash
   cp .env.prod.example .env.prod
   # Edit .env.prod with your production values
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run production setup**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec app python manage.py migrate
   docker-compose -f docker-compose.prod.yml exec app python manage.py collectstatic --noinput
   docker-compose -f docker-compose.prod.yml exec app python manage.py createsuperuser
   ```

4. **(Optional) Verify static + reverse proxy**:
   - Visit `http://localhost/` (should serve frontend build via Nginx)
   - API at `http://localhost/api/`

> Note: The production `Dockerfile` sets `ENV DJANGO_SETTINGS_MODULE=smartanom.settings.production` but no `production.py` exists. Either:
> - Create `backend/smartanom/settings/production.py` importing from `settings` and overriding prod values, or
> - Change the Dockerfile to `ENV DJANGO_SETTINGS_MODULE=smartanom.settings`.
>
> Until adjusted, Django will fallback incorrectly and may error on startup. Update before real deployment.

## 🛠 Services

### Development (`docker-compose.yml`)
- **Frontend**: React + Vite dev server with HMR
- **Backend**: Django development server with auto-reload
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Volumes**: Source code mounted for live development

### Production (`docker-compose.prod.yml`)
- **App**: Optimized multi-stage build with Nginx + Django
- **Database**: PostgreSQL with persistent storage
- **Cache**: Redis with persistent storage
- **Security**: Rate limiting, security headers, gzip compression
### Mobile / Expo (`docker-compose.expo.yml`)
- **Expo Dev**: Runs the React Native (web + native) development server
- **Ports**: 19000 (Metro), 19001 (WS/logs), 19006 (web preview)
- **Hot Reload**: Code changes in `mobile/` reflected automatically

## 📋 Available Commands

### Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service_name]

# Execute commands in containers
docker-compose exec backend python manage.py [command]
docker-compose exec frontend npm run [script]

# Mobile (Expo)
docker compose -f docker-compose.expo.yml up --build
docker compose -f docker-compose.expo.yml logs -f expo
docker compose -f docker-compose.expo.yml down

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Production
```bash
# Deploy production
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

## 🔧 Configuration

### Environment Variables

**Development** (`.env`):
- Database and Redis use default development credentials
- Debug mode enabled
- Hot reloading enabled

**Production** (`.env.prod`):
- Secure database credentials required
- SECRET_KEY must be set
- DEBUG disabled
- ALLOWED_HOSTS must include your domain

### Port Configuration
- **Frontend Dev**: 5173
- **Backend API**: 8000
- **Database**: 5432
- **Redis**: 6379
- **Production**: 80

## 📁 Project Structure
```
SmarTanom/
├── docker/
│   ├── Dockerfile.backend    # Backend dev container
│   ├── Dockerfile.frontend   # Frontend dev container
│   ├── nginx.conf            # Nginx configuration
│   ├── supervisord.conf      # Process manager config
│   └── init.sql              # Database initialization
├── Dockerfile                # Production multi-stage build
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
├── .env.dev.example         # Development env template
└── .env.prod.example        # Production env template
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check if ports are in use
   netstat -tulpn | grep :5173
   # Stop conflicting services or change ports in docker-compose.yml
   ```

2. **Database connection issues**:
   ```bash
   # Reset database
   docker-compose down -v
   docker-compose up -d
   ```

3. **Permission issues on Windows**:
   ```bash
   # Ensure Docker Desktop is running with admin privileges
   # Check WSL2 integration in Docker Desktop settings
   ```

4. **Build failures**:
   ```bash
   # Clean rebuild
   docker-compose down
   docker system prune -a
   docker-compose up -d --build
   ```

### Logs and Debugging
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Enter container for debugging
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 🚦 Health Checks

The containers include health checks:
- **Backend**: Django admin endpoint
- **Frontend**: HTTP response check
- **Database**: PostgreSQL connection test
- **Redis**: Ping response

## 📊 Monitoring

Production setup includes:
- Nginx access/error logs
- Django application logs
- Supervisor process monitoring
- Container resource monitoring via `docker stats`

## 🔐 Security

Production configuration includes:
- Rate limiting on API endpoints
- Security headers (XSS, CSRF protection)
- Gzip compression
- Static file caching
- Secure database connections

## 🤝 Team Development

### Getting Started for New Team Members

1. **Prerequisites**:
   - Docker Desktop installed
   - Git configured
   - Text editor/IDE ready

2. **Setup**:
   ```bash
   git clone https://github.com/SmarTanom/SmarTanom.git
   cd SmarTanom
   docker-compose up -d
   ```

3. **Verify setup**:
   - Visit http://localhost:5173 (should show SmarTanom frontend)
   - Visit http://localhost:8000/api (should show API documentation)

### Development Workflow

1. Make code changes (hot reload enabled)
2. Test changes in browser
3. Run tests: `docker-compose exec backend python manage.py test`
4. Commit and push changes

### Database Operations

```bash
# Create migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

This Docker setup provides a consistent, isolated development environment for your entire team! 🌱
