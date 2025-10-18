# 🔧 ESP32 WiFi Provisioning - Quick Reference

## 📋 What Was Fixed

Your ESP32 firmware had the **wrong backend URL**. This has been corrected.

### Before ❌
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
#define DEVICE_API_KEY ""
```

### After ✅
```cpp
#define BACKEND_URL "https://smartanom-backend.onrender.com"
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
```

---

## 🚀 Next Steps (You Must Do This!)

### 1️⃣ Re-flash Your ESP32
The firmware file has been updated, but your physical ESP32 still has the old code.

**Using Arduino IDE:**
1. Open `firmware/esp32-smartanom/esp32-smartanom.ino`
2. Verify `DEVICE_SERIAL` is set to `SMRT-0RE-ZQ8`
3. Click **Upload** button
4. Wait for "Done uploading" message

### 2️⃣ Test the Provisioning Flow
1. **Power on ESP32** → LED should blink, creates WiFi AP
2. **Connect** your phone/computer to WiFi: `SMRT-0RE-ZQ8`
3. **Password**: `smartanom123`
4. **Open browser**: `http://192.168.4.1`
5. **Select your WiFi** and enter password
6. **Click Connect**
7. **Wait 15-30 seconds** for connection

### 3️⃣ Check If It Worked

**Option A: Check ESP32 Serial Monitor**
```
✓ WiFi connected!
  SSID: YourHomeWiFi
  IP: 192.168.1.100
✓ Response code: 200
✓ Provisioning status reported successfully
```

**Option B: Check Render Logs**
Go to: https://dashboard.render.com/web/srv-... → Logs tab
Look for:
```
[apps.devices] Device SMRT-0RE-ZQ8 provisioning: connected
```

**Option C: Check Database**
Your device should now have `wifi_configured = true`

---

## 🔑 Key Configuration Values

### Backend (Render Environment)
| Variable | Value |
|----------|-------|
| URL | `https://smartanom-backend.onrender.com` |
| API Key | `b58e766d66ea4fededf05d3ccfe44475` |
| Auto-create | `true` |

### ESP32 Firmware
| Setting | Value |
|---------|-------|
| BACKEND_URL | `https://smartanom-backend.onrender.com` |
| DEVICE_API_KEY | `b58e766d66ea4fededf05d3ccfe44475` |
| DEVICE_SERIAL | `SMRT-0RE-ZQ8` |
| AP Password | `smartanom123` |

### WiFi AP (Created by ESP32)
| Setting | Value |
|---------|-------|
| SSID | `SMRT-0RE-ZQ8` |
| Password | `smartanom123` |
| Portal URL | `http://192.168.4.1` |

---

## 🐛 Troubleshooting

### Problem: "HTTPS connection failed"
**Cause**: ESP32 can't reach backend
**Fix**:
- Verify WiFi is connected (check Serial Monitor)
- Test backend: `curl https://smartanom-backend.onrender.com/healthz`
- Check if Render service is awake (not sleeping)

### Problem: "Response code: 401" or "403"
**Cause**: API key mismatch
**Fix**:
- Verify firmware has: `#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"`
- Verify Render has: `DEVICE_PROVISION_API_KEY = b58e766d66ea4fededf05d3ccfe44475`

### Problem: "Response code: 404"
**Cause**: Device serial not found, auto-create disabled
**Fix**:
- Verify Render has: `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT = true`
- Or pre-create device in Django admin

### Problem: Frontend shows "Provisioning timeout"
**Cause**: Frontend polling didn't detect wifi_configured
**Fix**:
- Check device in database: `wifi_configured` should be `true`
- Check frontend console for API errors
- Verify auth token is valid

---

## 📡 API Endpoint Test

You can manually test the provisioning endpoint:

```bash
curl -X POST https://smartanom-backend.onrender.com/api/devices/provision/ \
  -H "Content-Type: application/json" \
  -H "X-Device-Auth: b58e766d66ea4fededf05d3ccfe44475" \
  -d '{
    "serial": "SMRT-0RE-ZQ8",
    "status": "connected",
    "ip": "192.168.1.100",
    "firmware_version": "1.0.0"
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Device provisioning status updated successfully",
  "device": {
    "serial": "SMRT-0RE-ZQ8",
    "wifi_configured": true
  }
}
```

---

## 📚 Documentation Files

- **ESP32_FIRMWARE_FIX.md** - Detailed fix explanation
- **WIFI_PROVISIONING_README.md** - Full implementation guide
- **FRONTEND_PROVISIONING_UPDATE.md** - Frontend polling details
- **DEPLOYMENT_CHECKLIST.md** - Pre-production checklist

---

## ✅ Verification Checklist

After re-flashing ESP32:

- [ ] ESP32 boots and creates WiFi AP `SMRT-0RE-ZQ8`
- [ ] Can connect to ESP32 WiFi with password `smartanom123`
- [ ] Portal loads at `http://192.168.4.1`
- [ ] WiFi networks appear in dropdown
- [ ] Can submit home WiFi credentials
- [ ] ESP32 connects to home WiFi (Serial Monitor shows IP)
- [ ] ESP32 POSTs to backend (Serial Monitor shows HTTP 200)
- [ ] Render logs show provisioning message
- [ ] Database shows `wifi_configured = true`
- [ ] Frontend (Step 5) detects provisioning and redirects to dashboard

---

**Status**: ✅ Firmware updated, ready to flash
**Action Required**: Re-flash ESP32 with updated firmware
**Priority**: High - Device won't provision without this fix
