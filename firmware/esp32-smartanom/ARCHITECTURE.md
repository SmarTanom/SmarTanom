# SmarTanom ESP32 System Architecture & Diagrams

This document provides visual representations of the SmarTanom ESP32 monitoring system architecture, data flow, and component interactions.

---

## 1. Hardware Architecture

### 1.1 Complete System Wiring Diagram

```
                                   ESP32 Development Board
                                  ┌─────────────────────┐
                                  │                     │
    pH Sensor Module              │  GPIO 34 (ADC1_CH6)├──┐
    ┌──────────────┐             │                     │  │
    │  ┌────────┐  │  Analog     │  GPIO 35 (ADC1_CH7)├──┼──┐
    │  │ Probe  │  │  Output     │                     │  │  │
    │  └────────┘  ├──────────────┤  GPIO 32 (ADC1_CH4)├──┼──┼──┐
    │   pH Board   │              │                     │  │  │  │
    └──────────────┘              │  GPIO 33 (ADC1_CH5)├──┼──┼──┼──┐
                                  │                     │  │  │  │  │
    TDS/EC Sensor                 │  GPIO 4  (Digital) ├──┼──┼──┼──┼──┐
    ┌──────────────┐             │                     │  │  │  │  │  │
    │  ┌────────┐  │             │       3.3V  ────────┼──┼──┼──┼──┼──┼──┐
    │  │ Probe  │  │             │                     │  │  │  │  │  │  │
    │  └────────┘  ├─────────────┤       5V    ────────┼──┼──┼──┼──┼──┼──┼──┐
    │   TDS Board  │             │                     │  │  │  │  │  │  │  │
    └──────────────┘             │       GND   ────────┼──┼──┼──┼──┼──┼──┼──┼──┐
                                  └─────────────────────┘  │  │  │  │  │  │  │  │
    DS18B20 Waterproof                                    │  │  │  │  │  │  │  │
    ┌──────────────┐                                      │  │  │  │  │  │  │  │
    │  Red (VDD)   ├──────────────────────────────────────┘  │  │  │  │  │  │  │
    │  Yellow (DQ) ├────────────────────────┐                 │  │  │  │  │  │  │
    │  Black (GND) ├────────────────────────┼─────────────────┼──┼──┼──┼──┼──┼──┘
    └──────────────┘                        │                 │  │  │  │  │  │
                                            │                 │  │  │  │  │  │
                           4.7kΩ Pull-up    │                 │  │  │  │  │  │
                           Resistor         │                 │  │  │  │  │  │
                           ┌────────────────┘                 │  │  │  │  │  │
    Turbidity Sensor       │                                  │  │  │  │  │  │
    ┌──────────────┐      │                                  │  │  │  │  │  │
    │  Analog Out  ├──────┼──────────────────────────────────┼──┼──┘  │  │  │
    │  VCC (5V)    ├──────┼──────────────────────────────────┼──┼──────┼──┼──┘
    │  GND         ├──────┼──────────────────────────────────┼──┼──────┼──┼────┐
    └──────────────┘      │                                  │  │      │  │    │
                          │                                  │  │      │  │    │
    Water Level Sensor    │                                  │  │      │  │    │
    (HW-038 / Rain Sensor)│                                  │  │      │  │    │
    ┌──────────────┐     │                                  │  │      │  │    │
    │  Analog Out  ├─────┼──────────────────────────────────┼──┘      │  │    │
    │  VCC (3.3V)  ├─────┼──────────────────────────────────┘         │  │    │
    │  GND         ├─────┼────────────────────────────────────────────┘  │    │
    └──────────────┘     │                                               │    │
                         │                                               │    │
                         └───────────────────────────────────────────────┘    │
                                    Common Ground (CRITICAL!)                 │
                                    All grounds must be connected ────────────┘
```

### 1.2 Pin Assignment Summary

| GPIO Pin | Function | Sensor/Purpose | ADC Channel |
|----------|----------|----------------|-------------|
| GPIO 34 | Analog Input | pH Sensor | ADC1_CH6 |
| GPIO 35 | Analog Input | TDS/EC Sensor | ADC1_CH7 |
| GPIO 32 | Analog Input | Turbidity Sensor | ADC1_CH4 |
| GPIO 33 | Analog Input | Water Level Sensor | ADC1_CH5 |
| GPIO 4 | Digital I/O | DS18B20 Temperature (OneWire) | N/A |
| 3.3V | Power | Sensor VCC (3.3V compatible) | N/A |
| 5V | Power | Sensor VCC (5V required) | N/A |
| GND | Ground | Common ground (all sensors) | N/A |

---

## 2. Software Architecture

### 2.1 Firmware State Machine

```
                              ┌─────────────┐
                              │   BOOT UP   │
                              └──────┬──────┘
                                     │
                          Check NVS for WiFi credentials?
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                   Yes                               No
                    │                                 │
                    ↓                                 ↓
        ┌─────────────────────┐         ┌─────────────────────┐
        │ Attempt WiFi        │         │  PROVISIONING MODE  │
        │ Connection          │         │  (Captive Portal)   │
        └──────┬──────────────┘         └──────┬──────────────┘
               │                                │
        Success?│                               │
               │                          User configures
        ┌──────┴──────┐                   WiFi via web UI
        │             │                          │
       Yes           No                          │
        │             │                          │
        │             └──────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│              NORMAL OPERATION MODE                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Maintain   │  │   Service    │  │  Read Sensors│  │
│  │     WiFi     │→ │  WebSockets  │→ │  Every 5s    │  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
│                                               │          │
│  ┌──────────────────────────────────────────┐│          │
│  │        First payload?                    ││          │
│  │  ┌─────────────────┐  ┌────────────────┐││          │
│  │  │  Yes: Wait 30s  │  │ No: Send       │││          │
│  │  │  warmup period  │  │ immediately    │││          │
│  │  └────────┬────────┘  └────────┬───────┘││          │
│  │           │                    │         ││          │
│  │           └─────────┬──────────┘         ││          │
│  └─────────────────────┼────────────────────┘│          │
│                        ↓                      │          │
│              ┌──────────────────┐            │          │
│              │  Send via        │←───────────┘          │
│              │  WebSocket       │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        ↓                                │
│              ┌──────────────────┐                       │
│              │  Log to Serial   │                       │
│              │  Monitor         │                       │
│              └──────────────────┘                       │
│                        │                                │
│                        └────────────────────┐           │
│                                             │           │
└─────────────────────────────────────────────┼───────────┘
                                              │
                                              ↓
                                         (Loop back)
```

### 2.2 Main Loop Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         loop()                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
         Provisioning Mode?      Normal Operation Mode
                 │                       │
                Yes                     No
                 │                       │
                 ↓                       ↓
    ┌────────────────────────┐  ┌────────────────────────┐
    │ Handle Captive Portal  │  │ maintainWiFiConnection()│
    │ - DNS Server           │  │                        │
    │ - HTTP Web Server      │  │ serviceWebSockets()    │
    └────────────────────────┘  │                        │
                                │ wsClient.loop()        │
                                │                        │
                                │ if (5 seconds elapsed):│
                                │   readSensorsOnce()    │
                                │   sendSensorData()     │
                                └────────────────────────┘
                                             │
                                    delay(5ms)
                                             │
                                             └────┐
                                                  │
                                                  └──> (Repeat)
```

---

## 3. Data Flow Architecture

### 3.1 End-to-End Data Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHYSICAL WORLD                                   │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                    │
│  │  pH  │  │ TDS/ │  │ Temp │  │Turbi-│  │Water │                    │
│  │Sensor│  │  EC  │  │ DS18 │  │dity  │  │Level │                    │
│  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘                    │
└──────┼─────────┼─────────┼─────────┼─────────┼───────────────────────┘
       │         │         │         │         │
       │ Analog  │ Analog  │ Digital │ Analog  │ Analog
       ↓         ↓         ↓         ↓         ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        ESP32 MICROCONTROLLER                            │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    SIGNAL ACQUISITION                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │ │
│  │  │ ADC         │  │ ADC         │  │ OneWire     │              │ │
│  │  │ 12-bit      │  │ 12-bit      │  │ Protocol    │              │ │
│  │  │ 0-4095      │  │ 0-4095      │  │ Handler     │              │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │ │
│  └─────────┼─────────────────┼─────────────────┼─────────────────────┘ │
│            ↓                 ↓                 ↓                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    SIGNAL PROCESSING                              │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │ │
│  │  │  Median    │  │   Moving   │  │Temperature │  │   State    │ │ │
│  │  │  Filter    │  │   Average  │  │Compensated │  │  Machine   │ │ │
│  │  │  (pH)      │  │  (Water)   │  │   EC/TDS   │  │  (Level)   │ │ │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │ │
│  └────────┼────────────────┼────────────────┼────────────────┼───────┘ │
│           ↓                ↓                ↓                ↓          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     CALIBRATION                                   │ │
│  │  • pH: Linear formula (-5.70V + 20.84)                           │ │
│  │  • EC: DFRobot cubic polynomial × 1.1151                         │ │
│  │  • Water Level: map(ADC, calibDry, calibWet, 0, 100)            │ │
│  │  • Temperature: rawTemp + 14.80°C offset                         │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
│                                  ↓                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    JSON SERIALIZATION                             │ │
│  │  {                                                                │ │
│  │    "type": "sensor_data",                                         │ │
│  │    "device_serial": "SMRT-001",                                   │ │
│  │    "timestamp": "2025-11-24T10:30:00+0800",                       │ │
│  │    "data": {                                                      │ │
│  │      "ph": 6.85,                                                  │ │
│  │      "tds": 650,                                                  │ │
│  │      "ec": 1.30,                                                  │ │
│  │      "water_temperature": 26.5,                                   │ │
│  │      "water_level": 75,                                           │ │
│  │      "turbidity": 250                                             │ │
│  │    }                                                              │ │
│  │  }                                                                │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────────────┼──────────────────────────────────────┘
                                     │
                              WebSocket (WSS)
                              TLS/SSL Encrypted
                                     │
                                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLOUD BACKEND (Django)                           │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │              WebSocket Consumer (Django Channels)                 │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
│                                  ↓                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                     Data Validation                               │ │
│  │  • Check device authentication                                    │ │
│  │  • Validate sensor ranges                                         │ │
│  │  • Detect anomalies                                               │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
│                                  ↓                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │              Database Storage (PostgreSQL)                        │ │
│  │  Models: Device, SensorData, User, Reservoir                     │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
│                                  ↓                                      │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │          Real-Time Broadcast (Redis Pub/Sub)                      │ │
│  │  Channel: smartanom:sensors                                       │ │
│  └───────────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────────────┼──────────────────────────────────────┘
                                     │
                              WebSocket + REST API
                                     │
                                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     WEB DASHBOARD (React + Vite)                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    Real-Time Display                              │ │
│  │  • Live charts (Recharts library)                                │ │
│  │  • Alert notifications                                            │ │
│  │  • Historical data graphs                                         │ │
│  │  • Calibration interface                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ↓
                            ┌────────────────┐
                            │   END USER     │
                            │  (Grower/      │
                            │  Researcher)   │
                            └────────────────┘
```

**Latency Breakdown:**
- Sensor Reading: ~100ms (includes filtering)
- JSON Serialization: ~10ms
- WebSocket Transmission: 50-200ms (depends on network)
- Backend Processing: ~50ms
- Database Write: ~20ms
- Frontend Update: ~30ms
- **Total End-to-End: ~260-430ms** (< 0.5 second)

---

## 4. Network Architecture

### 4.1 WiFi Provisioning Flow

```
┌────────────┐                                    ┌──────────────┐
│   ESP32    │                                    │  User Phone  │
│  (Unpaired)│                                    │  or Laptop   │
└─────┬──────┘                                    └──────┬───────┘
      │                                                  │
      │ 1. Boot into AP mode                            │
      │    SSID: SMRT-XXX-XXX                           │
      │    Password: smartanomSMRT-XXX-XXX              │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                   2. User connects to ESP32 WiFi│
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 3. DNS Server redirects all requests to         │
      │    192.168.4.1 (Captive Portal)                 │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                   4. User selects home WiFi and │
      │                      enters password via web UI │
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 5. ESP32 attempts connection to user WiFi       │
      ├──────────────────────────┐                      │
      │                          │                      │
      │  ┌────────────────────┐  │                      │
      │  │ Connect to Router  │  │                      │
      │  └────────────────────┘  │                      │
      │                          │                      │
      │ 6. Save credentials to NVS                      │
      ├<─────────────────────────┘                      │
      │                                                  │
      │ 7. Report success to user                       │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │ 8. Shut down AP mode                            │
      │    Start normal operation                        │
      ├──────────────────────────┐                      │
      │                          │                      │
      │  ┌────────────────────┐  │                      │
      │  │ Connect to Backend │  │                      │
      │  │ via WebSocket      │  │                      │
      │  └────────────────────┘  │                      │
      │                          │                      │
      ├<─────────────────────────┘                      │
      │                                                  │
      ↓                                                  ↓
   (Normal                                    (User reconnects
   Operation)                                  to home WiFi)
```

### 4.2 WebSocket Communication Flow

```
┌────────────┐                                    ┌──────────────┐
│   ESP32    │                                    │   Backend    │
│            │                                    │   Server     │
└─────┬──────┘                                    └──────┬───────┘
      │                                                  │
      │ 1. NTP Time Sync (for TLS)                      │
      ├──────────────> NTP Servers                      │
      │                                                  │
      │ 2. WebSocket Handshake (WSS)                    │
      │    wss://backend.com/ws/device/SMRT-001/        │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                3. TLS Certificate Validation    │
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 4. Connection Established                       │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │ 5. Device Handshake Message                     │
      │    { "device_serial": "SMRT-001",               │
      │      "wifi_configured": true,                   │
      │      "status": "connected" }                    │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                            6. ACK                │
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 7. Sensor Data (every 5 seconds)                │
      │    { "type": "sensor_data", ...}                │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                           8. Server Ping         │
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 9. Pong Response                                │
      ├─────────────────────────────────────────────────>
      │                                                  │
      │                        10. Commands (optional)  │
      │                           { "action": "reset"}  │
      <─────────────────────────────────────────────────┤
      │                                                  │
      │ 11. Command Acknowledgment                      │
      ├─────────────────────────────────────────────────>
      │                                                  │
      ↓ (Connection maintained indefinitely)            ↓
```

**Reconnection Strategy (Exponential Backoff):**
```
Attempt  | Delay      | Cumulative Time
---------|------------|------------------
1        | 1 second   | 1s
2        | 2 seconds  | 3s
3        | 4 seconds  | 7s
4        | 8 seconds  | 15s
5        | 16 seconds | 31s
6        | 32 seconds | 63s
7+       | 60 seconds | 123s+ (capped)
```

---

## 5. Sensor Reading Timing Diagram

### 5.1 Sensor Polling Cycle (5-Second Interval)

```
Time:     0ms      100ms    200ms    300ms    400ms    500ms    ...    5000ms
          │         │        │        │        │        │              │
          ↓         ↓        ↓        ↓        ↓        ↓              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ Water Level   ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ (Moving Avg)  └─ Read 10 samples                                       │
└─────────────────────────────────────────────────────────────────────────┘
          │
          └────────────────────────────────────────────────────────────────>
                   │
┌──────────────────┼──────────────────────────────────────────────────────┐
│ Temperature      ↓                                                      │
│ (DS18B20)    ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│              └─ Request temp (750ms conversion time)                   │
└─────────────────────────────────────────────────────────────────────────┘
                   │
                   └─────────────────────────────────────────────────────>
                            │
┌───────────────────────────┼──────────────────────────────────────────────┐
│ TDS/EC                    ↓                                             │
│ (30 samples)          ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                       └─ Read + temp compensation + calc                │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            └────────────────────────────────────────────>
                                    │
┌───────────────────────────────────┼──────────────────────────────────────┐
│ pH                                ↓                                      │
│ (Median filter)               ████████████████░░░░░░░░░░░░░░░░░░░░░░│
│                               └─ 10 samples + sort + filter + calc      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    └───────────────────────────────────>
                                            │
┌───────────────────────────────────────────┼──────────────────────────────┐
│ Turbidity                                 ↓                              │
│ (Single read)                         ████░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                       └─ Single ADC read + voltage map   │
└─────────────────────────────────────────────────────────────────────────┘
                                            │
                                            └─────────────────────────────>
                                                    │
┌───────────────────────────────────────────────────┼──────────────────────┐
│ JSON Serialization                                ↓                      │
│                                               ████░░░░░░░░░░░░░░░░░░░│
│                                               └─ Build JSON payload      │
└─────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    └───────────────────>
                                                            │
┌───────────────────────────────────────────────────────────┼──────────────┐
│ WebSocket Send                                            ↓              │
│                                                       ████░░░░░░░░░░░░│
│                                                       └─ Transmit        │
└─────────────────────────────────────────────────────────────────────────┘
                                                            │
                                                            └─────────────>
                                                                    │
                                                                    ↓
                                                            ████████████████
                                                            Idle / Waiting
                                                            (until next 5s)
```

**Total Processing Time per Cycle: ~500-600ms**
**Idle Time per Cycle: ~4400-4500ms**
**CPU Utilization: ~10-12% (efficient power usage)**

---

## 6. Memory Architecture

### 6.1 ESP32 Memory Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    ESP32 Memory Map                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FLASH (4MB)                                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • Bootloader       (~28 KB)                       │   │
│  │  • Partition Table  (~3 KB)                        │   │
│  │  • NVS (Non-Volatile Storage)  (~20 KB)           │   │
│  │    └─ WiFi Credentials (SSID, Password)           │   │
│  │  • OTA Data         (~8 KB)                        │   │
│  │  • App Partition    (~1.8 MB)                      │   │
│  │    └─ Firmware Code                                │   │
│  │  • SPIFFS/LittleFS  (~1.5 MB)                      │   │
│  │    └─ Web UI assets (future use)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SRAM (520 KB)                                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • Internal RAM 0   (~192 KB)                      │   │
│  │    └─ Heap, Stack, Global Variables                │   │
│  │  • Internal RAM 1   (~128 KB)                      │   │
│  │    └─ WiFi/BT stack, DMA buffers                   │   │
│  │  • RTC Fast Memory  (~8 KB)                        │   │
│  │    └─ Deep sleep retention                         │   │
│  │  • RTC Slow Memory  (~8 KB)                        │   │
│  │    └─ ULP coprocessor                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EEPROM Emulation (512 bytes)                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  • Water Level Calibration (calibDry, calibWet)    │   │
│  │  • Magic Number (0xA5) for validity check          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Runtime Memory Usage

| Component | Approximate Size | Purpose |
|-----------|------------------|---------|
| Firmware code | ~800 KB | Program instructions |
| WiFi stack | ~60 KB | Network protocols |
| WebSocket library | ~40 KB | WS client implementation |
| ArduinoJson | ~20 KB | JSON parsing/generation |
| Sensor buffers | ~1.5 KB | Moving average, filtering |
| Global variables | ~2 KB | State, config, timestamps |
| Stack (both cores) | ~32 KB | Function calls, local vars |
| Heap (free) | ~200 KB | Dynamic allocations |

---

## 7. Power Consumption Profile

### 7.1 Current Draw by Operation Mode

```
Current (mA)
    │
500 ┤                                                  ███
    │                                                  ███
400 ┤                    ███                           ███
    │                    ███                           ███
300 ┤     ███            ███     ███                   ███
    │     ███            ███     ███                   ███
200 ┤     ███     ███    ███     ███     ███    ███    ███
    │     ███     ███    ███     ███     ███    ███    ███
100 ┤  ███ ███ ███ ███ ██ ███ ███ ███ ███ ███ ███ ███ ███
    │  ███ ███ ███ ███ ███ ███ ███ ███ ███ ███ ███ ███ ███
  0 └──┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴────
      Boot WiFi ADC  WS  ADC  WS  ADC WS  ADC  WS  Sleep Deep
      up   Con- Read Send Read Send Read Send Read Send Idle  Sleep
           nect                                              (future)

Average Current: ~150-200 mA (at 5V)
Peak Current: ~500 mA (WiFi transmission)
Power Consumption: 0.75-1.0 Watts typical
```

---

This visual guide provides a comprehensive overview of the SmarTanom ESP32 system architecture, helping developers and researchers understand how all components interact to create a robust water quality monitoring solution.

---

**For implementation details, see:**
- [README.md](README.md) - Complete documentation
- [METHODOLOGY.md](METHODOLOGY.md) - Academic thesis chapter
- [QUICK_START.md](QUICK_START.md) - Setup guide
