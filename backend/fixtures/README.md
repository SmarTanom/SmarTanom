# Sample Data Fixtures

This directory contains sample database data exported as Django fixtures that can be loaded into any SmarTanom instance.

## Files

### `sample_data.json`
Complete dataset including:
- Test users (`test1@smartanom.com`)
- Devices and reservoirs
- All 8 sensor types
- **192 sensor readings** (3 days of data)

### `structure_only.json`
Lightweight dataset with structure only:
- Test users and devices
- Sensor definitions
- **No sensor readings** (faster to load)

## Usage

### Option 1: Load Complete Data
```bash
# Clear existing and load full dataset
python manage.py load_sample_data --with-data --clear

# Or load just the structure
python manage.py load_sample_data --clear
```

### Option 2: Load via Django fixtures
```bash
# Load complete data
python manage.py loaddata fixtures/sample_data.json

# Load structure only
python manage.py loaddata fixtures/structure_only.json
```

### Option 3: Generate Fresh Data
```bash
# Generate new random data
python manage.py seed_mock_data --clear --users 1 --devices-per-user 1 --readings-per-sensor 24 --days 3
```

## What You Get

### 8 Sensor Types
1. **pH Sensor** → `ph` (pH)
2. **TDS Sensor** → `tds` (ppm)  
3. **Water Temperature** → `water_temperature` (°C)
4. **Water Level** → `water_level` (%)
5. **Turbidity** → `turbidity` (NTU)
6. **Air Temperature** → `air_temperature` (°C) [DHT22]
7. **Humidity** → `humidity` (%) [DHT22]
8. **Light** → `light` (lux) [BH1750]

### Test Account
- **Email**: `test1@smartanom.com`
- **Authentication**: Use OTP-based login via API

### API Endpoints
After loading data, test these endpoints:
- **Devices**: `GET /api/devices/`
- **Sensors**: `GET /api/sensors/`
- **Sensor Data**: `GET /api/sensors/{id}/data/`
- **Reservoirs**: `GET /api/reservoirs/`

## Regenerating Fixtures

If you modify the data and want to export new fixtures:

```bash
# Export complete data
python manage.py dumpdata accounts.User devices.Device reservoirs.Reservoir sensors.Sensor sensors.SensorData --indent 2 --output fixtures/sample_data.json

# Export structure only
python manage.py dumpdata accounts.User devices.Device reservoirs.Reservoir sensors.Sensor --indent 2 --output fixtures/structure_only.json
```

## Notes

- Fixtures are **version-controlled** and safe to commit to Git
- Database data is **portable** across different environments
- Sensor readings have **realistic values** for hydroponic systems
- Use `--clear` flag to avoid duplicate data when loading