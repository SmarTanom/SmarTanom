# Push Notifications Quick Start Guide

## 🚀 Get Push Notifications Working in 5 Minutes

This guide will get push notifications working end-to-end in your local development environment.

## Prerequisites

- Backend and frontend repos cloned
- Python 3.10+ installed
- Node.js 16+ installed
- Modern browser (Chrome/Firefox recommended)

## Step 1: Generate VAPID Keys (1 minute)

```powershell
# Navigate to backend
cd backend

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install pywebpush if not already installed
pip install pywebpush

# Generate VAPID keys
python manage.py generate_vapid_keys

# Output will look like:
# VAPID keys generated successfully!
#
# Add these to your environment variables or .env file:
#
# VAPID_PUBLIC_KEY=BDd3_hU17SG...
# VAPID_PRIVATE_KEY=mdHbs2LGh6...
# VAPID_ADMIN_EMAIL=mailto:admin@smartanom.com
```

**Copy these values!** You'll need them next.

## Step 2: Configure Backend Environment (30 seconds)

Create or update `.env` file in `backend/` directory:

```bash
# Push Notifications
VAPID_PUBLIC_KEY=your-generated-public-key-here
VAPID_PRIVATE_KEY=your-generated-private-key-here
VAPID_ADMIN_EMAIL=mailto:admin@smartanom.com
```

Or set environment variables in PowerShell:
```powershell
$env:VAPID_PUBLIC_KEY = "your-generated-public-key"
$env:VAPID_PRIVATE_KEY = "your-generated-private-key"
$env:VAPID_ADMIN_EMAIL = "mailto:admin@smartanom.com"
```

## Step 3: Run Database Migrations (30 seconds)

```powershell
cd backend
python manage.py migrate

# Expected output:
# Running migrations:
#   Applying notifications.0001_initial... OK
```

## Step 4: Start Backend (30 seconds)

```powershell
# Still in backend directory
python manage.py runserver

# Server should start at http://127.0.0.1:8000
```

**Keep this terminal open!**

## Step 5: Start Frontend (30 seconds)

Open **new terminal**:

```powershell
cd frontend
npm install  # Only needed first time or after package changes
npm run dev

# Vite dev server should start at http://localhost:5173
```

**Keep this terminal open too!**

## Step 6: Enable Push Notifications (1 minute)

1. Open browser to http://localhost:5173
2. Log in (or create account if needed)
3. Navigate to **Profile** page (click your avatar or menu)
4. Scroll down to **"Push Notifications"** section
5. Click **"Enable Notifications"** button
6. Browser will show permission prompt - click **"Allow"**
7. Status should change to:
   - Permission Status: **Granted** ✅
   - Subscription Status: **Active** ✅

## Step 7: Test It! (30 seconds)

1. Click the **"Send Test"** button
2. You should see a notification appear on your device:
   ```
   📱 SmarTanom Test Notification
   This is a test notification from SmarTanom
   ```
3. Click the notification - it should open/focus the app
4. Success! 🎉

## Step 8: Test Background Notifications (Optional)

1. Keep subscription active (from Step 6)
2. **Close the browser completely** (not just the tab)
3. Send notification from Django admin or API
4. Notification should still appear!
5. Click it to reopen the app

### Sending from Django Admin:

1. Go to http://127.0.0.1:8000/admin/
2. Log in as superuser
3. Go to "Push Subscriptions"
4. Find your subscription
5. Use "Send test notification" action
6. Check your device for notification

### Sending from API:

```powershell
# Using PowerShell
$token = "your-auth-token"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/notifications/subscriptions/test_notification/" `
  -Method POST `
  -Headers @{Authorization="Token $token"}
```

Or using curl:
```bash
curl -X POST http://127.0.0.1:8000/api/notifications/subscriptions/test_notification/ \
  -H "Authorization: Token your-auth-token"
```

## Troubleshooting

### Issue: "Push notifications are not supported"

**Solution:** Make sure you're using Chrome, Firefox, or Edge. Safari has limited support.

### Issue: Permission prompt doesn't appear

**Solutions:**
1. Check if you previously blocked notifications
2. Go to `chrome://settings/content/notifications`
3. Remove any block for `localhost:5173`
4. Reload page and try again

### Issue: Test notification not received

**Solutions:**
1. Check backend terminal for errors
2. Verify VAPID keys are set correctly
3. Check browser DevTools Console for errors
4. Try unsubscribing and resubscribing
5. Verify service worker is running: DevTools → Application → Service Workers

### Issue: "Module 'pywebpush' not found"

**Solution:**
```powershell
pip install pywebpush==1.14.1
```

### Issue: Migration fails

**Solution:**
```powershell
# Check if notifications app is in INSTALLED_APPS
python manage.py migrate notifications --fake-initial
```

## Verify Everything Works

### Backend Health Check
```powershell
# Check if backend is running
Invoke-RestMethod -Uri "http://127.0.0.1:8000/healthz"
# Should return: {"status": "healthy", "database": "ok"}
```

### Frontend Service Worker Check
Open browser console (F12) and run:
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('Service Worker:', reg.active.state);
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? 'Active' : 'None');
  });
});
```

### Backend Subscription Check
Log into Django admin:
1. Go to http://127.0.0.1:8000/admin/
2. Navigate to "Push Subscriptions"
3. You should see your subscription listed
4. Check the "Created at" timestamp

### API Endpoints Check
```powershell
# Get VAPID public key
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/notifications/subscriptions/vapid_public_key/"

# List notification logs (requires auth)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/notifications/logs/" `
  -Headers @{Authorization="Token your-token"}
```

## Next Steps

### Integrate with Real Alerts

Edit your sensor monitoring code to send notifications:

```python
# In apps/sensors/services.py or similar
from apps.notifications.services import PushNotificationService

def check_sensor_alert(sensor_data, device):
    """Check sensor readings and send alerts if needed."""

    # Example: pH level alert
    if sensor_data.ph < 5.5:
        PushNotificationService.send_alert_notification(
            user=device.owner,
            alert_type='pH',
            device_id=device.id,
            device_name=device.name,
            message=f'Critical: pH level {sensor_data.ph} is too low!',
            url=f'/device/{device.id}'
        )

    # Example: Water level alert
    if sensor_data.water_level < 20:
        PushNotificationService.send_alert_notification(
            user=device.owner,
            alert_type='water',
            device_id=device.id,
            device_name=device.name,
            message=f'Warning: Water level at {sensor_data.water_level}%',
            url=f'/device/{device.id}'
        )
```

### Customize Notifications

Edit `frontend/src/sw.js` to customize notification appearance:

```javascript
// In push event handler
const options = {
  body: data.body,
  icon: '/pwa-192x192.png',
  badge: '/pwa-64x64.png',

  // Add custom settings
  requireInteraction: true,  // Keep notification visible until user interacts
  silent: false,             // Play sound
  vibrate: [200, 100, 200],  // Vibration pattern

  // Add action buttons
  actions: [
    { action: '/device/' + data.device_id, title: 'View Device' },
    { action: '/alerts', title: 'View All Alerts' }
  ],

  // Custom data
  data: {
    url: data.url || '/',
    device_id: data.device_id,
    timestamp: Date.now()
  }
};
```

### Production Deployment

See `PUSH_NOTIFICATIONS_GUIDE.md` section "Production Deployment" for:
- HTTPS setup requirements
- Environment variable configuration
- Load balancing considerations
- Monitoring and logging

## Common Use Cases

### Daily Summary Notification
```python
# Create management command: send_daily_summary
from apps.notifications.services import PushNotificationService

def send_daily_summary(user):
    devices = user.device_set.all()
    message = f"Good morning! You have {devices.count()} devices online."

    PushNotificationService.send_notification(
        user=user,
        title="Daily Summary",
        body=message,
        url="/dashboard"
    )
```

### Harvest Reminder
```python
def send_harvest_reminder(device):
    days_since_planting = (date.today() - device.plant_date).days

    if days_since_planting >= device.harvest_days:
        PushNotificationService.send_alert_notification(
            user=device.owner,
            alert_type='harvest',
            device_id=device.id,
            device_name=device.name,
            message=f'Time to harvest {device.plant_type}!',
            url=f'/device/{device.id}'
        )
```

### System Status Update
```python
def send_system_status(user, status_message):
    PushNotificationService.send_notification(
        user=user,
        title="System Update",
        body=status_message,
        icon="info",
        url="/dashboard"
    )
```

## Complete Feature Checklist

After following this guide, you should have:

- ✅ VAPID keys generated and configured
- ✅ Backend notifications app migrated
- ✅ Frontend service worker with push handlers
- ✅ Notification permission component in Profile
- ✅ Successful test notification sent and received
- ✅ Background notifications working
- ✅ Click handler opening correct pages

## Resources

- **Backend Guide**: `PUSH_NOTIFICATIONS_GUIDE.md` - Complete backend documentation
- **Frontend Guide**: `PUSH_NOTIFICATIONS_FRONTEND.md` - Complete frontend documentation
- **Project Instructions**: `.github/copilot-instructions.md` - Project architecture
- **Web Push Spec**: https://web.dev/push-notifications-overview/ - Official guide

## Support

If you encounter issues:

1. Check both backend and frontend terminals for errors
2. Open browser DevTools (F12) → Console for client errors
3. Check Django logs in `backend/logs/django.log`
4. Review troubleshooting sections in main guides
5. Verify all environment variables are set correctly

**Happy pushing! 🚀📱**
