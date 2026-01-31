# Seed January 2026 Data for Device SMRT-G6M-E0Q

This seeds sensor data for the entire month of January 2026 (Jan 1-29) for device `SMRT-G6M-E0Q`.

## 🚀 Quick Start (For Render Free Tier)

### Method 1: Using the HTML Page (Easiest)

1. Open `seed_jan2026.html` in your browser
2. Enter your Render backend URL (e.g., `https://your-backend.onrender.com`)
3. Click "Seed Data"
4. Done! ✅

### Method 2: Using curl/Postman

After deploying to Render, make a POST request:

```bash
curl -X POST https://your-backend.onrender.com/api/sensors/seed-jan2026/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_serial": "SMRT-G6M-E0Q",
    "readings_per_day": 8
  }'
```

### Method 3: Using JavaScript in Browser Console

Navigate to your frontend app and run in the browser console:

```javascript
fetch('https://your-backend.onrender.com/api/sensors/seed-jan2026/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_serial: 'SMRT-G6M-E0Q',
    readings_per_day: 8
  })
})
.then(r => r.json())
.then(data => console.log(data));
```

## What Gets Created

- **Date Range**: January 1, 2026 to January 29, 2026
- **Sensors**: pH, TDS, EC, Water Temperature, Water Level, Turbidity
- **Readings**: 8 readings per day per sensor (232 readings per sensor total = 1,392 total readings)
- **Data Types**:
  - **Normal values**: Most readings will be within optimal ranges
  - **Alert-triggering values**: ~25% of days will have critical readings that trigger alerts

## Sensor Ranges

### Normal Ranges (Optimal):
- **pH**: 5.8 - 6.5
- **TDS**: 800 - 1200 ppm
- **EC**: 1.2 - 2.0 mS/cm
- **Water Temp**: 18 - 24°C
- **Water Level**: 50 - 90%
- **Turbidity**: 5 - 20 NTU

### Critical Ranges (Will Trigger Alerts):
- **pH**: Low: 4.5-5.4, High: 7.0-8.0
- **TDS**: Low: 300-600 ppm, High: 1500-2000 ppm
- **EC**: Low: 0.5-0.9 mS/cm, High: 2.5-3.5 mS/cm
- **Water Temp**: Low: 10-15°C, High: 28-35°C
- **Water Level**: Low: 10-30%, High: 95-100%
- **Turbidity**: Low: 0-3 NTU, High: 50-100 NTU

## How to Run

### Option 1: Using the Shell Script (Recommended)

On Render, after deploying your backend:

```bash
# SSH into your Render instance or use Render Shell
cd /opt/render/project/src
./seed_jan2026.sh
```

### Option 2: Using Django Management Command Directly

```bash
python manage.py seed_jan2026_data --device-serial SMRT-G6M-E0Q --readings-per-day 8
```

### Option 3: Test Locally First (Dry Run)

```bash
# Test without writing to database
python manage.py seed_jan2026_data --device-serial SMRT-G6M-E0Q --dry-run
```

### Option 4: Custom Device Serial

```bash
# Use a different device
python manage.py seed_jan2026_data --device-serial YOUR-DEVICE-SERIAL --readings-per-day 8
```

## Command Options

- `--device-serial`: Device serial number (default: SMRT-G6M-E0Q)
- `--readings-per-day`: Number of readings per day per sensor (default: 8)
- `--dry-run`: Simulate without writing to database

## Important Notes

1. **Device Must Exist**: The device `SMRT-G6M-E0Q` must already exist in the database
2. **Sensors Auto-Created**: Sensors will be created if they don't exist
3. **Idempotent**: Safe to run multiple times (will create duplicate readings though)
4. **Signals Disabled**: Alert signals are temporarily disabled during seeding to avoid spam
5. **Data Persists**: Once seeded, data persists even after redeployment

## Running on Render After Deployment

After you redeploy your backend to Render:

1. Go to your Render dashboard
2. Navigate to your backend service
3. Click "Shell" to open a shell session
4. Run the command:
   ```bash
   python manage.py seed_jan2026_data --device-serial SMRT-G6M-E0Q
   ```

Alternatively, you can add this to your `render.yaml` as a one-time job or run it via SSH if you have that configured.

## Example Output

```
==========================================
Seeding data for device SMRT-G6M-E0Q (id=123)
Date range: Jan 1-29, 2026
Readings per day per sensor: 8
Dry run: False
==========================================

Successfully inserted 1392 sensor readings!
Date range: Jan 1-29, 2026
Device: SMRT-G6M-E0Q

Readings per sensor:
  ph: 232 readings
  tds: 232 readings
  ec: 232 readings
  water_temperature: 232 readings
  water_level: 232 readings
  turbidity: 232 readings

Note: Signals reconnected. Future saves will trigger alerts.
```

## Troubleshooting

**Device not found error**:
```
Device with serial SMRT-G6M-E0Q not found
```
Solution: Make sure the device exists in your database. Check with:
```bash
python manage.py shell
>>> from apps.devices.models import Device
>>> Device.objects.filter(device_serial='SMRT-G6M-E0Q').exists()
```

**Permission errors**:
Solution: Make sure you're running the command with proper database permissions.

**Timezone warnings**:
Solution: The command handles timezone conversion automatically using Django's timezone utilities.
