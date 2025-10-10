# SmarTanom Firmware

This directory contains the embedded firmware for SmarTanom IoT devices.

## 📂 **Directory Structure**

```
firmware/
├── esp32-smartanom/           # Main ESP32 firmware
│   ├── esp32-smartanom.ino    # Arduino IDE project file
│   ├── README.md              # Hardware setup guide
│   ├── wiring_diagram.md      # Detailed wiring instructions
│   └── libraries.txt          # Required Arduino libraries
└── README.md                  # This file
```

## 🔧 **Hardware Platforms**

### **ESP32 (Primary Platform)**
- **File**: `esp32-smartanom/esp32-smartanom.ino`
- **Sensors**: 8 sensors matching backend API
- **Communication**: Serial output (WiFi integration planned)
- **IDE**: Arduino IDE or PlatformIO

## 🌐 **Sensor Integration**

The ESP32 firmware monitors all 8 sensor types defined in the SmarTanom backend:

| Backend Sensor Type | Hardware Sensor | ESP32 Pin | Notes |
|---------------------|-----------------|-----------|-------|
| `ph` | pH Sensor | GPIO36 | Analog, requires calibration |
| `tds` | TDS Sensor | GPIO39 | Analog, temperature compensated |
| `water_temperature` | DS18B20 | GPIO4 | OneWire, waterproof |
| `water_level` | HW-03 | GPIO33 | Analog, configurable range |
| `turbidity` | Turbidity Sensor | GPIO32 | Analog, clarity measurement |
| `air_temperature` | DHT22 | GPIO5 | Digital, with humidity |
| `humidity` | DHT22 | GPIO5 | Same sensor as air temp |
| `light` | BH1750 | GPIO21/22 | I2C, high precision |

## 🚀 **Quick Start**

1. **Hardware Setup**:
   ```bash
   cd firmware/esp32-smartanom/
   # Follow wiring_diagram.md instructions
   ```

2. **Arduino IDE Setup**:
   - Install ESP32 board package
   - Install required libraries (see libraries.txt)
   - Open esp32-smartanom.ino

3. **Upload & Monitor**:
   - Select "ESP32 Dev Module" board
   - Upload firmware
   - Open Serial Monitor (115200 baud)

## 📊 **Data Output**

Current firmware outputs sensor readings to Serial every 2 seconds:

```
========== SENSOR READINGS ==========
-- DHT22 (Air) --
Humidity (Air)      : 65.20 %
Temperature (Air)   : 26.50 °C | 79.70 °F
-- DS18B20 (Water Temp) --
Temperature (Water) : 24.25 °C
-- TDS Sensor --
TDS Value           : 456 ppm
-- pH Sensor --
pH Value            : 5.78
-- Turbidity Sensor --
Water Clarity       : Clear
-- BH1750 Light Sensor --
Light Level         : 1250.50 lx
======================================
```

## 🔮 **Future Development**

### **Planned Features**:
- [ ] **WiFi connectivity** for direct API communication
- [ ] **HTTP POST** to SmarTanom backend endpoints
- [ ] **JSON data formatting** matching API requirements
- [ ] **OTA firmware updates**
- [ ] **Deep sleep** for battery operation
- [ ] **Calibration mode** via serial commands
- [ ] **Error reporting** and diagnostics

### **Integration Roadmap**:
1. **Phase 1**: Serial monitoring (✅ Complete)
2. **Phase 2**: WiFi + HTTP API integration
3. **Phase 3**: Real-time data streaming
4. **Phase 4**: Remote configuration and OTA updates

## 🛠️ **Development**

### **Adding New Sensors**:
1. Update pin definitions in `.ino` file
2. Add sensor initialization in `setup()`
3. Add reading logic in `loop()`
4. Update backend sensor model if needed

### **Testing**:
- Use Serial Monitor for debugging
- Test each sensor individually
- Verify calibration with known references

### **Contributing**:
- Follow Arduino coding standards
- Document new sensor integrations
- Test on actual hardware before submitting

## 📋 **Requirements**

- **Hardware**: ESP32 development board
- **Sensors**: 8x sensors as specified in wiring diagram
- **Software**: Arduino IDE with ESP32 support
- **Libraries**: See `esp32-smartanom/libraries.txt`

## 🆘 **Support**

For hardware setup issues, see `esp32-smartanom/README.md` and `wiring_diagram.md`.

For backend API integration questions, refer to the main project documentation.
