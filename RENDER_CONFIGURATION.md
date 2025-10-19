# SmarTanom Render Configuration Summary

**Date:** October 18, 2025
**Backend:** https://smartanom.onrender.com
**Status:** ✅ All components configured for Render

---

## ✅ Configuration Status

### 1. Backend (Render Web Service)
- **URL:** https://smartanom.onrender.com
- **Health Check:** ✅ `{"status":"ok","db":true}`
- **Database:** PostgreSQL (Render managed)
- **Status:** Live and responding

### 2. Frontend (React + Vite)
**File:** `frontend/.env`
```env
VITE_API_BASE_URL=https://smartanom.onrender.com
```
- ✅ Configured to use Render backend
- ✅ API client resolves to: https://smartanom.onrender.com
- ✅ All API calls route through Render

**Run locally with:**
```powershell
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173` but calls Render API.

### 3. ESP32 Firmware
**File:** `firmware/esp32-smartanom/esp32-smartanom.ino`
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
```
- ✅ Configured to POST to Render backend
- ✅ 60-second timeout for cold starts
- ✅ 3-retry logic with exponential backoff
- ✅ Backend wake-up function (`/healthz` pre-call)

---

## 🔄 Current WiFi Provisioning Flow

### End-to-End Process:
1. **Frontend (Step 1-4):** User creates account, verifies OTP, binds device
   - Calls: `https://smartanom.onrender.com/api/auth/*`
   - Calls: `https://smartanom.onrender.com/api/devices/bind/`

2. **Frontend (Step 5):** User follows WiFi setup instructions
   - Device serial passed to polling function
   - Polls: `https://smartanom.onrender.com/api/devices/`
   - Checks for `wifi_configured=true`

3. **ESP32:** User connects to device AP, submits WiFi credentials
   - Connects to WiFi
   - Wakes backend: `GET https://smartanom.onrender.com/healthz`
   - Reports status: `POST https://smartanom.onrender.com/api/devices/provision/`
   - Sets `wifi_configured=true` in Render database

4. **Frontend Auto-Redirect:** Detects `wifi_configured=true`
   - Shows success message (2 seconds)
   - Redirects to `/dashboard`

---

## 🧪 Testing Against Render

### Quick Health Check:
```powershell
Invoke-WebRequest -Uri "https://smartanom.onrender.com/healthz" -UseBasicParsing
```
**Expected:** `{"status":"ok","db":true}`

### Test Device Provisioning (ESP32):
1. Upload firmware to ESP32 (already configured)
2. Connect to device AP: `SmarTanom-SMRT-XXXXXXX`
3. Navigate to: `http://192.168.4.1`
4. Submit WiFi credentials
5. Monitor serial output for:
   - ✅ WiFi connected
   - ✅ Backend woken (200 OK)
   - ✅ Provisioning reported (200 OK)

### Test Frontend Polling:
1. Start frontend: `cd frontend; npm run dev`
2. Navigate to: `http://localhost:5173`
3. Complete Steps 1-4 (signup, verify, bind device)
4. On Step 5, trigger ESP32 provisioning
5. Watch console logs:
   - `[SignupSetup] Starting polling for serial: SMRT-XXXXXXX`
   - `[SignupSetup] Polling attempt #1...`
   - `[SignupSetup] ✓ Device already configured! Redirecting...`

---

## 🗄️ Database State

### Check Device Status (Render):
You can check device status via:
1. **Render Dashboard:** Shell access to run Django commands
2. **Django Admin:** https://smartanom.onrender.com/admin/
3. **API:** GET https://smartanom.onrender.com/api/devices/ (authenticated)

### Reset Device for Re-Testing:
To test WiFi provisioning again with same device:
```python
# Via Render shell or Django admin
from apps.devices.models import Device
d = Device.objects.get(device_serial='SMRT-0RE-ZQ8')
d.wifi_configured = False
d.save()
```

Or unbind and rebind the device in the frontend.

---

## 📝 Environment Variables

### Frontend (.env):
```env
VITE_API_BASE_URL=https://smartanom.onrender.com
```

### Backend (Render Environment):
- `DATABASE_URL`: Managed by Render (PostgreSQL)
- `SECRET_KEY`: Set in Render dashboard
- `ALLOWED_HOSTS`: Should include `smartanom.onrender.com`
- `DEBUG`: `False` in production
- `DEVICE_PROVISION_API_KEY`: `b58e766d66ea4fededf05d3ccfe44475`
 - `REDIS_URL`: Required for production WebSockets. Use Render Redis connection string (redis:// or rediss://host:port). If not set or invalid, the app will fall back to in-memory channel layer and WebSockets may fail under load. Avoid leaving it as just `rediss://` without host, which causes connection attempts to `localhost:6379`.

### ESP32 Firmware:
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
```

---

## ⚠️ Important Notes

### Render Free Tier Cold Starts:
- Backend sleeps after 15 minutes of inactivity
- Wake-up time: 30-60 seconds
- **Solution:** ESP32 firmware calls `/healthz` before provisioning
- **Frontend:** Shows "Waiting for device..." during polling

### CORS Configuration:
Ensure Render backend has CORS configured for:
- Frontend origin: `http://localhost:5173` (development)
- Production frontend domain (if deployed)

### Device Serial Format:
- Pattern: `SMRT-XXX-XXX` (e.g., `SMRT-0RE-ZQ8`)
- Generated by ESP32 from MAC address
- Must match between ESP32 and database

---

## ✅ Verification Checklist

- [x] Backend deployed and responding: https://smartanom.onrender.com/healthz
- [x] Frontend `.env` configured with Render URL
- [x] ESP32 firmware configured with Render URL and API key
- [x] Database migrations applied (wifi_configured field)
- [x] Frontend polling handles paginated responses
- [x] Frontend checks both `serial` and `device_serial` fields
- [x] Success message shown before dashboard redirect
- [x] Error handling for device not found
- [x] Timeout handling for Render cold starts

---

## 🚀 Quick Start Commands

### Start Frontend (calls Render backend):
```powershell
cd frontend
npm run dev
# Opens http://localhost:5173
# All API calls go to https://smartanom.onrender.com
```

### Upload ESP32 Firmware:
1. Open `firmware/esp32-smartanom/esp32-smartanom.ino` in Arduino IDE
2. Select board: "ESP32 Dev Module"
3. Upload to device
4. Monitor serial output (115200 baud)

### Test Flow:
1. Frontend: Complete signup (Steps 1-4)
2. Frontend: Reach Step 5 WiFi Setup
3. ESP32: Connect to device AP
4. ESP32: Submit WiFi credentials
5. Frontend: Auto-redirect to dashboard ✅

---

**Configuration Complete!** 🎉

All components are now configured to use the Render backend at:
**https://smartanom.onrender.com**
