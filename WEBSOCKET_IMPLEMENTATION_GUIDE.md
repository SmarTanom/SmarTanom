# SmarTanom - Production-Ready Real-Time System Implementation

## ✅ COMPLETED: Backend WebSocket & JWT Setup

### 1. **Packages Installed**
```bash
pip install channels==4.0.0 channels-redis==4.2.0 daphne==4.1.0 djangorestframework-simplejwt==5.3.1
```

### 2. **Files Created/Modified**

#### ✅ `apps/devices/consumers.py` (NEW)
- `DeviceConsumer`: Broadcast device updates to all connected clients
- `UserConsumer`: User-specific notifications
- WebSocket URL: `ws://localhost:8000/ws/devices/`
- Production: `wss://your-app.onrender.com/ws/devices/`

#### ✅ `smartanom/routing.py` (NEW)
- WebSocket URL routing configuration
- Maps `/ws/devices/` → DeviceConsumer
- Maps `/ws/user/<user_id>/` → UserConsumer

#### ✅ `smartanom/asgi.py` (UPDATED)
- Configured ProtocolTypeRouter for HTTP + WebSocket
- Supports both Django (HTTP) and Channels (WebSocket)

#### ✅ `smartanom/settings.py` (UPDATED)
- Added `daphne` (first in INSTALLED_APPS)
- Added `channels` and `rest_framework_simplejwt`
- Configured `ASGI_APPLICATION`
- Added `CHANNEL_LAYERS` (Redis for production, InMemory for development)
- Added `SIMPLE_JWT` configuration
- JWT authentication added to REST_FRAMEWORK

### 3. **Configuration Details**

**Channel Layers:**
- Development: InMemoryChannelLayer (single worker)
- Production: RedisChannelLayer (multi-worker, requires REDIS_URL env var)

**JWT Settings:**
- Access Token: 60 minutes
- Refresh Token: 7 days
- Rotate refresh tokens on use
- Bearer token authentication

**CORS:**
- Development: Allow all origins
- Production: Restrict to CORS_ALLOWED_ORIGINS env var

---

## 🎯 NEXT STEPS: Complete Implementation

### Phase 2: Update Backend Views with WebSocket Broadcasting

**File: `apps/devices/views.py`**

Need to add WebSocket broadcasting in:

1. **bind_otp** - No broadcast needed
2. **confirm_bind** - Broadcast when device is bound
3. **admin_unbind** - Broadcast when device is unbound
4. **add_collaborator** - Broadcast when collaborator added
5. **admin_revoke_access** - Broadcast when access revoked

**Example Implementation:**

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime

def broadcast_device_update(action, device, **extra_data):
    """Broadcast device update via WebSocket."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "devices",
            {
                "type": "device_update",
                "action": action,
                "data": {
                    "device_id": device.id,
                    "device_serial": device.device_serial,
                    "bound_email": device.bound_email,
                    "is_bound": device.is_bound,
                    **extra_data
                },
                "timestamp": datetime.now().isoformat()
            }
        )

# In confirm_bind action:
broadcast_device_update("bind", device, user_created=created)

# In admin_unbind_device action:
broadcast_device_update("unbind", device, old_email=old_email)

# In add_collaborator action:
broadcast_device_update("collaborator_added", device, collaborator_email=email, user_id=user.id)

# In admin_revoke_access action:
broadcast_device_update("collaborator_revoked", device, collaborator_email=email, user_deactivated=user_deactivated)
```

### Phase 3: Add JWT Authentication Endpoints

**File: `apps/accounts/urls.py`** (UPDATE)

```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Existing OTP auth
    path('request-otp/', views.request_otp, name='request-otp'),
    path('verify-otp/', views.verify_otp, name='verify-otp'),

    # NEW: JWT endpoints
    path('jwt/login/', TokenObtainPairView.as_view(), name='jwt_login'),
    path('jwt/refresh/', TokenRefreshView.as_view(), name='jwt_refresh'),
    path('jwt/verify/', TokenVerifyView.as_view(), name='jwt_verify'),
]
```

**Optional: Custom JWT View with OTP Integration**

```python
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        token['role'] = 'admin' if user.is_staff else 'user'
        return token

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
```

---

## 📱 FRONTEND IMPLEMENTATION

### Phase 4: Create WebSocket Service

**File: `frontend/src/services/websocketClient.js`** (NEW)

```javascript
/**
 * WebSocket client for real-time device updates.
 * Automatically reconnects on disconnect.
 * Works in both development and production.
 */

const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' +
  (import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || window.location.host);

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Set();
  }

  connect() {
    const wsUrl = `${WS_BASE_URL}/ws/devices/`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          // Notify all listeners
          this.listeners.forEach(callback => callback(data));
        } catch (error) {
          console.error('[WebSocket] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback); // Unsubscribe function
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
```

### Phase 5: Update AdminDevices Component

**File: `frontend/src/pages/AdminDevices.jsx`** (UPDATE)

```javascript
import { useEffect, useState } from 'react';
import { wsClient } from '../services/websocketClient';

function AdminDevices() {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    // Connect to WebSocket
    wsClient.connect();

    // Subscribe to device updates
    const unsubscribe = wsClient.subscribe((update) => {
      const { action, data } = update;

      switch (action) {
        case 'bind':
          // Update device list when device is bound
          setDevices(prev => prev.map(d =>
            d.id === data.device_id
              ? { ...d, is_bound: true, bound_email: data.bound_email }
              : d
          ));
          break;

        case 'unbind':
          // Update device list when device is unbound
          setDevices(prev => prev.map(d =>
            d.id === data.device_id
              ? { ...d, is_bound: false, bound_email: null }
              : d
          ));
          break;

        case 'collaborator_added':
          // Refresh collaborators list
          if (selectedDevice?.id === data.device_id) {
            fetchCollaborators();
          }
          break;

        case 'collaborator_revoked':
          // Refresh collaborators list
          if (selectedDevice?.id === data.device_id) {
            fetchCollaborators();
          }
          break;
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  // Rest of component...
}
```

### Phase 6: Environment Variables

**File: `frontend/.env`** (UPDATE)

```env
# API Configuration
VITE_API_URL=http://127.0.0.1:8000

# WebSocket Configuration (auto-derived if not set)
# Development: ws://127.0.0.1:8000
# Production: wss://your-app.onrender.com
VITE_WS_URL=ws://127.0.0.1:8000
```

**File: `backend/.env`** (UPDATE)

```env
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=sqlite:///db.sqlite3

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Redis (for production Channels)
# REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:5173
NETLIFY_URL=https://your-app.netlify.app
```

---

## 🚀 DEPLOYMENT CONFIGURATION

### Render (Backend)

**Build Command:**
```bash
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
```

**Start Command:**
```bash
daphne -b 0.0.0.0 -p $PORT smartanom.asgi:application
```

**Environment Variables:**
```
DEBUG=False
SECRET_KEY=<generate-secure-key>
DATABASE_URL=<postgres-url-from-render>
REDIS_URL=<redis-url-from-render>
ALLOWED_HOSTS=your-app.onrender.com
CORS_ALLOWED_ORIGINS=https://your-app.netlify.app
NETLIFY_URL=https://your-app.netlify.app
```

### Netlify (Frontend)

**Build Command:**
```bash
npm run build
```

**Publish Directory:**
```
dist
```

**Environment Variables:**
```
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com
```

---

## ✅ TESTING CHECKLIST

### Local Testing
- [ ] Django server runs with Daphne: `daphne -b 127.0.0.1 -p 8000 smartanom.asgi:application`
- [ ] WebSocket connects successfully
- [ ] Device binding triggers real-time update
- [ ] Collaborator add/revoke triggers real-time update
- [ ] No CORS errors in browser console
- [ ] Toast notifications appear correctly

### Production Testing
- [ ] Render deployment successful
- [ ] Netlify deployment successful
- [ ] WebSocket works over WSS (secure)
- [ ] JWT authentication works
- [ ] All API endpoints return valid JSON
- [ ] Real-time updates work across different browsers
- [ ] Mobile responsive
- [ ] No 404/500 errors

---

## 📝 CURRENT STATUS

✅ **COMPLETED:**
- Django Channels installed and configured
- WebSocket consumers created
- ASGI configured for HTTP + WebSocket
- JWT authentication configured
- CORS configured
- Channel layers configured (Redis for production, InMemory for dev)

⏳ **IN PROGRESS:**
- Add WebSocket broadcasting to device views
- Create frontend WebSocket client
- Update AdminDevices with real-time updates

❌ **TODO:**
- Add JWT auth endpoints
- Update frontend API client with JWT support
- Test end-to-end with WebSocket
- Deploy to Render + Netlify
- Configure Redis for production

---

## 🎯 IMMEDIATE NEXT STEP

**Update `apps/devices/views.py` to add WebSocket broadcasting after each action.**

I can help you implement this now. Would you like me to:
1. Add the broadcast_device_update helper function
2. Update all the device actions (bind, unbind, add collaborator, revoke)
3. Test the WebSocket connection locally
