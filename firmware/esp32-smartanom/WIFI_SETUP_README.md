# SmarTanom ESP32 WiFi Setup Guide

## Overview
The ESP32 SmarTanom device now supports WiFi connectivity with automatic AP mode fallback for easy setup.

## WiFi Setup Process

### 1. Initial Boot
- Device generates unique ID: `SmarTanom-XXXX` (where XXXX is based on MAC address)
- If no saved WiFi credentials exist, device starts in Access Point mode
- AP Network: `SmarTanom-XXXX`
- AP Password: `12345678`

### 2. Connecting to Device Hotspot
1. Power on your SmarTanom device
2. On your phone/computer, connect to WiFi network `SmarTanom-XXXX`
3. Use password: `12345678`
4. Device IP in AP mode: `192.168.4.1`

### 3. Sending WiFi Credentials
The device provides HTTP API endpoints:

#### Setup WiFi (POST /wifi-setup)
```bash
curl -X POST http://192.168.4.1/wifi-setup \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "ssid=YourWiFiName&password=YourWiFiPassword"
```

#### Check Status (GET /status)
```bash
curl http://192.168.4.1/status
```

#### Get Sensor Data (GET /sensors)
```bash
curl http://192.168.4.1/sensors
```

### 4. Automatic Behavior
- **Success**: Device connects to your WiFi and saves credentials
- **Failure**: Device returns to AP mode for retry
- **Reconnection**: Device auto-reconnects if WiFi connection is lost
- **Persistence**: WiFi credentials are saved in flash memory

### 5. Status Indicators
Monitor via Serial console (115200 baud):
- Device ID and mode (AP/Station)
- IP addresses
- WiFi connection status
- Sensor readings every 2 seconds

## API Endpoints

### WiFi Setup
- **URL**: `/wifi-setup`
- **Method**: POST
- **Parameters**:
  - `ssid`: Your WiFi network name
  - `password`: Your WiFi password
- **Response**: JSON status message

### Device Status
- **URL**: `/status`
- **Method**: GET
- **Response**: Device status, IP, and connection info

### Sensor Data
- **URL**: `/sensors`
- **Method**: GET
- **Response**: All sensor readings in JSON format

## Troubleshooting

### WiFi Connection Fails
1. Device automatically returns to AP mode
2. Check WiFi credentials are correct
3. Ensure WiFi network is in range
4. Verify password case sensitivity

### Reset WiFi Settings
To clear saved WiFi credentials:
1. Flash the firmware again, or
2. Add reset button functionality in future updates

### Connection Monitoring
- Device checks WiFi connection every 30 seconds
- Automatic fallback to AP mode if connection lost
- Serial monitor shows detailed status information

## Integration with SmarTanom Web App
The device setup page in the web application should:
1. Detect when user is connected to SmarTanom hotspot
2. Provide form for WiFi credentials
3. Send POST request to `/wifi-setup` endpoint
4. Monitor `/status` endpoint for connection confirmation
5. Guide user through the setup process

## Technical Details
- **WiFi Library**: ESP32 built-in WiFi
- **Web Server**: ESP32 WebServer library
- **Storage**: ESP32 Preferences (NVS)
- **Connection Timeout**: 20 seconds
- **Reconnection Check**: Every 30 seconds
- **CORS**: Enabled for cross-origin requests

## Required Libraries
- WiFi (ESP32 built-in)
- WebServer (ESP32 built-in)
- Preferences (ESP32 built-in)
- DHT sensor library (Adafruit)
- OneWire
- DallasTemperature
- BH1750 by Claws
