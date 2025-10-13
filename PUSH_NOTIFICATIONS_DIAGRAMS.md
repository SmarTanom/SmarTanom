# Push Notifications Flow Diagrams

Visual guides to understand how push notifications work in SmarTanom.

## 1. Subscription Flow

```
┌──────────────┐
│     User     │
│ (Browser)    │
└──────┬───────┘
       │
       │ 1. Clicks "Enable Notifications"
       │
       ▼
┌──────────────────────────────────────┐
│  NotificationPermission Component    │
│  (React)                             │
└──────┬───────────────────────────────┘
       │
       │ 2. Requests browser permission
       │
       ▼
┌──────────────────────────────────────┐
│   Browser Permission Prompt          │
│   "Allow smartanom.com to send      │
│    notifications?"                   │
└──────┬───────────────────────────────┘
       │
       │ 3. User clicks "Allow"
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker                     │
│   (sw.js)                            │
└──────┬───────────────────────────────┘
       │
       │ 4. Registers with Push Service
       │
       ▼
┌──────────────────────────────────────┐
│   Browser Push Service               │
│   (FCM for Chrome, etc.)             │
│   Returns: endpoint + keys           │
└──────┬───────────────────────────────┘
       │
       │ 5. Returns subscription object
       │
       ▼
┌──────────────────────────────────────┐
│   notifications.js API Service      │
│   Calls: subscribeToPush()          │
└──────┬───────────────────────────────┘
       │
       │ 6. POST /api/notifications/subscriptions/subscribe/
       │    Body: {endpoint, p256dh, auth, user_agent}
       │
       ▼
┌──────────────────────────────────────┐
│   Django Backend                     │
│   PushSubscriptionViewSet            │
└──────┬───────────────────────────────┘
       │
       │ 7. Creates PushSubscription record
       │
       ▼
┌──────────────────────────────────────┐
│   PostgreSQL Database                │
│   notifications_pushsubscription     │
│   - user_id                          │
│   - endpoint                         │
│   - p256dh                           │
│   - auth                             │
│   - user_agent                       │
│   - created_at                       │
└──────┬───────────────────────────────┘
       │
       │ 8. Returns 201 Created
       │
       ▼
┌──────────────────────────────────────┐
│   React Component                    │
│   Shows "Subscription: Active ✅"    │
└──────────────────────────────────────┘
```

## 2. Notification Send Flow

```
┌──────────────────────────────────────┐
│   Trigger Event                      │
│   (Sensor alert, manual send, etc.)  │
└──────┬───────────────────────────────┘
       │
       │ 1. Code calls service
       │
       ▼
┌──────────────────────────────────────┐
│   PushNotificationService.send()     │
│   (Python)                           │
└──────┬───────────────────────────────┘
       │
       │ 2. Fetches user's subscriptions
       │
       ▼
┌──────────────────────────────────────┐
│   PostgreSQL Database                │
│   Query: PushSubscription.objects    │
│          .filter(user=user)          │
└──────┬───────────────────────────────┘
       │
       │ 3. Returns subscription(s)
       │
       ▼
┌──────────────────────────────────────┐
│   For Each Subscription:             │
│   PushNotificationService            │
│   ._send_to_subscription()           │
└──────┬───────────────────────────────┘
       │
       │ 4. Prepares notification payload
       │    {title, body, icon, badge, data}
       │
       ▼
┌──────────────────────────────────────┐
│   pywebpush.webpush()                │
│   - Signs with VAPID keys            │
│   - Encrypts payload                 │
│   - Sends HTTP/2 push                │
└──────┬───────────────────────────────┘
       │
       │ 5. HTTPS POST to endpoint
       │    Authorization: WebPush <JWT>
       │    Crypto-Key: p256ecdsa=...
       │    Content-Encoding: aes128gcm
       │
       ▼
┌──────────────────────────────────────┐
│   Browser Push Service               │
│   (FCM, Mozilla Push, etc.)          │
│   Validates VAPID signature          │
└──────┬───────────────────────────────┘
       │
       │ 6. Routes to user's device
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker (sw.js)             │
│   Receives 'push' event              │
└──────┬───────────────────────────────┘
       │
       │ 7. Parses payload
       │    const data = event.data.json();
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker                     │
│   self.registration.showNotification │
│   (title, {body, icon, badge, ...})  │
└──────┬───────────────────────────────┘
       │
       │ 8. Displays notification
       │
       ▼
┌──────────────────────────────────────┐
│   User's Device                      │
│   🔔 Notification appears            │
│   "pH Alert"                         │
│   "Critical: pH level is 4.2!"       │
└──────────────────────────────────────┘
```

## 3. Notification Click Flow

```
┌──────────────────────────────────────┐
│   User's Device                      │
│   🔔 Notification visible            │
└──────┬───────────────────────────────┘
       │
       │ 1. User clicks notification
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker (sw.js)             │
│   Receives 'notificationclick' event │
└──────┬───────────────────────────────┘
       │
       │ 2. Closes notification
       │    event.notification.close();
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker                     │
│   Extracts target URL from           │
│   event.notification.data.url        │
└──────┬───────────────────────────────┘
       │
       │ 3. Searches for existing window
       │    clients.matchAll({type: 'window'})
       │
       ▼
┌──────────────────────────────────────┐
│   Open Windows Check                 │
│   Is app already open?               │
└──────┬───────────────────────────────┘
       │
       ├── YES ──────────────────────────┐
       │                                  │
       │ 4a. Focus existing window        │
       │     client.focus()               │
       │                                  │
       │ 5a. Navigate to URL              │
       │     (if different page)          │
       │                                  │
       └──────────────────────────────────┤
                                          │
       ├── NO ───────────────────────────┤
       │                                  │
       │ 4b. Open new window              │
       │     clients.openWindow(url)      │
       │                                  │
       └──────────────────────────────────┤
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │   Browser Window         │
                              │   App opened to:         │
                              │   /device/123            │
                              └──────────────────────────┘
```

## 4. Background Notification Flow

```
┌──────────────────────────────────────┐
│   User closes browser completely     │
│   (App not running)                  │
└──────────────────────────────────────┘
       │
       │ Meanwhile...
       │
┌──────────────────────────────────────┐
│   Backend sends notification         │
│   (via PushNotificationService)      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│   Browser Push Service               │
│   (Cloud service, always running)    │
└──────┬───────────────────────────────┘
       │
       │ Wakes up service worker
       │
       ▼
┌──────────────────────────────────────┐
│   Service Worker                     │
│   (Runs independently of app)        │
│   Receives push event                │
└──────┬───────────────────────────────┘
       │
       │ Shows notification
       │
       ▼
┌──────────────────────────────────────┐
│   🔔 Notification appears on device  │
│   (Even though app is closed!)       │
└──────┬───────────────────────────────┘
       │
       │ User clicks notification
       │
       ▼
┌──────────────────────────────────────┐
│   Browser launches                   │
│   Opens app to relevant page         │
└──────────────────────────────────────┘
```

## 5. Error Handling Flow

```
┌──────────────────────────────────────┐
│   Notification send attempt          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│   Try: Send via pywebpush            │
└──────┬───────────────────────────────┘
       │
       ├── Success (200-201) ────────────┐
       │                                  │
       │ Log success ✅                   │
       │ NotificationLog.objects.create   │
       │   success=True                   │
       │                                  │
       └──────────────────────────────────┤
                                          │
       ├── Expired (410 Gone) ───────────┤
       │                                  │
       │ Delete subscription from DB      │
       │ PushSubscription.objects         │
       │   .filter(endpoint=...).delete() │
       │                                  │
       │ Log error ⚠️                     │
       │   error_message="Subscription    │
       │   expired"                       │
       │                                  │
       └──────────────────────────────────┤
                                          │
       ├── Other Error (4xx, 5xx) ───────┤
       │                                  │
       │ Log error ❌                     │
       │ NotificationLog.objects.create   │
       │   success=False                  │
       │   error_message=str(e)           │
       │                                  │
       │ Retry logic (optional)           │
       │                                  │
       └──────────────────────────────────┤
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │   Return result          │
                              │   Continue to next       │
                              │   subscription (if any)  │
                              └──────────────────────────┘
```

## 6. Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│                                                                  │
│  ┌────────────────┐       ┌────────────────┐                   │
│  │  Profile Page  │───────│ Notification   │                   │
│  │                │       │ Permission     │                   │
│  │  - Settings    │       │ Component      │                   │
│  │  - User info   │       │                │                   │
│  └────────────────┘       └────┬───────────┘                   │
│                                 │                                │
│                                 │ Uses                           │
│                                 ▼                                │
│                    ┌────────────────────────┐                   │
│                    │ notifications.js       │                   │
│                    │ API Service            │                   │
│                    │                        │                   │
│                    │ - subscribeToPush()    │                   │
│                    │ - unsubscribeFromPush()│                   │
│                    │ - sendTestNotification()│                   │
│                    └────────┬───────────────┘                   │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTPS
                              │ /api/notifications/
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                         Backend                                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐         │
│  │  PushSubscriptionViewSet (REST API)                │         │
│  │  - POST /subscribe/                                │         │
│  │  - POST /unsubscribe/                              │         │
│  │  - POST /test_notification/                        │         │
│  │  - GET /vapid_public_key/                          │         │
│  └────────────┬───────────────────────┬───────────────┘         │
│               │                       │                          │
│               ▼                       ▼                          │
│  ┌────────────────────┐   ┌──────────────────────┐             │
│  │  PushSubscription  │   │ NotificationLog      │             │
│  │  Model             │   │ Model                │             │
│  │                    │   │                      │             │
│  │  - user (FK)       │   │ - user (FK)          │             │
│  │  - endpoint        │   │ - title              │             │
│  │  - p256dh          │   │ - body               │             │
│  │  - auth            │   │ - sent_at            │             │
│  │  - user_agent      │   │ - success            │             │
│  │  - created_at      │   │ - error_message      │             │
│  └────────────────────┘   └──────────────────────┘             │
│               ▲                       ▲                          │
│               │                       │                          │
│               └───────────┬───────────┘                          │
│                           │                                      │
│               ┌───────────▼────────────┐                         │
│               │ PushNotificationService│                         │
│               │                        │                         │
│               │ - send_notification()  │                         │
│               │ - send_alert_...()     │                         │
│               │ - send_to_multiple...()│                         │
│               └───────────┬────────────┘                         │
│                           │                                      │
│                           │ Uses pywebpush                       │
│                           ▼                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTPS + VAPID
                            │ Web Push Protocol
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                  Browser Push Service                             │
│                  (FCM, Mozilla Push, etc.)                        │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ Push notification
                            ▼
                    ┌────────────────┐
                    │ User's Device  │
                    │ Service Worker │
                    │ (sw.js)        │
                    └────────────────┘
```

## 7. Component Interaction Diagram

```
React Component Lifecycle with Notifications:

┌────────────────────────────────────────────────────────────┐
│                   NotificationPermission                    │
│                   Component Mounted                         │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ useEffect() runs       │
            │ - checkSupport()       │
            │ - checkSubscription()  │
            └────────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────────┐      ┌────────────────────┐
│ isPushSupported()  │      │ isSubscribed()     │
│ Returns: boolean   │      │ Returns: boolean   │
└────────┬───────────┘      └────────┬───────────┘
         │                           │
         ▼                           ▼
┌────────────────────────────────────────────────┐
│              Update State                      │
│  - supported: true/false                       │
│  - subscribed: true/false                      │
│  - permission: granted/denied/default          │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│              Render UI                         │
│  IF supported:                                 │
│    IF subscribed:                              │
│      - Show "Send Test" button                 │
│      - Show "Disable" button                   │
│    ELSE:                                       │
│      - Show "Enable Notifications" button      │
│  ELSE:                                         │
│    - Show "Not Supported" message              │
└────────────────────────────────────────────────┘
```

## 8. Security Flow (VAPID)

```
VAPID Authentication Process:

┌────────────────────────────────────────────────────────────┐
│  Backend (Django)                                          │
│                                                            │
│  1. Generate VAPID Key Pair                               │
│     python manage.py generate_vapid_keys                  │
│                                                            │
│     ┌──────────────┐          ┌──────────────┐           │
│     │ Private Key  │          │ Public Key   │           │
│     │ (Keep Secret)│          │ (Share)      │           │
│     └──────┬───────┘          └──────┬───────┘           │
│            │                         │                    │
└────────────┼─────────────────────────┼────────────────────┘
             │                         │
             │ Stored in env           │ Served via API
             │ variable                │
             ▼                         ▼
    ┌─────────────────┐      ┌──────────────────┐
    │ Settings:       │      │ GET /vapid_      │
    │ VAPID_PRIVATE   │      │ public_key/      │
    │ _KEY            │      │                  │
    └─────────┬───────┘      └────────┬─────────┘
              │                       │
              │                       │
              │            ┌──────────▼──────────┐
              │            │  Frontend            │
              │            │  Receives public key │
              │            │  Uses for subscribe  │
              │            └──────────┬──────────┘
              │                       │
              │                       │ Subscribe with public key
              │                       ▼
              │            ┌───────────────────────┐
              │            │ Browser Push Service  │
              │            │ Stores public key     │
              │            └───────────┬───────────┘
              │                        │
              │ Later...               │
              │                        │
┌─────────────▼────────────┐          │
│ Send Notification:       │          │
│ pywebpush.webpush()      │          │
│ - Signs with private key │          │
│ - Creates JWT token      │          │
│ - Includes in headers    │          │
└─────────────┬────────────┘          │
              │                        │
              │ HTTPS POST             │
              │ Authorization:         │
              │ WebPush <JWT>          │
              └────────────────────────▼──────────┐
                              │ Browser Push Service│
                              │ Verifies signature  │
                              │ using public key    │
                              └─────────┬───────────┘
                                        │
                                        │ Signature valid ✅
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │ Delivers to device  │
                              └─────────────────────┘
```

## 9. Logging Flow

```
Notification Lifecycle with Logging:

┌────────────────────────────────────────────────────────────┐
│  Application Code                                          │
│  PushNotificationService.send_notification()               │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│  Loop through user's subscriptions                         │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│  For each subscription:                                    │
│  Try sending                                               │
└────┬───────────────────────────────────────┬───────────────┘
     │                                       │
     │ Success                               │ Failure
     ▼                                       ▼
┌──────────────────────┐         ┌───────────────────────────┐
│ Create NotificationLog│         │ Create NotificationLog    │
│ - success = True      │         │ - success = False         │
│ - error_message = None│         │ - error_message = str(e)  │
│ - sent_at = now()     │         │ - sent_at = now()         │
└──────────┬───────────┘         └───────────┬───────────────┘
           │                                  │
           │                                  │
           └──────────────┬───────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────┐
         │  PostgreSQL Database               │
         │  notifications_notificationlog     │
         │                                    │
         │  Available in:                     │
         │  - Django admin                    │
         │  - API: /api/notifications/logs/   │
         │  - Analytics queries               │
         └────────────────────────────────────┘
```

## 10. Complete User Journey

```
New User to Receiving Notifications:

Day 1: Sign Up
┌─────────────────┐
│ User creates    │
│ account         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Logs in         │
│ Sees dashboard  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Goes to Profile │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Sees "Push Notifications"   │
│ section                     │
│ Status: Inactive            │
└────────┬────────────────────┘
         │
         │ Clicks "Enable Notifications"
         │
         ▼
┌─────────────────────────────┐
│ Browser permission prompt   │
│ "Allow smartanom.com..."    │
└────────┬────────────────────┘
         │
         │ Clicks "Allow"
         │
         ▼
┌─────────────────────────────┐
│ Status: Active ✅           │
│ Shows "Send Test" button    │
└────────┬────────────────────┘
         │
         │ Clicks "Send Test"
         │
         ▼
┌─────────────────────────────┐
│ 🔔 Test notification appears│
│ "SmarTanom Test Notification"│
└────────┬────────────────────┘
         │
         │ Clicks notification
         │
         ▼
┌─────────────────────────────┐
│ App opens/focuses           │
│ Confirms it works!          │
└─────────────────────────────┘

Day 2: Real Alert
┌─────────────────────────────┐
│ User adds device            │
│ Device collects sensor data │
└────────┬────────────────────┘
         │
         │ pH level drops below threshold
         │
         ▼
┌─────────────────────────────┐
│ Backend monitoring detects  │
│ Calls PushNotificationService│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 🔔 Alert notification:      │
│ "pH Alert"                  │
│ "Critical: pH level 4.2!"   │
└────────┬────────────────────┘
         │
         │ User sees notification
         │ (even if app was closed!)
         │
         ▼
┌─────────────────────────────┐
│ Clicks notification         │
│ Opens to device details     │
│ Takes corrective action     │
└─────────────────────────────┘

Ongoing: Regular Use
┌─────────────────────────────┐
│ User receives:              │
│ - Daily summaries           │
│ - Critical alerts           │
│ - System updates            │
│ - Harvest reminders         │
│                             │
│ All delivered in real-time  │
│ even when app closed!       │
└─────────────────────────────┘
```

---

These diagrams should help developers and users understand the complete push notification system flow!
