# SmarTanom ESP32 Quick Start Guide

## 🚀 Get Started in 5 Minutes

This quick start guide will help you set up your SmarTanom ESP32 device from scratch.

---

## Prerequisites

✅ ESP32 Development Board  
✅ USB Cable (data transfer capable)  
✅ Arduino IDE installed  
✅ All sensors connected (see [README.md](README.md) for wiring)  
✅ Computer with WiFi  

---

## Step 1: Install Arduino IDE & ESP32 Support

### 1.1 Download Arduino IDE
Visit: https://www.arduino.cc/en/software

### 1.2 Add ESP32 Board Manager URL
1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**

### 1.3 Install ESP32 Board
1. Go to **Tools → Board → Boards Manager**
2. Search for "esp32"
3. Install **esp32 by Espressif Systems**
4. Wait for installation to complete

---

## Step 2: Install Required Libraries

Open **Tools → Manage Libraries** and install these libraries:

| Library Name | Version | Purpose |
|-------------|---------|---------|
| `ArduinoJson` | 6.x | JSON handling |
| `DallasTemperature` | Latest | DS18B20 sensor |
| `OneWire` | Latest | OneWire protocol |
| `WebSockets by Markus Sattler` | Latest | WebSocket client |

**How to install:**
1. Click **Tools → Manage Libraries**
2. Search for each library name
3. Click **Install**

---

## Step 3: Configure the Firmware

### 3.1 Open the Firmware
1. Open `esp32-smartanom-clean.ino` in Arduino IDE

### 3.2 Set Your Device Serial Number
Find this line near the top:
```cpp
#define DEVICE_SERIAL "SMRT-DNX-XYS"  // * CHANGE THIS BEFORE FLASHING *
```

Change it to your unique device ID (e.g., `SMRT-001`, `SMRT-ABC-123`).

### 3.3 Set Your Backend URL
Find this line:
```cpp
#define BACKEND_URL "https://smartanom.onrender.com"
```

Change it to your backend URL if different.

### 3.4 Set Your API Key (Optional)
```cpp
#define DEVICE_API_KEY "your-api-key-here"
```

---

## Step 4: Upload to ESP32

### 4.1 Connect ESP32
Plug your ESP32 into your computer via USB.

### 4.2 Select Board and Port
1. Go to **Tools → Board → ESP32 Arduino**
2. Select **ESP32 Dev Module**
3. Go to **Tools → Port**
4. Select the COM port (Windows) or /dev/ttyUSB0 (Linux/Mac)

### 4.3 Configure Upload Settings
Set these in **Tools** menu:
- **Upload Speed:** 921600
- **CPU Frequency:** 240MHz
- **Flash Frequency:** 80MHz
- **Flash Mode:** QIO
- **Flash Size:** 4MB (32Mb)
- **Partition Scheme:** Default 4MB with spiffs

### 4.4 Upload
1. Click the **Upload** button (→) in Arduino IDE
2. Wait for "Connecting..." message
3. If it fails to connect, hold the **BOOT** button on ESP32 when it says "Connecting..."
4. Wait for upload to complete (30-60 seconds)

---

## Step 5: WiFi Provisioning

### 5.1 Open Serial Monitor
1. Click **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see startup messages

### 5.2 Connect to ESP32 WiFi
1. On your phone or laptop, open WiFi settings
2. Look for a network named: `SMRT-XXX-XXX` (your device serial)
3. Connect to it
4. Password: `smartanom` + your device serial
   - Example: If device is `SMRT-001`, password is `smartanomSMRT-001`

### 5.3 Configure WiFi
1. Your browser should automatically open to the setup page
2. If not, manually go to: `http://192.168.4.1`
3. Select your WiFi network from the dropdown
4. Enter your WiFi password
5. Click **Connect to WiFi**
6. Wait for connection (15-30 seconds)

### 5.4 Success!
- If successful, you'll see "Successfully Connected!"
- The ESP32 will remember your WiFi credentials
- **Important:** Reconnect your phone/laptop to your home WiFi to access the dashboard

---

## Step 6: Verify Operation

### 6.1 Check Serial Monitor
You should see output like this:
```
=================================
SmarTanom ESP32 Provisioning
=================================
Device Serial: SMRT-001
Firmware: v2.0.0
=================================

✓ WiFi connected!
  IP: 192.168.1.100
  RSSI: -45 dBm
[Time] ✓ NTP sync successful
[WS] ✓ Connected to backend
[SENSOR] Warming up... 5/30 seconds
========== SENSOR READINGS ==========
Water Level : 75% (raw=1250, NORMAL)
Water Temp  : 26.50 °C
TDS         : 650 ppm
EC          : 1.30 mS/cm
pH          : 6.85
Turbidity   : 250 (1.20 V) - Cloudy
======================================
```

### 6.2 Check Your Dashboard
1. Open your web browser
2. Go to your SmarTanom dashboard
3. You should see your device listed
4. Real-time sensor readings should appear every 5 seconds

---

## 🎉 You're All Set!

Your ESP32 is now:
- ✅ Connected to WiFi
- ✅ Reading sensors
- ✅ Sending data to the cloud
- ✅ Visible in your dashboard

---

## Common Issues & Solutions

### Issue: Can't find ESP32 WiFi network
**Solution:**
- Check Serial Monitor for "Access Point started successfully"
- The SSID is your device serial number
- Make sure ESP32 is powered on
- Try restarting the ESP32

### Issue: Connection to backend fails
**Solution:**
- Verify `BACKEND_URL` is correct
- Check backend server is running
- Ensure your WiFi allows outbound HTTPS connections
- Check Serial Monitor for specific error messages

### Issue: Sensors show weird values
**Solution:**
- Verify all sensors are properly wired
- Check that all sensors share common ground
- Ensure sensors are in water (except water level sensor)
- Wait 30 seconds for sensor warmup

### Issue: Upload fails
**Solution:**
- Try a different USB cable (some are charge-only)
- Hold BOOT button while "Connecting..." appears
- Lower upload speed to 115200
- Try pressing RESET button after upload starts

### Issue: Serial Monitor shows garbage text
**Solution:**
- Set baud rate to 115200
- Try different line ending settings

---

## Next Steps

### Calibration
For accurate readings, calibrate your sensors:
1. **pH:** Use pH 4.0 and 7.0 buffer solutions
2. **TDS/EC:** Use 1.413 mS/cm standard solution
3. **Water Level:** Measure dry and fully submerged ADC values

See [README.md](README.md) for detailed calibration instructions.

### Advanced Configuration
- Adjust sensor reading interval
- Change warmup delay
- Modify threshold values
- Enable additional features

See code comments for configurable parameters.

---

## Useful Resources

📖 **Full Documentation:** [README.md](README.md)  
🎓 **Methodology (Thesis):** [METHODOLOGY.md](METHODOLOGY.md)  
💻 **Code Examples:** Check the README's "Code Snippets" section  
🐛 **Troubleshooting:** See README's "Troubleshooting" section  

---

## Support

Need help?
- **GitHub Issues:** https://github.com/SmarTanom/SmarTanom/issues
- **Email:** support@smartanom.com
- **Documentation:** https://smartanom.onrender.com/docs

---

**Happy Monitoring! 🌱**
