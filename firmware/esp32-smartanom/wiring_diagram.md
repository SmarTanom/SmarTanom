# ESP32 SmarTanom Wiring Diagram

## 📋 **Complete Pin Mapping**

| Sensor | ESP32 Pin | Sensor Pin | Power | Notes |
|--------|-----------|------------|-------|--------|
| **BH1750 (Light)** | | | | |
| | GPIO21 | SDA | - | I2C Data |
| | GPIO22 | SCL | - | I2C Clock |
| | 3.3V | VCC | 3.3V | Power |
| | GND | GND | GND | Ground |
| **DHT22 (Air Temp/Humidity)** | | | | |
| | GPIO5 | DATA | - | Digital signal |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |
| | - | - | - | **10kΩ pull-up: DATA to VCC** |
| **HW-03 (Water Level)** | | | | |
| | GPIO33 | SIGNAL | - | Analog output |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |
| **DS18B20 (Water Temp)** | | | | |
| | GPIO4 | DATA | - | OneWire protocol |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |
| | - | - | - | **4.7kΩ pull-up: DATA to VCC** |
| **TDS Sensor** | | | | |
| | GPIO39 | ANALOG | - | Analog voltage |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |
| **pH Sensor** | | | | |
| | GPIO36 (VP) | ANALOG | - | Analog voltage |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |
| **Turbidity Sensor** | | | | |
| | GPIO32 | ANALOG | - | Analog voltage |
| | 5V | VCC | 5V | Power |
| | GND | GND | GND | Ground |

## 🔌 **Power Distribution**

### **ESP32 Power:**
- **USB Power**: 5V → On-board regulator → 3.3V
- **External**: 3.3V directly to 3.3V pin (bypass regulator)

### **Sensor Power:**
- **5V External Supply** (recommended)
  - Connect to breadboard/PCB power rails
  - Distribute to all sensor VCC pins
- **Alternative**: ESP32 VIN pin (if powered via USB)

### **Ground Connections:**
```
ESP32 GND ──┬── Sensor 1 GND
            ├── Sensor 2 GND
            ├── Sensor 3 GND
            ├── ... (all sensors)
            └── External 5V Supply GND
```

## 🏗️ **Physical Layout Suggestion**

### **Breadboard Layout:**
```
    ESP32 DevKit
    ┌─────────────┐
    │ 3V3    GND  │──── Common GND Rail
    │ GPIO21 GPIO22│──── I2C (BH1750)
    │ GPIO5       │──── DHT22 Data
    │ GPIO4       │──── DS18B20 Data
    │ GPIO32      │──── Turbidity
    │ GPIO33      │──── Water Level
    │ GPIO36      │──── pH Sensor
    │ GPIO39      │──── TDS Sensor
    │ 5V     GND  │──── 5V Rail, GND Rail
    └─────────────┘

External 5V Supply
    ┌───────┐
    │ +5V ──┼──── 5V Power Rail
    │ GND ──┼──── GND Rail
    └───────┘
```

## ⚠️ **Critical Wiring Notes**

### **1. Pull-up Resistors (REQUIRED):**
- **DHT22**: 10kΩ between DATA (GPIO5) and VCC
- **DS18B20**: 4.7kΩ between DATA (GPIO4) and VCC

### **2. Power Supply:**
- **Never power all sensors from ESP32 3.3V pin** (insufficient current)
- Use external 5V supply or ESP32's VIN pin
- Current draw: ~200-500mA total for all sensors

### **3. Ground Integrity:**
- **All grounds must be connected** (star ground configuration)
- Poor grounding = erratic readings
- Use thick wires for ground connections

### **4. ADC Considerations:**
- ESP32 ADC reference: 3.3V
- ADC resolution: 12-bit (0-4095)
- GPIO36-39 are ADC1 pins (preferred for analog sensors)

## 🧪 **Testing Each Sensor**

### **BH1750 (I2C):**
```cpp
// Test code snippet
if (lightMeter.begin()) {
    Serial.println("BH1750 OK");
} else {
    Serial.println("BH1750 FAIL - Check I2C wiring");
}
```

### **DHT22:**
```cpp
// Test code snippet
float h = dht.readHumidity();
if (isnan(h)) {
    Serial.println("DHT22 FAIL - Check power/pull-up");
} else {
    Serial.println("DHT22 OK");
}
```

### **DS18B20:**
```cpp
// Test code snippet
sensors.requestTemperatures();
float temp = sensors.getTempCByIndex(0);
if (temp == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 FAIL - Check OneWire connection");
} else {
    Serial.println("DS18B20 OK");
}
```

### **Analog Sensors (TDS, pH, Turbidity, Water Level):**
```cpp
// Test code snippet - should read ~0-4095
int raw = analogRead(SENSOR_PIN);
Serial.printf("Sensor raw value: %d\n", raw);
// If always 4095 or 0 = wiring issue
// If fluctuating normally = OK
```

## 🔧 **Troubleshooting Wiring**

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| BH1750 initialization fails | I2C wiring | Check SDA=21, SCL=22, power |
| DHT22 returns NaN | Missing pull-up | Add 10kΩ resistor |
| DS18B20 not detected | OneWire issue | Check pull-up, connections |
| ADC reads 4095 constantly | Floating input | Check sensor connections |
| ADC reads 0 constantly | Sensor not powered | Check 5V supply |
| Erratic readings | Ground loops | Improve ground connections |
| Random resets | Power issues | Check current capacity |

## 📸 **Connection Verification Checklist**

- [ ] All sensors have 5V power
- [ ] All grounds connected to ESP32 GND
- [ ] DHT22 has 10kΩ pull-up resistor
- [ ] DS18B20 has 4.7kΩ pull-up resistor
- [ ] I2C sensors on GPIO21 (SDA) and GPIO22 (SCL)
- [ ] Analog sensors on ADC pins (32, 33, 36, 39)
- [ ] No loose connections
- [ ] External power supply adequate (1A+ capacity)
