# Real-Time Push Notifications Implementation Guide

## 🚀 Overview

Complete implementation of Web Push notifications for SmarTanom using the Web Push API with VAPID authentication. Works on desktop, laptop, Android, and iOS (16.4+) - even when the app is closed or in the background.

---

## 📦 Backend Setup (Django)

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The `pywebpush==1.14.1` library is now included in requirements.txt.

### 2. Generate VAPID Keys

VAPID keys are required for Web Push authentication:

```bash
python manage.py generate_vapid_keys
```

This will output something like:

```
VAPID_PUBLIC_KEY=BN...longstring...
VAPID_PRIVATE_KEY=ABC...secret...
VAPID_ADMIN_EMAIL=admin@smartanom.com
```

### 3. Add to Environment Variables

Create or update `.env` file in the backend directory:

```env
# Web Push Notifications
VAPID_PUBLIC_KEY=<your_public_key_here>
VAPID_PRIVATE_KEY=<your_private_key_here>
VAPID_ADMIN_EMAIL=admin@smartanom.com
```

⚠️ **IMPORTANT**: Never commit `VAPID_PRIVATE_KEY` to version control!

### 4. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

This creates:
- `PushSubscription` model (stores user subscriptions)
- `NotificationLog` model (tracks sent notifications)

### 5. Restart Django Server

```bash
python manage.py runserver
```

---

## 🎨 Frontend Setup (React + Vite PWA)

### Files to Create/Update:

1. **Service Worker** (`public/sw.js`) - handles push events
2. **Notification API** (`src/services/api/notifications.js`) - API calls
3. **Notification Component** (`src/components/notifications/NotificationPermission.jsx`) - UI
4. **Integration** - Add to Dashboard/Profile

---

## 📡 Backend API Endpoints

### Base URL: `/api/notifications/`

#### 1. Get VAPID Public Key
```
GET /api/notifications/subscriptions/vapid_public_key/
```

Response:
```json
{
  "public_key": "BN...longstring..."
}
```

#### 2. Subscribe to Push Notifications
```
POST /api/notifications/subscriptions/
Authorization: Token <user_token>
Content-Type: application/json

{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BM...base64...",
  "auth": "xyz...base64...",
  "device_name": "Chrome Desktop",
  "user_agent": "Mozilla/5.0..."
}
```

Response:
```json
{
  "success": true,
  "message": "Successfully subscribed to push notifications",
  "subscription": {
    "id": 1,
    "endpoint": "...",
    "device_name": "Chrome Desktop",
    "is_active": true,
    "created_at": "2025-10-14T10:30:00Z"
  }
}
```

#### 3. Unsubscribe
```
DELETE /api/notifications/subscriptions/<id>/
Authorization: Token <user_token>
```

Response:
```json
{
  "success": true,
  "message": "Successfully unsubscribed from push notifications"
}
```

#### 4. Send Test Notification
```
POST /api/notifications/subscriptions/test_notification/
Authorization: Token <user_token>
Content-Type: application/json

{
  "title": "Test Alert",
  "message": "This is a test push notification",
  "notification_type": "info",
  "url": "/alerts"
}
```

Response:
```json
{
  "success": true,
  "message": "Notification sent to 2 device(s)",
  "stats": {
    "sent": 2,
    "failed": 0
  }
}
```

#### 5. View Notification Logs
```
GET /api/notifications/logs/
Authorization: Token <user_token>
```

Response:
```json
[
  {
    "id": 1,
    "notification_type": "alert",
    "title": "Low pH Detected",
    "message": "pH is 5.2. Raise pH using pH Up...",
    "status": "sent",
    "sent_at": "2025-10-14T10:30:00Z",
    "metadata": {
      "device_id": 37,
      "alert_type": "critical"
    }
  }
]
```

---

## 🔔 Sending Notifications from Django

### Method 1: Send to Single User

```python
from apps.notifications.services import PushNotificationService

# Send a simple notification
PushNotificationService.send_notification(
    user=user_instance,
    title="Water Level Low",
    message="Water level at 15%. Refill soon.",
    notification_type="warning",
    url="/alerts?device=37"
)
```

### Method 2: Send Alert Notification

```python
# Convenience method for device alerts
PushNotificationService.send_alert_notification(
    user=user_instance,
    alert_title="Low pH Detected",
    alert_message="pH is 5.2. Raise pH using pH Up, mix thoroughly...",
    alert_type="critical",  # critical, warning, info, success
    device_id=37
)
```

### Method 3: Send to Multiple Users

```python
user_ids = [1, 2, 3, 4]

PushNotificationService.send_to_multiple_users(
    user_ids=user_ids,
    title="System Maintenance",
    message="Scheduled maintenance at 2 AM tonight",
    notification_type="info"
)
```

### Integration Example: Send on Sensor Alert

```python
# In your sensor monitoring code or signal handler
from apps.notifications.services import PushNotificationService

def handle_sensor_alert(sensor, reading):
    """Called when sensor reading exceeds threshold."""

    device = sensor.device
    user = device.user  # Assuming device has user FK

    if sensor.sensor_type == 'ph' and reading.value < 5.5:
        PushNotificationService.send_alert_notification(
            user=user,
            alert_title="Low pH Detected",
            alert_message=f"pH is {reading.value}. Raise pH using pH Up immediately.",
            alert_type="critical",
            device_id=device.id
        )
```

---

## 🧪 Testing

### 1. Test VAPID Keys Generation

```bash
python manage.py generate_vapid_keys
```

Should output public/private key pairs.

### 2. Test Subscription (via API)

Use curl or Postman:

```bash
curl -X POST http://127.0.0.1:8000/api/notifications/subscriptions/vapid_public_key/
```

### 3. Test Notification from Django Shell

```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from apps.notifications.services import PushNotificationService

User = get_user_model()
user = User.objects.first()

# Send test notification
result = PushNotificationService.send_notification(
    user=user,
    title="Test Alert 🌱",
    message="This is a test notification from Django shell",
    notification_type="info"
)

print(f"Sent: {result['sent']}, Failed: {result['failed']}")
```

### 4. Check Admin Panel

Go to `http://127.0.0.1:8000/admin/` and check:
- **Push Subscriptions** - view active user subscriptions
- **Notification Logs** - see delivery status

---

## 🔐 Security Considerations

1. **VAPID Private Key**: Never expose or commit to version control
2. **HTTPS Required**: Web Push only works on HTTPS (except localhost)
3. **User Permissions**: Only authenticated users can subscribe
4. **Subscription Scoping**: Users can only see/manage their own subscriptions

---

## 🐛 Troubleshooting

### Issue: "VAPID keys not configured"

**Solution**: Run `python manage.py generate_vapid_keys` and add keys to `.env`

### Issue: "Failed to send notification"

**Causes**:
- User has no active subscriptions
- Subscription expired (user unsubscribed or cleared browser data)
- Invalid VAPID keys

**Check logs**:
```bash
tail -f backend/logs/django.log | grep notifications
```

### Issue: Subscription returns 410 Gone

This means the subscription expired. The system automatically marks it as inactive.

### Issue: Notifications not appearing

**Check**:
1. Browser notification permission granted?
2. Service worker registered?
3. User subscribed to push notifications?
4. Check browser console for errors

---

## 📊 Monitoring

### View Notification Stats

```python
from apps.notifications.models import NotificationLog

# Recent notifications
recent = NotificationLog.objects.all()[:10]

# Success rate
total = NotificationLog.objects.count()
sent = NotificationLog.objects.filter(status='sent').count()
success_rate = (sent / total * 100) if total > 0 else 0

print(f"Success rate: {success_rate:.1f}%")
```

### Cleanup Old Logs

```python
from datetime import timedelta
from django.utils import timezone
from apps.notifications.models import NotificationLog

# Delete logs older than 30 days
cutoff = timezone.now() - timedelta(days=30)
NotificationLog.objects.filter(sent_at__lt=cutoff).delete()
```

---

## 🌍 Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | ✅ | ✅ | Full support |
| Firefox | ✅ | ✅ | Full support |
| Safari | ✅ (macOS 13+) | ✅ (iOS 16.4+) | Recent versions only |
| Edge | ✅ | ✅ | Chromium-based |
| Opera | ✅ | ✅ | Chromium-based |

---

## 📱 Next Steps (Frontend)

Now that the backend is ready, implement the frontend:

1. Update service worker (`public/sw.js`)
2. Create notification API service
3. Add NotificationPermission component
4. Integrate into Dashboard/Profile
5. Test end-to-end

See the frontend implementation files being created next!

---

## 🔗 Useful Resources

- [Web Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [pywebpush documentation](https://github.com/web-push-libs/pywebpush)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

