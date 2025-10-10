# SmarTanom Development Setup Guide

## Local Development (Recommended for daily work)

### Port: 8000
### Database: SQLite (local file)
### Data: Your mock data with 5 devices including unowned device

**Start local development:**
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
# or
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Access:**
- Admin: http://127.0.0.1:8000/admin/
- API: http://127.0.0.1:8000/api/
- Login: smartanom01@gmail.com / smartanomadmin4r1

**Database:** `backend/db.sqlite3`
**Features:**
- 5 devices (4 owned + 1 unowned "Factory Floor Unit A")
- 40 sensors (8 per device)
- 960 sensor readings
- Fast startup, no dependencies

---

## Docker Development (For full-stack testing)

### Port: 8001 (different from local!)
### Database: PostgreSQL (containerized)
### Data: Fresh/empty database

**Start Docker development:**
```bash
docker-compose up --build
```

**Access:**
- Backend: http://127.0.0.1:8001/admin/
- Frontend: http://127.0.0.1:5173/
- API: http://127.0.0.1:8001/api/

**Database:** PostgreSQL container (fresh each time)
**Features:**
- Full-stack environment
- PostgreSQL + Redis
- Frontend + Backend integration
- Production-like setup

---

## ⚠️ IMPORTANT: Choose One Mode

**NEVER run both simultaneously!**

- **Local development** = Port 8000 + SQLite + Your data
- **Docker development** = Port 8001 + PostgreSQL + Fresh data

**To switch modes:**
1. Stop current mode (`Ctrl+C` for local, `docker-compose down` for Docker)
2. Start other mode
3. Access the correct port!

---

## Recommended Workflow

1. **Daily development**: Use local (port 8000)
2. **Testing integrations**: Use Docker (port 8001)
3. **Quick admin work**: Use local (port 8000)
4. **Frontend development**: Use Docker (port 8001)

---

## Troubleshooting

**Problem: "Port already in use"**
- Check: `netstat -ano | findstr :8000`
- Stop: Local Django server or Docker containers

**Problem: "Wrong data showing"**
- Check: Are you on the right port?
- Local = 8000, Docker = 8001

**Problem: "No devices in admin"**
- If local: Run `python manage.py seed_mock_data --unowned-devices 1`
- If Docker: Database is fresh, create superuser and data
