# SmarTanom Quick Reference

## 🚀 Start Development Environment

### Terminal 1 - Backend (Django)
```powershell
cd c:\Users\Rodillon\Desktop\SmarTanom\backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```
**Backend runs at**: http://127.0.0.1:8000

### Terminal 2 - Frontend (React + Vite)
```powershell
cd c:\Users\Rodillon\Desktop\SmarTanom\frontend
npm run dev
```
**Frontend runs at**: http://localhost:5173

---

## 🔑 Important URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend App | http://localhost:5173 | Main application |
| Backend API | http://127.0.0.1:8000/api/ | REST API endpoints |
| Admin Panel | http://127.0.0.1:8000/admin/ | Django admin |
| Health Check | http://127.0.0.1:8000/healthz | Server status |

---

## 🔧 Common Commands

### Backend (Django)
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Seed mock data
python manage.py seed_mock_data --readings-per-sensor 24 --days 3

# Run tests
python manage.py test

# Start server
python manage.py runserver
```

### Frontend (React + Vite)
```powershell
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 New Admin Features

### Device Details with QR Code
1. Navigate to Admin Dashboard → Devices
2. Click "View Details" on any device
3. See QR code + device info
4. Click "Download QR Code" to save as PNG

### Bind Device to User
1. Open device details modal
2. Click "Bind Device to User"
3. Enter user email
4. Submit form
   - Creates user if doesn't exist
   - Binds device to user

### Unbind Device
1. Open device details for bound device
2. Click "Unbind Device"
3. Confirm action

### View Collaborators
1. Open device details
2. Scroll to "Shared With" section
3. See list of all collaborators

---

## 🔌 API Endpoints

### Admin Device Management
```bash
# Bind device to user (admin only)
POST /api/devices/{id}/admin-bind/
Authorization: Token {admin-token}
Content-Type: application/json
{
  "email": "user@example.com"
}

# Unbind device (admin only)
POST /api/devices/{id}/admin-unbind/
Authorization: Token {admin-token}

# Get device collaborators
GET /api/devices/{id}/collaborators/
Authorization: Token {token}
```

### Device Endpoints
```bash
GET  /api/devices/              # List all devices
GET  /api/devices/{id}/         # Get device details
POST /api/devices/              # Create device (admin)
PUT  /api/devices/{id}/         # Update device
DELETE /api/devices/{id}/       # Delete device
```

---

## 🐛 Troubleshooting

### Backend Not Starting
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F

# Restart server
python manage.py runserver
```

### Frontend Not Starting
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
Remove-Item -Recurse -Force node_modules
npm install

# Start server
npm run dev
```

### CORS Errors
- Verify backend is running on port 8000
- Check `frontend/.env` has `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Verify Django settings have `CORS_ALLOW_ALL_ORIGINS = True` (in DEBUG mode)

### QR Code Not Showing
```powershell
cd frontend
npm install qrcode.react
npm run dev
```

---

## 📦 Dependencies

### Backend (Python)
- Django 4.2+
- djangorestframework
- django-cors-headers
- django-filter
- python-dotenv

### Frontend (Node.js)
- React 18
- Vite
- qrcode.react (for QR generation)
- lucide-react (icons)
- react-router-dom

---

## 🔒 Security Notes

- Admin endpoints require staff permissions
- All API endpoints require authentication (except auth endpoints)
- Tokens stored in localStorage
- CORS configured for local development
- SQLite database in development (switch to PostgreSQL for production)

---

## 📝 Environment Variables

### Backend (.env)
```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🎨 Project Structure

```
SmarTanom/
├── backend/                # Django REST API
│   ├── apps/              # Django applications
│   │   ├── accounts/      # User authentication
│   │   ├── devices/       # Device management
│   │   ├── sensors/       # Sensor data
│   │   ├── reservoirs/    # Reservoir management
│   │   └── common/        # Shared utilities
│   ├── smartanom/         # Project settings
│   ├── manage.py          # Django CLI
│   └── requirements.txt   # Python dependencies
│
├── frontend/              # React + Vite app
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API clients
│   │   └── assets/        # Static assets
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
│
├── LOCAL_SETUP_GUIDE.md   # Complete setup guide
├── UPDATE_SUMMARY.md      # Changes documentation
└── README.md              # Project overview
```

---

## 📞 Support

For issues or questions:
1. Check `LOCAL_SETUP_GUIDE.md` for detailed instructions
2. Review `UPDATE_SUMMARY.md` for recent changes
3. Check browser console for errors
4. Verify both backend and frontend are running

---

**Version**: 2.0 (Docker-free)
**Last Updated**: 2025-10-14
