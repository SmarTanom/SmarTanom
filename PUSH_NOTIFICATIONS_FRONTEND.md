# Push Notifications Frontend Integration

## Overview

This document describes the complete frontend implementation of push notifications for SmarTanom, including setup, usage, testing, and troubleshooting.

## Architecture

```
Frontend Push Notification Stack:
┌─────────────────────────────────────────────┐
│  User Interface Components                  │
│  - NotificationPermission.jsx               │
│  - ProfilePage.jsx (integration)            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  API Service Layer                          │
│  - notifications.js (API client)            │
│  - Subscribe/Unsubscribe/Test              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Service Worker (sw.js)                     │
│  - Push event handler                       │
│  - Notification click handler               │
│  - Workbox caching                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Browser Push API                           │
│  - PushManager                              │
│  - Notification API                         │
└─────────────────────────────────────────────┘
```

## Files Created

### 1. Service Worker (`frontend/src/sw.js`)
Custom service worker with push notification support:
- **Push Event Handler**: Receives push messages from backend
- **Notification Display**: Shows notifications with title, body, icon, badge
- **Click Handler**: Opens app to relevant page when notification clicked
- **Workbox Integration**: Maintains caching strategies for offline support

### 2. Notification API Service (`frontend/src/services/api/notifications.js`)
Client-side API for notification management:

#### Key Functions:
- `getVapidPublicKey()` - Fetch VAPID public key from backend
- `subscribeToPush()` - Subscribe user to push notifications
- `unsubscribeFromPush()` - Unsubscribe from notifications
- `isSubscribed()` - Check current subscription status
- `sendTestNotification()` - Send test push notification
- `getNotificationLogs()` - Fetch notification history

#### Helper Functions:
- `urlBase64ToUint8Array()` - Convert VAPID key format
- `isPushNotificationSupported()` - Check browser support
- `requestNotificationPermission()` - Request permission
- `getCurrentSubscription()` - Get active subscription

### 3. NotificationPermission Component (`frontend/src/components/notifications/NotificationPermission.jsx`)
React component for managing push notification subscriptions:

#### Features:
- **Browser Support Detection**: Shows warning if unsupported
- **Permission Status Display**: Shows granted/denied/default status
- **Subscription Management**: Enable/disable notifications
- **Test Notification**: Send test to verify setup
- **Visual Feedback**: Success/error messages with icons
- **Feature List**: Explains what notifications user will receive

#### States:
- `supported` - Browser support flag
- `permission` - Notification permission status
- `subscribed` - Active subscription status
- `loading` - Action in progress
- `message` - User feedback (success/error)

### 4. Component Styles (`frontend/src/components/notifications/NotificationPermission.css`)
Comprehensive styling with:
- Responsive design (mobile-first)
- Status badges (permission, subscription)
- Action buttons (subscribe, test, unsubscribe)
- Message alerts (success, error)
- Loading spinners
- Feature list styling

## Integration Points

### Profile Page Integration
Location: `frontend/src/pages/ProfilePage.jsx`

Added new section after "Mobile App":
```jsx
{/* Push Notifications */}
<section className="profile-section">
  <div className="section-header">
    <h2 className="section-title">Push Notifications</h2>
  </div>
  <NotificationPermission />
</section>
```

### Vite Configuration
Updated `frontend/vite.config.js`:
- Changed from automatic workbox to `injectManifest` strategy
- Specifies custom service worker path: `src/sw.js`
- Maintains existing PWA manifest and caching

## User Flow

### First-Time Setup Flow
1. User navigates to Profile page
2. Sees "Push Notifications" section
3. Status shows: Permission "Not Requested", Subscription "Inactive"
4. Clicks "Enable Notifications"
5. Browser shows permission prompt
6. User grants permission
7. Service worker subscribes to push
8. Subscription sent to backend
9. Status updates: Permission "Granted", Subscription "Active"
10. Success message displays

### Testing Flow
1. User clicks "Send Test" button
2. Frontend calls backend test endpoint
3. Backend sends push notification
4. Service worker receives push event
5. Notification displays on device
6. User sees notification (even if app closed)
7. Success message confirms send

### Unsubscribe Flow
1. User clicks "Disable Notifications"
2. Browser unsubscribes from push
3. Backend removes subscription
4. Status updates to "Inactive"
5. Confirmation message displays

## API Endpoints Used

All endpoints prefixed with `/api/notifications/`:

### `POST /subscriptions/subscribe/`
Subscribe to push notifications.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BH1w...",
  "auth": "qFE...",
  "user_agent": "Mozilla/5.0..."
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "endpoint": "https://...",
  "created_at": "2024-01-15T10:30:00Z",
  "user_agent": "Mozilla/5.0..."
}
```

### `POST /subscriptions/unsubscribe/`
Unsubscribe from notifications.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Unsubscribed successfully"
}
```

### `GET /subscriptions/vapid_public_key/`
Get VAPID public key for subscription.

**Response:** `200 OK`
```json
{
  "public_key": "BDd3_hU..."
}
```

### `POST /subscriptions/test_notification/`
Send test notification to current user.

**Response:** `200 OK`
```json
{
  "message": "Test notification sent",
  "sent_to": 1
}
```

### `GET /logs/`
Get notification logs (paginated).

**Query Parameters:**
- `page` - Page number
- `page_size` - Results per page

**Response:** `200 OK`
```json
{
  "count": 42,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Test Notification",
      "body": "This is a test",
      "sent_at": "2024-01-15T10:30:00Z",
      "success": true
    }
  ]
}
```

## Service Worker Events

### Push Event
Triggered when push notification received:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-64x64.png',
    data: data.data || {},
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

### Notification Click Event
Triggered when user clicks notification:

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Focus existing window or open new one
        for (let client of clientList) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
```

## Testing Guide

### Local Development Testing

#### 1. Start Backend with Environment Variables
```powershell
cd backend
$env:VAPID_PUBLIC_KEY = "your-public-key"
$env:VAPID_PRIVATE_KEY = "your-private-key"
$env:VAPID_ADMIN_EMAIL = "mailto:admin@smartanom.com"
python manage.py runserver
```

#### 2. Start Frontend
```powershell
cd frontend
npm run dev
```

#### 3. Enable Push Notifications
1. Open browser to `http://localhost:5173`
2. Navigate to Profile page
3. Scroll to "Push Notifications" section
4. Click "Enable Notifications"
5. Accept browser permission prompt
6. Verify status shows "Active"

#### 4. Send Test Notification
1. Click "Send Test" button
2. Check for notification (even with app in background)
3. Click notification to verify it opens app
4. Check console for service worker logs

#### 5. Verify Backend Logs
Check Django logs for:
```
[INFO] apps.notifications: Push notification sent successfully to user X
```

### Production Testing

#### 1. HTTPS Required
Push notifications **require HTTPS** in production (except localhost).

#### 2. Deploy with Environment Variables
Ensure these are set:
```bash
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
VAPID_ADMIN_EMAIL=mailto:admin@yourdomain.com
```

#### 3. Test Across Devices
- Desktop Chrome/Edge
- Desktop Firefox
- Android Chrome
- iOS Safari 16.4+ (limited support)

#### 4. Test Background Notifications
1. Subscribe to notifications
2. Close browser/app completely
3. Send notification via Django admin or API
4. Verify notification appears on device

### Testing Different Browsers

#### Chrome/Edge (Best Support)
- Full push notification support
- Background notifications work
- Action buttons supported
- Badge/icon displayed

#### Firefox
- Full push notification support
- Background notifications work
- Some badge limitations
- Action buttons supported

#### Safari (iOS 16.4+)
- Limited push support
- Requires add to home screen first
- Background notifications limited
- Test thoroughly before production

#### Safari (macOS)
- Good push support
- Background notifications work
- Some icon/badge differences

## Troubleshooting

### Issue: "Push notifications are not supported"

**Causes:**
- Using HTTP instead of HTTPS (except localhost)
- Browser doesn't support Push API
- Service worker not registered

**Solutions:**
1. Use HTTPS or localhost
2. Test in modern browser (Chrome 42+, Firefox 44+)
3. Check service worker registration in DevTools

### Issue: "Notification permission denied"

**Causes:**
- User clicked "Block" on permission prompt
- Site permissions manually blocked

**Solutions:**
1. Clear site data in browser settings
2. Go to browser settings → Site Settings → Notifications
3. Find your site and set to "Allow"
4. Reload page

### Issue: Test notification not received

**Causes:**
- VAPID keys not configured
- Service worker not active
- Subscription expired
- Backend error

**Solutions:**
1. Check backend logs for errors
2. Verify VAPID keys are set in Django settings
3. Check browser DevTools → Application → Service Workers
4. Unsubscribe and resubscribe
5. Check `/api/notifications/logs/` for delivery status

### Issue: Notifications work but don't appear in background

**Causes:**
- Browser-specific behavior
- OS notification settings
- Service worker not running

**Solutions:**
1. Check OS notification settings (Windows/Mac/Android)
2. Ensure service worker has `skipWaiting: true`
3. Test with browser completely closed
4. Check browser notification settings

### Issue: Subscription fails with 401 error

**Causes:**
- Not authenticated
- Token expired

**Solutions:**
1. Ensure user is logged in
2. Check token in localStorage
3. Try logging out and back in
4. Verify API authentication in network tab

## Browser DevTools Debugging

### Service Worker Inspector
1. Open DevTools (F12)
2. Go to Application tab
3. Select "Service Workers" section
4. Verify service worker is "activated and running"
5. Check for errors in service worker log

### Push Subscription Details
```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? sub.toJSON() : 'None');
  });
});
```

### Simulate Push Event
```javascript
// In service worker console (Application → Service Workers → Source)
self.dispatchEvent(new PushEvent('push', {
  data: {
    json: () => ({
      title: 'Test',
      body: 'Manual test notification',
      icon: '/pwa-192x192.png'
    })
  }
}));
```

### Check Notification Permission
```javascript
// In browser console
console.log('Permission:', Notification.permission);
```

### Force Service Worker Update
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update());
});
```

## Performance Considerations

### Subscription Management
- Subscriptions cached in service worker
- Backend stores only active subscriptions
- Expired subscriptions auto-removed on 410 response

### Service Worker Lifecycle
- `skipWaiting: true` ensures immediate activation
- `clientsClaim: true` controls pages immediately
- No waiting for page reload

### Notification Delivery
- Push event handlers must complete within 30 seconds
- Use `event.waitUntil()` to keep service worker alive
- Batch notifications to avoid rate limits

## Security Best Practices

### VAPID Key Management
- Never commit keys to version control
- Use environment variables
- Rotate keys periodically
- Keep private key secure

### Subscription Validation
- Backend validates endpoints
- User-scoped subscriptions only
- HTTPS required in production

### Permission Handling
- Request permission only when needed
- Explain benefits before requesting
- Respect user's choice
- Provide easy unsubscribe

## Future Enhancements

### Potential Improvements
1. **Notification Actions**: Add buttons (View, Dismiss, Snooze)
2. **Rich Notifications**: Include images, larger text
3. **Notification Categories**: Filter by type (alerts, updates)
4. **Quiet Hours**: Respect user-defined quiet times
5. **Notification History**: Show past notifications in app
6. **Badge Count**: Update app icon badge with count
7. **Sound Customization**: Different sounds per notification type
8. **Priority Levels**: Critical vs informational notifications

### Integration with Alerts System
Connect to existing device alert monitoring:

```python
# In sensor monitoring service
from apps.notifications.services import PushNotificationService

def check_sensor_thresholds(sensor_data):
    if sensor_data.ph < threshold:
        # Send push notification
        PushNotificationService.send_alert_notification(
            user=device.owner,
            alert_type='pH',
            device_id=device.id,
            device_name=device.name,
            message=f"Low pH detected: {sensor_data.ph}"
        )
```

## Support & Resources

### Documentation
- Backend guide: `PUSH_NOTIFICATIONS_GUIDE.md`
- Web Push Protocol: https://datatracker.ietf.org/doc/html/rfc8030
- VAPID: https://datatracker.ietf.org/doc/html/rfc8292
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API

### Browser Compatibility
- Chrome 42+ ✅
- Firefox 44+ ✅
- Edge 17+ ✅
- Safari 16+ ⚠️ (limited)
- Opera 29+ ✅

### Testing Tools
- Chrome DevTools Service Worker inspector
- Firefox Developer Tools Push simulator
- Online VAPID key generator (for testing only!)
- Push notification testing services

## Summary

The push notification system is now fully implemented on the frontend with:
- ✅ Custom service worker with push/click handlers
- ✅ Notification API service for subscription management
- ✅ React component for user interface
- ✅ Integration into Profile page
- ✅ Comprehensive error handling
- ✅ Cross-browser support
- ✅ Background notification support
- ✅ Complete testing guide

Users can now enable push notifications from their profile and receive real-time alerts even when the app is closed!
