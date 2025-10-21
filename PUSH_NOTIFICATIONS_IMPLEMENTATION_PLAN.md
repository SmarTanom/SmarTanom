# SmarTanom Push Notifications & Role-Based Alerts - Production Implementation Plan

**Last Updated:** October 21, 2025
**Project:** SmarTanom - Smart Hydroponic Monitoring System
**Tech Stack:** React (Vite) Frontend + Django Backend

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Backend Implementation](#backend-implementation)
4. [Web Frontend Implementation (React + Vite)](#web-frontend-implementation)
5. [Mobile Implementation Strategy](#mobile-implementation-strategy)
6. [Role-Based Alert Filtering](#role-based-alert-filtering)
7. [Testing & Validation](#testing--validation)
8. [Production Deployment Checklist](#production-deployment-checklist)
9. [Troubleshooting & Best Practices](#troubleshooting--best-practices)

---

## Executive Summary

### Current Status ✅
Your SmarTanom project **already has a production-ready push notification system** implemented:

- ✅ **Django Backend:** Complete with `PushSubscription`, `NotificationLog`, and `NotificationPreferences` models
- ✅ **Service Worker:** Basic service worker for web push (`frontend/public/sw.js`)
- ✅ **Push Service:** `PushNotificationService` with VAPID authentication
- ✅ **Role-Based Filtering:** Admin-only alerts are already filtered by `is_staff=True`
- ✅ **Email Templates:** OTP, Device Binding, Device Revoke, and Alert emails

### What Was Fixed ✅
1. **Removed "Open SmarTanom" buttons** from all email templates
2. **Verified admin-only alert filtering** - alerts are correctly sent only to admins when appropriate

### What Needs Implementation 🚧
1. **Web Frontend Integration** - React components for subscription management
2. **VAPID Keys Generation** - Environment configuration
3. **Mobile Push Strategy** - Firebase Cloud Messaging or PWA fallback
4. **Enhanced Service Worker** - Better notification handling

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Desktop    │   │   Mobile     │   │   Mobile     │       │
│  │   Browser    │   │   Browser    │   │   Native     │       │
│  │              │   │   (PWA)      │   │   (iOS/And.) │       │
│  │  - SW.js     │   │  - SW.js     │   │  - FCM       │       │
│  │  - VAPID     │   │  - VAPID     │   │  - APNs      │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      Django Backend API             │
          ├─────────────────────────────────────┤
          │                                     │
          │  • PushSubscriptionViewSet          │
          │  • PushNotificationService          │
          │  • Role-based filtering             │
          │  • VAPID authentication             │
          │                                     │
          └─────────────────────────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │     Push Service Providers          │
          ├─────────────────────────────────────┤
          │                                     │
          │  • Browser Push API (Web)           │
          │  • Firebase Cloud Messaging         │
          │  • Apple Push Notification Service  │
          │                                     │
          └─────────────────────────────────────┘
```

---

## Backend Implementation

### 1. Database Models (Already Implemented ✅)

**Location:** `backend/apps/notifications/models.py`

```python
class PushSubscription(models.Model):
    """Store user push notification subscriptions."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    endpoint = models.URLField(max_length=500, unique=True)
    p256dh = models.CharField(max_length=255)  # Encryption key
    auth = models.CharField(max_length=255)     # Auth secret
    user_agent = models.TextField(blank=True)
    device_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class NotificationLog(models.Model):
    """Log of sent notifications for debugging and analytics."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    subscription = models.ForeignKey(PushSubscription, on_delete=models.SET_NULL, null=True)
    notification_type = models.CharField(max_length=20)  # alert, warning, critical, info
    title = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20)  # sent, failed, expired
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    sent_at = models.DateTimeField(auto_now_add=True)

class NotificationPreferences(models.Model):
    """Store user notification preferences for filtering."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    critical_alerts = models.BooleanField(default=True)
    warnings = models.BooleanField(default=True)
    info = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=False)
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(default='22:00')
    quiet_hours_end = models.TimeField(default='07:00')
```

### 2. VAPID Keys Setup 🚧 **ACTION REQUIRED**

VAPID (Voluntary Application Server Identification) keys are required for web push notifications.

#### Generate VAPID Keys

```bash
# Install py-vapid
pip install py-vapid

# Generate keys
vapid --gen
```

**Output will be:**
```
Private Key: BG7x...
Public Key: BPx...
```

#### Add to Django Settings

**File:** `backend/smartanom/settings.py`

```python
# Push Notifications - VAPID Configuration
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", default="")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", default="")
VAPID_ADMIN_EMAIL = env("VAPID_ADMIN_EMAIL", default="admin@smartanom.com")
VAPID_CLAIMS = {
    "sub": f"mailto:{VAPID_ADMIN_EMAIL}"
}
```

#### Add to Environment File

**File:** `backend/.env`

```bash
# Push Notifications
VAPID_PRIVATE_KEY=BG7x...your-private-key...
VAPID_PUBLIC_KEY=BPx...your-public-key...
VAPID_ADMIN_EMAIL=admin@smartanom.com
```

### 3. API Endpoints (Already Implemented ✅)

**Location:** `backend/apps/notifications/views.py`

```python
class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """API endpoints for managing push notification subscriptions."""

    # GET /api/notifications/push-subscriptions/vapid_public_key/
    @action(detail=False, methods=['get'])
    def vapid_public_key(self, request):
        """Get VAPID public key for subscription."""
        public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        return Response({'public_key': public_key})

    # POST /api/notifications/push-subscriptions/subscribe/
    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Subscribe to push notifications."""
        # Payload: {endpoint, keys: {p256dh, auth}, device_name}

    # POST /api/notifications/push-subscriptions/unsubscribe/
    @action(detail=False, methods=['post'])
    def unsubscribe(self, request):
        """Unsubscribe using endpoint URL."""
        # Payload: {endpoint}

    # POST /api/notifications/push-subscriptions/test_notification/
    @action(detail=False, methods=['post'])
    def test_notification(self, request):
        """Send a test notification to the current user."""
        # Payload: {title, message, notification_type, url}
```

### 4. Push Notification Service (Already Implemented ✅)

**Location:** `backend/apps/notifications/services.py`

```python
class PushNotificationService:
    """Service for sending push notifications to subscribed users."""

    @staticmethod
    def send_notification(user, title, message, notification_type='info',
                         icon=None, badge=None, url=None, data=None):
        """
        Send push notification to all active subscriptions for a user.

        Features:
        - Checks user preferences (quiet hours, notification types)
        - Sends to all active browser subscriptions
        - Logs success/failure
        - Handles expired subscriptions (410 Gone)
        - Sends email if enabled
        """

    @staticmethod
    def send_to_all_admins(title, message, **kwargs):
        """
        Send notification to all staff/admin users.
        Only sends to users with is_staff=True.
        """

    @staticmethod
    def send_alert_notification(user, alert_title, alert_message,
                                alert_type='warning', device_id=None):
        """Convenience method for sending device alert notifications."""
```

### 5. Role-Based Alert Logic (Already Implemented ✅)

**Location:** `backend/apps/sensors/alert_service.py`

```python
# Send to device owner (regular user)
result = PushNotificationService.send_alert_notification(
    user=user,
    alert_title=title,
    alert_message=body,
    alert_type=severity,
    device_id=device.id,
)

# Only broadcast to admins if critical or unbound device
# This prevents regular users from receiving admin-only alerts
if severity == 'critical' or not device.is_bound:
    PushNotificationService.send_to_all_admins(
        title=f"🌱 {title}",
        message=body,
        notification_type=severity,
        url=f"/alerts?device={device.id}",
        data={'device_id': device.id, 'alert_type': severity}
    )
else:
    logger.info(f"Skipping admin broadcast for {severity} alert on user-owned device")
```

**Key Points:**
- ✅ Regular users receive alerts **only** for their own devices
- ✅ Admins receive critical alerts from **all** devices
- ✅ Admins receive **all** alerts from unbound devices
- ✅ Admin filtering enforced by `is_staff=True` check in `send_to_all_admins()`

---

## Web Frontend Implementation

### 1. Service Worker Setup 🚧 **NEEDS ENHANCEMENT**

**Current File:** `frontend/public/sw.js`

**Enhanced Service Worker:**

```javascript
/**
 * SmarTanom Service Worker - Enhanced Push Notifications
 * Handles push events, notification clicks, and background sync
 */

const CACHE_NAME = 'smartanom-v1';
const API_BASE_URL = self.location.origin.includes('localhost')
  ? 'http://localhost:8000'
  : 'https://api.smartanom.com';

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'SmarTanom Alert',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    tag: 'smartanom-notification',
    requireInteraction: false,
    data: {
      url: '/dashboard',
      timestamp: Date.now()
    }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      console.log('[Service Worker] Payload:', payload);

      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || payload.message || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        requireInteraction: payload.requireInteraction || false,
        data: {
          url: payload.data?.url || '/dashboard',
          type: payload.data?.type || 'info',
          device_id: payload.data?.device_id,
          timestamp: Date.now(),
          ...payload.data
        },
        // Notification actions
        actions: payload.data?.device_id ? [
          {
            action: 'view',
            title: 'View Details',
            icon: '/icons/view.png'
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/close.png'
          }
        ] : []
      };

      // Add vibration pattern for critical alerts
      if (payload.data?.type === 'critical') {
        notificationData.vibrate = [200, 100, 200, 100, 200];
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  // Handle notification actions
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.startsWith(self.location.origin) && 'focus' in client) {
              client.focus();
              client.navigate(fullUrl);
              return;
            }
          }
          // No window open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(fullUrl);
          }
        })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already done above)
    console.log('[Service Worker] Notification dismissed');
  }
});

// Background sync event (optional - for offline support)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync unread notifications when back online
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/alerts/`, {
      headers: {
        'Authorization': `Token ${await getAuthToken()}`
      }
    });
    const data = await response.json();
    console.log('[Service Worker] Synced notifications:', data);
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

async function getAuthToken() {
  // Get auth token from IndexedDB or localStorage
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  if (clients && clients.length > 0) {
    const client = clients[0];
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.token);
      };
      client.postMessage({ type: 'GET_AUTH_TOKEN' }, [channel.port2]);
    });
  }
  return null;
}
```

### 2. React Push Notification Hook 🚧 **NEW IMPLEMENTATION**

**Create:** `frontend/src/hooks/usePushNotifications.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';

/**
 * Custom hook for managing push notification subscriptions
 *
 * Usage:
 * const {
 *   isSupported,
 *   isSubscribed,
 *   isLoading,
 *   subscribe,
 *   unsubscribe,
 *   sendTestNotification
 * } = usePushNotifications();
 */
export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setIsSupported(supported);

      if (!supported) {
        console.warn('[Push] Push notifications not supported in this browser');
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  // Register service worker and check subscription status
  useEffect(() => {
    if (!isSupported) return;

    const registerServiceWorkerAndCheckSubscription = async () => {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('[Push] Service Worker registered:', registration);

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
          console.log('[Push] Already subscribed:', existingSubscription);
        } else {
          setIsSubscribed(false);
        }
      } catch (err) {
        console.error('[Push] Service Worker registration failed:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    registerServiceWorkerAndCheckSubscription();
  }, [isSupported]);

  // Convert base64 VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Request permission
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission:', permission);

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const { data: vapidData } = await apiClient.get(
        '/api/notifications/push-subscriptions/vapid_public_key/'
      );

      if (!vapidData.public_key) {
        throw new Error('VAPID public key not configured on server');
      }

      const vapidPublicKey = urlBase64ToUint8Array(vapidData.public_key);

      // Subscribe to push manager
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('[Push] Push subscription created:', pushSubscription);

      // Send subscription to backend
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: btoa(
            String.fromCharCode.apply(
              null,
              new Uint8Array(pushSubscription.getKey('p256dh'))
            )
          ),
          auth: btoa(
            String.fromCharCode.apply(
              null,
              new Uint8Array(pushSubscription.getKey('auth'))
            )
          )
        },
        user_agent: navigator.userAgent,
        device_name: navigator.platform || 'Unknown Device'
      };

      await apiClient.post(
        '/api/notifications/push-subscriptions/subscribe/',
        subscriptionData
      );

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      console.log('[Push] Subscription saved to backend');

      return pushSubscription;
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      throw new Error('No active subscription');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify backend
      await apiClient.post(
        '/api/notifications/push-subscriptions/unsubscribe/',
        { endpoint: subscription.endpoint }
      );

      setSubscription(null);
      setIsSubscribed(false);
      console.log('[Push] Unsubscribed successfully');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      const response = await apiClient.post(
        '/api/notifications/push-subscriptions/test_notification/',
        {
          title: 'SmarTanom Test',
          message: 'This is a test notification from your hydroponic system!',
          notification_type: 'info',
          url: '/dashboard'
        }
      );

      console.log('[Push] Test notification sent:', response.data);
      return response.data;
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
      throw err;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscription,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
};
```

### 3. React Notification Settings Component 🚧 **NEW IMPLEMENTATION**

**Create:** `frontend/src/components/NotificationSettings.jsx`

```jsx
import React, { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Bell, BellOff, AlertCircle, CheckCircle } from 'lucide-react';

const NotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const [testResult, setTestResult] = useState(null);

  const handleToggleSubscription = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        setTestResult({ type: 'success', message: 'Unsubscribed from push notifications' });
      } else {
        await subscribe();
        setTestResult({ type: 'success', message: 'Subscribed to push notifications' });
      }
    } catch (err) {
      setTestResult({ type: 'error', message: err.message });
    }
  };

  const handleTestNotification = async () => {
    try {
      await sendTestNotification();
      setTestResult({
        type: 'success',
        message: 'Test notification sent! Check your notifications.'
      });
    } catch (err) {
      setTestResult({ type: 'error', message: 'Failed to send test notification' });
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Push notifications not supported
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <Bell className="h-6 w-6 text-green-600" />
            ) : (
              <BellOff className="h-6 w-6 text-gray-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-500">
                {isSubscribed
                  ? 'You will receive real-time alerts'
                  : 'Enable to receive real-time alerts'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleSubscription}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isSubscribed
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Processing...' : isSubscribed ? 'Disable' : 'Enable'}
          </button>
        </div>

        {isSubscribed && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleTestNotification}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Send Test Notification
            </button>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {testResult && (
        <div className={`border rounded-lg p-4 ${
          testResult.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start">
            {testResult.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            )}
            <p className={`text-sm ${
              testResult.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Notification Types
        </h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="form-checkbox h-4 w-4 text-green-600" />
            <span className="ml-3 text-sm text-gray-700">Critical Alerts (pH, EC, Water Level)</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="form-checkbox h-4 w-4 text-green-600" />
            <span className="ml-3 text-sm text-gray-700">Warning Notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" defaultChecked className="form-checkbox h-4 w-4 text-green-600" />
            <span className="ml-3 text-sm text-gray-700">Info Updates</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
```

### 4. Update Main App to Register Service Worker 🚧 **ACTION REQUIRED**

**Update:** `frontend/src/main.jsx` or `frontend/src/App.jsx`

```javascript
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[App] Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Mobile Implementation Strategy

### Option 1: Firebase Cloud Messaging (Recommended for Native Apps) ✅

**For React Native (`mobile/` directory)**

#### 1. Install Firebase

```bash
cd mobile
npm install @react-native-firebase/app @react-native-firebase/messaging
```

#### 2. Configure Firebase

**Android:** `mobile/android/app/google-services.json`
**iOS:** `mobile/ios/GoogleService-Info.plist`

#### 3. Create Push Notification Hook

**Create:** `mobile/src/hooks/usePushNotifications.js`

```javascript
import { useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import apiClient from '../services/apiClient';

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Request permission (iOS only)
    const requestPermission = async () => {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('[Push] Permission denied');
          return;
        }
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('[Push] FCM Token:', token);
      setFcmToken(token);

      // Subscribe to backend
      await subscribeToPush(token);
    };

    requestPermission();

    // Handle foreground messages
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('[Push] Foreground message:', remoteMessage);
      // Show local notification or update UI
    });

    // Handle background messages (app in background)
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[Push] Background message:', remoteMessage);
    });

    // Handle notification opened
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[Push] Notification opened:', remoteMessage);
      // Navigate to relevant screen
    });

    return () => {
      unsubscribeForeground();
    };
  }, []);

  const subscribeToPush = async (token) => {
    try {
      await apiClient.post('/api/notifications/mobile-push-subscriptions/', {
        platform: Platform.OS,
        fcm_token: token,
        device_name: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device'
      });
      setIsSubscribed(true);
      console.log('[Push] Subscribed to backend');
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
    }
  };

  const unsubscribe = async () => {
    try {
      await apiClient.delete(`/api/notifications/mobile-push-subscriptions/${fcmToken}/`);
      await messaging().deleteToken();
      setIsSubscribed(false);
      console.log('[Push] Unsubscribed');
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
    }
  };

  return {
    fcmToken,
    isSubscribed,
    unsubscribe
  };
};
```

#### 4. Backend Support for FCM 🚧 **NEW MODEL NEEDED**

**Create:** `backend/apps/notifications/models.py` (add to existing file)

```python
class MobilePushSubscription(models.Model):
    """Store mobile push notification subscriptions (FCM/APNs)."""

    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mobile_push_subscriptions'
    )

    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    fcm_token = models.CharField(max_length=500, unique=True)
    device_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user'], name='idx_mobile_push_user'),
            models.Index(fields=['is_active'], name='idx_mobile_push_active'),
        ]
```

**Backend Service for FCM:**

```python
# backend/apps/notifications/services.py

import firebase_admin
from firebase_admin import credentials, messaging as fcm_messaging

class MobilePushService:
    """Service for sending push notifications to mobile devices via FCM."""

    @staticmethod
    def initialize_firebase():
        """Initialize Firebase Admin SDK (call once at startup)."""
        if not firebase_admin._apps:
            cred = credentials.Certificate('path/to/serviceAccountKey.json')
            firebase_admin.initialize_app(cred)

    @staticmethod
    def send_to_fcm_token(token: str, title: str, message: str, data: dict = None):
        """Send push notification via Firebase Cloud Messaging."""
        MobilePushService.initialize_firebase()

        notification = fcm_messaging.Notification(
            title=title,
            body=message
        )

        message_payload = fcm_messaging.Message(
            notification=notification,
            data=data or {},
            token=token
        )

        try:
            response = fcm_messaging.send(message_payload)
            logger.info(f"[FCM] Message sent successfully: {response}")
            return True
        except Exception as e:
            logger.error(f"[FCM] Failed to send message: {e}")
            return False
```

### Option 2: PWA Fallback (For Mobile Browsers) ✅

If users access your app via mobile browser instead of native app, the **same web push implementation** from the Web Frontend section will work on:

- ✅ Chrome on Android
- ✅ Edge on Android
- ✅ Samsung Internet
- ❌ Safari on iOS (limited support)

**No additional code needed** - the React + Service Worker implementation handles this automatically.

---

## Role-Based Alert Filtering

### Current Implementation (Already Correct ✅)

```python
# backend/apps/sensors/alert_service.py

# Send to device owner (regular user)
result = PushNotificationService.send_alert_notification(
    user=user,  # Device owner or collaborator
    alert_title=title,
    alert_message=body,
    alert_type=severity,
    device_id=device.id,
)

# Only broadcast to admins if critical or unbound device
if severity == 'critical' or not device.is_bound:
    PushNotificationService.send_to_all_admins(
        title=f"🌱 {title}",
        message=body,
        notification_type=severity,
        url=f"/alerts?device={device.id}",
        data={'device_id': device.id, 'alert_type': severity}
    )
```

```python
# backend/apps/notifications/services.py

@staticmethod
def send_to_all_admins(title, message, **kwargs):
    """Send notification to all staff/admin users."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    # Filter by is_staff=True (ENFORCED HERE)
    admin_users = User.objects.filter(
        is_staff=True,
        is_active=True
    )

    for user in admin_users:
        # Only send to admins with device_alerts enabled
        preferences = UserPreferences.objects.filter(user=user).first()
        if preferences and not preferences.device_alerts:
            continue

        PushNotificationService.send_notification(user, title, message, **kwargs)
```

### Alert Scope Field (Future Enhancement) 🚧 **OPTIONAL**

**Add to:** `backend/apps/sensors/models.py`

```python
class Alert(models.Model):
    """Alert model for sensor threshold breaches."""

    SCOPE_CHOICES = [
        ('user', 'User - Device Owner Only'),
        ('device', 'Device - Owner + Collaborators'),
        ('admin', 'Admin - Staff Only'),
        ('global', 'Global - All Users'),
    ]

    alert_scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='user',
        help_text='Who should receive this alert'
    )
```

**Usage in alert service:**

```python
def send_alert(alert):
    if alert.alert_scope == 'admin':
        # Only send to admins
        PushNotificationService.send_to_all_admins(...)
    elif alert.alert_scope == 'user':
        # Only send to device owner
        PushNotificationService.send_alert_notification(user=device.owner, ...)
    elif alert.alert_scope == 'device':
        # Send to owner + collaborators
        for user in get_device_users(device):
            PushNotificationService.send_alert_notification(user, ...)
    elif alert.alert_scope == 'global':
        # Send to all active users
        PushNotificationService.send_to_all_users(...)
```

---

## Testing & Validation

### 1. Backend Testing

#### Test VAPID Keys

```bash
cd backend
python manage.py shell
```

```python
from django.conf import settings

print(f"Private Key: {settings.VAPID_PRIVATE_KEY[:20]}...")
print(f"Public Key: {settings.VAPID_PUBLIC_KEY[:20]}...")
print(f"Admin Email: {settings.VAPID_ADMIN_EMAIL}")
```

#### Test Push Subscription API

```bash
# Get VAPID public key
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/notifications/push-subscriptions/vapid_public_key/

# Subscribe
curl -X POST -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "BASE64_KEY",
      "auth": "BASE64_AUTH"
    }
  }' \
  http://localhost:8000/api/notifications/push-subscriptions/subscribe/

# Send test notification
curl -X POST -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Alert",
    "message": "This is a test",
    "notification_type": "info"
  }' \
  http://localhost:8000/api/notifications/push-subscriptions/test_notification/
```

#### Test Admin-Only Filtering

```python
# Create test users
from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.create_user(
    email='admin@test.com',
    is_staff=True,
    is_active=True
)

regular_user = User.objects.create_user(
    email='user@test.com',
    is_staff=False,
    is_active=True
)

# Send admin-only alert
from apps.notifications.services import PushNotificationService

result = PushNotificationService.send_to_all_admins(
    title='Admin Test',
    message='This should only go to admins'
)

# Verify: admin@test.com should receive, user@test.com should NOT
```

### 2. Frontend Testing

#### Test Service Worker Registration

1. Open browser DevTools → Application → Service Workers
2. Verify `sw.js` is registered and activated
3. Check "Update on reload" during development

#### Test Push Subscription

```javascript
// In browser console
navigator.serviceWorker.ready.then(async (registration) => {
  const subscription = await registration.pushManager.getSubscription();
  console.log('Current subscription:', subscription);
});
```

#### Test Notification Display

```javascript
// In browser console
navigator.serviceWorker.ready.then((registration) => {
  registration.showNotification('Test', {
    body: 'This is a test notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png'
  });
});
```

### 3. End-to-End Testing Checklist

- [ ] VAPID keys generated and configured
- [ ] Service Worker registers successfully
- [ ] User can subscribe/unsubscribe
- [ ] Test notification appears as system popup
- [ ] Notification click opens correct URL
- [ ] Admin-only alerts sent only to `is_staff=True` users
- [ ] Regular users receive only their device alerts
- [ ] Critical alerts trigger admin broadcast
- [ ] Quiet hours respected for non-critical alerts
- [ ] Email sent when `email_enabled=True`
- [ ] Expired subscriptions (410 Gone) marked inactive
- [ ] NotificationLog entries created correctly

---

## Production Deployment Checklist

### Backend

- [ ] Generate production VAPID keys (different from dev)
- [ ] Add VAPID keys to production environment variables
- [ ] Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- [ ] Set `DEBUG=False`
- [ ] Configure production email backend (Brevo/SMTP)
- [ ] Run migrations: `python manage.py migrate`
- [ ] Install `pywebpush`: `pip install pywebpush`
- [ ] For mobile: Setup Firebase Admin SDK and add `serviceAccountKey.json`
- [ ] Configure HTTPS (required for service workers)

### Frontend

- [ ] Update `VITE_API_BASE_URL` to production URL
- [ ] Ensure `sw.js` is in `public/` directory
- [ ] Build production bundle: `npm run build`
- [ ] Configure PWA manifest with correct icons
- [ ] Test HTTPS configuration (service workers require HTTPS)
- [ ] Add `NotificationSettings` component to user settings page
- [ ] Test on different browsers (Chrome, Firefox, Edge)

### Mobile (if using native app)

- [ ] Add Firebase configuration files
- [ ] Request notification permissions on first launch
- [ ] Handle deep links for notification clicks
- [ ] Test on physical devices (iOS + Android)
- [ ] Configure APNs certificate (iOS only)

### Infrastructure

- [ ] Configure reverse proxy (Nginx/Apache) for HTTPS
- [ ] Set up SSL certificate (Let's Encrypt recommended)
- [ ] Configure firewall to allow push service endpoints
- [ ] Monitor push notification delivery rates
- [ ] Set up logging/monitoring for failed pushes

---

## Troubleshooting & Best Practices

### Common Issues

#### 1. Notifications not appearing

**Check:**
- Is Notification permission granted? (`Notification.permission === 'granted'`)
- Is service worker registered and activated?
- Are VAPID keys correctly configured?
- Is the site served over HTTPS? (localhost is OK for testing)
- Check browser console for errors
- Verify subscription exists in backend database

#### 2. Subscription fails

**Check:**
- VAPID public key correctly formatted (no spaces/newlines)
- Service worker scope matches application scope
- Browser supports Push API (check `'PushManager' in window`)
- Network connectivity
- Backend API reachable

#### 3. Admin-only alerts sent to users

**Check:**
- `send_to_all_admins()` filters by `is_staff=True`
- Regular alert flow uses `send_alert_notification(user=device_owner)`
- No direct calls to `send_notification()` without user filtering
- NotificationLog metadata includes correct `alert_scope`

#### 4. Service worker not updating

**Solutions:**
- Enable "Update on reload" in DevTools → Application → Service Workers
- Call `registration.update()` periodically
- Increment cache version (`CACHE_NAME`)
- Use `skipWaiting()` in install event

### Best Practices

#### 1. **Always request permission explicitly**
```javascript
// Good: Ask when user clicks "Enable Notifications"
button.onclick = async () => {
  await Notification.requestPermission();
};

// Bad: Ask immediately on page load
window.onload = () => Notification.requestPermission();
```

#### 2. **Handle permission denial gracefully**
```javascript
if (Notification.permission === 'denied') {
  showMessage('Notifications blocked. Please enable in browser settings.');
}
```

#### 3. **Respect quiet hours**
```python
# Already implemented in NotificationPreferences
def should_send_notification(self, notification_type):
    if notification_type in ['critical', 'alert']:
        return True  # Always send critical
    if self.is_quiet_hours():
        return False  # Skip during quiet hours
    return self.allows_notification_type(notification_type)
```

#### 4. **Monitor and clean up expired subscriptions**
```python
# Run periodic task to remove expired subscriptions
from apps.notifications.models import PushSubscription
from datetime import timedelta
from django.utils import timezone

# Remove subscriptions inactive for 30+ days
threshold = timezone.now() - timedelta(days=30)
PushSubscription.objects.filter(
    is_active=False,
    updated_at__lt=threshold
).delete()
```

#### 5. **Batch notifications when possible**
```python
# Instead of sending individually
for user in users:
    send_notification(user, title, message)

# Use batch sending
user_ids = [u.id for u in users]
PushNotificationService.send_to_multiple_users(user_ids, title, message)
```

#### 6. **Log everything for debugging**
```python
logger.info(f"[Push] Sending to {user.email}: {title}")
logger.info(f"[Push] Subscription endpoint: {subscription.endpoint[:50]}...")
logger.info(f"[Push] Result: sent={result['sent']}, failed={result['failed']}")
```

#### 7. **Test across browsers and devices**
- Chrome/Edge (full support)
- Firefox (full support)
- Safari on macOS (limited support)
- Safari on iOS (no web push, use native app)
- Mobile browsers (Android Chrome, Samsung Internet)

---

## Next Steps

### Immediate Actions (Today)

1. **Generate VAPID Keys:**
   ```bash
   pip install py-vapid
   vapid --gen
   ```

2. **Update `backend/.env`:**
   ```bash
   VAPID_PRIVATE_KEY=your_private_key
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_ADMIN_EMAIL=admin@smartanom.com
   ```

3. **Update `frontend/public/sw.js`** with enhanced version from this document

4. **Create `frontend/src/hooks/usePushNotifications.js`**

5. **Create `frontend/src/components/NotificationSettings.jsx`**

6. **Test locally:**
   ```bash
   # Backend
   cd backend
   python manage.py runserver

   # Frontend
   cd frontend
   npm run dev
   ```

### Short-term (This Week)

1. Integrate `NotificationSettings` into user profile/settings page
2. Test on multiple browsers (Chrome, Firefox, Edge)
3. Test admin-only alert filtering with test users
4. Review and customize notification UI/UX

### Mid-term (This Month)

1. Implement mobile push (Firebase) if using React Native
2. Add quiet hours UI in frontend
3. Create admin dashboard for monitoring push delivery
4. Set up automated tests for push subscription flow

### Long-term (Next Quarter)

1. Add analytics for notification open rates
2. Implement notification grouping for multiple alerts
3. Add rich notification content (images, actions)
4. Optimize battery usage on mobile devices

---

## Summary

### What's Already Working ✅

- ✅ Django backend with complete push notification models
- ✅ VAPID-based web push service
- ✅ Admin-only alert filtering (`is_staff=True`)
- ✅ Email notification integration
- ✅ NotificationLog for debugging
- ✅ Quiet hours support
- ✅ Service worker foundation

### What Was Fixed Today ✅

- ✅ Removed "Open SmarTanom" buttons from all email templates
- ✅ Verified admin-only alert delivery (no issues found)

### What You Need to Implement 🚧

- 🚧 Generate and configure VAPID keys
- 🚧 Enhance service worker with notification click handling
- 🚧 Create React hook for push subscription management
- 🚧 Create React UI component for notification settings
- 🚧 (Optional) Implement mobile push with Firebase

### Key Files Modified ✅

1. `backend/templates/emails/otp_email.html` - Removed button
2. `backend/templates/emails/device_binding_otp_email.html` - Removed button
3. `backend/templates/emails/device_revoke_otp_email.html` - Removed button
4. `backend/templates/emails/alert_notification.html` - Removed button

### Contact & Support

For questions or issues with this implementation:
- Review this document's [Troubleshooting](#troubleshooting--best-practices) section
- Check browser console and Django logs
- Verify VAPID keys are correctly configured
- Test with simple test notification first

**Good luck with your production deployment! 🚀🌱**
