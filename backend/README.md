# SmarTanom Backend

Django REST API powering the SmarTanom hydroponic monitoring system.

## Stack
- Django 4.2
- Django REST Framework
- django-filter

## App: `monitoring`
Models:
- Device (per user; status choices)
- Reservoir (date validation)
- Sensor (enum types)
- SensorData (timestamped readings)

## Setup
Follow root `README.md` for environment + installation. Quick inline guide:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## API Endpoints (Router)
Base path: `/api/monitoring/`

| Resource | Endpoint | Methods |
|----------|----------|---------|
| Devices | /devices/ | GET, POST |
| Device Detail | /devices/{id}/ | GET, PUT, PATCH, DELETE |
| Reservoirs | /reservoirs/ | GET, POST |
| Sensors | /sensors/ | GET, POST |
| Sensor Data | /sensor-data/ | GET, POST |

Filtering examples:
```
/api/monitoring/sensors/?device=1
/api/monitoring/reservoirs/?plant_type=Lettuce
/api/monitoring/sensor-data/?sensor=5
```

Ordering examples:
```
/api/monitoring/devices/?ordering=device_name
/api/monitoring/sensor-data/?ordering=-created_at
```

## Tests
```powershell
python manage.py test apps.monitoring
```

## Future Enhancements
- Add JWT auth (SimpleJWT)
- Add CORS headers
- Add drf-spectacular for docs
- Add Celery for background anomaly detection

