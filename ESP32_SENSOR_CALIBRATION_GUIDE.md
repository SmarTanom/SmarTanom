# ESP32 Sensor Calibration Guide

## 🎯 Quick Calibration Reference

This guide helps you calibrate the sensors for accurate readings.

---

## pH Sensor Calibration

### What You Need
- pH 7.0 buffer solution (neutral)
- pH 4.0 buffer solution (acidic)
- Multimeter (to measure voltage)

### Steps
1. Connect pH sensor to ESP32 GPIO34
2. Place sensor in pH 7.0 buffer
3. Measure voltage with multimeter → Note as `PH_VOLTAGE_NEUTRAL`
4. Place sensor in pH 4.0 buffer
5. Measure voltage → Note as `PH_VOLTAGE_ACIDIC`
6. Update firmware constants:

```cpp
#define PH_VOLTAGE_NEUTRAL 2.5    // Your measured voltage at pH 7.0
#define PH_VOLTAGE_ACIDIC 3.0     // Your measured voltage at pH 4.0
```

### Expected Values
- Typical range: 0-3.3V
- pH 7.0 usually: ~2.5V
- pH 4.0 usually: ~3.0V

---

## TDS Sensor Calibration

### What You Need
- Distilled water (0 ppm reference)
- TDS calibration solution (e.g., 1000 ppm)
- Thermometer

### Steps
1. Connect TDS sensor to ESP32 GPIO35
2. Measure water temperature → Update `TDS_TEMPERATURE`
3. Place sensor in distilled water
4. Check ESP32 serial output → Should read near 0 ppm
5. Place sensor in calibration solution
6. Compare reading to known value
7. Adjust `TDS_K_VALUE` if needed:

```cpp
#define TDS_K_VALUE 1.0  // Increase if reading too low, decrease if too high
```

### EC Calculation
EC (mS/cm) = TDS (ppm) × K / 1000

Example:
- TDS = 500 ppm
- K = 1.0
- EC = 500 × 1.0 / 1000 = 0.5 mS/cm

---

## Water Level Sensor Calibration

### What You Need
- Empty reservoir
- Full reservoir (water at max level)
- Multimeter

### Steps
1. Connect water level sensor to ESP32 GPIO32
2. Place sensor in **empty** reservoir
3. Measure voltage → Note as `WATER_LEVEL_MIN_VOLTAGE`
4. Fill reservoir to **maximum** level
5. Measure voltage → Note as `WATER_LEVEL_MAX_VOLTAGE`
6. Update firmware:

```cpp
#define WATER_LEVEL_MIN_VOLTAGE 0.5   // Empty tank
#define WATER_LEVEL_MAX_VOLTAGE 3.0   // Full tank
```

### Calculation
```
Level% = ((voltage - MIN) / (MAX - MIN)) × 100
```

---

## Water Temperature Sensor (DS18B20)

### What You Need
- DS18B20 sensor
- Known temperature reference (thermometer)

### Steps
1. Connect DS18B20 to ESP32 GPIO25
2. **Note**: Current firmware uses analog approximation
3. **TODO**: Install OneWire library for accurate DS18B20 reading

### Recommended Library
```bash
arduino-cli lib install "OneWire"
arduino-cli lib install "DallasTemperature"
```

### Updated Code (for accurate reading)
```cpp
#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature tempSensor(&oneWire);

void setupSensors() {
    tempSensor.begin();
    // ... other sensor setup
}

float readWaterTemperature() {
    tempSensor.requestTemperatures();
    return tempSensor.getTempCByIndex(0);
}
```

---

## Turbidity Sensor Calibration

### What You Need
- Clear water (0 NTU reference)
- Turbid water sample (known NTU if available)
- Multimeter

### Steps
1. Connect turbidity sensor to ESP32 GPIO33
2. Place sensor in **clear** water
3. Measure voltage → Note as `TURBIDITY_CLEAR_VOLTAGE`
4. Place sensor in **very turbid** water
5. Measure voltage → Note as `TURBIDITY_MAX_VOLTAGE`
6. Update firmware:

```cpp
#define TURBIDITY_CLEAR_VOLTAGE 4.2  // Clear water (high voltage)
#define TURBIDITY_MAX_VOLTAGE 0.5    // Maximum turbidity (low voltage)
```

### Understanding
- **Clear water** = HIGH voltage (more light passes through)
- **Turbid water** = LOW voltage (less light passes through)

---

## 🔧 Calibration Testing

### Monitor Serial Output

```cpp
void loop() {
    // In normal operation mode
    if (millis() - lastSensorRead > SENSOR_READ_INTERVAL) {
        SensorReadings readings = readAllSensors();

        Serial.println("\n--- Sensor Readings ---");
        Serial.printf("pH: %.2f\n", readings.ph);
        Serial.printf("TDS: %.2f ppm\n", readings.tds);
        Serial.printf("EC: %.2f mS/cm\n", readings.ec);
        Serial.printf("Water Level: %.1f%%\n", readings.waterLevel);
        Serial.printf("Water Temp: %.2f°C\n", readings.waterTemp);
        Serial.printf("Turbidity: %.2f NTU\n", readings.turbidity);
    }
}
```

### Expected Ranges

| Sensor | Typical Range | Ideal Aquaponics Range |
|--------|---------------|------------------------|
| pH | 0 - 14 | 6.0 - 7.5 |
| TDS | 0 - 2000 ppm | 400 - 800 ppm |
| EC | 0 - 2 mS/cm | 0.4 - 0.8 mS/cm |
| Water Level | 0 - 100% | 70 - 90% |
| Water Temp | 0 - 50°C | 18 - 26°C |
| Turbidity | 0 - 3000 NTU | 0 - 50 NTU |

---

## 🧪 Calibration Validation

### Test Procedure

1. **Baseline Test** (no calibration)
   - Read sensors with factory defaults
   - Note any obvious errors

2. **Single Point Calibration**
   - Use one known reference (e.g., pH 7.0)
   - Adjust offset values

3. **Two Point Calibration**
   - Use two known references (e.g., pH 4.0 and 7.0)
   - Calculate slope for linear conversion

4. **Verification**
   - Test with third reference point
   - Compare to known value
   - Accuracy should be within ±5%

---

## 📊 Calibration Data Sheet

Fill this out during calibration:

### pH Sensor
- Date: ___________
- pH 7.0 Voltage: _____ V
- pH 4.0 Voltage: _____ V
- Slope: _____
- Notes: _______________

### TDS Sensor
- Date: ___________
- 0 ppm Voltage: _____ V
- 1000 ppm Voltage: _____ V
- K Value: _____
- Water Temp: _____ °C
- Notes: _______________

### Water Level
- Date: ___________
- Empty Voltage: _____ V
- Full Voltage: _____ V
- Notes: _______________

### Turbidity
- Date: ___________
- Clear Voltage: _____ V
- Turbid Voltage: _____ V
- Notes: _______________

---

## ⚠️ Common Calibration Issues

### pH Sensor
- **Drifting readings**: Sensor may need cleaning or replacement
- **Stuck at 7.0**: Check connections, sensor may be damaged
- **Random values**: Electrical noise - add capacitor or shielding

### TDS Sensor
- **Always 0**: Check power supply and connections
- **Unstable**: Temperature compensation may be off
- **Too high**: K value needs adjustment

### Water Level
- **Inverted**: Swap MIN and MAX voltage values
- **Not linear**: Sensor may not be linear type - use lookup table
- **Noise**: Add filtering in code (moving average)

### Turbidity
- **Always max**: Check LED power supply
- **Opposite direction**: Swap CLEAR and MAX voltages
- **Inconsistent**: Ensure sensor is fully submerged

---

## 🔄 Re-calibration Schedule

- **pH Sensor**: Every 3-6 months (or when drift detected)
- **TDS Sensor**: Every 6 months
- **Water Level**: Rarely (only if sensor moved)
- **Turbidity**: Every 6 months or when readings inconsistent
- **Temperature**: Rarely (DS18B20 is pre-calibrated)

---

## 📝 Firmware Update After Calibration

1. Update calibration constants in firmware
2. Recompile and upload to ESP32
3. Monitor serial output for 24 hours
4. Compare to manual measurements
5. Fine-tune if needed

---

**Calibration Complete! ✅**
Your sensors should now provide accurate readings for optimal plant growth monitoring.
