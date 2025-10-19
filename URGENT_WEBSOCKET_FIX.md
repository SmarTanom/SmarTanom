# 🔥 URGENT: WebSocket Disconnect Fix - Action Plan

## Current Status ✅

Your ESP32 is working perfectly:
- ✅ NTP sync working (Philippine time)
- ✅ TLS connection established
- ✅ Handshake sent successfully
- ❌ **Server disconnects immediately** (no close code)

## Root Cause 🎯

**Backend Django Channels consumer is likely encountering an error** when:
1. Joining the Redis channel layer group
2. Processing the handshake message
3. Database operation failing

The lack of a close code means the connection is dropping at the **ASGI/Daphne layer**, not in your consumer code.

---

## IMMEDIATE FIX - Option 1: Test Backend (Recommended)

### Step 1: Restart Your Backend

On Render dashboard or via CLI:

```bash
# Restart the service to reload settings with new logging
render services restart <your-service-id>
```

### Step 2: Check Backend Logs

Watch logs in real-time:

```bash
render logs -f <your-service-name>
```

Or on Render dashboard: **Your Service → Logs**

**Look for:**
```
[Channels] Using Redis channel layer: redis://...
[DeviceWS] Connection attempt for serial=SMRT-DQX-0HO
[DeviceWS] ✓ Joined group: device_SMRT-DQX-0HO
[DeviceWS] ✓ Connection accepted for serial=SMRT-DQX-0HO
[DeviceWS] ← Received message from SMRT-DQX-0HO: {"device_serial":"SMRT-DQX-0HO"...}
```

**If you see errors like:**
```
ConnectionRefusedError: [Errno 111] Connection refused
redis.exceptions.ConnectionError
```

Then Redis is the problem → Go to **Fix 2**

### Step 3: Test WebSocket Manually

Install websockets library:
```bash
cd backend
pip install websockets
```

Run the test script:
```bash
python test_websocket.py
```

**Expected output if backend is working:**
```
✅ WebSocket connection established!
✅ Handshake sent successfully
✅ Received response: {"status":"ok","device_registered":true,...}
✅ Sensor data sent successfully
🎉 Test PASSED
```

**If test fails with immediate disconnect** → Go to **Fix 2**

---

## IMMEDIATE FIX - Option 2: Disable Redis (Quick)

If Redis is causing issues, temporarily use in-memory channel layer:

### Edit `backend/smartanom/settings.py`

Find this section (around line 420):

```python
REDIS_URL = os.getenv('REDIS_URL', '')
```

**Change to:**

```python
# Temporarily force in-memory for debugging
REDIS_URL = ''  # Force empty to use in-memory layer
# REDIS_URL = os.getenv('REDIS_URL', '')  # Commented out
```

### Restart Backend

```bash
# Commit changes
git add backend/smartanom/settings.py
git commit -m "debug: temporarily disable Redis channel layer"
git push origin prod

# Render will auto-deploy
```

### Test ESP32 Again

After deployment completes (~2-3 minutes):
1. Reset your ESP32
2. Watch serial monitor
3. Connection should stay alive now

**If this fixes it:**
- Issue is Redis connection/configuration
- Solution: Either fix Redis or keep in-memory for single-worker setups

---

## IMMEDIATE FIX - Option 3: Check Database

Device might not exist in database.

### SSH into Backend or Use Django Shell

```bash
# If local
cd backend
python manage.py shell

# If on Render
render shell <service-name>
```

### Check Device Exists

```python
from apps.devices.models import Device

# Check if device exists
device = Device.objects.filter(device_serial="SMRT-DQX-0HO").first()
print(device)

# If None, create it
if not device:
    device = Device.objects.create(
        device_serial="SMRT-DQX-0HO",
        device_name="Test Device",
        is_bound=False,
        wifi_configured=True
    )
    print(f"Created device: {device}")
else:
    print(f"Device exists: {device.device_name}")
    print(f"WiFi configured: {device.wifi_configured}")
    print(f"Is bound: {device.is_bound}")
```

---

## LONG-TERM FIX: Robust Error Handling

I've already added enhanced logging to your consumer. After backend restart, you'll see detailed logs showing exactly where it fails.

### Files Modified:

1. **`backend/apps/devices/consumers.py`**
   - Added try/catch in `connect()`
   - Added detailed logging in `receive()`

2. **`backend/smartanom/settings.py`**
   - Added logging for channel layer selection
   - Added capacity/expiry settings for Redis

3. **`backend/test_websocket.py`** (NEW)
   - Python script to test WebSocket without ESP32
   - Isolates backend issues

---

## What To Do Right Now 🚀

### Priority 1: Check Backend Logs

```bash
# Start watching logs
render logs -f smartanom-backend

# In another terminal, trigger ESP32 connection
# (reset your ESP32)

# Watch for connection attempt in logs
```

**Copy the logs** and share them with me. Look for:
- `[DeviceWS]` messages
- Any `ERROR` or `Exception` lines
- Redis connection errors

### Priority 2: Test with Python Script

```bash
cd backend
pip install websockets
python test_websocket.py
```

Share the output.

### Priority 3: Check Render Configuration

On Render dashboard:
1. Go to your service
2. **Environment** tab
3. Check if `REDIS_URL` is set
4. If Redis add-on not enabled → **that's your issue**

---

## Expected Timeline

| Action | Time | Who |
|--------|------|-----|
| Check backend logs | 2 min | You |
| Run Python test | 5 min | You |
| Share results | 1 min | You |
| Identify exact issue | 2 min | Me |
| Apply fix | 5 min | Us |
| Deploy & test | 5 min | You |
| **TOTAL** | **~20 min** | |

---

## Quick Reference

### ESP32 is connecting to:
```
wss://smartanom.onrender.com:443/ws/device/SMRT-DQX-0HO/
```

### Handshake payload:
```json
{"device_serial":"SMRT-DQX-0HO","wifi_configured":true,"status":"connected"}
```

### Expected backend response:
```json
{"status":"ok","device_registered":true,"serial":"SMRT-DQX-0HO","server_time":"..."}
```

---

## Next Message from You Should Include:

1. ✅ Backend logs (last 50 lines with `[DeviceWS]`)
2. ✅ Output of `python test_websocket.py`
3. ✅ Render environment variables screenshot (check `REDIS_URL`)
4. ✅ Django admin check: Does device `SMRT-DQX-0HO` exist?

Let's solve this in the next 20 minutes! 🚀
