# SmarTanom Local Setup Guide

This guide explains how to run the SmarTanom full-stack application locally without Docker.

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** installed
- **Node.js 16+** and npm installed
- **PowerShell** (Windows) or bash (Linux/macOS)

---

## 🔧 Backend Setup (Django)

### 1. Navigate to Backend Directory
```powershell
cd backend
```

### 2. Create and Activate Virtual Environment
```powershell
# Create virtual environment
py -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables (Optional)
Create a `.env` file in the `backend/` directory:
```env
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**Note**: The backend uses SQLite by default for local development, so no database setup is required.

### 5. Run Database Migrations
```powershell
python manage.py migrate
```

### 6. Create Admin Superuser
```powershell
python manage.py createsuperuser
```
Follow the prompts to create your admin account.

### 7. (Optional) Seed Mock Data
```powershell
python manage.py seed_mock_data --readings-per-sensor 24 --days 3
```

### 8. Start Backend Server
```powershell
python manage.py runserver
```

The backend API will be available at: **http://127.0.0.1:8000**

- Admin Panel: http://127.0.0.1:8000/admin/
- API Root: http://127.0.0.1:8000/api/

---

## 🎨 Frontend Setup (React + Vite)

### 1. Navigate to Frontend Directory
Open a **new terminal window** and navigate to the frontend:
```powershell
cd frontend
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
The frontend `.env` file should already exist with:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

**Verify** this file exists at `frontend/.env`. If not, create it with the above content.

### 4. Start Frontend Development Server
```powershell
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

## ✅ Verification & Testing

### 1. Test Backend API
Open your browser and visit:
- Health Check: http://127.0.0.1:8000/healthz
- Admin Panel: http://127.0.0.1:8000/admin/

### 2. Test Frontend
Open your browser and visit:
- Frontend App: http://localhost:5173

### 3. Test Frontend-Backend Communication
1. Log in to the frontend with your admin credentials
2. Navigate to the Admin Dashboard
3. Check that devices, users, and stats load correctly
4. No console errors should appear in the browser developer tools

---

## 🔑 Admin Features

### Device Management
1. **View All Devices**: Admin dashboard shows all devices (bound and unbound)
2. **Device Details with QR Code**:
   - Click "View Details" on any device
   - See QR code for device registration
   - Download QR code as PNG image
3. **Bind Device to User**:
   - Open device details modal
   - Click "Bind Device to User"
   - Enter user email and submit
   - Creates user account if it doesn't exist
4. **Unbind Device**:
   - Open device details for a bound device
   - Click "Unbind Device"
   - Confirm the action
5. **View Collaborators**:
   - Device details modal shows all users who have shared access
   - Displays owner and collaborators with their permission levels

### API Endpoints for Admin

#### Bind Device to User
```bash
POST /api/devices/{device_id}/admin-bind/
Authorization: Token {admin-token}
Content-Type: application/json

{
  "email": "user@example.com",
  "device_name": "Optional Device Name"
}
```

#### Unbind Device
```bash
POST /api/devices/{device_id}/admin-unbind/
Authorization: Token {admin-token}
```

#### Get Device Collaborators
```bash
GET /api/devices/{device_id}/collaborators/
Authorization: Token {token}
```

---

## 🛠️ Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```powershell
# Find and kill the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Database errors:**
```powershell
# Delete database and recreate
Remove-Item db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

**Import errors:**
```powershell
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend Issues

**Port 5173 already in use:**
```powershell
# Kill the process and restart
npm run dev
```

**Module not found errors:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

**QR Code not showing:**
- Make sure `qrcode.react` is installed: `npm list qrcode.react`
- If missing: `npm install qrcode.react`

**API connection errors:**
1. Verify backend is running on port 8000
2. Check `frontend/.env` has correct `VITE_API_BASE_URL`
3. Check browser console for CORS errors
4. Verify Django CORS settings allow `http://localhost:5173`

### CORS Issues

If you see CORS errors in the browser console:

1. Verify `django-cors-headers` is installed:
   ```powershell
   pip show django-cors-headers
   ```

2. Check `backend/smartanom/settings.py`:
   - `corsheaders` is in `INSTALLED_APPS`
   - `corsheaders.middleware.CorsMiddleware` is in `MIDDLEWARE` (should be near the top)
   - In DEBUG mode, `CORS_ALLOW_ALL_ORIGINS = True`

---

## 📦 Production Build

### Backend
```powershell
# Set environment variables for production
$env:DJANGO_DEBUG="false"
$env:DJANGO_SECRET_KEY="your-production-secret-key"
$env:ALLOWED_HOSTS="yourdomain.com"

# Collect static files
python manage.py collectstatic --noinput

# Use gunicorn or similar WSGI server
pip install gunicorn
gunicorn smartanom.wsgi:application --bind 0.0.0.0:8000
```

### Frontend
```powershell
# Build for production
npm run build

# Output will be in dist/ folder
# Serve with nginx or similar web server
```

---

## 📝 Development Workflow

### Daily Development
1. **Start Backend**: `cd backend && .\.venv\Scripts\Activate.ps1 && python manage.py runserver`
2. **Start Frontend**: `cd frontend && npm run dev` (in new terminal)
3. **Make Changes**: Edit code with hot reload enabled
4. **Test**: Verify changes in browser at http://localhost:5173

### Making Backend Changes
- Models: Run `python manage.py makemigrations` then `python manage.py migrate`
- Views/Serializers: Changes take effect immediately (auto-reload)
- Settings: Restart the Django server

### Making Frontend Changes
- Components/Pages: Hot reload happens automatically
- Environment Variables: Restart the Vite dev server
- Dependencies: Run `npm install` then restart

---

## 🔒 Security Notes

- **Never commit** `.env` files to version control
- Use strong `SECRET_KEY` in production
- Set `DEBUG=false` in production
- Configure proper `ALLOWED_HOSTS` in production
- Use HTTPS in production
- Enable Django's security middleware in production

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)

---

## 🆘 Getting Help

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review backend logs in terminal
3. Check browser console for frontend errors
4. Verify all dependencies are installed
5. Ensure both backend and frontend are running

---

**Happy Coding! 🌱**
