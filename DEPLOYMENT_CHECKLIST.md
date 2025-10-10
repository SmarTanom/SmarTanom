# 🚀 SmarTanom Production Deployment Checklist

## Pre-Deployment Security Checklist

### ✅ Environment Configuration
- [ ] Copy `.env.production.template` to `.env.production`
- [ ] Generate new Django `SECRET_KEY` using: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- [ ] Set strong database password (minimum 16 characters)
- [ ] Set strong Redis password (minimum 16 characters)
- [ ] Configure `ALLOWED_HOSTS` with your domain names
- [ ] Configure `CORS_ALLOWED_ORIGINS` with your frontend domains
- [ ] Set up email SMTP credentials (Gmail App Password, SES, SendGrid, etc.)
- [ ] Update `DEFAULT_FROM_EMAIL` with your domain

### ✅ SSL/TLS & Domain Setup
- [ ] Domain name configured and pointing to your server
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] Reverse proxy configured (nginx recommended)
- [ ] HTTPS redirect enabled
- [ ] Security headers configured

### ✅ Server Infrastructure
- [ ] Server meets minimum requirements (2GB RAM, 2 CPU cores, 20GB disk)
- [ ] Docker and Docker Compose installed
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key authentication enabled (password auth disabled)
- [ ] Non-root user created for deployment
- [ ] Log rotation configured
- [ ] Monitoring and alerting set up

## Deployment Steps

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Reboot to ensure Docker group membership
sudo reboot
```

### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/YourUsername/SmarTanom.git
cd SmarTanom

# Configure environment
cp .env.production.template .env.production
nano .env.production  # Update all values

# Deploy
docker-compose -f docker-compose.production.yml up -d --build

# Verify deployment
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

### 3. Post-Deployment Verification
```bash
# Health check
curl -f http://localhost:8000/healthz

# Create admin user
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser

# Test API authentication
curl -X POST http://localhost:8000/api/auth/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com"}'
```

## Maintenance & Operations

### ✅ Backup Strategy
- [ ] Database backups configured (daily recommended)
- [ ] Media files backup configured
- [ ] Configuration files backup (`.env.production`, compose files)
- [ ] Backup restoration tested

### ✅ Monitoring & Logging
- [ ] Application logs monitored
- [ ] Database performance monitored
- [ ] Disk space monitoring
- [ ] Memory and CPU monitoring
- [ ] Error alerting configured
- [ ] Uptime monitoring configured

### ✅ Security Maintenance
- [ ] Regular security updates scheduled
- [ ] Docker images updated regularly
- [ ] Password rotation policy in place
- [ ] Access logs reviewed regularly
- [ ] Vulnerability scanning scheduled

## Common Commands

### Application Management
```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Restart application
docker-compose -f docker-compose.production.yml restart backend

# Update application
git pull
docker-compose -f docker-compose.production.yml up -d --build

# Scale backend (if needed)
docker-compose -f docker-compose.production.yml up -d --scale backend=3
```

### Database Management
```bash
# Backup database
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U smartanom smartanom_prod > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.production.yml exec -T postgres psql -U smartanom smartanom_prod

# Database shell
docker-compose -f docker-compose.production.yml exec postgres psql -U smartanom smartanom_prod
```

### Debug & Troubleshooting
```bash
# Container shell access
docker-compose -f docker-compose.production.yml exec backend sh

# View container stats
docker stats

# Clean up unused resources
docker system prune -f
```

## Performance Tuning

### Database Optimization
- Enable PostgreSQL connection pooling
- Configure appropriate `shared_buffers` and `work_mem`
- Set up database monitoring
- Regular `VACUUM` and `ANALYZE`

### Application Optimization
- Adjust Gunicorn workers based on CPU cores: `(2 × CPU cores) + 1`
- Configure Redis for session caching
- Enable database query optimization
- Set up CDN for static files

### Infrastructure Scaling
- Horizontal scaling with load balancer
- Database read replicas for high traffic
- Redis clustering for high availability
- Container orchestration (Kubernetes, Docker Swarm)

## Security Best Practices

### Application Security
- Regular dependency updates
- HTTPS enforcement
- CORS properly configured
- Rate limiting enabled
- Input validation and sanitization
- Regular security audits

### Infrastructure Security
- Server hardening
- Network segmentation
- Regular backups
- Intrusion detection
- Log analysis
- Access control reviews

## Rollback Procedures

### Quick Rollback
```bash
# Stop current deployment
docker-compose -f docker-compose.production.yml down

# Revert to previous git commit
git checkout HEAD~1

# Deploy previous version
docker-compose -f docker-compose.production.yml up -d --build
```

### Database Rollback
```bash
# Restore from backup
docker-compose -f docker-compose.production.yml down
docker volume rm smartanom_postgres_data_prod
docker-compose -f docker-compose.production.yml up -d postgres
cat backup.sql | docker-compose -f docker-compose.production.yml exec -T postgres psql -U smartanom smartanom_prod
docker-compose -f docker-compose.production.yml up -d
```

---

⚠️ **Important**: Always test deployment procedures in a staging environment before production deployment.

📞 **Support**: For issues, check logs first, then consult the troubleshooting section in the main README.
