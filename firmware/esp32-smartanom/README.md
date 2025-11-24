# SmarTanom ESP32 Firmware

## Overview

This firmware enables ESP32 microcontrollers to monitor aquaponics/hydroponics systems by reading multiple water quality sensors and transmitting data to a cloud backend via WebSocket connections. The system features WiFi provisioning through a captive portal interface and automatic reconnection with exponential backoff.

**Version:** 2.0.0 (Cleaned & Finalized)  
**Hardware:** ESP32 Development Board  
**IDE:** Arduino IDE 2.x or PlatformIO

---

## Table of Contents

1. [Features](#features)
2. [Hardware Requirements](#hardware-requirements)
3. [Pin Configuration](#pin-configuration)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [WiFi Provisioning](#wifi-provisioning)
7. [Sensor Calibration](#sensor-calibration)
8. [Code Snippets](#code-snippets)
9. [Troubleshooting](#troubleshooting)
10. [Architecture](#architecture)

---

## Features

✅ **WiFi Provisioning** - Easy WiFi setup via captive portal (no hardcoded credentials)  
✅ **Multi-Sensor Monitoring** - pH, TDS/EC, Temperature, Turbidity, Water Level  
✅ **Real-Time Data Transmission** - WebSocket connection to cloud backend  
✅ **Automatic Reconnection** - Exponential backoff algorithm for stable connectivity  
✅ **NTP Time Synchronization** - Required for TLS/SSL certificate validation  
✅ **Persistent Storage** - WiFi credentials and calibration data stored in NVS/EEPROM  
✅ **Sensor Warmup** - 30-second stabilization period before first reading  
✅ **State Machine** - Water level warning system with hysteresis  

---

## Hardware Requirements

### Core Components

| Component | Model/Type | Purpose |
|-----------|-----------|---------|
| **Microcontroller** | ESP32 DevKit V1 | Main controller with WiFi |
| **pH Sensor** | Analog pH Sensor Module | Measures water acidity/alkalinity |
| **TDS/EC Sensor** | Analog TDS Sensor (DFRobot compatible) | Measures dissolved solids & conductivity |
| **Temperature Sensor** | DS18B20 (Waterproof) | Measures water temperature |
| **Turbidity Sensor** | Analog Turbidity Sensor | Measures water clarity |
| **Water Level Sensor** | HW-038/Rain Sensor Module | Detects water presence and level |

### Additional Components

- 5V Power Supply (2A minimum)
- Breadboard or PCB for connections
- Jumper wires (male-to-male, male-to-female)
- 4.7kΩ resistor (for DS18B20 data line pull-up)

---

## Pin Configuration

```cpp
// Sensor Pin Assignments
#define WATER_SENSOR_PIN 33  // HW-03 Water Level Sensor (Analog)
#define ONE_WIRE_BUS 4       // DS18B20 Temperature (Digital)
#define TDS_PIN 35           // TDS/EC Sensor (Analog)
#define PH_PIN 34            // pH Sensor (Analog)
#define TURBIDITY_PIN 32     // Turbidity Sensor (Analog)
```

### Wiring Diagram

```
ESP32 Pin    →    Sensor
---------------------------------
GPIO 34      →    pH Sensor (AO)
GPIO 35      →    TDS Sensor (AO)
GPIO 32      →    Turbidity Sensor (AO)
GPIO 33      →    Water Level Sensor (AO)
GPIO 4       →    DS18B20 Data (with 4.7kΩ pull-up to 3.3V)
3.3V         →    All sensor VCC (if 3.3V compatible)
5V           →    Sensors requiring 5V power
GND          →    All sensor GND (common ground!)
```

⚠️ **IMPORTANT:** Ensure all sensors share a common ground with the ESP32!

---

## Installation

### 1. Install Arduino IDE

Download and install [Arduino IDE 2.x](https://www.arduino.cc/en/software)

### 2. Install ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search for "ESP32" and install **esp32 by Espressif Systems**

### 3. Install Required Libraries

Open **Tools → Manage Libraries** and install:

| Library | Purpose |
|---------|---------|
| `ArduinoJson` (v6.x) | JSON parsing and generation |
| `DallasTemperature` | DS18B20 temperature sensor |
| `OneWire` | OneWire protocol for DS18B20 |
| `WebSockets` by Markus Sattler | WebSocket client |

### 4. Upload Firmware

1. Open `esp32-smartanom-clean.ino`
2. **IMPORTANT:** Edit configuration (see next section)
3. Connect ESP32 via USB
4. Select **Tools → Board → ESP32 Dev Module**
5. Select correct **Port**
6. Click **Upload** button

---

## Configuration

### Required Configuration (Before Flashing!)

Open the firmware file and modify these constants:

```cpp
// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-ABC-123"  // ⚠️ CHANGE THIS!

// =============================================
// BACKEND CONFIGURATION
// =============================================
#define BACKEND_URL "https://smartanom.onrender.com"  // Your backend URL
#define DEVICE_API_KEY "your-api-key-here"            // Your API key
```

### Optional Configuration

```cpp
// AP Password = "smartanom" + DEVICE_SERIAL
// Example: "smartanomSMRT-ABC-123"
#define AP_PASSWORD_PREFIX "smartanom"

// Sensor reading interval (milliseconds)
const unsigned long SENSOR_SEND_INTERVAL_MS = 5000;  // 5 seconds

// Warmup delay before first reading
const unsigned long WARMUP_DELAY_MS = 30000;  // 30 seconds
```

---

## WiFi Provisioning

### First-Time Setup Process

1. **Power on ESP32**
   - Device boots into Access Point (AP) mode
   - SSID = Your device serial (e.g., `SMRT-ABC-123`)
   - Password = `smartanom` + device serial

2. **Connect to ESP32 WiFi**
   - On phone/laptop, connect to the ESP32's WiFi network
   - Most devices will automatically open the captive portal
   - If not, manually navigate to `http://192.168.4.1`

3. **Configure WiFi**
   - Select your home/office WiFi network from the list
   - Enter WiFi password
   - Click "Connect to WiFi"

4. **Provisioning Complete**
   - ESP32 connects to your WiFi
   - Credentials are saved to non-volatile storage (NVS)
   - Device automatically starts sensor monitoring
   - ESP32 AP shuts down

5. **Reconnect to Home WiFi**
   - Your phone/laptop will disconnect from ESP32
   - Reconnect to your home WiFi to access the dashboard

### Subsequent Boots

- ESP32 automatically connects using saved credentials
- No provisioning needed unless you clear credentials or change WiFi

### Reset WiFi Credentials

To clear saved credentials and re-enter provisioning mode:

```cpp
// In setup(), add this line temporarily:
clearPreferences();
ESP.restart();
```

Or send a `reset_wifi` command via WebSocket from the backend.

---

## Sensor Calibration

### pH Sensor Calibration

The firmware uses a median-filtered linear calibration formula:

```cpp
pH = (-5.70 × voltage) + 20.84
```

**To recalibrate:**

1. Prepare pH 4.0 and pH 7.0 buffer solutions
2. Read voltage at each pH using this test code:

```cpp
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetPinAttenuation(PH_PIN, ADC_11db);
}

void loop() {
  int raw = analogRead(PH_PIN);
  float voltage = raw * (3.3 / 4095.0);
  Serial.printf("Raw: %d | Voltage: %.3f V\n", raw, voltage);
  delay(1000);
}
```

3. Calculate your calibration:
   ```
   Slope = (pH₂ - pH₁) / (V₂ - V₁)
   Intercept = pH - (Slope × Voltage)
   ```

4. Update in firmware:
   ```cpp
   static const float PH_CALIBRATION_VALUE = 20.84f;  // Your intercept
   float ph = (-5.70f * volt) + PH_CALIBRATION_VALUE; // Your slope
   ```

### TDS/EC Sensor Calibration

Uses temperature-compensated polynomial (DFRobot formula) with calibration factor:

```cpp
#define EC_CAL_FACTOR 1.1151f  // Adjust this!
```

**To recalibrate:**

1. Prepare EC standard solution (e.g., 1.413 mS/cm)
2. Measure EC with firmware
3. Calculate factor:
   ```
   EC_CAL_FACTOR = EC_standard / EC_measured
   ```
4. Update `EC_CAL_FACTOR` in firmware

### Water Level Sensor Calibration

Uses EEPROM-stored dry/wet calibration points:

```cpp
int calibDry = 600;   // ADC value when dry (0%)
int calibWet = 1700;  // ADC value when wet (100%)
```

**To recalibrate:**

1. Run sensor in air (dry): note ADC value → `calibDry`
2. Submerge sensor fully: note ADC value → `calibWet`
3. Update values in firmware
4. Calibration is saved to EEPROM automatically

### Temperature Sensor

DS18B20 has factory calibration. Apply offset if needed:

```cpp
waterTempC = tempSensors.getTempCByIndex(0) + 14.80; // Offset correction
```

---

## Code Snippets

### 1. Reading pH Sensor (Median Filter)

```cpp
static float computePhFromSensor() {
    // Collect 10 samples
    int samples[10];
    for (int i = 0; i < 10; i++) {
        samples[i] = analogRead(PH_PIN);
        delay(30);
    }

    // Sort samples (bubble sort)
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (samples[i] > samples[j]) {
                int tmp = samples[i];
                samples[i] = samples[j];
                samples[j] = tmp;
            }
        }
    }

    // Average middle 6 samples (remove outliers)
    unsigned long avgSum = 0;
    for (int i = 2; i < 8; i++) {
        avgSum += samples[i];
    }

    // Convert to voltage
    float volt = (float)avgSum * (3.3 / 4095.0) / 6.0f;
    
    // Apply calibration formula
    float ph = (-5.70f * volt) + 20.84f;
    return ph;
}
```

**Purpose:** Reduces noise by removing 2 highest and 2 lowest readings, then averaging the remaining 6.

---

### 2. Reading TDS/EC Sensor (Temperature Compensated)

```cpp
void readTDS_EC() {
    // Read TDS sensor (averaged over 30 samples)
    long avgRawTDS = 0;
    for (int i = 0; i < 30; i++) {
        avgRawTDS += analogRead(TDS_PIN);
    }
    avgRawTDS /= 30;

    // Convert to voltage
    float voltage = (float)avgRawTDS * (3.3 / 4095.0);

    // Temperature compensation (2% per °C)
    float tempCoeff = 1.0f + 0.02f * (waterTempC - 25.0f);
    float compensatedVoltage = voltage / tempCoeff;

    // DFRobot cubic polynomial for EC (µS/cm → mS/cm)
    float ec_mS = (133.42f * pow(compensatedVoltage, 3)
                 - 255.86f * pow(compensatedVoltage, 2)
                 + 857.39f * compensatedVoltage) / 1000.0f;

    // Apply calibration factor
    ec_mS *= 1.1151f;  // EC_CAL_FACTOR
    if (ec_mS < 0.0f) ec_mS = 0.0f;

    // Convert EC to TDS (ppm)
    // TDS(ppm) = EC(mS/cm) × 500
    tdsValue = ec_mS * 500.0f;
    ecValue = ec_mS;
}
```

**Purpose:** Provides accurate conductivity and TDS readings compensated for temperature variations.

---

### 3. Reading Water Temperature (DS18B20)

```cpp
void readTemperature() {
    tempSensors.requestTemperatures();
    waterTempC = tempSensors.getTempCByIndex(0);
    
    // Apply calibration offset if needed
    waterTempC = waterTempC + 14.80;
}
```

**Setup (in `initSensors()`):**

```cpp
OneWire oneWire(ONE_WIRE_BUS);  // GPIO 4
DallasTemperature tempSensors(&oneWire);

void initSensors() {
    tempSensors.begin();  // Initialize DS18B20
}
```

**Purpose:** OneWire protocol allows multiple DS18B20 sensors on one pin. Index 0 = first sensor.

---

### 4. Reading Turbidity Sensor

```cpp
void readTurbidity() {
    // Read analog value
    int rawTurb = analogRead(TURBIDITY_PIN);
    float voltage = rawTurb * (3.3 / 4095.0);

    // Map voltage to NTU (Nephelometric Turbidity Units)
    // Clear water: 3.0V → 0 NTU
    // Turbid water: 0.5V → 1000 NTU
    turbidityNTU = mapFloat(voltage, 3.0, 0.5, 0.0, 1000.0);
    if (turbidityNTU < 0) turbidityNTU = 0;

    // Classification
    String status;
    if (voltage <= 0.30) status = "Dirty/Algae";
    else if (voltage <= 1.00) status = "Cloudy";
    else status = "Clear";
}
```

**Purpose:** Higher voltage = clearer water. Sensor output inversely proportional to turbidity.

---

### 5. Reading Water Level Sensor (Moving Average)

```cpp
// Moving average buffer
#define WATER_SAMPLE_COUNT 10
int waterLevelSamples[WATER_SAMPLE_COUNT];
int waterLevelSampleIndex = 0;
bool waterLevelBufferFilled = false;

void readWaterLevel() {
    // Read raw ADC
    int rawWater = analogRead(WATER_SENSOR_PIN);

    // Add to moving average buffer
    waterLevelSamples[waterLevelSampleIndex] = rawWater;
    waterLevelSampleIndex = (waterLevelSampleIndex + 1) % WATER_SAMPLE_COUNT;
    if (waterLevelSampleIndex == 0) waterLevelBufferFilled = true;

    // Calculate average
    long sumWater = 0;
    int count = waterLevelBufferFilled ? WATER_SAMPLE_COUNT : waterLevelSampleIndex;
    if (count == 0) count = 1;
    
    for (int i = 0; i < count; i++) {
        sumWater += waterLevelSamples[i];
    }
    int avgADC = sumWater / count;

    // Convert to percentage (using calibration)
    waterPercent = map(avgADC, calibDry, calibWet, 0, 100);
    waterPercent = constrain(waterPercent, 0, 100);

    // State machine with hysteresis
    if (avgADC < 500 - 20) {  // WARNING threshold with hysteresis
        currentWaterLevelState = STATE_WARNING;
    } else if (avgADC >= 500 + 20) {
        currentWaterLevelState = STATE_NORMAL;
    }
}
```

**Purpose:** Moving average filter smooths noisy readings. Hysteresis prevents state flickering.

---

### 6. WebSocket Connection & Data Transmission

```cpp
void sendSensorData() {
    if (wsConnected) {
        // Build JSON payload
        StaticJsonDocument<512> doc;
        doc["type"] = "sensor_data";
        doc["device_serial"] = DEVICE_SERIAL;
        
        JsonObject sensors = doc.createNestedObject("data");
        sensors["timestamp"] = buildTimestamp();
        sensors["ph"] = phValue;
        sensors["tds"] = tdsValue;
        sensors["ec"] = ecValue;
        sensors["turbidity"] = rawTurb;
        sensors["water_temperature"] = waterTempC;
        sensors["water_level"] = waterPercent;
        
        // Serialize and send
        String output;
        serializeJson(doc, output);
        wsClient.sendTXT(output);
        
        Serial.println("✓ Data sent to backend");
    }
}
```

**Connection Setup:**

```cpp
void initWebSocket() {
    wsClient.onEvent(wsEvent);  // Set event handler
    
    // Parse backend URL
    // wss://smartanom.onrender.com → wss://smartanom.onrender.com/ws/device/SERIAL/
    deriveWsEndpointFromBackend();
    
    // Connect
    if (WS_SECURE) {
        wsClient.beginSSL(WS_HOST, WS_PORT, WS_PATH);
    } else {
        wsClient.begin(WS_HOST, WS_PORT, WS_PATH);
    }
}
```

---

## Troubleshooting

### WiFi Issues

| Problem | Solution |
|---------|----------|
| Can't find ESP32 WiFi | Check serial monitor for AP name. Ensure device is in provisioning mode (first boot or after clearing credentials). |
| Captive portal doesn't open | Manually navigate to `http://192.168.4.1` in your browser. |
| Connection fails | Check WiFi password. Ensure 2.4GHz network (ESP32 doesn't support 5GHz). |
| Keeps resetting | Check power supply (needs 2A minimum). |

### WebSocket Issues

| Problem | Solution |
|---------|----------|
| Won't connect to backend | Check `BACKEND_URL` is correct. Verify backend is running. Check serial monitor for errors. |
| TLS/SSL errors | Ensure NTP time sync succeeded (check serial monitor). Backend must have valid SSL certificate. |
| Frequent disconnections | Check WiFi signal strength (RSSI). Backend might be sleeping (free tier services). |

### Sensor Issues

| Problem | Solution |
|---------|----------|
| pH reading stuck at 7.0 or NaN | Check wiring: AO→GPIO34, GND common, 5V power. Verify sensor in water. |
| TDS always 0 | Check wiring. Ensure probe is submerged. Verify voltage output with multimeter. |
| Temperature -127°C | DS18B20 not detected. Check wiring, 4.7kΩ pull-up resistor, and power. |
| Water level always 0% | Check calibration values. Ensure sensor AO connected to GPIO33. |

### Serial Monitor Commands

Enable Serial Monitor (115200 baud) to see diagnostic output:

```
✓ WiFi connected!
  IP: 192.168.1.100
  RSSI: -45 dBm
[Time] ✓ NTP sync successful
[WS] ✓ Connected
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

---

## Architecture

### State Machine

```
┌─────────────────┐
│  PROVISIONING   │ ← First boot or WiFi cleared
│      MODE       │
└────────┬────────┘
         │ User configures WiFi
         ↓
┌─────────────────┐
│   CONNECTING    │
│    TO WIFI      │
└────────┬────────┘
         │ Connected
         ↓
┌─────────────────┐
│   NORMAL OPS    │
│   (Monitoring)  │
└────────┬────────┘
         │
         ↓
    ┌────────┐
    │  Loop  │
    └────┬───┘
         ├→ Maintain WiFi
         ├→ Service WebSocket
         ├→ Read Sensors (every 5s)
         └→ Send Data
```

### Main Loop Flow

```cpp
void loop() {
    if (provisioningMode) {
        // Handle captive portal
        dnsServer.processNextRequest();
        server.handleClient();
    } else {
        // Normal operation
        maintainWiFiConnection();    // Check WiFi every 5s
        serviceWebSockets();          // Handle WS reconnection
        wsClient.loop();              // Process WS events
        
        // Read and send sensors every 5s
        if (millis() - lastSensorSend >= 5000) {
            readSensorsOnce();        // Read all sensors
            sendSensorData();         // Send via WebSocket
            lastSensorSend = millis();
        }
    }
}
```

### Data Flow

```
Sensors → ESP32 ADC/OneWire → Calibration → JSON → WebSocket → Backend → Database
                                                                      ↓
                                                                Frontend Dashboard
```

---

## Advanced Features

### Exponential Backoff Reconnection

```cpp
uint32_t computeBackoffDelayMs(uint32_t attempt) {
    uint32_t exp = (attempt >= 6) ? 6 : attempt;
    uint32_t delay = 1000 * (1 << exp);  // 1s, 2s, 4s, 8s, 16s, 32s, 64s
    if (delay > 60000) delay = 60000;    // Cap at 60s
    return delay;
}
```

**Purpose:** Prevents connection storms. Increases retry delay exponentially after failures.

### Time Synchronization (NTP)

Required for TLS/SSL certificate validation:

```cpp
bool syncTimeIfNeeded() {
    time_t now = time(nullptr);
    struct tm tm_info;
    localtime_r(&now, &tm_info);

    if (tm_info.tm_year + 1900 >= 2020) {
        return true;  // Already synced
    }

    // Configure NTP (Philippines timezone: UTC+8)
    configTime(28800, 0, "ph.pool.ntp.org", "asia.pool.ntp.org");

    // Wait up to 30 seconds for sync
    uint32_t start = millis();
    while ((millis() - start) < 30000) {
        now = time(nullptr);
        localtime_r(&now, &tm_info);
        if (tm_info.tm_year + 1900 >= 2020) return true;
        delay(500);
    }

    return false;  // Timeout
}
```

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues, questions, or contributions:

- **GitHub Issues:** [github.com/SmarTanom/SmarTanom](https://github.com/SmarTanom/SmarTanom)
- **Email:** support@smartanom.com
- **Documentation:** [smartanom.onrender.com/docs](https://smartanom.onrender.com/docs)

---

## Changelog

### v2.0.0 (2025-11-24)
- 🧹 Cleaned and finalized codebase
- ❌ Removed duplicate WebSocket systems
- ❌ Removed unused Upstash REST publishing
- ✅ Simplified sensor reading logic
- ✅ Improved code documentation
- 📉 Reduced codebase by 50%

### v1.2.0
- Added captive portal for WiFi provisioning
- Implemented WebSocket reconnection with exponential backoff
- Added NTP time synchronization for TLS

### v1.0.0
- Initial release with basic sensor monitoring

---

**Made with 🌱 by the SmarTanom Team**
