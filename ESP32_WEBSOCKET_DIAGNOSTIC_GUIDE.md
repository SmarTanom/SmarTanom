# ESP32 WebSocket Diagnostic Guide

## Summary of Fixes Applied

### ✅ **Fixed Issues:**

1. **NTP Time Synchronization**
   - ✅ Extended timeout from 10s → 30s
   - ✅ Added Philippine NTP servers (`ph.pool.ntp.org`, `asia.pool.ntp.org`)
   - ✅ Configured Philippine timezone (GMT+8 / UTC+8 = 28800 seconds)
   - ✅ Added visual progress indicator during sync
   - ✅ Returns boolean to indicate success/failure

2. **TLS Certificate Validation**
   - ✅ Ensures NTP sync completes **before** attempting WSS connection
   - ✅ Waits 1 second after time sync for system propagation
   - ✅ Falls back to insecure `ws://` if time sync fails and `ALLOW_WS_INSECURE_FALLBACK=true`

3. **Render Backend Wake-up**
   - ✅ Added 3-second delay after POST request for WebSocket service initialization
   - ✅ Free-tier instances need time to spin up WebSocket layer after HTTP wake

4. **Enhanced Diagnostic Logging**
   - ✅ WebSocket close codes decoded (1000-1011)
   - ✅ Close reason messages displayed
   - ✅ Handshake payload logged
   - ✅ Connection timestamp with Philippine time
   - ✅ TLS error detection with actionable messages

5. **Code Compilation Error**
   - ✅ Fixed "jump to case label" error by adding scope braces to `WStype_ERROR` case

---

## Current Issue: Immediate Disconnection After Connection

### **Symptoms:**
```
[WS] ✓✓✓ Connected to server ✓✓✓
[WS] Protocol: wss://smartanom.onrender.com:443
[WS] ✗ Disconnected from server
[WS] Auto-reconnect in 5s...
```

### **What This Means:**
- ✅ NTP time sync is working (TLS handshake succeeds)
- ✅ WiFi is stable
- ✅ TLS certificate is valid
- ❌ Server is closing the connection after accepting it

### **Most Likely Causes:**

#### **1. Backend Consumer Rejecting Connection**
The Django Channels consumer (`DeviceOnboardingConsumer`) may be:
- Rejecting the device serial format
- Timing out waiting for first message
- Requiring authentication you're not providing

#### **2. WebSocket Path Mismatch**
Your ESP32 connects to: `/ws/device/SMRT-A3A-ZGZ/`
Backend expects: `/ws/device/<serial>/`

**Check:** Is `SMRT-A3A-ZGZ` registered in your backend database?

#### **3. Channel Layer Issue**
If backend uses Redis channel layer but Redis is down, connections may fail silently.

---

## Next Steps to Diagnose

### **Step 1: Check Serial Monitor for New Logs**

Upload the updated firmware and watch for:

```
[WS] ✓✓✓ Connected to server ✓✓✓
[WS] Protocol: wss://smartanom.onrender.com:443
[WS] Path: /ws/device/SMRT-A3A-ZGZ/
[WS] Connected at: 2025-10-19 14:35:22 PHT
[WS] → Sending handshake...
[WS] Payload: {"device_serial":"SMRT-A3A-ZGZ","wifi_configured":true,"status":"connected"}
[WS] ✓ Handshake sent successfully
[WS] ✗ Disconnected from server
[WS] Close code: 1006
[WS] → Abnormal closure (no close frame)
```

**Key Questions:**
- Does handshake send successfully?
- What is the close code?
- Is there a close reason message?

### **Step 2: Check Backend Logs**

SSH into your Render service or check logs:

```bash
# Look for WebSocket connection attempts
grep "DeviceWS" <your-log-file>
```

Expected backend logs:
```
[DeviceWS] Device channel connected for serial=SMRT-A3A-ZGZ, joined group=device_SMRT-A3A-ZGZ
[DeviceWS] Handshake/keepalive received from SMRT-A3A-ZGZ
```

If you see:
```
[DeviceWS] Device channel disconnected serial=SMRT-A3A-ZGZ code=1006
```

Then the backend is closing the connection.

### **Step 3: Verify Device Registration**

Check if device exists in database:

```bash
python manage.py shell
```

```python
from apps.devices.models import Device
device = Device.objects.filter(device_serial="SMRT-A3A-ZGZ").first()
print(device)  # Should not be None
print(device.wifi_configured)  # Should be True after POST request
```

### **Step 4: Test WebSocket Manually**

Use a WebSocket client to test the endpoint:

```bash
# Install wscat if needed
npm install -g wscat

# Test connection
wscat -c "wss://smartanom.onrender.com/ws/device/SMRT-A3A-ZGZ/"
```

Then send:
```json
{"device_serial":"SMRT-A3A-ZGZ","wifi_configured":true,"status":"connected"}
```

If you get a response, the backend is working. If it closes immediately, there's a backend issue.

---

## Possible Backend Fixes

### **Fix 1: Check Channel Layer Configuration**

In `backend/smartanom/settings.py`:

```python
REDIS_URL = os.getenv('REDIS_URL', '')

if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
```

**Verify Redis is running** on Render. If using free tier, Redis may not be available.

**Temporary Fix:** Use in-memory channel layer for testing:

```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
```

### **Fix 2: Check Consumer Accept Logic**

In `backend/apps/devices/consumers.py`, verify `DeviceOnboardingConsumer.connect()`:

```python
async def connect(self):
    self.serial = self.scope['url_route']['kwargs'].get('serial')
    self.device_group = f"device_{self.serial}"

    # Join device-specific group
    await self.channel_layer.group_add(self.device_group, self.channel_name)

    # CRITICAL: Must call accept() or connection will close
    await self.accept()

    print(f"[DeviceWS] Device connected: {self.serial}")
```

Make sure `await self.accept()` is called!

### **Fix 3: Add Timeout Protection**

The consumer might be timing out. Add:

```python
async def connect(self):
    self.serial = self.scope['url_route']['kwargs'].get('serial')

    # Validate serial format
    if not self.serial or len(self.serial) < 5:
        await self.close(code=1008)  # Policy violation
        return

    self.device_group = f"device_{self.serial}"
    await self.channel_layer.group_add(self.device_group, self.channel_name)
    await self.accept()
```

---

## Configuration Checklist

### **ESP32 Firmware:**
- [x] `DEVICE_SERIAL` matches backend device
- [x] `BACKEND_URL` = `"https://smartanom.onrender.com"`
- [x] `ALLOW_WS_INSECURE_FALLBACK` = `true`
- [x] NTP configured for Philippine timezone
- [x] Enhanced logging enabled

### **Backend (Django Channels):**
- [ ] Device with serial `SMRT-A3A-ZGZ` exists in database
- [ ] `DeviceOnboardingConsumer` calls `await self.accept()`
- [ ] Channel layer configured (Redis or in-memory)
- [ ] WebSocket routing includes `/ws/device/<serial>/`
- [ ] No middleware blocking WebSocket upgrades

### **Render Deployment:**
- [ ] Redis add-on enabled (if using Redis channel layer)
- [ ] Daphne server running (check `Procfile` or `render.yaml`)
- [ ] Port 443 open for WSS
- [ ] Environment variable `REDIS_URL` set (if applicable)

---

## Expected Working Flow

### **1. ESP32 Boot Sequence:**
```
✓ WiFi connected
✓ POST /api/devices/provision/ → 200 OK
✓ Waiting 3s for WebSocket service...
✓ NTP sync: 2025-10-19 14:35:22 PHT
✓ Time synced - TLS handshake can proceed
✓✓✓ Connected to server ✓✓✓
→ Sending handshake...
✓ Handshake sent successfully
← Message: {"status":"ok","device_registered":true,...}
========== SENSOR READINGS ==========
```

### **2. Backend Logs:**
```
[DeviceWS] Device channel connected for serial=SMRT-A3A-ZGZ
[DeviceWS] Handshake/keepalive received from SMRT-A3A-ZGZ
[DeviceWS] RX sensor data for SMRT-A3A-ZGZ: keys=[ph,tds,ec,turbidity,water_temp,water_level]
[DeviceWS] Stored ph=6.8pH for device SMRT-A3A-ZGZ
```

---

## Contact Points

If issue persists after checking above:

1. **Share updated Serial Monitor output** (with close codes)
2. **Share backend logs** from Render dashboard
3. **Confirm device exists** in Django admin
4. **Test with `wscat`** to isolate ESP32 vs backend issue

---

## Quick Test Commands

### **Check Device in Database:**
```bash
cd backend
python manage.py shell -c "from apps.devices.models import Device; print(Device.objects.filter(device_serial='SMRT-A3A-ZGZ').first())"
```

### **Monitor Backend Logs Live:**
```bash
# On Render dashboard or via CLI
render logs -f <service-name>
```

### **Test WebSocket with wscat:**
```bash
wscat -c "wss://smartanom.onrender.com/ws/device/SMRT-A3A-ZGZ/"
# Then type:
{"device_serial":"SMRT-A3A-ZGZ","wifi_configured":true,"status":"connected"}
```

---

## Conclusion

The good news: **TLS and NTP are working!** Your ESP32 successfully establishes a secure WebSocket connection.

The challenge: **The server closes it immediately**, likely due to:
- Backend consumer logic issue
- Missing device in database
- Channel layer misconfiguration

Upload the updated firmware and share the **close code** from the Serial Monitor. That will tell us exactly why the server is disconnecting.
