# 🔧 SmarTanom Backend Setup Guide

Comprehensive guide for setting up the Django REST API backend.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Authentication System](#authentication-system)
- [Push Notifications](#push-notifications)
- [Running the Server](#running-the-server)
- [Management Commands](#management-commands)
- [Testing](#testing)
- [Deployment](#deployment)

---

## System Requirements

- **Python**: 3.11+ (3.13 recommended)
- **Database**: SQLite (dev) / PostgreSQL 14+ (prod)
- **OS**: Windows 10+, macOS 12+, Linux (Ubuntu 20.04+)
- **RAM**: 2GB minimum, 4GB recommended

---

## Installation

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Virtual Environment

**Windows:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Upgrade pip

```bash
pip install --upgrade pip
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

**Verify Installation:**
```bash
pip list
# Should show: Django, djangorestframework, pywebpush, cryptography, etc.
```

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Generate SECRET_KEY

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and set it in `.env`:
```env
SECRET_KEY=your-generated-secret-key-here
```

### 3. Configure Basic Settings

**Development (.env):**
```env
# Django Core
SECRET_KEY=your-secret-key-here
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for development)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Email (console for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**Production (.env.production):**
```env
# Django Core
SECRET_KEY=your-production-secret-key
DEBUG=false
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database (PostgreSQL for production)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=smartanom_prod
DB_USER=smartanom
DB_PASSWORD=secure-password-here
DB_HOST=localhost
DB_PORT=5432

# Email (SMTP for production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-specific-password
DEFAULT_FROM_EMAIL=SmarTanom <noreply@yourdomain.com>

# CORS (specific origins in production)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Database Setup

### 1. Run Migrations

```bash
python manage.py migrate
```

This creates all necessary database tables.

### 2. Create Superuser

```bash
python manage.py createsuperuser
```

Enter your email when prompted. No password needed (OTP authentication).

### 3. Verify Database

```bash
# Open Django shell
python manage.py shell

# Check user exists
from apps.accounts.models import User
User.objects.all()
# Should show your superuser
```

---

## Authentication System

### How It Works

1. **Passwordless**: No passwords stored, uses email OTP
2. **Token-based**: DRF Token authentication for API
3. **Session support**: Django session auth for admin panel
4. **Rate limiting**: Prevents brute force attacks

### OTP Configuration

```env
# OTP Settings
OTP_EXPIRATION_SECONDS=300    # 5 minutes
OTP_CODE_LENGTH=6              # 6-digit code
OTP_MAX_ATTEMPTS=5             # Max verification attempts
OTP_RATE_LIMIT_PERIOD=900      # 15 min cooldown
OTP_MAX_LOGIN_ATTEMPTS=5       # Max requests before cooldown
```

### Testing OTP Flow

```bash
# Start server
python manage.py runserver

# In another terminal or API client:
# 1. Request OTP
curl -X POST http://localhost:8000/api/auth/request-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Check console for OTP code (development mode)
# 2. Verify OTP
curl -X POST http://localhost:8000/api/auth/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","code":"123456"}'

# Response contains auth token
```

---

## Push Notifications

### 1. Install Required Packages

```bash
pip install pywebpush cryptography
```

### 2. Generate VAPID Keys

```bash
python manage.py generate_vapid_keys
```

**Output:**
```
VAPID Keys Generated:
----------------------------
VAPID_PUBLIC_KEY=BCI2Xv7XAWw...
VAPID_PRIVATE_KEY=DR6BvsEKOyF...
VAPID_ADMIN_EMAIL=admin@yourdomain.com
----------------------------
Add these to your .env file
```

### 3. Add Keys to .env

```env
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_ADMIN_EMAIL=admin@yourdomain.com
```

### 4. Verify Setup

```bash
python -c "from django.conf import settings; print(f'VAPID Keys: {bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)}')"
# Should print: VAPID Keys: True
```

### 5. Test Push Notification

```bash
python manage.py shell

from apps.notifications.services import PushNotificationService
from apps.accounts.models import User

user = User.objects.first()
result = PushNotificationService.send_notification(
    user=user,
    title="Test Notification",
    message="This is a test!",
    notification_type="info"
)
print(result)
```

---

## Running the Server

### Development Server

```bash
python manage.py runserver
```

Server runs at: http://localhost:8000

**With custom port:**
```bash
python manage.py runserver 8080
```

**Access from network:**
```bash
python manage.py runserver 0.0.0.0:8000
```

### Production Server (Gunicorn)

```bash
# Install gunicorn
pip install gunicorn

# Run server
gunicorn smartanom.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### With Auto-reload (Development)

```bash
python manage.py runserver --noreload  # Disable auto-reload
python manage.py runserver             # Enable auto-reload (default)
```

---

## Management Commands

### Database Commands

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Rollback migration
python manage.py migrate app_name migration_name

# Show migrations
python manage.py showmigrations

# SQL for migration
python manage.py sqlmigrate app_name migration_number
```

### User Management

```bash
# Create superuser
python manage.py createsuperuser

# Change user email
python manage.py shell
>>> from apps.accounts.models import User
>>> user = User.objects.get(email='old@example.com')
>>> user.email = 'new@example.com'
>>> user.save()
```

### Static Files

```bash
# Collect static files (production)
python manage.py collectstatic

# Find static files
python manage.py findstatic filename.css
```

### Testing Commands

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.accounts

# Run with verbosity
python manage.py test --verbosity 2

# Keep test database
python manage.py test --keepdb
```

### Custom Commands

```bash
# Generate VAPID keys
python manage.py generate_vapid_keys

# Clean expired OTP codes (if implemented)
# python manage.py cleanup_otp_codes
```

---

## Testing

### Running Tests

```bash
# All tests
python manage.py test

# Specific app
python manage.py test apps.notifications

# Specific test file
python manage.py test apps.notifications.tests.test_services

# Specific test class
python manage.py test apps.notifications.tests.test_services.PushNotificationTestCase

# Specific test method
python manage.py test apps.notifications.tests.test_services.PushNotificationTestCase.test_send_notification
```

### Coverage Report

```bash
# Install coverage
pip install coverage

# Run tests with coverage
coverage run --source='.' manage.py test

# Generate report
coverage report

# HTML report
coverage html
# Open htmlcov/index.html
```

### Writing Tests

```python
# apps/yourapp/tests.py
from django.test import TestCase
from apps.accounts.models import User

class YourTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create(email='test@example.com')

    def test_something(self):
        self.assertEqual(self.user.email, 'test@example.com')
```

---

## Deployment

### Production Checklist

- [ ] Set `DEBUG=false`
- [ ] Generate new `SECRET_KEY`
- [ ] Configure PostgreSQL database
- [ ] Set up SMTP email
- [ ] Generate VAPID keys
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Set `CORS_ALLOWED_ORIGINS`
- [ ] Collect static files
- [ ] Run migrations
- [ ] Set up gunicorn/uwsgi
- [ ] Configure nginx reverse proxy
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure backups

### Using Gunicorn

```bash
# Install
pip install gunicorn

# Run
gunicorn smartanom.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --timeout 120 \
  --access-logfile /var/log/smartanom/access.log \
  --error-logfile /var/log/smartanom/error.log \
  --daemon
```

### Using Supervisor

```ini
# /etc/supervisor/conf.d/smartanom.conf
[program:smartanom]
command=/path/to/venv/bin/gunicorn smartanom.wsgi:application --bind 127.0.0.1:8000 --workers 4
directory=/path/to/smartanom/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/smartanom/gunicorn.log
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /static/ {
        alias /path/to/smartanom/backend/staticfiles/;
    }

    location /media/ {
        alias /path/to/smartanom/backend/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Troubleshooting

### Import Errors

**Problem**: `ModuleNotFoundError`

**Solution**:
```bash
# Ensure virtual environment is activated
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate     # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

### Migration Conflicts

**Problem**: Migration conflicts after pulling changes

**Solution**:
```bash
# Reset migrations (development only!)
python manage.py migrate --fake app_name zero
python manage.py migrate app_name
```

### Permission Errors

**Problem**: Can't write to logs/media folders

**Solution**:
```bash
# Create directories with proper permissions
mkdir -p logs media
chmod 755 logs media

# On Linux/macOS, ensure user owns directories
chown -R $USER:$USER logs media
```

### Database Locked (SQLite)

**Problem**: `database is locked` error

**Solution**:
```bash
# Close all Django shells and dev servers
# Or switch to PostgreSQL for production
```

---

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

---

**Need help?** Open an issue on GitHub or contact support@smartanom.com
