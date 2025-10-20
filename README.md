# SmartAnom Backend — Setup & Deploy

This document describes how to run the SmartAnom Django backend locally and deploy it to Render with Brevo (SMTP) for email and Channels (WebSockets) support.

## Quick environment

- Backend (Django + Channels + Daphne)
- Frontend (Vite) runs separately at `http://localhost:5173`
- Postgres on Render configured via `DATABASE_URL`
- Brevo SMTP for email delivery

## Files added/changed

- `smartanom/settings.py` — updated for Render/Postgres, Brevo SMTP, Channels, CORS
- `.env.example` — environment variable example
- `Procfile` — runs Daphne on Render
- `requirements.txt` — packages required for deployment
- `apps/accounts/apps.py` — auto-create superuser on deploy (post_migrate)

## Local setup

1. Create and activate a virtualenv (Windows PowerShell):

```powershell
py -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and set values. For local dev you can use DEBUG=true and console email backend.

3. Run migrations and create static files:

```powershell
python backend/manage.py migrate
python backend/manage.py collectstatic --noinput
python backend/manage.py runserver
```

4. Start frontend (in the `frontend/` folder):

```powershell
cd frontend
npm install
npm run dev
```

## Render deploy notes

1. Create a new Web Service on Render and connect to this repository.

2. Set build and start commands in Render:

- Build command: `pip install -r requirements.txt && python backend/manage.py migrate --noinput && python backend/manage.py collectstatic --noinput`
- Start command (Procfile is supported): `daphne -b 0.0.0.0 -p $PORT smartanom.asgi:application`

3. Set environment variables on Render (at minimum):

- `DATABASE_URL` — your Render Postgres URL
SMTP (Brevo):
- `SMTP_HOST=smtp-relay.brevo.com`
- `SMTP_PORT=587`
- `SMTP_USER=your-brevo-smtp-username`
- `SMTP_PASS=your-brevo-smtp-password`
- `DEFAULT_FROM_EMAIL=SmarTanom <noreply@yourdomain.com>`
- `DEFAULT_FROM_EMAIL` — e.g. "SmartAnom System <smartanom01@gmail.com>"
- `SUPERUSER_EMAIL`, `SUPERUSER_USERNAME`, `SUPERUSER_PASSWORD` — credentials to auto-create superuser
- `REDIS_URL` — (optional) Redis URL for Channels in production

4. Ensure `RENDER_EXTERNAL_URL` (provided by Render) is present — settings will auto-append it to `ALLOWED_HOSTS` and CSRF trusted origins.

## WebSockets / Channels

- WebSocket entrypoint: `wss://<your-deploy-domain>/ws/` (ensure the frontend uses `wss://` when deployed)
- `smartanom/asgi.py` is configured to route WebSocket connections through Channels using `AuthMiddlewareStack` and `AllowedHostsOriginValidator`.
- For multi-worker (production) you must provide `REDIS_URL` and channels_redis will be used for channel layers.

## Email / OTP (SMTP: Brevo)

- The project uses Django's SMTP EmailBackend. Configure Brevo SMTP via environment variables (see above). For local testing you can keep `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` to print emails to the console.

## Auto-create superuser

- On each deploy/migrate, a post-migrate hook creates the superuser specified by `SUPERUSER_EMAIL`, `SUPERUSER_USERNAME`, and `SUPERUSER_PASSWORD` if it does not already exist.

## Testing endpoints

- Health: `/healthz` (DB + basic checks)
- Auth endpoints: `/api/auth/request-otp/` and `/api/auth/verify-otp/` (see `apps/accounts/`)

## Troubleshooting

- If WebSockets fail on Render, confirm that:
  - `REDIS_URL` is set and reachable
  - `ASGI_APPLICATION` is pointing to `smartanom.asgi.application`
  - Deploy domain is included in `CSRF_TRUSTED_ORIGINS`

## Notes

- CORS is permissive in DEBUG for local frontend use. Lock this down for production by setting `CORS_ALLOW_ALL_ORIGINS=false` and providing `CORS_ALLOWED_ORIGINS`.
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
python -m venv .venv
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
- API Endpoints:
  - Devices: `http://127.0.0.1:8000/api/devices/`
  - Sensors: `http://127.0.0.1:8000/api/sensors/`
  - Reservoirs: `http://127.0.0.1:8000/api/reservoirs/`
- Health Check: `http://127.0.0.1:8000/api/health/`
- Admin: `http://127.0.0.1:8000/admin/`

### 5. Sample API Usage (After Authentication)

First, get an authentication token via OTP:
```powershell
# Request OTP
curl -H "Content-Type: application/json" ^
	-d '{"email":"your-email@example.com"}' ^
	http://127.0.0.1:8000/api/auth/request-otp/

# Verify OTP (check your email for the code)
curl -H "Content-Type: application/json" ^
	-d '{"email":"your-email@example.com","otp_code":"123456"}' ^
	http://127.0.0.1:8000/api/auth/verify-otp/
```

Use the returned token for API calls:
```powershell
# Create a device
curl -H "Authorization: Token your-token-here" ^
     -H "Content-Type: application/json" ^
     -d '{"device_name":"Primary Greenhouse"}' ^
     http://127.0.0.1:8000/api/devices/

# List sensors
curl -H "Authorization: Token your-token-here" ^
     http://127.0.0.1:8000/api/sensors/
```

### 6. Generate Mock Data & Running Tests
```powershell
# Generate sample data for development
python manage.py seed_mock_data --readings-per-sensor 24 --days 3

# Run tests
python manage.py test
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
