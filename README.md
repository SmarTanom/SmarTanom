<h1 align="center">SmarTanom</h1>

Smart hydroponic monitoring & analytics platform.

## Repositories Structure

```
backend/   # Django REST API (devices, sensors, reservoirs, sensor data)
frontend/  # Web client (placeholder)
mobile/    # Mobile app (placeholder)
```

## Quick Start (Backend API)

Requirements:
- Python 3.11+
- PowerShell (Windows) or bash (Linux/macOS)

### 1. Create Virtual Environment & Install Dependencies

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Environment Variables (Optional)
Create a `.env` file in `backend/` (optional) if you want to override defaults:
```
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
```
(If you add `.env` support later, integrate with `python-dotenv` or similar.)

### 3. Run Migrations & Create Superuser
```powershell
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 4. Start Development Server
```powershell
python manage.py runserver
```
Visit:
- API Root (monitoring): `http://127.0.0.1:8000/api/monitoring/`
- Health Check: `http://127.0.0.1:8000/api/health/`
- Admin: `http://127.0.0.1:8000/admin/`

### 5. Sample API Usage (After Login via Browsable API / Session Auth)
Create a device:
```powershell
curl -u username:password -H "Content-Type: application/json" ^
	-d '{"user_id":1,"device_name":"Primary Unit"}' ^
	http://127.0.0.1:8000/api/monitoring/devices/
```

List sensors:
```powershell
curl -u username:password http://127.0.0.1:8000/api/monitoring/sensors/
```

### 6. Running Tests
```powershell
python manage.py test apps.monitoring
```

## Data Model (Conceptual)

User → Device → (Reservoir, Sensor) → SensorData

Key constraints:
- Unique device name per user
- Unique (device, sensor_type, unit) per sensor
- Unique reservoir name per device

## Project Conventions
- Pinned versions in `requirements.txt`
- REST API: DRF ViewSets + router
- Filtering: `django-filter`
- Pagination: DRF page-number (50/page)
- Security toggles auto-adjust when `DJANGO_DEBUG=false`

## Adding Features Next
- CORS: add `django-cors-headers`
- JWT auth: add `djangorestframework-simplejwt`
- OpenAPI docs: add `drf-spectacular`
- CI/CD: add GitHub Actions workflow for tests & lint

## Frontend & Mobile (Placeholder)
The `frontend/` and `mobile/` directories are scaffolds; integrate them with the API endpoints once the domain logic stabilizes.

## License
Add licensing information here (MIT / Apache 2.0 / Proprietary). Currently unspecified.
