# SmarTanom ESP32 Firmware

## Hardware Components

### 🔌 **Sensors & Connections:**
1. **BH1750** (Light Sensor) - I2C
   - SDA → GPIO21
   - SCL → GPIO22
   - VCC → 3.3V
   - GND → GND

2. **DHT22** (Air Temperature & Humidity)
   - Data → GPIO5
   - VCC → 5V
   - GND → GND
   - **Note:** 10kΩ pull-up resistor required between data pin and VCC

3. **HW-03** (Water Level Sensor)
   - Signal → GPIO33
   - VCC → 5V
   - GND → GND

4. **DS18B20** (Water Temperature)
   - Data → GPIO4 (with 4.7kΩ pull-up resistor)
   - VCC → 5V
   - GND → GND

5. **TDS Sensor** (Total Dissolved Solids)
   - Analog Signal → GPIO39
   - VCC → 5V
   - GND → GND

6. **pH Sensor**
   - Analog Signal → GPIO36 (VP)
   - VCC → 5V
   - GND → GND

7. **Turbidity Sensor**
   - Analog Signal → GPIO32
   - VCC → 5V
   - GND → GND

### ⚡ **Power Requirements:**
- **ESP32**: 3.3V (USB/External)
- **Sensors**: 5V external supply recommended
- **Common Ground**: All sensors and ESP32 must share GND

## 📚 **Required Libraries**

Install these libraries through Arduino IDE Library Manager:

1. **DHT sensor library** by Adafruit
   ```
   Tools → Manage Libraries → Search "DHT sensor library"
   ```

2. **OneWire** by Jim Studt
   ```
   Tools → Manage Libraries → Search "OneWire"
   ```

3. **DallasTemperature** by Miles Burton
   ```
   Tools → Manage Libraries → Search "DallasTemperature"
   ```

4. **BH1750** by Claws
   ```
   Tools → Manage Libraries → Search "BH1750 Claws"
   ```

## 🚀 **Setup Instructions**

### 1. **Arduino IDE Configuration:**
   - Install ESP32 board package
   - Select board: "ESP32 Dev Module"
   - Set port to your ESP32's COM port

### 2. **Wiring:**
   - Follow the connection diagram above
   - **CRITICAL**: Ensure common ground between ESP32 and all sensors
   - Use 5V external supply for sensors (not ESP32's 3.3V pin)

### 3. **Upload & Monitor:**
   - Open Serial Monitor (115200 baud)
   - Upload the firmware
   - Monitor sensor readings every 2 seconds

## 🔧 **Calibration**

### **TDS Sensor:**
- Adjust `TDS_FACTOR` (default: 0.5)
- Test with known TDS solutions

### **pH Sensor:**
- Adjust `PH_CALIBRATION_OFFSET` (default: 0.00)
- Calibrate with pH 4.0, 7.0, and 10.0 buffer solutions

### **Water Level Sensor:**
- Adjust `DRY_VALUE` and `WET_VALUE` based on your sensor's range
- Test in dry and fully submerged conditions

## 📊 **Expected Output**

```
========== SENSOR READINGS ==========
-- DHT22 (Air) --
Humidity (Air)      : 65.20 %
Temperature (Air)   : 26.50 °C | 79.70 °F
-- HW-03 Water Sensor --
Raw=856 | Level=75%
-- DS18B20 (Water Temp) --
Temperature (Water) : 24.25 °C
-- TDS Sensor --
Raw ADC (TDS)       : 1234
Voltage (TDS)       : 1.001 V
TDS Value           : 456 ppm
-- pH Sensor --
Raw ADC (pH)        : 2048
Voltage (pH)        : 1.650 V
pH Value            : 5.78
-- Turbidity Sensor --
Raw ADC (Turb)      : 2200
Voltage (Turb)      : 1.77 V
Water Clarity       : Clear
-- BH1750 Light Sensor --
Light Level         : 1250.50 lx
Light Condition     : Bright daylight
======================================
```

## 🔗 **Integration with SmarTanom API**

This firmware currently outputs sensor data to Serial. To integrate with the SmarTanom backend:

1. **Add WiFi connectivity**
2. **HTTP POST to API endpoints**
3. **JSON data formatting**
4. **Error handling & reconnection**

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **"BH1750 Error initializing!"**
   - Check I2C wiring (SDA=21, SCL=22)
   - Verify 3.3V power to BH1750

2. **"Failed to read from DHT22!"**
   - Check pull-up resistor (10kΩ)
   - Verify 5V power supply

3. **"DS18B20 not detected!"**
   - Check pull-up resistor (4.7kΩ)
   - Verify OneWire connection

4. **Erratic ADC readings:**
   - Check common ground connections
   - Use external 5V supply for sensors
   - Add capacitors for noise filtering

## 📁 **File Structure**

```
firmware/
├── esp32-smartanom/
│   ├── esp32-smartanom.ino    # Main firmware file
│   ├── README.md              # This file
│   ├── wiring_diagram.md      # Detailed wiring guide
│   └── libraries.txt          # Library versions used
```
