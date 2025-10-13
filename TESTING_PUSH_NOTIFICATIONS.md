# 🔔 Push Notifications Testing Guide - Quick Start

## ✅ Setup Complete!

I've just completed the following setup steps for you:

1. ✅ Created database migrations for notifications app
2. ✅ Applied migrations to database
3. ✅ Generated VAPID keys
4. ✅ Added VAPID keys to .env file

## 🚀 Next Steps to Receive Notifications

### Step 1: Restart Django Server (IMPORTANT!)

**You MUST restart the server to load the new VAPID keys:**

1. Go to the terminal running Django server
2. Press `Ctrl+C` to stop it
3. Run again:
```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\backend
.\.venv\Scripts\Activate.ps1
python manage.py runserver
```

### Step 2: Start Frontend (if not running)

```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\frontend
npm run dev
```

Frontend should be at: http://localhost:5173

### Step 3: Enable Push Notifications in Browser

1. **Open your browser** to http://localhost:5173
2. **Log in** to your account
3. **Navigate to Profile page** (click your avatar/name in the menu)
4. **Scroll down** to find "Push Notifications" section
5. **Click "Enable Notifications"** button
6. **Accept the browser permission** when prompted
7. **Verify status changes** to:
   - Permission Status: **Granted ✅**
   - Subscription Status: **Active ✅**

### Step 4: Test Notification

1. In the Push Notifications section, click **"Send Test"** button
2. You should see a notification appear on your device:
   ```
   📱 SmarTanom Test Notification
   This is a test notification from SmarTanom
   ```
3. **Click the notification** - it should open/focus the app

### Step 5: Test Background Notifications (Optional)

1. Keep your subscription active
2. **Close your browser completely**
3. Send a notification from Django admin or Python shell (see below)
4. Notification should still appear even with browser closed!

## 🧪 Testing Methods

### Method 1: Using the UI Test Button (Easiest)
1. Go to Profile → Push Notifications section
2. Click "Send Test"
3. Done! ✨

### Method 2: Using Django Admin
1. Go to http://127.0.0.1:8000/admin/
2. Log in as admin (create superuser if needed: `python manage.py createsuperuser`)
3. Navigate to "Push Subscriptions"
4. Find your subscription
5. Select it and choose "Send test notification" action
6. Click "Go"

### Method 3: Using Django Shell
```powershell
# In backend directory with venv activated
python manage.py shell
```

```python
from apps.notifications.services import PushNotificationService
from apps.accounts.models import User

# Get your user (replace with your email)
user = User.objects.get(email='reyfoxconner@gmail.com')

# Send test notification
PushNotificationService.send_notification(
    user=user,
    title="Hello from Django!",
    body="This is a test notification from Python shell",
    url="/dashboard"
)
```

### Method 4: Using Python Script
Create a file `test_notification.py` in backend:

```python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.notifications.services import PushNotificationService
from apps.accounts.models import User

# Get your user
user = User.objects.get(email='reyfoxconner@gmail.com')

# Send notification
result = PushNotificationService.send_notification(
    user=user,
    title="Test Alert",
    body="Your device needs attention!",
    url="/alerts"
)

print(f"Sent: {result['sent']}, Failed: {result['failed']}")
```

Run it:
```powershell
cd C:\Users\Rodillon\Desktop\SmarTanom\backend
.\.venv\Scripts\Activate.ps1
python test_notification.py
```

---

## 🚨 AUTOMATIC SENSOR ALERTS

**NEW:** The system now **automatically sends push notifications** when sensor readings breach thresholds!

### How It Works
- Every time sensor data is saved (from ESP32 or API), the system checks thresholds
- If pH, TDS, water level, temperature, etc. breach safe ranges → **Automatic notification sent**
- Works even when the app is closed!

### Alert Thresholds
- **pH**: Critical if < 5.5 or > 6.5
- **TDS**: Critical if < 800 or > 1500 ppm (warning at 800-999 and 1301-1500)
- **Water Level**: Critical if 0%, warning if ≤ 40%
- **Air Temperature**: Warning if < 18°C or > 26°C
- **Turbidity**: Warning if cloudy, critical if turbid
- And more...

### Testing Automatic Alerts
Use Django shell to create test sensor data with threshold breaches:

```python
python manage.py shell
```

```python
from apps.sensors.models import Sensor, SensorData
from apps.devices.models import Device

# Find your device
device = Device.objects.filter(is_bound=True).first()
print(f"Device: {device.device_name}")

# Find pH sensor
ph_sensor = Sensor.objects.filter(device=device, sensor_type='ph').first()

# Create LOW pH reading (triggers automatic alert!)
SensorData.objects.create(sensor=ph_sensor, value=5.0)
print("✅ Created pH 5.0 - should trigger LOW pH alert notification")

# Create HIGH pH reading
SensorData.objects.create(sensor=ph_sensor, value=7.0)
print("✅ Created pH 7.0 - should trigger HIGH pH alert notification")

# Test TDS
tds_sensor = Sensor.objects.filter(device=device, sensor_type='tds').first()
SensorData.objects.create(sensor=tds_sensor, value=600)
print("✅ Created TDS 600 ppm - should trigger LOW TDS alert")

# Test water level
wl_sensor = Sensor.objects.filter(device=device, sensor_type='water_level').first()
SensorData.objects.create(sensor=wl_sensor, value=0)
print("✅ Created Water Level 0% - should trigger EMPTY alert")
```

You should receive push notifications for each alert!

**📖 For complete automatic alerts documentation, see:** `AUTOMATIC_SENSOR_ALERTS.md`

## 🔍 Troubleshooting

### "Not receiving notifications"

**Check 1: Browser Support**
- ✅ Chrome, Edge, Firefox: Full support
- ⚠️ Safari: Limited support (iOS 16.4+)
- ❌ Older browsers: Not supported

**Check 2: Permission Status**
- Go to Profile → Push Notifications
- Check if "Permission Status" shows "Granted"
- If "Denied", you need to reset browser permissions:
  1. Click the lock icon in address bar
  2. Go to site settings
  3. Set "Notifications" to "Allow"
  4. Reload page

**Check 3: Subscription Status**
- Check if "Subscription Status" shows "Active"
- If "Inactive", click "Enable Notifications" again

**Check 4: VAPID Keys Loaded**
Test in Django shell:
```python
from django.conf import settings
print("Public key:", settings.VAPID_PUBLIC_KEY[:20], "...")
print("Private key:", settings.VAPID_PRIVATE_KEY[:20], "...")
```
Should print non-empty values. If empty, restart server!

**Check 5: Service Worker Active**
1. Open browser DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in left menu
4. Verify service worker is "activated and is running"
5. Check for errors in service worker log

**Check 6: Check Backend Logs**
Look for errors in Django console when sending notification.

**Check 7: Check Database**
```python
# In Django shell
from apps.notifications.models import PushSubscription
print(f"Total subscriptions: {PushSubscription.objects.count()}")
print(f"Your subscriptions: {PushSubscription.objects.filter(user__email='reyfoxconner@gmail.com').count()}")
```

### "Permission prompt doesn't appear"

- You may have already blocked notifications
- Reset in browser settings (see Check 2 above)
- Try in incognito/private window

### "Service worker not found"

- Frontend is in development mode, service worker may not be fully active
- Try: `npm run build` then `npm run preview` for production mode
- Or continue in dev mode - notifications still work!

### "401 Unauthorized" error

- You're not logged in
- Token expired
- Log out and log back in

## 📊 Verify Everything is Working

Run this comprehensive check:

```python
# In Django shell
from apps.notifications.models import PushSubscription, NotificationLog
from apps.accounts.models import User
from django.conf import settings

print("=== Push Notifications Status ===\n")

# Check settings
print(f"✓ VAPID Public Key configured: {bool(settings.VAPID_PUBLIC_KEY)}")
print(f"✓ VAPID Private Key configured: {bool(settings.VAPID_PRIVATE_KEY)}")
print(f"✓ VAPID Admin Email: {settings.VAPID_ADMIN_EMAIL}\n")

# Check database
print(f"✓ Total users: {User.objects.count()}")
print(f"✓ Total subscriptions: {PushSubscription.objects.count()}")
print(f"✓ Active subscriptions: {PushSubscription.objects.filter(is_active=True).count()}")
print(f"✓ Total notifications sent: {NotificationLog.objects.count()}")
print(f"✓ Successful deliveries: {NotificationLog.objects.filter(status='sent').count()}\n")

# Check your user
user = User.objects.filter(email='reyfoxconner@gmail.com').first()
if user:
    subs = PushSubscription.objects.filter(user=user, is_active=True)
    print(f"✓ Your active subscriptions: {subs.count()}")
    if subs.exists():
        print(f"  - Latest: {subs.latest('created_at').created_at}")
else:
    print("✗ User not found")
```

## 🎯 Expected Results

After completing setup, you should see:

1. **In Profile Page:**
   - Permission Status: **Granted** (green)
   - Subscription Status: **Active** (blue)
   - Buttons: "Send Test" and "Disable Notifications"

2. **After clicking "Send Test":**
   - Success message appears
   - Notification pops up on screen
   - Clicking notification opens app

3. **In Django Shell Check:**
   - VAPID keys: ✓ Configured
   - Subscriptions: ≥1
   - Active subscriptions: ≥1
   - Your subscriptions: ≥1

## 📝 Your VAPID Keys (Keep Secret!)

**Public Key:** `BCI2Xv7XAWw1VIyNY00yVmXqilV-cPjj9HoYmUDCGD0RimFsLGyj4oALJ2ZiICzRA60w4Do7wSKJchhrtsGZNEU`

**Private Key:** `DR6BvsEKOyF8mQ4gw74-hZhaHZQ8GQMvMGAI0VKsKYE`

**Admin Email:** `smartanom01@gmail.com`

⚠️ **IMPORTANT:** Keep private key secret! Already added to `.env` file.

## 🚨 Common Mistakes

1. ❌ **Not restarting Django server after adding VAPID keys**
   - Solution: Always restart after changing .env

2. ❌ **Using system Python instead of venv**
   - Solution: Always activate venv first

3. ❌ **Browser blocking notifications**
   - Solution: Check browser notification settings

4. ❌ **Testing in HTTP (not HTTPS or localhost)**
   - Solution: Use localhost or HTTPS

5. ❌ **Not accepting permission prompt**
   - Solution: Click "Allow" when prompted

## ✅ Quick Success Path

**5-minute test:**
1. Restart Django server ← **DO THIS FIRST!**
2. Open http://localhost:5173
3. Login
4. Go to Profile
5. Click "Enable Notifications"
6. Accept permission
7. Click "Send Test"
8. See notification! 🎉

---

**Need more help?** Check the full documentation in:
- `PUSH_NOTIFICATIONS_QUICKSTART.md`
- `PUSH_NOTIFICATIONS_FRONTEND.md`
- `PUSH_NOTIFICATIONS_GUIDE.md`
