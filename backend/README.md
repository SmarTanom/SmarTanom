# SmarTanom Backend API

A Django REST API for managing smart hydroponic monitoring systems. This backend provides secure, scalable endpoints for device management, sensor data collection, and user authentication.

## 🏗️ Architecture Overview

### Technology Stack
- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL (production) / SQLite (development)
- **Authentication**: Email-based OTP (One-Time Password) system
- **API**: RESTful with filtering, pagination, and search
- **Security**: Token-based auth, rate limiting, CORS protection

### Domain Model
```
User (Email-based auth)
└── Device (Hydroponic systems)
    ├── Reservoir (Growing containers)
    └── Sensor (Monitoring equipment)
        └── SensorData (Time-series readings)
```

## 📁 Project Structure

```
backend/
├── apps/                          # Django applications
│   ├── accounts/                  # User auth & OTP system
│   ├── common/                    # Shared utilities & base classes
│   ├── devices/                   # Device management + mock data
│   ├── reservoirs/                # Reservoir management
│   └── sensors/                   # Sensor & sensor data
├── smartanom/                     # Django project settings
├── templates/                     # Email templates
├── logs/                          # Application logs
├── manage.py                      # Django CLI
├── requirements.txt               # Production dependencies
└── .env.production.example        # Environment template
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL (for production)
- Virtual environment tool

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment configuration**:
```bash
cp .env.production.example .env
# Edit .env with your settings
```

3. **Database setup**:
```bash
python manage.py migrate
python manage.py createsuperuser
```

4. **Generate mock data** (optional):
```bash
python manage.py seed_mock_data --readings-per-sensor 24 --days 7
```

5. **Run development server**:
```bash
python manage.py runserver
```

Visit `http://localhost:8000/admin/` for the admin interface.

## 🔐 Authentication System

### OTP-Based Authentication
- **Passwordless**: Users authenticate using email + OTP codes
- **Secure**: 6-digit codes with expiration and attempt limits
- **Rate Limited**: Protection against brute force attacks

### Authentication Flow
1. **Request OTP**: `POST /api/auth/request-otp/`
   ```json
   {"email": "user@example.com"}
   ```

2. **Verify OTP**: `POST /api/auth/verify-otp/`
   ```json
   {"email": "user@example.com", "otp_code": "123456"}
   ```

3. **Use Token**: Include in headers for API requests
   ```
   Authorization: Token <your-token-here>
   ```

### Rate Limiting
- **OTP Requests**: 10/hour per IP
- **OTP Verification**: 20/hour per IP
- **Login Attempts**: 30/hour per IP
- **API Calls**: 5000/day per user, 1000/day anonymous

## 📡 API Endpoints

### Core Resources

#### Devices
```
GET    /api/devices/           # List user's devices
POST   /api/devices/           # Create new device
GET    /api/devices/{id}/      # Get device details
PUT    /api/devices/{id}/      # Update device
DELETE /api/devices/{id}/      # Delete device
```

#### Reservoirs
```
GET    /api/reservoirs/        # List reservoirs
POST   /api/reservoirs/        # Create reservoir
GET    /api/reservoirs/{id}/   # Get reservoir details
PUT    /api/reservoirs/{id}/   # Update reservoir
DELETE /api/reservoirs/{id}/   # Delete reservoir
```

#### Sensors
```
GET    /api/sensors/           # List sensors
POST   /api/sensors/           # Create sensor
GET    /api/sensors/{id}/      # Get sensor details
PUT    /api/sensors/{id}/      # Update sensor
DELETE /api/sensors/{id}/      # Delete sensor

GET    /api/sensors/data/      # List sensor readings
POST   /api/sensors/data/      # Create sensor reading
```

### Authentication
```
POST   /api/auth/request-otp/  # Request OTP code
POST   /api/auth/verify-otp/   # Verify OTP & get token
```

### System
```
GET    /healthz               # Health check
GET    /api/health/           # Detailed health status
```

## 🔍 API Features

### Filtering & Search
All list endpoints support:
- **Filtering**: `?sensor_type=ph&device=1`
- **Search**: `?search=greenhouse`
- **Ordering**: `?ordering=-created_at`
- **Pagination**: Automatic (50 items per page)

### Example API Calls
```bash
# Get all pH sensors
curl "http://localhost:8000/api/sensors/?sensor_type=ph" \
     -H "Authorization: Token your-token"

# Search devices by name
curl "http://localhost:8000/api/devices/?search=greenhouse" \
     -H "Authorization: Token your-token"

# Get latest sensor readings
curl "http://localhost:8000/api/sensors/data/?ordering=-created_at" \
     -H "Authorization: Token your-token"
```

## 📊 Data Models

### Device
```python
{
    "id": 1,
    "device_name": "Greenhouse Alpha 1",
    "status": "active",  # active, inactive, maintenance, decommissioned
    "user": 1,
    "created_at": "2025-10-10T10:00:00Z",
    "updated_at": "2025-10-10T10:00:00Z"
}
```

### Sensor
```python
{
    "id": 1,
    "device": 1,
    "sensor_type": "ph",  # ph, tds, water_temperature, humidity, etc.
    "unit": "pH",
    "created_at": "2025-10-10T10:00:00Z"
}
```

### Sensor Data
```python
{
    "id": 1,
    "sensor": 1,
    "value": 6.5,
    "created_at": "2025-10-10T10:00:00Z"
}
```

### Reservoir
```python
{
    "id": 1,
    "device": 1,
    "reservoir_name": "Main Tank",
    "plant_type": "Lettuce",
    "start_date": "2025-01-15",
    "end_date": "2025-04-15"
}
```

## ⚙️ Configuration

### Environment Variables

#### Core Django
```bash
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=false                    # true for development
DJANGO_ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
```

#### Database
```bash
# Option 1: DATABASE_URL
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Option 2: Individual settings
DB_ENGINE=django.db.backends.postgresql
DB_NAME=smartanom
DB_USER=smartanom_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432
```

#### Email (Brevo SMTP example)
```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-username
SMTP_PASS=your-brevo-smtp-password
EMAIL_USE_TLS=true
DEFAULT_FROM_EMAIL=SmarTanom <noreply@yourdomain.com>
```

#### Security (Production)
```bash
SECURE_HSTS_SECONDS=31536000
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

#### OTP Configuration
```bash
OTP_EXPIRE_MINUTES=5                  # OTP code expiry
OTP_MAX_ATTEMPTS=3                    # Max verification attempts
OTP_RATE_LIMIT_MINUTES=15             # Rate limit window
OTP_RATE_LIMIT_ATTEMPTS=5             # Max requests in window
```

#### Rate Limiting
```bash
OTP_REQUEST_THROTTLE=10/hour          # OTP request limit
OTP_VERIFY_THROTTLE=20/hour           # OTP verify limit
LOGIN_ATTEMPT_THROTTLE=30/hour        # Login attempt limit
DRF_USER_THROTTLE=5000/day            # Authenticated user limit
DRF_ANON_THROTTLE=1000/day            # Anonymous user limit
```

### Media Storage (Cloudinary)

Enable CDN-backed media storage by setting `CLOUDINARY_URL`:

```bash
# Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
CLOUDINARY_URL=cloudinary://1234567890:abcDEFghiJKLmnopQRSTuvwx@mycloud
```

When this is set, the backend automatically switches `STORAGES["default"]` to use Cloudinary for MEDIA uploads while keeping static files served by WhiteNoise. See `backend/README_CLOUDINARY.md` for step-by-step setup and verification.

## 🛠️ Management Commands

### Generate Mock Data
```bash
# Default: 2 users, 2 devices each, 3 days of data
python manage.py seed_mock_data

# Custom configuration
python manage.py seed_mock_data \
    --users 5 \
    --devices-per-user 3 \
    --reservoirs-per-device 2 \
    --readings-per-sensor 48 \
    --days 7

# Clear existing data first
python manage.py seed_mock_data --clear
```

### Create Admin User
```bash
python manage.py createsuperuser
```

### Database Operations
```bash
python manage.py makemigrations     # Create new migrations
python manage.py migrate           # Apply migrations
python manage.py dbshell           # Open database shell
```

### System Checks
```bash
python manage.py check             # Basic system check
python manage.py check --deploy    # Production readiness check
```

## 🔒 Security Features

### Built-in Protection
- **OTP Authentication**: No passwords, time-limited codes
- **Rate Limiting**: Per-endpoint throttling
- **CORS Protection**: Configurable cross-origin policies
- **CSRF Protection**: Cross-site request forgery prevention
- **SQL Injection**: Django ORM protection
- **XSS Protection**: Template escaping and headers

### User Data Isolation
- **User Scoping**: Users only see their own data
- **Staff Override**: Admin users can access all data
- **Permission System**: Django's built-in permissions
- **Token Auth**: Secure API token authentication

### Production Security
- **HTTPS Enforcement**: SSL redirect and HSTS
- **Secure Cookies**: Production cookie settings
- **Security Headers**: XSS, content-type, frame protection
- **Environment Isolation**: Sensitive config via env vars

## 📈 Monitoring & Logging

### Health Checks
- **Basic**: `GET /healthz` - Simple OK/error status
- **Detailed**: `GET /api/health/` - Database connectivity

### Logging
- **File Logging**: `logs/django.log`
- **Console Output**: Development debugging
- **Structured Logs**: JSON-formatted for production
- **Log Levels**: Debug (dev) / Info (prod)

## � Deployment

### Local Development
Run the development server with:
```bash
python manage.py runserver
```

### Production Deployment
1. **Install dependencies**: `pip install -r requirements.txt`
2. **Set environment**: Copy and configure `.env`
3. **Database setup**: `python manage.py migrate`
4. **Static files**: `python manage.py collectstatic`
5. **WSGI server**: Use gunicorn, uwsgi, or similar
6. **Reverse proxy**: Nginx recommended for static files

### Environment Checklist
- [ ] `DEBUG=false` in production
- [ ] Strong `SECRET_KEY` set
- [ ] Database configured (PostgreSQL recommended)
- [ ] Email SMTP configured
- [ ] `ALLOWED_HOSTS` configured
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Monitoring and logging set up

## 🧪 Testing

### Run Tests
```bash
python manage.py test              # All tests
python manage.py test apps.devices # Specific app
```

### API Testing
```bash
# Health check
curl http://localhost:8000/healthz

# Authentication flow
curl -X POST http://localhost:8000/api/auth/request-otp/ \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
```

## ✉️ Unified OTP Email Templates

The backend ships with a single, unified OTP email design used across authentication flows (login, registration, reset) and a matching variant for device revocation.

Templates:
- `templates/emails/otp_email.html` and `templates/emails/otp_email.txt`
- `templates/emails/device_revoke_otp_email.html` and `templates/emails/device_revoke_otp_email.txt`

Context variables supported (optional unless noted):
- `code` / `otp` (required): the verification code
- `expiry_minutes` (int): minutes until code expires
- `site_name` (string): brand name (default `SmarTanom`)
- `site_logo_url` (string): absolute URL to logo (optional)
- `app_url` (string): CTA link destination (optional)
- `support_email` (string): support contact (optional)
- `request_ip`, `timestamp`, `year`: metadata (optional)

Preview the template with the current email backend:
```bash
python manage.py sendtestemail you@example.com --code 123456
```

## 📝 Development Notes

### Code Style
- **PEP 8**: Python style guide compliance
- **Type Hints**: Modern Python annotations
- **Docstrings**: Comprehensive documentation
- **Imports**: Organized with `__future__` imports

### Model Conventions
- **Constraints**: Database-level unique constraints
- **Indexes**: Performance-optimized queries
- **Validation**: Business logic in `clean()` methods
- **Relationships**: Proper foreign key relationships

### API Design
- **RESTful**: Standard HTTP methods and status codes
- **Consistent**: Uniform response formats
- **Filtered**: User data isolation
- **Paginated**: Scalable list responses

## 🤝 Contributing

1. Follow existing code style and conventions
2. Write tests for new features
3. Update documentation for API changes
4. Use meaningful commit messages
5. Test security implications of changes

## 📄 License

[Your license here]

## 🆘 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub issues for bug reports
- **Email**: [Your support email]

---

**SmarTanom Backend** - Powering smart hydroponic monitoring systems 🌱
