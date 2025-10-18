# ESP32 WiFi Provisioning Implementation Guide

## Overview

This document describes the complete WiFi provisioning system for ESP32 devices in the SmarTanom platform.

## Architecture

### Backend (Django REST API)

#### Endpoints

1. **POST `/api/devices/provision/`** - Device provisioning endpoint
   - **Authentication**: `X-Device-Auth` header (required in production, optional in dev)
   - **Throttling**: 10 requests per hour per device+IP
   - **Payload**:
     ```json
     {
       "serial": "SMRT-XXX-XXX",
       "status": "connected" | "failed",
       "ip": "192.168.1.100",  // required for connected
       "firmware_version": "1.0.0",  // optional
       "meta": {}  // optional
     }
     ```
   - **Response**:
     ```json
     {
       "success": true,
       "device_id": 123,
       "device_serial": "SMRT-XXX-XXX",
       "device_name": "Device SMRT-XXX-XXX",
       "wifi_configured": true,
       "is_bound": false,
       "bound_email": null,
       "message": "Device SMRT-XXX-XXX provisioning successful."
     }
     ```

2. **GET `/api/devices/{serial}/config/`** - Fetch device configuration
   - **Authentication**: `X-Device-Auth` header (optional in dev)
   - **Response**:
     ```json
     {
       "device_id": 123,
       "device_serial": "SMRT-ABC-123",
       "device_name": "My Device",
       "wifi_configured": true,
       "is_bound": true,
       "bound_email": "user@example.com",
       "status": "active",
       "backend_url": "https://smartanom.onrender.com",
       "websocket_url": "wss://smartanom.onrender.com/ws/devices/"
     }
     ```

#### Settings

Add to `.env`:

```env
# Device Provisioning
DEVICE_PROVISION_API_KEY=your-secret-api-key-here
AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=true
DEVICE_PROVISION_THROTTLE_RATE=10/hour
```

#### Database Schema

The `Device` model already includes:
```python
wifi_configured = models.BooleanField(
    default=False,
    help_text="Whether device has successfully configured WiFi and phoned home"
)
```

### Firmware (ESP32 Arduino)

#### Configuration

Before flashing, set in `esp32-smartanom.ino`:

```cpp
#define DEVICE_SERIAL "SMRT-ABC-123"  // *** CHANGE THIS ***
#define FIRMWARE_VERSION "1.0.0"
#define BACKEND_URL "https://smartanom.onrender.com"
#define DEVICE_API_KEY ""  // Optional: set for production auth
```

#### Flow

1. **Boot**:
   - Check NVS (Preferences) for saved WiFi credentials
   - If found and valid, connect to WiFi → Report to backend → Normal operation
   - If not found or connection fails, start provisioning mode

2. **Provisioning Mode**:
   - Start AP with SSID = `DEVICE_SERIAL`, password = `smartanom123`
   - Start web server on `192.168.4.1`
   - Scan for WiFi networks
   - Serve HTML form listing networks

3. **User Connects**:
   - User connects phone/laptop to device AP
   - Opens `http://192.168.4.1` (or auto-redirected via captive portal)
   - Selects WiFi network and enters password
   - Submits form

4. **Connection Attempt**:
   - Device attempts to connect to selected WiFi (30 second timeout)
   - If success:
     - Save credentials to NVS
     - POST to `https://smartanom.onrender.com/api/devices/provision/` with status `connected`
     - Shut down AP
     - Begin normal operation
   - If failure:
     - POST to backend with status `failed`
     - Show error page with retry option
     - Keep AP running

#### Libraries Required

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

Install via Arduino Library Manager:
- ArduinoJson (v6.x)

### Frontend (React)

#### Provisioning Instructions

The frontend should display step-by-step instructions in the `/signup/setup` page:

##### Step-by-Step UI

```
┌─────────────────────────────────────────────┐
│  WiFi Provisioning Instructions             │
├─────────────────────────────────────────────┤
│                                             │
│  1. Power on your ESP32 device             │
│     It will broadcast a WiFi network        │
│     named your device serial:              │
│     📡 SMRT-ABC-123                        │
│                                             │
│  2. Connect to that WiFi network           │
│     Password: smartanom123                  │
│     (You may temporarily lose internet)     │
│                                             │
│  3. Your browser will auto-open the        │
│     setup page, or manually open:          │
│     http://192.168.4.1                     │
│                                             │
│  4. Select your home WiFi network          │
│     and enter the password                  │
│                                             │
│  5. The device will connect and            │
│     automatically register                  │
│                                             │
│  ⏳ Waiting for device to connect...       │
│  [Checking status... 15s]                  │
│                                             │
└─────────────────────────────────────────────┘
```

#### Polling for Completion

After user initiates provisioning, the frontend should poll the backend:

```javascript
// Poll device status
const pollDeviceStatus = async (deviceSerial) => {
  const maxAttempts = 60; // 5 minutes (5 second intervals)
  let attempts = 0;

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/devices/check/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial_number: deviceSerial })
      });

      const data = await response.json();

      if (data.exists && data.wifi_configured) {
        // Success! Device is provisioned
        setProvisioningStatus('success');
        // Refresh device list
        fetchDevices();
        // Redirect to dashboard
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (attempts >= maxAttempts) {
        // Timeout
        setProvisioningStatus('timeout');
      } else {
        // Keep polling
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    } catch (error) {
      console.error('Poll error:', error);
      // Continue polling on error
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    }
  };

  checkStatus();
};
```

## Testing

### Backend Testing

Run the device provisioning tests:

```bash
cd backend
python manage.py test apps.devices.DeviceProvisioningTests -v 2
```

### Manual Testing

#### 1. Test Backend Endpoint

```bash
# Test provisioning (dev mode, no auth required)
curl -X POST http://localhost:8000/api/devices/provision/ \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "SMRT-TEST-001",
    "status": "connected",
    "ip": "192.168.1.100",
    "firmware_version": "1.0.0"
  }'

# Test with auth header (production mode)
curl -X POST https://smartanom.onrender.com/api/devices/provision/ \
  -H "Content-Type: application/json" \
  -H "X-Device-Auth: your-api-key-here" \
  -d '{
    "serial": "SMRT-TEST-001",
    "status": "connected",
    "ip": "192.168.1.100"
  }'

# Get device config
curl http://localhost:8000/api/devices/SMRT-TEST-001/config/
```

#### 2. Test ESP32 Firmware

1. Flash device with serial `SMRT-TEST-001`
2. Power on device
3. Verify AP broadcasts `SMRT-TEST-001` with password `smartanom123`
4. Connect to AP from phone/laptop
5. Browser should auto-open captive portal or manually navigate to `http://192.168.4.1`
6. Verify WiFi network list displays
7. Select network, enter password, submit
8. Monitor serial output:
   ```
   Connecting to WiFi: MyHomeNetwork
   ✓ WiFi connected!
     SSID: MyHomeNetwork
     IP: 192.168.1.100
   Reporting provision status to backend: connected
   POST https://smartanom.onrender.com/api/devices/provision/
   ✓ Response code: 200
   ✓ Provisioning status reported successfully
   Provisioning complete. Shutting down AP...
   Ready for normal operation.
   ```
9. Check backend database:
   ```bash
   python manage.py shell
   >>> from apps.devices.models import Device
   >>> d = Device.objects.get(device_serial='SMRT-TEST-001')
   >>> print(d.wifi_configured)
   True
   ```

#### 3. Test Wrong Password Flow

1. Select network and enter WRONG password
2. Device should fail to connect
3. Serial output:
   ```
   ✗ WiFi connection failed!
   ✗ Request failed or status != connected
   ```
4. Web page should show retry form
5. Device AP remains active for retry

## Troubleshooting

### Device Not Broadcasting AP

- Check power supply (USB provides adequate power)
- Verify firmware uploaded successfully
- Check serial monitor for boot messages
- Ensure `DEVICE_SERIAL` is set before flashing

### Cannot Connect to AP

- Password is case-sensitive: `smartanom123`
- Some phones auto-disable WiFi when no internet detected - disable this feature
- Try forgetting and reconnecting to the AP

### Device Connects but Backend Shows wifi_configured=False

- Check serial monitor for HTTPS POST errors
- Verify `BACKEND_URL` is correct
- If using HTTPS with self-signed cert, device uses `setInsecure()` (replace with proper cert in production)
- Check backend logs for incoming requests
- Verify `AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=true` in `.env`

### Frontend Not Detecting Provisioned Device

- Verify polling is active (check browser console)
- Ensure device serial matches exactly (case-sensitive)
- Check network - device must be able to reach `smartanom.onrender.com`
- Verify firewall/NAT allows outbound HTTPS

## Security Considerations

### Current Implementation

- **Development**: No authentication required, insecure TLS (`setInsecure()`)
- **Production**: Requires `X-Device-Auth` header with API key

### Recommendations for Production

1. **TLS Certificate Validation**:
   - Replace `client.setInsecure()` with proper certificate validation
   - Use `client.setCACert(root_ca)` with Let's Encrypt root CA

2. **Device Authentication**:
   - Generate unique API key per device
   - Store in Preferences during manufacturing
   - Rotate keys periodically

3. **Mutual TLS** (Advanced):
   - Issue client certificates to devices
   - Verify device identity at TLS layer

4. **Rate Limiting**:
   - Already implemented: 10 requests/hour per device+IP
   - Monitor logs for abuse patterns

5. **AP Security**:
   - Consider randomizing AP password during manufacturing
   - Print password on device label
   - Or use WPS-style push-button provisioning

## Environment Variables Summary

### Backend `.env`

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=true
ALLOWED_HOSTS=localhost,127.0.0.1,smartanom.onrender.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Device Provisioning
DEVICE_PROVISION_API_KEY=dev-insecure-device-key
AUTO_CREATE_DEVICE_ON_FIRST_CONNECT=true
DEVICE_PROVISION_THROTTLE_RATE=10/hour

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Next Steps

1. ✅ Backend provisioning endpoints
2. ✅ ESP32 firmware with captive portal
3. ✅ Tests for provisioning flow
4. ⏳ Frontend provisioning UI (use existing `/signup/setup` page)
5. ⏳ WebSocket notifications for real-time status updates
6. ⏳ Production TLS certificate pinning
7. ⏳ Manufacturing process for pre-flashing serials

## References

- Django REST Framework Throttling: https://www.django-rest-framework.org/api-guide/throttling/
- ESP32 WiFi API: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/wifi.html
- ArduinoJson: https://arduinojson.org/
- Captive Portal Detection: https://www.chromium.org/chromium-os/chromiumos-design-docs/network-portal-detection

---

**Implementation Date**: 2025-10-18
**Version**: 1.0.0
**Status**: Backend ✅ | Firmware ✅ | Tests ✅ | Frontend ⏳
