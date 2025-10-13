# 🌱 SmarTanom - Smart Aquaponics Monitoring System

A modern full-stack web application for monitoring and managing smart aquaponics systems with real-time sensor data, push notifications, and Progressive Web App (PWA) capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
  - [Backend Setup](#backend-setup-django)
  - [Frontend Setup](#frontend-setup-react-vite-pwa)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Push Notifications Setup](#push-notifications-setup)
- [Building for Production](#building-for-production)
- [Authentication System](#authentication-system)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

SmarTanom is a comprehensive monitoring solution for smart aquaponics systems. It provides real-time data visualization, automatic alerts when sensor readings exceed thresholds, and mobile-friendly Progressive Web App functionality for monitoring on any device.

### Key Capabilities

- **Real-time Monitoring**: Track pH, TDS, water level, temperature, turbidity, light, and humidity
- **Automatic Alerts**: Push notifications when sensor readings breach thresholds
- **Multi-Device Support**: Bind and monitor multiple aquaponics devices per user
- **Passwordless Authentication**: Secure email-based OTP (One-Time Password) login
- **PWA**: Install on mobile/desktop for app-like experience
- **Offline Support**: Service worker caching for offline functionality
- **Photo Management**: Upload and manage plant/device photos

---

## ✨ Features

### 🌊 Monitoring
- Real-time sensor data visualization with charts
- Historical data trends and analytics
- Customizable monitoring dashboards
- Device and reservoir management

### 🔔 Notifications
- Web Push notifications (works even when browser is closed)
- Automatic alerts based on sensor thresholds
- Customizable alert levels (critical, warning, info)
- Notification history and logs

### 🔐 Security
- Passwordless authentication via email OTP
- Token-based API authentication
- Rate limiting and throttling
- CORS and CSRF protection
- Secure session management

### 📱 Progressive Web App
- Install on any device (iOS, Android, Desktop)
- Offline functionality with service worker
- App-like experience with manifest
- Background sync capabilities

---

## 🛠 Tech Stack

### Backend
- **Framework**: Django 4.2+ & Django REST Framework
- **Database**: PostgreSQL / SQLite (development)
- **Authentication**: Custom email OTP system + DRF Token Auth
- **Push Notifications**: pywebpush + Web Push API
- **Email**: SMTP (Gmail/custom) or console backend (dev)

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: CSS Modules + Tailwind CSS (optional)
- **Icons**: Lucide React
- **Charts**: Chart.js / Recharts
- **PWA**: vite-plugin-pwa with Workbox
- **HTTP Client**: Axios
- **State Management**: React Context API

### DevOps
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (production)
- **Process Manager**: Supervisor (optional)

---

## 📁 Project Structure

```
SmarTanom/
├── backend/                    # Django REST API
│   ├── apps/                   # Django applications
│   │   ├── accounts/          # User authentication (OTP)
│   │   ├── devices/           # Device management
│   │   ├── notifications/     # Push notifications
│   │   ├── sensors/           # Sensor data & alerts
│   │   └── reservoirs/        # Reservoir management
│   ├── smartanom/             # Django project settings
│   ├── templates/             # Email templates
│   ├── media/                 # User-uploaded files
│   ├── logs/                  # Application logs
│   ├── manage.py              # Django management script
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
│
├── frontend/                   # React Vite PWA
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── contexts/          # React contexts
│   │   ├── utils/             # Utility functions
│   │   ├── sw.js              # Service worker
│   │   └── main.jsx           # Entry point
│   ├── public/                # Static assets
│   ├── dist/                  # Production build
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   └── .env.example           # Environment template
│
├── docker/                     # Docker configurations
├── firmware/                   # ESP32 firmware (Arduino)
├── mobile/                     # React Native app (optional)
├── docker-compose.yml         # Development stack
├── docker-compose.prod.yml    # Production stack
└── README.md                  # This file
```

---

## 📦 Prerequisites

### Required Software

- **Python**: 3.11+ (3.13 recommended)
- **Node.js**: 18+ (20 LTS recommended)
- **npm**: 9+ or **yarn**: 1.22+
- **Git**: Latest version

### Optional (for production)

- **PostgreSQL**: 14+ (development uses SQLite)
- **Redis**: 7+ (for Celery tasks, optional)
- **Docker**: 24+ with Docker Compose (for containerized deployment)

### System Requirements

- **OS**: Windows 10/11, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk**: 2GB free space

---

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```powershell
# Clone repository
git clone https://github.com/yourusername/smartanom.git
cd smartanom

# Run quick start script
.\start-local.ps1
```

**macOS/Linux:**
```bash
# Clone repository
git clone https://github.com/yourusername/smartanom.git
cd smartanom

# Make script executable and run
chmod +x start-local.sh
./start-local.sh
```

### Option 2: Manual Setup

```powershell
# 1. Clone repository
git clone https://github.com/yourusername/smartanom.git
cd smartanom

# 2. Backend setup
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows
# source .venv/bin/activate          # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# 3. Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/

---

## 📝 Detailed Setup

### Backend Setup (Django)

#### 1. Create Virtual Environment

```powershell
# Windows
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# macOS/Linux
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

#### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
# Minimum required:
# - SECRET_KEY (generate new one)
# - DEBUG=true
# - ALLOWED_HOSTS=localhost,127.0.0.1
```

**Generate SECRET_KEY:**
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 4. Generate VAPID Keys (for Push Notifications)

```bash
python manage.py generate_vapid_keys
```

Copy the output keys to your `.env` file.

#### 5. Run Migrations

```bash
python manage.py migrate
```

#### 6. Create Superuser

```bash
python manage.py createsuperuser
# Follow prompts (uses email, no password needed)
```

#### 7. Start Development Server

```bash
python manage.py runserver
```

Backend is now running at http://localhost:8000

---

### Frontend Setup (React Vite PWA)

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file:
# VITE_API_BASE_URL=http://127.0.0.1:8000
```

#### 3. Start Development Server

```bash
npm run dev
```

Frontend is now running at http://localhost:5173

#### 4. Build for Production

```bash
npm run build
```

#### 5. Preview Production Build

```bash
npm run preview
```

Production preview at http://localhost:4173

---

## ⚙️ Environment Configuration

### Backend Environment Variables

See `backend/.env.example` for full list. Key variables:

```env
# Core Django
SECRET_KEY=your-secret-key
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (SQLite for dev)
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3

# Push Notifications
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_ADMIN_EMAIL=admin@yourdomain.com

# Email (console for dev, SMTP for prod)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Frontend Environment Variables

See `frontend/.env.example` for full list. Key variables:

```env
# API Configuration
VITE_API_BASE_URL=http://127.0.0.1:8000

# PWA Configuration
VITE_APP_NAME=SmarTanom
VITE_THEME_COLOR=#10b981
```

---

## 🏃 Running the Application

### Development Mode

**Start both servers simultaneously:**

Terminal 1 (Backend):
```bash
cd backend
.\.venv\Scripts\Activate.ps1  # Windows
python manage.py runserver
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Production Mode

#### Using Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up --build
```

#### Manual Production Deployment

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
gunicorn smartanom.wsgi:application --bind 0.0.0.0:8000
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or serve
npm install -g serve
serve -s dist -l 3000
```

---

## 🔔 Push Notifications Setup

### Overview

SmarTanom uses Web Push API for real-time browser notifications. Users receive alerts even when the app is closed.

### Backend Setup

1. **Generate VAPID Keys** (if not done already):
   ```bash
   python manage.py generate_vapid_keys
   ```

2. **Add Keys to Environment**:
   ```env
   VAPID_PUBLIC_KEY=BCI2Xv7XAWw...
   VAPID_PRIVATE_KEY=DR6BvsEKOyF...
   VAPID_ADMIN_EMAIL=admin@yourdomain.com
   ```

3. **Verify Installation**:
   ```bash
   python -c "import pywebpush, cryptography; print('Push notifications ready!')"
   ```

### Frontend Setup

1. **Service Worker**: Automatically configured via `vite-plugin-pwa`

2. **Enable Notifications**: Users enable in Profile page → Push Notifications section

3. **Testing**:
   - Go to http://localhost:5173/profile
   - Click "Enable Notifications"
   - Allow browser permission
   - Trigger sensor alert by creating data that breaches thresholds

### How It Works

1. User enables notifications → Creates push subscription
2. Subscription stored in database linked to user
3. Sensor data saved → Django signal checks thresholds
4. If threshold breached → Push notification sent to user's devices
5. Service worker displays notification even if browser closed

### Supported Browsers

- ✅ Chrome/Edge 90+
- ✅ Firefox 90+
- ✅ Safari 16+ (iOS 16.4+)
- ✅ Opera 76+
- ❌ Internet Explorer (not supported)

---

## 🏗️ Building for Production

### Backend Production Build

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment to production
export DEBUG=false  # or set in .env
export ALLOWED_HOSTS=yourdomain.com

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Start with gunicorn
gunicorn smartanom.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Frontend Production Build

```bash
cd frontend

# Install dependencies
npm install

# Create production environment
cp .env.example .env.production
# Edit .env.production with production values

# Build
npm run build

# Output in dist/ folder
# Serve with nginx, Apache, or CDN
```

### Using Docker

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up --build -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

---

## 🔐 Authentication System

### Passwordless Email OTP

SmarTanom uses a modern passwordless authentication system:

1. **Request OTP**: User enters email → Backend sends 6-digit code
2. **Verify OTP**: User enters code → Backend validates and creates token
3. **Token Auth**: Frontend stores auth token → Includes in API requests

### API Authentication Flow

```javascript
// 1. Request OTP
POST /api/auth/request-otp/
Body: { "email": "user@example.com" }

// 2. Verify OTP
POST /api/auth/verify-otp/
Body: { "email": "user@example.com", "code": "123456" }
Response: { "token": "abc123...", "user": {...} }

// 3. Use Token
GET /api/devices/
Headers: { "Authorization": "Token abc123..." }
```

### Security Features

- ✅ Rate limiting (prevents brute force)
- ✅ OTP expiration (5 minutes default)
- ✅ Maximum attempts (5 tries per OTP)
- ✅ Cooldown periods (15 minutes after rate limit)
- ✅ HTTPS only in production
- ✅ Secure cookies

---

## 📚 API Documentation

### Base URL
- Development: `http://localhost:8000/api/`
- Production: `https://yourdomain.com/api/`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/request-otp/` | Request OTP code |
| POST | `/auth/verify-otp/` | Verify OTP and get token |
| POST | `/auth/logout/` | Logout user |

### Device Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/devices/` | List user's devices |
| POST | `/devices/` | Create new device |
| GET | `/devices/{id}/` | Get device details |
| PATCH | `/devices/{id}/` | Update device |
| DELETE | `/devices/{id}/` | Delete device |

### Sensor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sensors/` | List sensors |
| GET | `/sensors/data/` | Get sensor readings |
| POST | `/sensors/data/` | Create sensor reading |

### Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications/subscriptions/vapid_public_key/` | Get VAPID public key |
| POST | `/notifications/subscriptions/subscribe/` | Subscribe to push notifications |
| POST | `/notifications/subscriptions/unsubscribe/` | Unsubscribe |
| GET | `/notifications/logs/` | Get notification history |

---

## 🐛 Troubleshooting

### Common Issues

#### 1. HTTP 401 Unauthorized (VAPID Key Fetch)

**Problem**: Frontend can't fetch VAPID public key

**Solution**:
- Ensure user is logged in
- Check auth token is stored: `localStorage.getItem('authToken')`
- Verify token is sent in request headers
- Check backend CORS settings allow credentials

**Fix in frontend**:
```javascript
// Ensure token is included
const token = localStorage.getItem('authToken');
const response = await fetch('/api/notifications/subscriptions/vapid_public_key/', {
  headers: {
    'Authorization': `Token ${token}`
  }
});
```

#### 2. Push Notifications Not Working

**Checklist**:
- ✅ VAPID keys generated and in .env
- ✅ Backend running with pywebpush installed
- ✅ Frontend built (service worker only works in production build)
- ✅ User clicked "Enable Notifications" and allowed browser permission
- ✅ HTTPS enabled (required in production)

**Test**:
```bash
# Backend: Check if keys are loaded
python manage.py shell
>>> from django.conf import settings
>>> print(settings.VAPID_PUBLIC_KEY)
```

#### 3. CORS Errors

**Problem**: Frontend can't connect to backend

**Solution**:
- Add frontend URL to `CORS_ALLOWED_ORIGINS` in backend .env
- Ensure `CORS_ALLOW_CREDENTIALS=True`
- Check `ALLOWED_HOSTS` includes backend domain

**Backend .env**:
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
ALLOWED_HOSTS=localhost,127.0.0.1
```

#### 4. Database Migration Errors

**Problem**: `python manage.py migrate` fails

**Solution**:
```bash
# Delete all migrations and recreate
python manage.py migrate --fake-initial

# Or reset database (development only!)
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

#### 5. Service Worker Not Updating

**Problem**: Changes not reflecting after rebuild

**Solution**:
```bash
# Hard refresh in browser
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (macOS)

# Or clear service workers manually:
# Chrome DevTools → Application → Service Workers → Unregister
```

#### 6. Module Not Found Errors (Backend)

**Problem**: Python imports failing

**Solution**:
```bash
# Ensure virtual environment is activated
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate     # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

#### 7. Unicode Encoding Error (Windows Console)

**Problem**: Emoji in logs crash backend on Windows

**Solution**: Already fixed! Emojis replaced with ASCII in logger calls. If you still see this:
```bash
# Use file logging instead of console
# In settings.py, logs go to backend/logs/django.log
```

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/yourusername/smartanom/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/smartanom/discussions)
- **Email**: support@smartanom.com

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- **Python**: Follow PEP 8, use Black formatter
- **JavaScript**: Follow ESLint config, use Prettier
- **Commits**: Use conventional commits (feat:, fix:, docs:, etc.)

### Testing

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Django REST Framework team
- React and Vite communities
- Web Push API contributors
- All open-source libraries used in this project

---

## 📧 Contact

- **Project Link**: https://github.com/yourusername/smartanom
- **Email**: contact@smartanom.com
- **Website**: https://smartanom.com

---

**Made with ❤️ by the SmarTanom Team**
