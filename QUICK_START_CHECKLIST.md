# 🚀 ESP32 Sensor Integration - Quick Start Checklist

**Status:** ✅ Verification Complete - Ready for Deployment
**Last Updated:** October 19, 2025

---

## 📦 Before You Start

### Required Hardware
- [ ] ESP32 Development Board (ESP32-WROOM-32 or similar)
- [ ] pH Sensor (analog, 0-5V output)
- [ ] TDS Sensor (analog, 0-5V output)
- [ ] Water Level Sensor (analog)
- [ ] Turbidity Sensor (analog)
- [ ] Water Temperature Sensor (analog or DS18B20)
- [ ] Jumper wires
- [ ] Breadboard (optional)
- [ ] USB cable for ESP32 programming

### Required Software
- [ ] Arduino IDE (1.8.19 or newer) or PlatformIO
- [ ] ESP32 Board Package (via Arduino Boards Manager)
- [ ] USB-to-Serial driver (if needed for your ESP32 board)

---

## 📚 Step 1: Install Arduino Libraries

Open Arduino IDE → Sketch → Include Library → Manage Libraries

Install these libraries:

```
1. WebSocketsClient by Markus Sattler (v2.4.0 or newer)
   - Search: "websocketsclient markus"
   - Click Install

2. ArduinoJson by Benoit Blanchon (v6.21.0 or newer)
   - Search: "arduinojson"
   - Click Install (choose v6.x, NOT v7)

3. ESP32 Core Libraries (auto-installed with board package)
   - WiFi
   - HTTPClient
   - Preferences
   - DNSServer
   - WebServer
```

**Verification:**
- Sketch → Include Library → (you should see all libraries listed)

---

## 🔧 Step 2: Configure ESP32 Board

### Install ESP32 Board Package

1. **File → Preferences**
2. **Additional Board Manager URLs:**
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools → Board → Boards Manager**
4. Search: `esp32`
5. Install: **ESP32 by Espressif Systems** (v2.0.11 or newer)

### Select Board Settings

**Tools Menu:**
- **Board:** ESP32 Dev Module
- **Upload Speed:** 115200
- **CPU Frequency:** 240MHz (WiFi/BT)
- **Flash Frequency:** 80MHz
- **Flash Mode:** QIO
- **Flash Size:** 4MB (32Mb)
- **Partition Scheme:** Default 4MB with spiffs
- **Core Debug Level:** None (or "Info" for debugging)
- **PSRAM:** Disabled (unless your board has PSRAM)
- **Port:** (Select your COM port - e.g., COM3, COM4)

---

## 🔌 Step 3: Wire Sensors to ESP32

### Pin Connections

| Sensor | ESP32 Pin | Wire Color | Notes |
|--------|-----------|------------|-------|
| pH Sensor Signal | GPIO34 | Yellow/Signal | ADC1_CH6 |
| pH Sensor VCC | 3.3V | Red | **NOT 5V** |
| pH Sensor GND | GND | Black | |
| TDS Sensor Signal | GPIO35 | Yellow/Signal | ADC1_CH7 |
| TDS Sensor VCC | 3.3V | Red | **NOT 5V** |
| TDS Sensor GND | GND | Black | |
| Water Level Signal | GPIO32 | Yellow/Signal | ADC1_CH4 |
| Water Level VCC | 3.3V | Red | |
| Water Level GND | GND | Black | |
| Turbidity Signal | GPIO33 | Yellow/Signal | ADC1_CH5 |
| Turbidity VCC | 3.3V | Red | |
| Turbidity GND | GND | Black | |
| Water Temp Signal | GPIO25 | Yellow/Signal | Analog (for now) |
| Water Temp VCC | 3.3V | Red | |
| Water Temp GND | GND | Black | |

### ⚠️ Critical Warnings

1. **DO NOT use 5V for sensors** - ESP32 ADC pins are 3.3V max
2. **Use ADC1 pins only** - ADC2 conflicts with WiFi
3. **Check sensor polarity** - VCC/GND reversed = damaged sensor
4. **Secure connections** - Loose wires = erratic readings

---

## 📝 Step 4: Configure Firmware

### Edit Device Serial Number

**File:** `firmware/esp32-smartanom/esp32-smartanom.ino`

**Line 38:** Change this to YOUR device serial:
```cpp
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // *** CHANGE THIS ***
```

**Where to find your device serial:**
1. Login to dashboard: http://localhost:5173
2. Navigate to Devices
3. Your device serial is displayed (format: `SMRT-XXX-XXX`)

### Verify Backend URL

**Line 45:** Should match your deployed backend:
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
```

For local testing:
```cpp
#define BACKEND_URL "http://localhost:8000"  // Local Django
```

### Optional: Adjust Sensor Pins

If your wiring is different, update these lines (60-68):
```cpp
#define PH_SENSOR_PIN 34
#define TDS_SENSOR_PIN 35
#define WATER_LEVEL_PIN 32
#define TURBIDITY_SENSOR_PIN 33
#define TEMP_SENSOR_PIN 25
```

---

## 🔨 Step 5: Compile & Upload Firmware

### Compile Firmware

1. **File → Open** → `firmware/esp32-smartanom/esp32-smartanom.ino`
2. **Verify/Compile** (checkmark icon or Ctrl+R)
3. Wait for compilation (30-60 seconds)
4. **Expected output:**
   ```
   Sketch uses XXXXX bytes (XX%) of program storage space.
   Global variables use XXXXX bytes (XX%) of dynamic memory.
   ```
5. **No errors should appear**

### Upload to ESP32

1. **Connect ESP32 to USB**
2. **Select correct COM port** (Tools → Port)
3. **Upload** (arrow icon or Ctrl+U)
4. **Wait for upload** (~30 seconds)
5. **Expected output:**
   ```
   Writing at 0x00010000... (XX%)
   ...
   Hard resetting via RTS pin...
   ```

### Common Upload Errors

**Port not found:**
- Install USB-to-Serial driver (CP210x or CH340)
- Try different USB cable (some are charge-only)

**Timeout during upload:**
- Hold BOOT button on ESP32 during upload
- Press EN (reset) button after upload

**Permission denied (Linux/Mac):**
```bash
sudo chmod 666 /dev/ttyUSB0  # or /dev/ttyACM0
```

---

## 🖥️ Step 6: Monitor Serial Output

### Open Serial Monitor

**Tools → Serial Monitor** (or Ctrl+Shift+M)

**Settings:**
- **Baud Rate:** 115200
- **Line Ending:** Both NL & CR

### Expected Boot Sequence

```
========================================
 SmarTanom ESP32 Provisioning
 Firmware v1.3.0
========================================
Serial: SMRT-0RE-ZQ8

[Setup] Loading saved WiFi credentials...
[Setup] No WiFi credentials found
[Setup] Entering provisioning mode...

✓ Access Point started successfully
  SSID: SMRT-0RE-ZQ8
  Password: smartanom123
  IP: 192.168.4.1
✓ DNS server started for captive portal
✓ Web server started

Waiting for WiFi configuration via captive portal...
```

---

## 📱 Step 7: WiFi Provisioning

### Connect to ESP32 AP

1. **Phone/Laptop WiFi Settings**
2. **Connect to network:** `SMRT-0RE-ZQ8`
3. **Password:** `smartanom123`
4. **Captive portal should auto-open**

If portal doesn't open:
- Open browser manually
- Navigate to: `http://192.168.4.1`

### Configure WiFi

1. **Captive portal page loads**
2. **Select your WiFi network** from dropdown
3. **Enter WiFi password**
4. **Click "Connect"**
5. **Wait 30 seconds** (backend cold start)

### Success Indicators

**Serial Monitor shows:**
```
✓ WiFi connected
  SSID: YourNetwork
  IP: 192.168.1.100
  Signal: -45 dBm (Excellent)

Waking up backend server...
✓ Backend wake-up call successful (200)

Reporting provision status: success
✓ Provisioning status reported successfully

Connecting to WebSocket: wss://smartanom.onrender.com/ws/device/SMRT-0RE-ZQ8/
✓ WebSocket connected

--- Reading Sensors ---
pH: 7.20
TDS: 450.50 ppm
EC: 0.45 mS/cm
Water Level: 75.0%
Water Temp: 25.50°C
Turbidity: 12.30 NTU

Sending sensor data via WebSocket...
✓ Sensor data sent successfully
```

**Dashboard shows:**
- Device status: **Online** (green badge)
- WiFi configured: **Yes**
- Last seen: **Just now**
- Sensor cards appear with live data

---

## 🧪 Step 8: Test Sensor Readings

### Verify Each Sensor

**Open Serial Monitor** (115200 baud):

Every 30 seconds you should see:
```
--- Reading Sensors ---
pH: 7.20
TDS: 450.50 ppm
EC: 0.45 mS/cm
Water Level: 75.0%
Water Temp: 25.50°C
Turbidity: 12.30 NTU

Sending sensor data via WebSocket...
✓ Sensor data sent successfully
```

### Check Dashboard

**Navigate to:** http://localhost:5173/dashboard

**Expected:**
- 6 sensor cards displayed
- Values update every 30 seconds
- Charts show historical data
- No error messages

### Troubleshoot Sensor Readings

**Readings show NaN or 0.00:**
1. Check sensor wiring (VCC, GND, Signal)
2. Verify pin assignments match your wiring
3. Test sensors with multimeter
4. Check ADC reference voltage (3.3V)

**Readings wildly fluctuating:**
1. Check for loose connections
2. Add 100nF capacitor across sensor VCC/GND
3. Increase averaging samples in code
4. Move sensor wires away from power cables

**Readings stuck at same value:**
1. Sensor may be faulty
2. Check if sensor is submerged (if required)
3. Try different ADC pin
4. Test with known reference solution

---

## 🔄 Step 9: Test WiFi Reset Feature

### From Dashboard

1. **Navigate to Device Details**
2. **Click "Settings" tab**
3. **Scroll to "Danger Zone"**
4. **Click "Reset WiFi Configuration"**
5. **Confirm action** (2 prompts)

### Serial Monitor Shows

```
[WebSocket] Received message: {"type":"wifi_reset_command"}
[WiFi Reset] Clearing saved WiFi credentials...
[WiFi Reset] Restarting device to re-enter AP mode...

========================================
 SmarTanom ESP32 Provisioning
 Firmware v1.3.0
========================================
Serial: SMRT-0RE-ZQ8

[Setup] Loading saved WiFi credentials...
[Setup] No WiFi credentials found
[Setup] Entering provisioning mode...

✓ Access Point started successfully
  SSID: SMRT-0RE-ZQ8
  ...
```

### Repeat Provisioning

1. **Reconnect to AP:** `SMRT-0RE-ZQ8`
2. **Configure WiFi again**
3. **Verify device comes back online**

---

## 📊 Step 10: Calibrate Sensors

**See:** `ESP32_SENSOR_CALIBRATION_GUIDE.md` for detailed procedures

### Quick Calibration Steps

#### pH Sensor
1. Prepare pH 4.0, 7.0, and 10.0 buffer solutions
2. Dip sensor in each solution
3. Record voltage readings from Serial Monitor
4. Update calibration constants in firmware:
   ```cpp
   #define PH_VOLTAGE_NEUTRAL 2.5  // Adjust based on pH 7.0 reading
   #define PH_VOLTAGE_ACIDIC 3.0   // Adjust based on pH 4.0 reading
   ```

#### TDS Sensor
1. Prepare 500 ppm standard solution
2. Submerge sensor
3. Note voltage reading
4. Adjust K value:
   ```cpp
   #define TDS_K_VALUE 1.0  // Increase if reading too low, decrease if too high
   ```

#### Water Level Sensor
1. Place in empty container (0% level)
2. Note ADC reading
3. Fill container to 100% level
4. Note ADC reading
5. Update constants:
   ```cpp
   #define WATER_LEVEL_EMPTY_ADC 0    // ADC at 0%
   #define WATER_LEVEL_FULL_ADC 4095  // ADC at 100%
   ```

#### Turbidity Sensor
1. Use distilled water (0 NTU)
2. Note voltage reading
3. Use turbidity standard (100 NTU)
4. Note voltage reading
5. Adjust slope calculation

---

## ✅ Success Checklist

### Hardware
- [ ] All sensors wired correctly (3.3V, GND, Signal)
- [ ] ESP32 powered via USB
- [ ] No loose connections
- [ ] LED on ESP32 blinking (WiFi activity)

### Firmware
- [ ] Correct device serial configured
- [ ] Libraries installed
- [ ] Firmware compiles without errors
- [ ] Upload successful

### WiFi Provisioning
- [ ] AP mode boots successfully
- [ ] Captive portal accessible
- [ ] WiFi credentials accepted
- [ ] Device connects to WiFi
- [ ] Backend reports device as online

### WebSocket
- [ ] WebSocket connects successfully
- [ ] Serial Monitor shows "WebSocket connected"
- [ ] No reconnection loops

### Sensor Data
- [ ] All 6 sensors show readings (not NaN)
- [ ] Readings appear every 30 seconds
- [ ] Dashboard displays live data
- [ ] Sensor cards update automatically

### WiFi Reset
- [ ] Reset button appears in dashboard
- [ ] Confirmation dialogs work
- [ ] ESP32 receives command
- [ ] Device restarts in AP mode
- [ ] Re-provisioning works

---

## 🐛 Troubleshooting Guide

### ESP32 Won't Boot

**Serial Monitor shows nothing:**
- Check USB cable (try different cable)
- Press EN (reset) button on ESP32
- Try different USB port
- Verify baud rate is 115200

**Brownout detector triggered:**
```
Brownout detector was triggered
```
- Power supply insufficient (USB port too weak)
- Use powered USB hub or dedicated 5V power supply

### WiFi Connection Fails

**"WiFi connection failed" in Serial Monitor:**
- Wrong password (check for typos)
- WiFi network is 5GHz (ESP32 only supports 2.4GHz)
- Signal too weak (move ESP32 closer to router)
- Router MAC filtering enabled (add ESP32 MAC address)

### WebSocket Won't Connect

**"WebSocket connection failed" repeatedly:**
- Backend not deployed or sleeping (wake it up manually)
- Wrong backend URL in firmware
- SSL certificate issue (check `setInsecure()` is called)
- Firewall blocking WebSocket (check network settings)

### Sensor Readings Invalid

**All sensors show 0.00:**
- No power to sensors (check 3.3V wiring)
- Ground not connected
- Wrong pin numbers in firmware

**pH always shows 7.0:**
- Sensor not calibrated
- Sensor dry (needs to be in solution)
- Faulty sensor (test with multimeter)

**TDS shows very high values (>5000):**
- Sensor not properly submerged
- Air bubbles on sensor electrode
- TDS_K_VALUE too high (decrease to 0.5)

### Backend API Issues

**Device not appearing in dashboard:**
- Check device serial matches exactly (case-sensitive)
- Backend database migration needed
- User not logged in
- Device not provisioned yet

**401 Unauthorized errors:**
- Check DEVICE_API_KEY is correct
- Verify API key in Django admin
- Token expired (logout and login again)

---

## 📞 Need Help?

### Documentation
- **Implementation Guide:** `ESP32_SENSOR_INTEGRATION_COMPLETE.md`
- **Calibration Guide:** `ESP32_SENSOR_CALIBRATION_GUIDE.md`
- **Verification Report:** `VERIFICATION_COMPLETE.md`
- **Project README:** `README.md`

### Debugging Tools
- **ESP32 Serial Monitor:** Arduino IDE (115200 baud)
- **Backend Logs:** Render dashboard → Logs tab
- **Frontend Console:** Browser F12 → Console tab
- **WebSocket Test:** https://www.piesocket.com/websocket-tester

### Common Log Locations
- **ESP32:** Serial output (real-time)
- **Backend:** `backend/logs/django.log`
- **Frontend:** Browser developer console
- **Database:** Django admin → Recent Actions

---

## 🎉 You're All Set!

Your ESP32 sensor integration is now complete and ready for production use.

**Next Steps:**
1. Monitor sensor readings for 24 hours
2. Calibrate sensors with reference solutions
3. Deploy backend to production (if not already)
4. Configure alerts for abnormal readings
5. Set up automated backups

**Enjoy your smart water monitoring system!** 💧📊🚀
