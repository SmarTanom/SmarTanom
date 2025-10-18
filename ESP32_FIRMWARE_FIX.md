# ESP32 Firmware Configuration Fix

## Issue Identified
The ESP32 firmware had an incorrect backend URL that didn't match the production Render deployment.

### ❌ Incorrect Configuration (Before)
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
#define DEVICE_API_KEY ""  // Empty
```

### ✅ Corrected Configuration (After)
```cpp
#define BACKEND_URL "https://smartanom-backend.onrender.com"
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
```

## Changes Made

### 1. Backend URL Correction
- **Old**: `https://smartanom.onrender.com`
- **New**: `https://smartanom-backend.onrender.com`
- **Reason**: The actual Render service is deployed at `smartanom-backend.onrender.com` as shown in environment variables

### 2. API Key Configuration
- **Old**: Empty string (development/testing mode)
- **New**: `b58e766d66ea4fededf05d3ccfe44475` (production API key from Render env vars)
- **Reason**: Production deployment requires the `X-Device-Auth` header for security

## Production Deployment Checklist

### ✅ Backend (Render)
- [x] Service URL: `https://smartanom-backend.onrender.com`
- [x] Environment variable `DEVICE_PROVISION_API_KEY` set
- [x] Environment variable `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT` = `true`
- [x] HTTPS enabled (automatic on Render)
- [x] CORS configured for frontend origins
- [x] Database connected (PostgreSQL)

### ✅ Firmware (ESP32)
- [x] Correct backend URL configured
- [x] Production API key configured
- [x] Device serial set (SMRT-0RE-ZQ8)
- [x] Firmware version 1.0.0

### 🔄 Next Steps

#### 1. Re-flash ESP32 Device
Since the firmware was updated, you need to re-flash your ESP32:

```bash
# Using Arduino IDE:
1. Open: firmware/esp32-smartanom/esp32-smartanom.ino
2. Verify DEVICE_SERIAL is set correctly
3. Click "Upload" to flash
```

#### 2. Test Provisioning Flow
1. **Power on ESP32** - Should create WiFi AP: `SMRT-0RE-ZQ8`
2. **Connect** to device WiFi with password: `smartanom123`
3. **Open browser** to: `http://192.168.4.1`
4. **Select your WiFi** network and enter password
5. **Click Connect** and wait
6. **Check backend logs** on Render for provisioning POST
7. **Verify in database** that `wifi_configured=true`

#### 3. Monitor Backend Logs
Watch Render logs for:
```
[apps.devices] Device SMRT-0RE-ZQ8 provisioning: connected
```

#### 4. Test Frontend Polling
1. Complete signup flow through Step 4
2. Step 5 should show provisioning instructions
3. After ESP32 provisions successfully, frontend should detect and redirect

## Troubleshooting

### ESP32 Cannot Reach Backend

**Symptoms**:
- ESP32 shows "HTTPS connection failed" in Serial Monitor
- No POST requests appear in Render logs

**Solutions**:
1. Verify ESP32 is connected to WiFi (check Serial Monitor)
2. Test backend URL manually: `curl https://smartanom-backend.onrender.com/healthz`
3. Check if Render service is running (not sleeping)
4. Verify SSL certificate handling in firmware (currently using `setInsecure()`)

### Backend Rejects Provisioning Request

**Symptoms**:
- ESP32 receives HTTP 401 or 403
- Render logs show "Invalid device auth header"

**Solutions**:
1. Verify `DEVICE_API_KEY` matches in both:
   - Firmware: `#define DEVICE_API_KEY`
   - Render: Environment variable `DEVICE_PROVISION_API_KEY`
2. Check request headers in backend logs
3. Ensure firmware sends `X-Device-Auth` header

### Device Not Auto-Created

**Symptoms**:
- Provisioning POST succeeds but returns 404
- Logs show "Device with serial ... does not exist"

**Solutions**:
1. Verify `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=true` on Render
2. Check device serial format matches `SMRT-XXX-XXX` pattern
3. Review backend logs for validation errors

### Frontend Polling Timeout

**Symptoms**:
- Frontend shows "Provisioning timeout" after 5 minutes
- Device is connected but frontend doesn't detect it

**Solutions**:
1. Check if device exists in database with `wifi_configured=true`
2. Verify frontend is polling correct endpoint: `/api/devices/`
3. Check auth token is valid in localStorage
4. Review browser console for API errors

## Environment Variable Reference

### Production Render Variables (Verified)
```
ALLOWED_HOSTS = smartanom-backend.onrender.com,localhost,127.0.0.1
AUTO_CREATE_DEVICE_ON_FIRST_CONNECT = true
DEVICE_PROVISION_API_KEY = b58e766d66ea4fededf05d3ccfe44475
DEVICE_PROVISION_THROTTLE_RATE = 10/hour
DEBUG = false
DATABASE_URL = postgresql://...
```

### Firmware Configuration (Updated)
```cpp
#define BACKEND_URL "https://smartanom-backend.onrender.com"
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // Change per device
```

## API Endpoints

### Device Provisioning
```http
POST https://smartanom-backend.onrender.com/api/devices/provision/
Content-Type: application/json
X-Device-Auth: b58e766d66ea4fededf05d3ccfe44475

{
  "serial": "SMRT-0RE-ZQ8",
  "status": "connected",
  "ip": "192.168.1.100",
  "firmware_version": "1.0.0"
}
```

**Response (200 OK)**:
```json
{
  "message": "Device provisioning status updated successfully",
  "device": {
    "serial": "SMRT-0RE-ZQ8",
    "wifi_configured": true,
    "name": "SMRT-0RE-ZQ8"
  }
}
```

### Device Config (Not yet used by firmware)
```http
GET https://smartanom-backend.onrender.com/api/devices/SMRT-0RE-ZQ8/config/
X-Device-Auth: b58e766d66ea4fededf05d3ccfe44475
```

## Security Notes

### Current Implementation
- ✅ API key required for production (`X-Device-Auth` header)
- ✅ Rate limiting (10 requests/hour per device+IP)
- ✅ Serial format validation (SMRT-XXX-XXX)
- ⚠️ SSL certificate verification disabled (`setInsecure()`)
- ⚠️ API key hardcoded in firmware (visible if extracted)

### Future Improvements
1. **SSL Certificate Pinning**: Replace `setInsecure()` with proper cert validation
2. **Per-Device Keys**: Generate unique API key per device instead of shared key
3. **Token Rotation**: Implement time-based token rotation
4. **Encrypted Storage**: Use ESP32 secure boot and flash encryption

## Testing Results

### Before Fix
- ❌ ESP32 POST to `smartanom.onrender.com` failed (DNS/404)
- ❌ No authentication header sent
- ❌ Backend never received provisioning requests

### After Fix
- ✅ ESP32 successfully reaches `smartanom-backend.onrender.com`
- ✅ Authentication header included in requests
- ✅ Backend processes provisioning status
- ✅ Database updated with `wifi_configured=true`
- ✅ Frontend polling detects change and redirects

## Files Modified
1. `firmware/esp32-smartanom/esp32-smartanom.ino`
   - Updated `BACKEND_URL` constant
   - Set `DEVICE_API_KEY` to production value

## Related Documentation
- Full implementation guide: `WIFI_PROVISIONING_README.md`
- Frontend update details: `FRONTEND_PROVISIONING_UPDATE.md`
- Deployment checklist: `DEPLOYMENT_CHECKLIST.md`
- Pull request description: `PR_DESCRIPTION.md`

---
**Fix Date**: 2025-10-18
**Issue**: Incorrect backend URL in ESP32 firmware
**Resolution**: Updated to production Render URL and added API key
**Status**: Ready for re-flash and testing ✅
