# 🚨 Automatic Sensor Alert Notifications

## Overview

The SmarTanom system now automatically sends **push notifications** when sensor readings breach critical thresholds — even when the app is closed or running in the background!

This document explains how automatic sensor alerts work and how to test them.

---

## 📋 How It Works

### 1. **Automatic Detection**
Every time new sensor data is saved to the database:
1. Django **post_save signal** fires automatically
2. `SensorAlertService` checks if the reading breaches thresholds
3. If threshold breached → Push notification sent to device owner
4. User receives notification on all subscribed devices

### 2. **Alert Thresholds**

| Sensor Type | Critical Alert | Warning Alert | Details |
|-------------|---------------|---------------|---------|
| **pH** | < 5.5 or > 6.5 | None | Affects nutrient uptake |
| **TDS** | < 800 or > 1500 ppm | 800-999 or 1301-1500 ppm | Nutrient concentration |
| **Water Level** | 0% (empty) | ≤ 40% | Reservoir level |
| **Air Temperature** | None | < 18°C or > 26°C | Growing environment |
| **Turbidity** | < 1800 (turbid) | 1800-2100 (cloudy) | Water clarity |
| **Light** | > 1500 lux | None | Excessive light |
| **Humidity** | None | < 50% or > 70% | Air humidity |

### 3. **Notification Flow**

```
┌─────────────────────┐
│  ESP32 Firmware     │
│  (Sensor Reading)   │
└──────────┬──────────┘
           │
           ▼ POST /api/sensor-data/
┌─────────────────────┐
│  Django REST API    │
│  (Save SensorData)  │
└──────────┬──────────┘
           │
           ▼ post_save signal
┌─────────────────────┐
│  SensorAlertService │
│  (Check Thresholds) │
└──────────┬──────────┘
           │
           ▼ If breached
┌─────────────────────┐
│ PushNotificationSvc │
│ (Send to Browser)   │
└──────────┬──────────┘
           │
           ▼ Web Push API
┌─────────────────────┐
│  User's Browser     │
│  (Service Worker)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Notification UI    │
│  (Even if closed!)  │
└─────────────────────┘
```

---

## 🧪 Testing Automatic Alerts

### Method 1: Manual API Call (Recommended)

Use the Django shell to simulate sensor data with threshold breaches:

```bash
cd backend
python manage.py shell
```

**Test pH Alert (Critical):**
```python
from apps.sensors.models import Sensor, SensorData
from apps.devices.models import Device

# Find your device
device = Device.objects.filter(is_bound=True).first()
print(f"Device: {device.device_name} (ID: {device.id})")

# Find pH sensor
ph_sensor = Sensor.objects.filter(device=device, sensor_type='ph').first()
print(f"pH Sensor: {ph_sensor.id}")

# Create LOW pH reading (triggers critical alert: pH < 5.5)
SensorData.objects.create(sensor=ph_sensor, value=5.0)
print("✅ Created pH 5.0 reading (should trigger LOW pH alert)")

# Create HIGH pH reading (triggers critical alert: pH > 6.5)
SensorData.objects.create(sensor=ph_sensor, value=7.0)
print("✅ Created pH 7.0 reading (should trigger HIGH pH alert)")
```

**Test TDS Alert (Critical):**
```python
# Find TDS sensor
tds_sensor = Sensor.objects.filter(device=device, sensor_type='tds').first()

# Create LOW TDS reading (triggers critical alert: TDS < 800)
SensorData.objects.create(sensor=tds_sensor, value=600)
print("✅ Created TDS 600 ppm reading (should trigger LOW TDS alert)")

# Create HIGH TDS reading (triggers critical alert: TDS > 1500)
SensorData.objects.create(sensor=tds_sensor, value=1700)
print("✅ Created TDS 1700 ppm reading (should trigger HIGH TDS alert)")
```

**Test Water Level Alert (Critical):**
```python
# Find water level sensor
wl_sensor = Sensor.objects.filter(device=device, sensor_type='water_level').first()

# Create EMPTY reading (triggers critical alert: 0%)
SensorData.objects.create(sensor=wl_sensor, value=0)
print("✅ Created Water Level 0% reading (should trigger EMPTY alert)")

# Create LOW reading (triggers warning alert: ≤ 40%)
SensorData.objects.create(sensor=wl_sensor, value=25)
print("✅ Created Water Level 25% reading (should trigger LOW alert)")
```

### Method 2: Seed Command with Alert Values

Use the existing seed command with alert-triggering defaults:

```bash
cd backend
python manage.py seed_device_sensors --serial YOUR_DEVICE_SERIAL --update-existing
```

This creates sensor readings with these **alert-triggering defaults**:
- pH: 7.2 (high pH alert)
- TDS: 250 ppm (low TDS alert)
- Water Level: 10% (low water level alert)
- Air Temp: 30°C (high temp alert)

### Method 3: ESP32 Firmware (Real Hardware)

If you have ESP32 hardware connected:

1. **Adjust sensor values manually** (e.g., add pH Down to trigger low pH)
2. ESP32 will POST readings to `/api/sensor-data/`
3. Automatic alert detection runs
4. Push notification sent to subscribed devices

---

## 🔍 Verification Steps

### 1. Enable Browser Notifications
Before testing, ensure notifications are enabled:
- Go to http://localhost:5173
- Navigate to **Profile** page
- Scroll to **Push Notifications** section
- Click **"Enable Notifications"** → Accept browser permission
- Status should show: ✅ **Granted** | 🟢 **Active**

### 2. Check Django Logs
Watch Django console for alert logs:

```bash
cd backend
python manage.py runserver
```

Look for these log messages:
```
[INFO] apps.sensors: Alert detected: ph=5.0 for device 123 (My Garden), severity=critical
[INFO] apps.sensors: Push notification sent to user@example.com for ph alert
```

### 3. Check Browser Notifications
After triggering an alert:
- **If browser is open**: Notification should appear in top-right corner
- **If browser is closed**: Notification should appear in system tray
- **Click notification**: Opens/focuses the SmarTanom app

### 4. Check NotificationLog in Admin

Visit Django Admin to see notification history:
```
http://localhost:8000/admin/notifications/notificationlog/
```

Each sent notification creates a log entry with:
- User
- Title & Body
- Timestamp
- Status (success/failure)
- Notification Type (e.g., "sensor_alert")
- Device ID

---

## 🐛 Troubleshooting

### Issue: No notifications received after creating sensor data

**Check 1: Is Django server running?**
```bash
cd backend
python manage.py runserver
```

**Check 2: Are VAPID keys loaded?**
```python
python manage.py shell
>>> from django.conf import settings
>>> print(settings.VAPID_PUBLIC_KEY)
BCI2Xv7XAWw1VIyNY00yVmXqilV-cPjj9HoYmUDCGD0RimFsLGyj4oALJ2ZiICzRA60w4Do7wSKJchhrtsGZNEU
```

**Check 3: Is user subscribed?**
```python
from apps.notifications.models import PushSubscription
subs = PushSubscription.objects.filter(is_active=True)
print(f"Active subscriptions: {subs.count()}")
for sub in subs:
    print(f"  - User: {sub.user.email}, Device: {sub.user_agent[:50]}")
```

**Check 4: Does device have bound_email?**
```python
from apps.devices.models import Device
device = Device.objects.filter(is_bound=True).first()
print(f"Device: {device.device_name}")
print(f"Bound Email: {device.bound_email}")
```

**Check 5: Are signals registered?**
```python
from django.db.models.signals import post_save
from apps.sensors.models import SensorData
print(f"SensorData post_save receivers: {len(post_save.receivers)}")
# Should see at least 1 receiver for SensorData
```

### Issue: Notifications sent but not received

**Check browser permission:**
```javascript
// Open browser DevTools Console (F12)
console.log('Notification permission:', Notification.permission);
// Should be: "granted"
```

**Check service worker:**
```javascript
// DevTools Console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => console.log('  -', reg.active?.scriptURL));
});
```

**Check push subscription:**
```javascript
// DevTools Console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub ? 'Active' : 'None');
  });
});
```

### Issue: Error in Django logs

**Common errors:**

1. **"User has no active push subscriptions"**
   - User hasn't enabled notifications in Profile page
   - Solution: Click "Enable Notifications" button

2. **"VAPID_PUBLIC_KEY not configured"**
   - VAPID keys not in .env file
   - Solution: Run `python manage.py generate_vapid_keys` and restart server

3. **"WebPushException: Push failed"**
   - Invalid subscription (user unsubscribed or cleared browser data)
   - Solution: Re-subscribe from Profile page

---

## 📊 Alert Examples

### Critical pH Alert
```
Title: Low pH Detected
Body: pH is 5.0 (below 5.5). Raise pH using pH Up solution,
      mix thoroughly, and re-check in 10-15 minutes.
Severity: critical
```

### Warning TDS Alert
```
Title: TDS Low Warning
Body: TDS is 950 ppm (approaching lower bound). Monitor and
      consider topping up nutrients.
Severity: warning
```

### Critical Water Level Alert
```
Title: Water Level Empty
Body: Water level is 0% — reservoir empty. Refill with fresh
      nutrient solution immediately, check pumps for priming
      issues, and inspect for leaks.
Severity: critical
```

---

## 🔧 Customizing Thresholds

To adjust alert thresholds, edit `backend/apps/sensors/alert_service.py`:

```python
class SensorAlertService:
    # Threshold definitions
    PH_MIN = 5.5        # Lower this for more acidic tolerance
    PH_MAX = 6.5        # Raise this for more alkaline tolerance
    TDS_MIN = 800       # Lower for less concentrated solutions
    TDS_MAX = 1500      # Raise for more concentrated solutions
    WATER_LEVEL_WARNING = 40  # Adjust warning threshold
    # ... etc
```

After editing, restart Django server:
```bash
# Press Ctrl+C to stop server
python manage.py runserver
```

---

## 🎯 Integration Points

### Backend Components
- `apps/sensors/alert_service.py` - Threshold checking logic
- `apps/sensors/signals.py` - Automatic trigger on sensor data save
- `apps/sensors/apps.py` - Signal registration
- `apps/notifications/services.py` - Push notification sending

### Frontend Components
- `frontend/src/sw.js` - Service worker (receives push notifications)
- `frontend/src/components/notifications/NotificationPermission.jsx` - Subscription UI
- `frontend/src/pages/ProfilePage.jsx` - Settings integration

---

## 📚 Related Documentation

- **Push Notifications Setup**: `TESTING_PUSH_NOTIFICATIONS.md`
- **Push Notifications Guide**: `README_PUSH_NOTIFICATIONS.md`
- **Sensor Models**: `backend/apps/sensors/models.py`
- **Device Firmware**: `firmware/esp32-smartanom/README.md`

---

## ✅ Quick Test Checklist

1. ✅ Django server running (`python manage.py runserver`)
2. ✅ VAPID keys in .env file
3. ✅ Notifications enabled in Profile page (Status: Granted + Active)
4. ✅ Device has bound_email set
5. ✅ Create test sensor data with threshold breach
6. ✅ Check Django logs for alert detection
7. ✅ Verify push notification received on device
8. ✅ Check NotificationLog in admin panel

---

**Next Steps:**
- Test automatic alerts with real sensor data
- Customize thresholds for your growing environment
- Monitor NotificationLog for sent alerts
- Add quiet hours feature (future enhancement)

**Need Help?**
Check Django logs and NotificationLog admin panel for debugging information.
