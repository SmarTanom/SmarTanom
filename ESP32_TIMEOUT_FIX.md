# ESP32 Timeout Fix - Render Cold Start Handling

## Issue Diagnosed

Your ESP32 successfully connected to WiFi but got a **read timeout** when trying to POST to the backend:

```
✗ Request failed: read Timeout
```

### Root Cause
**Render's free tier services "sleep" after 15 minutes of inactivity.** When your ESP32 tries to connect, the service takes 30-60 seconds to wake up, but the ESP32's default timeout was too short.

---

## ✅ Fixes Applied

### 1. **Increased HTTP Timeouts**
```cpp
// Before: Default timeout (~10 seconds)
// After: 60 second timeout for both SSL and HTTP layers
client.setTimeout(60);           // SSL layer
https.setTimeout(60000);         // HTTP layer (60 seconds)
https.setConnectTimeout(15000);  // Connection timeout (15 seconds)
```

### 2. **Added Retry Logic**
The firmware now retries up to **3 times** with 2-second delays between attempts:
```cpp
const int maxRetries = 3;
const int retryDelayMs = 2000;
```

### 3. **Backend Wake-Up Function**
New function `wakeUpBackend()` hits the `/healthz` endpoint before provisioning to wake up the service:
```cpp
bool wakeUpBackend() {
    // Hits https://smartanom-backend.onrender.com/healthz
    // Wakes up sleeping Render service
    // Returns true if backend responds
}
```

### 4. **Improved Error Handling**
- Distinguishes between different HTTP error codes
- Doesn't retry on rate limits (429)
- Retries on server errors (500+)
- Shows attempt progress in Serial Monitor

---

## Expected Serial Monitor Output (After Fix)

### When Render is Sleeping (Cold Start)
```
Found saved WiFi credentials. Attempting connection...
Connecting to WiFi: Server-01
..
✓ WiFi connected!
  SSID: Server-01
  IP: 192.168.1.61
  RSSI: -83 dBm
Successfully connected to saved WiFi!

--- Preparing to report to backend ---
Waking up backend service (Render free tier may be sleeping)...
GET https://smartanom-backend.onrender.com/healthz
✓ Backend responded (HTTP 200). Service is awake.

Reporting provision status to backend: connected
Attempt 1/3...
POST https://smartanom-backend.onrender.com/api/devices/provision/
Payload: {"serial":"SMRT-0RE-ZQ8","status":"connected","ip":"192.168.1.61","firmware_version":"1.0.0","attempt":1}
Sending POST request (this may take up to 60s if server is waking up)...
✓ Response code: 200
Response: {"message":"Device provisioning status updated successfully",...}
✓ Provisioning status reported successfully
Ready for normal operation.
```

### When Render is Already Awake
```
✓ Backend responded (HTTP 200). Service is awake.
Reporting provision status to backend: connected
Attempt 1/3...
POST https://smartanom-backend.onrender.com/api/devices/provision/
✓ Response code: 200
✓ Provisioning status reported successfully
Ready for normal operation.
```

---

## 🚀 What to Do Now

### 1. Re-flash ESP32 with Updated Firmware
```bash
# Arduino IDE:
1. Open firmware/esp32-smartanom/esp32-smartanom.ino
2. Click Upload
3. Wait for "Done uploading"
```

### 2. Test Again
```bash
# Open Serial Monitor (115200 baud)
# Power cycle ESP32 (or press reset button)
# Watch for improved output with retry logic
```

### 3. If It Still Times Out

**Option A: Manually Wake Up Render First**
Open this URL in your browser to wake up the service:
```
https://smartanom-backend.onrender.com/healthz
```

Then reset your ESP32 - it should connect successfully while service is awake.

**Option B: Keep Render Awake**
Consider these options:
1. **UptimeRobot** (free) - Pings your service every 5 minutes
2. **Upgrade to Render Paid Plan** - No cold starts ($7/month)
3. **Use Cron Job** - Ping healthz endpoint every 10 minutes

---

## Technical Details

### Timeout Tuning
| Layer | Before | After | Reason |
|-------|--------|-------|--------|
| SSL Client | 10s (default) | 60s | Render cold start |
| HTTP Client | 5s (default) | 60s | Allow full wake-up |
| Connection | 5s (default) | 15s | Initial TCP handshake |

### Retry Strategy
- **Max retries**: 3 attempts
- **Retry delay**: 2 seconds between attempts
- **Total max time**: ~3 minutes (3 attempts × 60s timeout + delays)
- **Smart retry**: Only retries on timeout or 5xx errors, not 4xx

### Backend Wake-Up Flow
```
1. ESP32 connects to WiFi
2. Call wakeUpBackend()
   └─> GET /healthz (30s timeout)
   └─> Render wakes up (if sleeping)
3. Wait 2 seconds
4. Call reportProvisionStatus()
   └─> POST /api/devices/provision/ (60s timeout)
   └─> Retry up to 3 times if needed
5. Success!
```

---

## Code Changes Summary

### Files Modified
1. ✅ `firmware/esp32-smartanom/esp32-smartanom.ino`

### Functions Changed
- `reportProvisionStatus()` - Added retry logic, increased timeouts
- `setup()` - Added wakeUpBackend() call before reporting
- `handleConnect()` - Added wakeUpBackend() call before reporting

### Functions Added
- `wakeUpBackend()` - New function to wake sleeping Render service

---

## Troubleshooting

### Still Getting Timeout After 3 Retries
**Possible causes:**
1. Render service is down (check dashboard)
2. Network firewall blocking HTTPS
3. DNS resolution failing
4. SSL handshake failing

**Debug steps:**
```cpp
// Add to reportProvisionStatus() for more verbose logging:
Serial.printf("DNS lookup for: %s\n", BACKEND_URL);
Serial.printf("Connecting to IP: %s\n", client.localIP().toString().c_str());
```

### HTTP 429 (Rate Limited)
You're making too many requests. The limit is **10/hour per device**.
- Wait 1 hour and try again
- Or clear rate limit in Django admin

### HTTP 401 (Unauthorized)
API key mismatch between firmware and Render.
- Verify `DEVICE_API_KEY` in firmware matches `DEVICE_PROVISION_API_KEY` on Render

### HTTP 404 (Not Found)
Device serial not found and auto-create is disabled.
- Verify `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=true` on Render
- Or create device manually in Django admin

---

## Alternative: Keep Render Service Awake

### Using UptimeRobot (Free, Recommended)

1. Sign up at https://uptimerobot.com (free)
2. Create new monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: SmarTanom Backend
   - **URL**: `https://smartanom-backend.onrender.com/healthz`
   - **Monitoring Interval**: 5 minutes
3. Save

This pings your service every 5 minutes, preventing it from sleeping.

### Using Render Cron Job

Add to `render.yaml`:
```yaml
services:
  - type: cron
    name: keep-alive
    schedule: "*/10 * * * *"  # Every 10 minutes
    plan: free
    env: web
    command: curl https://smartanom-backend.onrender.com/healthz
```

---

## Testing Checklist

After re-flashing firmware:

- [ ] ESP32 boots and connects to saved WiFi
- [ ] Serial Monitor shows "Waking up backend service..."
- [ ] Health check completes (HTTP 200 or timeout)
- [ ] Provisioning POST sent (Attempt 1/3)
- [ ] Either succeeds on first try OR retries up to 3 times
- [ ] Response code 200 received
- [ ] "Provisioning status reported successfully" message shown
- [ ] Render logs show device provisioning
- [ ] Database updated with `wifi_configured=true`

---

**Update Date**: 2025-10-18
**Issue**: Read timeout when POSTing to Render
**Root Cause**: Render free tier cold start (30-60s wake time)
**Resolution**: Increased timeouts to 60s, added retry logic, added wake-up call
**Status**: Ready for re-flash ✅
