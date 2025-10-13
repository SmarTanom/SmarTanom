# 🎉 Automatic Sensor Alert Integration - Complete!

## What Was Done

I've integrated the push notification system with your existing sensor monitoring to **automatically send push notifications when sensor readings breach thresholds**.

### Changes Made

#### 1. **Alert Detection Service** (`backend/apps/sensors/alert_service.py`)
- Created `SensorAlertService` class
- Implements threshold checking for all sensor types
- Matches thresholds from your frontend (`AlertsPage.jsx`, `DeviceDetails.jsx`, `Dashboard.jsx`)
- Automatically sends push notifications when thresholds breached

**Supported Sensors:**
- ✅ pH (critical: < 5.5 or > 6.5)
- ✅ TDS (critical: < 800 or > 1500 ppm, warning: 800-999 and 1301-1500)
- ✅ Water Level (critical: 0%, warning: ≤ 40%)
- ✅ Air Temperature (warning: < 18°C or > 26°C)
- ✅ Turbidity (critical: < 1800, warning: 1800-2100)
- ✅ Light (critical: > 1500 lux)
- ✅ Humidity (warning: < 50% or > 70%)

#### 2. **Django Signal** (`backend/apps/sensors/signals.py`)
- Added `post_save` signal on `SensorData` model
- Automatically triggers alert check when new sensor data is saved
- Non-blocking: Errors don't prevent sensor data from being saved

#### 3. **Signal Registration** (`backend/apps/sensors/apps.py`)
- Updated `SensorsConfig.ready()` to import signal handlers
- Ensures signals are registered when Django starts

#### 4. **Documentation**
- Created `AUTOMATIC_SENSOR_ALERTS.md` - Complete guide to automatic alerts
- Updated `TESTING_PUSH_NOTIFICATIONS.md` - Added automatic alerts testing section
- Created `test_automatic_alerts.py` - Automated testing script

---

## How It Works

### Flow Diagram

```
┌──────────────┐
│  ESP32 or    │
│  API Call    │
└──────┬───────┘
       │ POST /api/sensor-data/
       ▼
┌──────────────────────┐
│  Django REST API     │
│  SensorDataViewSet   │
│  .perform_create()   │
└──────┬───────────────┘
       │
       │ Save SensorData instance
       ▼
┌──────────────────────┐
│  Database            │
│  SensorData created  │
└──────┬───────────────┘
       │
       │ post_save signal fires
       ▼
┌────────────────────────────┐
│  signals.py                │
│  check_sensor_alerts()     │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  SensorAlertService        │
│  .check_and_notify()       │
│  - Check thresholds        │
│  - Detect alert severity   │
└──────┬─────────────────────┘
       │
       │ If threshold breached
       ▼
┌────────────────────────────┐
│  PushNotificationService   │
│  .send_alert_notification()│
│  - Find user subscriptions │
│  - Send Web Push API call  │
│  - Log to NotificationLog  │
└──────┬─────────────────────┘
       │
       ▼ Web Push Protocol
┌────────────────────────────┐
│  User's Browser            │
│  Service Worker (sw.js)    │
│  - Receive push event      │
│  - Display notification    │
└────────────────────────────┘
```

### Example Scenario

1. **ESP32 reads pH sensor**: pH = 5.0 (low!)
2. **ESP32 POSTs to API**: `POST /api/sensor-data/` with `{sensor: 123, value: 5.0}`
3. **Django saves data**: `SensorData.objects.create(sensor=ph_sensor, value=5.0)`
4. **Signal fires**: `post_save` signal calls `check_sensor_alerts()`
5. **Alert detected**: pH 5.0 < 5.5 threshold → Critical alert
6. **Notification sent**: Push notification to device owner's browser
7. **User receives**: "Low pH Detected - pH is 5.0 (below 5.5)..."

**All automatic!** No manual intervention needed.

---

## Testing

### Quick Test (Recommended)

1. **Ensure notifications are enabled** in Profile page:
   ```
   http://localhost:5173 → Profile → Push Notifications → Enable
   ```

2. **Run the test script**:
   ```powershell
   cd C:\Users\Rodillon\Desktop\SmarTanom\backend
   .\.venv\Scripts\Activate.ps1
   python test_automatic_alerts.py
   ```

3. **Check your device** for notifications:
   - You should receive 4 notifications (pH low/high, TDS low, water level empty)

### Manual Test with Django Shell

```python
python manage.py shell
```

```python
from apps.sensors.models import Sensor, SensorData
from apps.devices.models import Device

# Find your device
device = Device.objects.filter(is_bound=True).first()
ph_sensor = Sensor.objects.filter(device=device, sensor_type='ph').first()

# Trigger alert
SensorData.objects.create(sensor=ph_sensor, value=5.0)
# ^ Should send push notification automatically!
```

### Verify Notifications Sent

1. **Check Django logs** (terminal running `python manage.py runserver`):
   ```
   [INFO] apps.sensors: Alert detected: ph=5.0 for device 123, severity=critical
   [INFO] apps.sensors: Push notification sent to user@example.com for ph alert
   ```

2. **Check Django Admin**:
   ```
   http://localhost:8000/admin/notifications/notificationlog/
   ```
   Should see new entries with:
   - Title: "Low pH Detected"
   - Type: "sensor_alert"
   - Status: "success"

3. **Check your browser/device** for actual push notification

---

## Configuration

### Adjusting Thresholds

Edit `backend/apps/sensors/alert_service.py`:

```python
class SensorAlertService:
    # Change these to match your growing environment
    PH_MIN = 5.5        # Lower = more acidic tolerance
    PH_MAX = 6.5        # Higher = more alkaline tolerance
    TDS_MIN = 800       # ppm
    TDS_MAX = 1500      # ppm
    WATER_LEVEL_WARNING = 40  # percent
    # ... etc
```

**After editing**: Restart Django server (`Ctrl+C` then `python manage.py runserver`)

### Disabling Automatic Alerts

To temporarily disable automatic alerts without removing code:

**Option 1: Comment out signal** in `backend/apps/sensors/signals.py`:
```python
# @receiver(post_save, sender=SensorData)
# def check_sensor_alerts(sender, instance, created, **kwargs):
#     ...
```

**Option 2: Add environment variable** (future enhancement):
```python
# In alert_service.py
if not getattr(settings, 'ENABLE_AUTO_ALERTS', True):
    return None
```

---

## Troubleshooting

### No notifications received after creating sensor data

1. **Check Django server is running**:
   ```powershell
   cd backend
   python manage.py runserver
   ```

2. **Check VAPID keys loaded**:
   ```python
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.VAPID_PUBLIC_KEY[:20])
   BCI2Xv7XAWw1VIyNY00y  # Should see key, not empty
   ```

3. **Check user has active subscription**:
   ```python
   from apps.notifications.models import PushSubscription
   from apps.devices.models import Device

   device = Device.objects.filter(is_bound=True).first()
   subs = PushSubscription.objects.filter(user__email=device.bound_email, is_active=True)
   print(f"Active subscriptions: {subs.count()}")  # Should be > 0
   ```

4. **Check signal registered**:
   ```python
   from django.db.models.signals import post_save
   from apps.sensors.models import SensorData

   receivers = [r for r in post_save.receivers if r[0][1] == SensorData]
   print(f"SensorData post_save receivers: {len(receivers)}")  # Should be > 0
   ```

5. **Check Django logs** for errors:
   ```
   Look for lines starting with:
   [ERROR] apps.sensors: Error checking alerts...
   [WARNING] apps.sensors: Failed to send push notification...
   ```

### Notifications sent but not received on device

- See "Troubleshooting" section in `TESTING_PUSH_NOTIFICATIONS.md`
- Check browser permission status
- Check service worker is active (DevTools → Application → Service Workers)

---

## Next Steps

### Recommended Enhancements

1. **Add Quiet Hours** (Don't send notifications at night):
   ```python
   # In alert_service.py
   from datetime import datetime

   def check_and_notify(sensor_data):
       # Don't send notifications between 10 PM - 7 AM
       now = datetime.now()
       if 22 <= now.hour or now.hour < 7:
           logger.debug("Quiet hours - skipping notification")
           return None
       # ... rest of logic
   ```

2. **Add Alert Cooldown** (Don't spam same alert):
   ```python
   # Track last alert time per sensor
   # Only send if > X minutes since last alert of same type
   ```

3. **Add Alert Acknowledgement**:
   - Add API endpoint to mark alert as "acknowledged"
   - Don't re-send same alert until next breach

4. **Add Daily Summary**:
   - Send daily summary of all alerts
   - Use Celery beat for scheduled task

5. **Add Multi-Device Support**:
   - Current: Sends to device owner only
   - Future: Send to all device collaborators with proper permissions

---

## File Reference

### New Files Created
- `backend/apps/sensors/alert_service.py` - Alert detection logic
- `backend/apps/sensors/signals.py` - Django signal handlers
- `backend/test_automatic_alerts.py` - Testing script
- `AUTOMATIC_SENSOR_ALERTS.md` - User documentation

### Modified Files
- `backend/apps/sensors/apps.py` - Added signal registration
- `TESTING_PUSH_NOTIFICATIONS.md` - Added automatic alerts section

### Related Files (Pre-existing)
- `backend/apps/notifications/services.py` - Push notification sending
- `backend/apps/notifications/models.py` - PushSubscription, NotificationLog
- `backend/apps/sensors/models.py` - Sensor, SensorData
- `backend/apps/sensors/views.py` - SensorDataViewSet
- `frontend/src/sw.js` - Service worker (receives notifications)

---

## Architecture Notes

### Why Django Signals?

**Pros:**
- ✅ Automatic - No need to modify existing viewsets
- ✅ Decoupled - Alert logic separate from data creation
- ✅ Reusable - Works for data created via API, admin, shell, bulk imports
- ✅ Easy to disable - Just comment out signal decorator

**Cons:**
- ⚠️ Synchronous - Blocks SensorData creation (but very fast)
- ⚠️ No retry - If notification fails, won't retry automatically

### Future: Celery Tasks

For production, consider moving to async Celery tasks:

```python
# sensors/tasks.py
from celery import shared_task

@shared_task
def check_sensor_alert_async(sensor_data_id):
    sensor_data = SensorData.objects.get(id=sensor_data_id)
    SensorAlertService.check_and_notify(sensor_data)

# sensors/signals.py
@receiver(post_save, sender=SensorData)
def check_sensor_alerts(sender, instance, created, **kwargs):
    if created:
        check_sensor_alert_async.delay(instance.id)
```

**Benefits:**
- Non-blocking sensor data creation
- Automatic retry on failure
- Rate limiting / throttling
- Better for high-throughput scenarios

---

## Success Criteria ✅

You've successfully integrated automatic sensor alerts if:

1. ✅ Creating sensor data with threshold breach triggers notification
2. ✅ Notification appears on your device (even if browser closed)
3. ✅ NotificationLog shows sent notifications in admin panel
4. ✅ Django logs show "Alert detected" and "Push notification sent"
5. ✅ No errors in Django console

---

## Support

**Documentation:**
- `AUTOMATIC_SENSOR_ALERTS.md` - Detailed guide
- `TESTING_PUSH_NOTIFICATIONS.md` - Setup and testing
- `README_PUSH_NOTIFICATIONS.md` - Architecture overview

**Testing:**
- Run `python test_automatic_alerts.py` for automated testing
- Check Django logs for detailed debugging info
- Check NotificationLog admin for sent notification history

**Need Help?**
Check Django logs and NotificationLog admin panel for debugging information.

---

**🎉 Your sensor monitoring system now has real-time push alerts!**
