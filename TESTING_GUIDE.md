# SmarTanom - Real-Time WebSocket Testing Guide

## ✅ COMPLETED IMPLEMENTATION

### Backend Changes
- ✅ WebSocket broadcasting function added to `apps/devices/views.py`
- ✅ Broadcasting integrated into:
  - `confirm_bind` - Broadcasts when device is bound
  - `admin_unbind_device` - Broadcasts when device is unbound
  - `add_collaborator` - Broadcasts when collaborator is added
  - `admin_revoke_access` - Broadcasts when access is revoked
- ✅ JWT authentication endpoints added to `apps/accounts/urls.py`
- ✅ Channel layers configured in `settings.py` (Redis for production, InMemory for development)

### Frontend Changes
- ✅ WebSocket client created (`services/websocketClient.js`)
- ✅ AdminDevices component updated with WebSocket subscription
- ✅ Real-time toast notifications for all device actions
- ✅ Automatic device list refresh on WebSocket updates
- ✅ Environment variables configured (`.env`)

---

## 🧪 TESTING PROCEDURES

### Phase 1: Start the Backend with WebSocket Support

Since Django Channels is now installed and ASGI is configured, you have two options:

#### Option A: Use `runserver` (Development Only - Single Worker)
```powershell
cd backend
python manage.py runserver
```
**Note:** `runserver` now uses ASGI and supports WebSockets in development. However, it's single-threaded and doesn't use Redis channel layer (uses InMemoryChannelLayer instead).

#### Option B: Use Daphne (Production-Like - Multi-Worker Support)
```powershell
cd backend
daphne -b 127.0.0.1 -p 8000 smartanom.asgi:application
```
**Note:** Daphne is the recommended ASGI server for production. For multi-worker support, you'll need Redis running (see Phase 2).

**Expected Output:**
```
Starting ASGI/Channels version 4.0.0 development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

---

### Phase 2: Install and Start Redis (Optional, for Production-Like Testing)

Redis is **required** for production but **optional** for local development (InMemoryChannelLayer is used by default).

#### Install Redis on Windows

**Option 1: Using Windows Subsystem for Linux (WSL)**
```powershell
wsl
sudo apt update
sudo apt install redis-server
redis-server
```

**Option 2: Using Chocolatey**
```powershell
choco install redis-64
redis-server
```

**Option 3: Using Docker**
```powershell
docker run -d -p 6379:6379 --name redis redis:alpine
```

#### Verify Redis is Running
```powershell
redis-cli ping
# Expected output: PONG
```

#### Update Backend Settings for Redis (Optional)
If you want to test with Redis locally, update `backend/.env`:
```env
REDIS_URL=redis://localhost:6379
```

Or keep the default (InMemoryChannelLayer will be used):
```python
# settings.py will use InMemoryChannelLayer if REDIS_URL is not set
```

---

### Phase 3: Start the Frontend

```powershell
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in Xms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Note:** If port 5173 is in use, Vite will use 5174 or the next available port.

---

### Phase 4: Test WebSocket Connection

1. **Open Browser Console** (F12)
2. **Navigate to Admin Devices** (http://localhost:5173/admin/devices)
3. **Check Console Logs**

**Expected Console Output:**
```
[AdminDevices] Connecting to WebSocket...
[WebSocket] Connecting to: ws://127.0.0.1:8000/ws/devices/
[WebSocket] Connected successfully
[WebSocket] Subscriber added, total: 1
```

**If Connection Fails:**
```
[WebSocket] Error: ...
[WebSocket] Reconnecting in 3s... (1/5)
```

**Troubleshooting:**
- Ensure backend is running with ASGI support (runserver or daphne)
- Check `.env` file has `VITE_WS_URL=ws://127.0.0.1:8000`
- Verify no CORS errors in console
- Check backend logs for WebSocket connection attempts

---

### Phase 5: Test Real-Time Device Binding

**Setup:**
1. Open **TWO browser windows** side-by-side:
   - Window A: Admin Devices page
   - Window B: Admin Devices page (different device details or same)

**Test Steps:**

#### Test 1: Bind Device via OTP
1. **Window A:** Click on any unbound device
2. **Window A:** Click "Bind Device" button
3. **Window A:** Enter email: `test@example.com`
4. **Window A:** Click "Send OTP"
5. **Check Backend Console** for OTP code (DEBUG mode shows code in response)
6. **Window A:** Enter the OTP code
7. **Window A:** Click "Confirm Binding"

**Expected Results:**
- ✅ **Window A:** Toast notification "Device bound to test@example.com"
- ✅ **Window B:** Toast notification appears automatically
- ✅ **Both Windows:** Device status updates to "Assigned" without manual refresh
- ✅ **Backend Console:** Logs show `WebSocket broadcast sent: bind for device DEVICE_SERIAL`
- ✅ **Browser Console:** Shows `[WebSocket] Message received: {action: 'bind', data: {...}}`

#### Test 2: Unbind Device
1. **Window A:** Click on a bound device
2. **Window A:** Click "Unbind Device" button
3. **Window A:** Confirm in modal

**Expected Results:**
- ✅ **Window A:** Toast notification "Device unbound from test@example.com"
- ✅ **Window B:** Toast notification appears automatically
- ✅ **Both Windows:** Device status updates to "Available" without manual refresh
- ✅ **Backend Console:** Logs show `WebSocket broadcast sent: unbind for device DEVICE_SERIAL`

#### Test 3: Add Collaborator
1. **Window A:** Click on a bound device
2. **Window A:** Click "Add Collaborator" button
3. **Window A:** Enter email: `collab@example.com`
4. **Window A:** Click "Add"

**Expected Results:**
- ✅ **Window A:** Toast notification "Collaborator collab@example.com added"
- ✅ **Window B:** Toast notification appears automatically
- ✅ **Both Windows:** Collaborator list updates automatically
- ✅ **Backend Console:** Logs show `WebSocket broadcast sent: collaborator_added`

#### Test 4: Revoke Collaborator
1. **Window A:** Click on a collaborator
2. **Window A:** Click "Revoke Access" button
3. **Window A:** Confirm in modal

**Expected Results:**
- ✅ **Window A:** Toast notification "Access revoked for collab@example.com"
- ✅ **Window B:** Toast notification appears automatically
- ✅ **Both Windows:** Collaborator removed from list automatically
- ✅ **Backend Console:** Logs show `WebSocket broadcast sent: collaborator_revoked`

---

### Phase 6: Test JWT Authentication (Optional)

#### Test JWT Token Obtain
```powershell
# Using curl (Windows PowerShell)
$body = @{
    username = "admin@example.com"
    password = "your_password"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/auth/jwt/token/" -Method POST -Body $body -ContentType "application/json"
$response.Content
```

**Expected Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### Test JWT Token Refresh
```powershell
$body = @{
    refresh = "YOUR_REFRESH_TOKEN_HERE"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/auth/jwt/refresh/" -Method POST -Body $body -ContentType "application/json"
$response.Content
```

**Expected Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

## 🔍 DEBUGGING CHECKLIST

### Backend Issues

#### WebSocket Connection Refused
- [ ] Backend running with ASGI support (runserver or daphne)?
- [ ] Check `INSTALLED_APPS` has `daphne` first, then `channels`
- [ ] Check `ASGI_APPLICATION = 'smartanom.asgi.application'` in settings
- [ ] Check `smartanom/asgi.py` has ProtocolTypeRouter configuration
- [ ] Check `CHANNEL_LAYERS` configuration in settings

#### WebSocket Broadcasts Not Working
- [ ] Check backend logs for "WebSocket broadcast sent" messages
- [ ] Check if `get_channel_layer()` returns None (means not configured)
- [ ] If using Redis, verify Redis is running: `redis-cli ping`
- [ ] Check `REDIS_URL` environment variable if using Redis
- [ ] Try with InMemoryChannelLayer (remove REDIS_URL) for debugging

#### JWT Authentication Fails
- [ ] Check `rest_framework_simplejwt` in INSTALLED_APPS
- [ ] Check `JWTAuthentication` in REST_FRAMEWORK authentication classes
- [ ] Check `SIMPLE_JWT` configuration in settings
- [ ] Check SECRET_KEY is set in settings
- [ ] Verify user credentials are correct

### Frontend Issues

#### WebSocket Not Connecting
- [ ] Check `.env` file has `VITE_WS_URL=ws://127.0.0.1:8000`
- [ ] Check browser console for WebSocket errors
- [ ] Check browser console for CORS errors
- [ ] Verify backend URL is correct (port 8000 or 8001?)
- [ ] Check if backend is accepting WebSocket connections (see backend logs)

#### WebSocket Messages Not Received
- [ ] Check browser console for `[WebSocket] Message received` logs
- [ ] Check `wsClient.subscribe()` is called in useEffect
- [ ] Check unsubscribe function is returned from useEffect cleanup
- [ ] Verify action names match backend broadcasts (bind, unbind, etc.)

#### Toast Notifications Not Showing
- [ ] Check `<ToastContainer />` is in App.jsx
- [ ] Check `react-toastify` CSS is imported
- [ ] Check toast.success/info/warning/error calls in WebSocket handler
- [ ] Check browser console for JavaScript errors

---

## 📊 SUCCESS INDICATORS

### ✅ Phase 1: Backend Started
- Django/Daphne server running on http://127.0.0.1:8000/
- No errors in console
- ASGI application loaded successfully

### ✅ Phase 2: Redis Running (Optional)
- Redis server responding to `redis-cli ping` with `PONG`
- Backend logs show "Using Redis channel layer"

### ✅ Phase 3: Frontend Started
- Vite dev server running on http://localhost:5173/
- No build errors
- Environment variables loaded correctly

### ✅ Phase 4: WebSocket Connected
- Browser console shows "[WebSocket] Connected successfully"
- Backend logs show "WebSocket connection accepted"
- No reconnection attempts

### ✅ Phase 5: Real-Time Updates Working
- Device binding updates both browser windows instantly
- Toast notifications appear in both windows
- No page refresh required
- Backend logs show "WebSocket broadcast sent"

### ✅ Phase 6: JWT Working (Optional)
- Token obtain endpoint returns access + refresh tokens
- Token refresh endpoint returns new access token
- Token verify endpoint validates tokens

---

## 🚀 NEXT STEPS

Once all tests pass locally:

1. **Deploy Backend to Render:**
   - Set REDIS_URL environment variable
   - Use Daphne as start command: `daphne -b 0.0.0.0 -p $PORT smartanom.asgi:application`
   - Set CORS_ALLOWED_ORIGINS to include Netlify URL

2. **Deploy Frontend to Netlify:**
   - Set VITE_API_URL to Render backend URL
   - Set VITE_WS_URL to wss://your-backend.onrender.com

3. **Test Production:**
   - Verify WebSocket works over WSS (secure WebSocket)
   - Test JWT authentication
   - Test real-time updates across devices

---

## 📝 NOTES

- **InMemoryChannelLayer:** Good for development, but only works with single worker
- **RedisChannelLayer:** Required for production with multiple workers
- **WebSocket URL:** Uses `ws://` for HTTP and `wss://` for HTTPS
- **Reconnection:** WebSocket client auto-reconnects up to 5 times with 3-second delay
- **JWT Expiration:** Access tokens expire in 60 minutes, refresh tokens in 7 days
- **Token Rotation:** New refresh token issued on refresh (old one invalidated)

---

## 🆘 TROUBLESHOOTING RESOURCES

- **Django Channels Docs:** https://channels.readthedocs.io/
- **Daphne Docs:** https://github.com/django/daphne
- **Redis Docs:** https://redis.io/docs/
- **JWT Docs:** https://django-rest-framework-simplejwt.readthedocs.io/
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

## ✨ SUMMARY

You now have a fully functional real-time system with:
- ✅ Django Channels WebSocket broadcasting
- ✅ Real-time device updates without page refresh
- ✅ JWT authentication endpoints
- ✅ Toast notifications for all actions
- ✅ Production-ready configuration (with Redis)
- ✅ Development-ready configuration (InMemory)

**Current Status:** Ready for local testing!

**Next Action:** Start backend with `python manage.py runserver`, start frontend with `npm run dev`, and test WebSocket connection in browser console.
