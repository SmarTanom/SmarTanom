# SmarTanom ESP32 Sensor Calibration Guide

This guide provides step-by-step procedures for calibrating each sensor in your SmarTanom monitoring system to ensure accurate readings.

---

## Why Calibration Matters

**Factory sensors are NOT pre-calibrated for your specific setup.** Variations in:
- Manufacturing tolerances
- Power supply voltage
- Cable length and resistance
- Water chemistry
- Temperature

...can cause measurement errors of 10-30% or more! Calibration corrects these errors using known reference standards.

---

## 📋 Calibration Checklist

Before you begin, gather these items:

### Required Materials
- [ ] Your assembled SmarTanom device
- [ ] USB cable and computer with Serial Monitor
- [ ] Clean distilled or deionized water
- [ ] Thermometer (for reference)

### pH Calibration
- [ ] pH 4.0 buffer solution (250ml minimum)
- [ ] pH 7.0 buffer solution (250ml minimum)
- [ ] pH 10.0 buffer solution (optional, for verification)

### TDS/EC Calibration
- [ ] EC 1.413 mS/cm standard solution (or known EC value)
- [ ] Alternative: Pre-mixed nutrient solution with known EC

### Water Level Calibration
- [ ] Container for sensor immersion
- [ ] Paper towels for drying

---

## 1. pH Sensor Calibration

### 1.1 Understanding pH Calibration

Your pH sensor outputs a voltage that varies with pH. The relationship is approximately linear:
- **Low pH (acidic):** Higher voltage
- **High pH (alkaline):** Lower voltage

The firmware uses this formula:
```cpp
pH = (slope × voltage) + intercept
```

Currently set to:
```cpp
pH = (-5.70 × voltage) + 20.84
```

### 1.2 Measuring Your Sensor's Response

#### Step 1: Upload Test Sketch

Temporarily modify your code or use this test function:

```cpp
void testPhSensor() {
    Serial.begin(115200);
    analogReadResolution(12);
    analogSetPinAttenuation(PH_PIN, ADC_11db);
    
    while(true) {
        // Take multiple readings
        long sum = 0;
        for(int i = 0; i < 10; i++) {
            sum += analogRead(PH_PIN);
            delay(50);
        }
        int avgRaw = sum / 10;
        
        float voltage = avgRaw * (3.3 / 4095.0);
        Serial.printf("ADC: %d | Voltage: %.3f V\n", avgRaw, voltage);
        delay(1000);
    }
}
```

Call this in `setup()` to see raw voltage readings.

#### Step 2: Measure pH 7.0 Buffer

1. Rinse pH probe with distilled water
2. Shake off excess water
3. Submerge probe in pH 7.0 buffer solution
4. Wait 2-3 minutes for stabilization
5. Record the voltage from Serial Monitor

**Example output:**
```
ADC: 1586 | Voltage: 2.508 V
```

Record this: **V₇ = 2.508 V**

#### Step 3: Measure pH 4.0 Buffer

1. Rinse probe thoroughly with distilled water
2. Submerge probe in pH 4.0 buffer solution
3. Wait 2-3 minutes for stabilization
4. Record the voltage

**Example output:**
```
ADC: 1820 | Voltage: 2.880 V
```

Record this: **V₄ = 2.880 V**

### 1.3 Calculate Calibration Values

Using your two measurements:

```
Slope = (pH₇ - pH₄) / (V₇ - V₄)
Slope = (7.0 - 4.0) / (2.508 - 2.880)
Slope = 3.0 / (-0.372)
Slope = -8.06

Intercept = pH₇ - (Slope × V₇)
Intercept = 7.0 - (-8.06 × 2.508)
Intercept = 7.0 + 20.21
Intercept = 27.21
```

### 1.4 Update Firmware

Edit `esp32-smartanom-clean.ino`:

```cpp
// OLD (default values):
float ph = (-5.70f * volt) + 20.84f;

// NEW (your calibrated values):
float ph = (-8.06f * volt) + 27.21f;
```

Upload the updated firmware and verify with both buffer solutions!

### 1.5 Verification

Test your calibration:
- pH 7.0 buffer should read **7.0 ± 0.1**
- pH 4.0 buffer should read **4.0 ± 0.1**
- pH 10.0 buffer (optional) should read **10.0 ± 0.2**

If readings are off by >0.2 pH units, repeat calibration.

---

## 2. TDS/EC Sensor Calibration

### 2.1 Understanding EC Calibration

The firmware converts sensor voltage to EC using a DFRobot polynomial, then applies a calibration factor:

```cpp
ec_mS = (polynomial result) × EC_CAL_FACTOR
```

Default: `EC_CAL_FACTOR = 1.1151`

### 2.2 Measuring Actual EC

#### Step 1: Prepare Standard Solution

**Option A:** Buy commercial EC standard (1.413 mS/cm is common)  
**Option B:** Use a known nutrient solution measured with a calibrated EC meter

For this example, let's use **EC standard = 1.413 mS/cm**

#### Step 2: Measure with Your Sensor

1. Rinse TDS probe with distilled water
2. Submerge probe in standard solution
3. Wait for temperature to stabilize (important!)
4. Let device run for 30 seconds
5. Check Serial Monitor for EC reading

**Example output:**
```
EC: 1.27 mS/cm
TDS: 635 ppm
```

Your measured EC: **1.27 mS/cm**

### 2.3 Calculate Correction Factor

```
EC_CAL_FACTOR = EC_standard / EC_measured
EC_CAL_FACTOR = 1.413 / 1.27
EC_CAL_FACTOR = 1.113
```

### 2.4 Update Firmware

Edit the calibration constant:

```cpp
// OLD:
#define EC_CAL_FACTOR 1.1151f

// NEW:
#define EC_CAL_FACTOR 1.113f
```

Upload and verify!

### 2.5 Verification

After calibration, the standard solution should read:
- **EC: 1.41 ± 0.03 mS/cm**
- **TDS: 705 ± 15 ppm** (at conversion factor 0.5)

### 2.6 Temperature Compensation Check

Test in both cold (15°C) and warm (30°C) water:
- EC readings should remain consistent
- TDS should scale with EC
- Formula: `TDS = EC × 500`

---

## 3. Water Temperature Calibration (DS18B20)

### 3.1 Understanding Temperature Offset

DS18B20 sensors have factory calibration but may need offset adjustment:

```cpp
waterTempC = rawTemp + TEMP_OFFSET;
```

Current offset: `+14.80°C` (seems very high - verify this!)

### 3.2 Calibration Procedure

#### Step 1: Ice Bath Test (0°C Reference)

1. Fill container with ice and water
2. Stir and wait for equilibrium
3. Submerge DS18B20 probe
4. Wait 5 minutes
5. Record temperature

**Expected:** ~0°C  
**If reading is 14.8°C:** Offset is WRONG! Should be close to 0°C.

#### Step 2: Boiling Water Test (100°C Reference)

⚠️ **Safety Warning:** Hot water can damage sensor housing! Skip if probe is not rated for 100°C.

1. Boil water (at sea level = 100°C)
2. Submerge probe carefully
3. Record temperature

**Expected:** ~100°C

#### Step 3: Room Temperature Verification

Use a calibrated thermometer:

1. Place both thermometers in the same water
2. Wait for equilibrium
3. Compare readings
4. Calculate offset

**Example:**
```
Reference thermometer: 25.3°C
ESP32 reading (raw): 10.5°C
Offset needed: 25.3 - 10.5 = 14.8°C ✓ (matches current setting)
```

### 3.3 Update Firmware

```cpp
// Adjust this value based on your measurement:
waterTempC = tempSensors.getTempCByIndex(0) + 14.80; // Your offset here
```

### 3.4 Verification

Test across temperature range:
- Cold water (10-15°C): ±0.5°C accuracy
- Room temp (20-25°C): ±0.3°C accuracy
- Warm water (30-35°C): ±0.5°C accuracy

---

## 4. Water Level Sensor Calibration

### 4.1 Understanding Water Level Mapping

The rain sensor outputs different voltages based on water contact:

```
Dry (0% wetness): High resistance → Low voltage → Low ADC
Wet (100% wetness): Low resistance → High voltage → High ADC
```

The firmware maps this range to 0-100%:

```cpp
percentage = (ADC - calibDry) / (calibWet - calibDry) × 100
```

### 4.2 Calibration Procedure

#### Step 1: Measure Dry Value

1. Ensure sensor is completely dry (wipe with paper towel)
2. Open Serial Monitor
3. Check water level raw ADC value
4. Record this value

**Example:**
```
Water Level: 2% (raw=580, NORMAL)
```

**calibDry = 580** (or whatever your sensor reads when dry)

#### Step 2: Measure Wet Value

1. Fully submerge sensor in water (up to MAX line, not beyond!)
2. Wait 10 seconds for reading to stabilize
3. Record raw ADC value

**Example:**
```
Water Level: 98% (raw=1720, NORMAL)
```

**calibWet = 1720**

### 4.3 Update Firmware

Edit these constants:

```cpp
// OLD default values:
int calibDry = 600;
int calibWet = 1700;

// NEW calibrated values:
int calibDry = 580;   // Your dry reading
int calibWet = 1720;  // Your wet reading
```

### 4.4 Save to EEPROM

The firmware automatically saves calibration to EEPROM when you call:

```cpp
eepromSaveWaterCalibration();
```

You can add a serial command to trigger this, or it saves automatically on first run.

### 4.5 Verification

Test at different levels:
- Dry: Should read **0-5%**
- Half submerged: Should read **45-55%**
- Fully submerged: Should read **95-100%**

### 4.6 Adjust Warning Threshold

If needed, adjust the low-water warning threshold:

```cpp
int ADC_WARNING_THRESH = 500;  // Change this based on your needs
```

Example: If you want warning at 30% water level:
```
ADC_at_30% = calibDry + (calibWet - calibDry) × 0.30
ADC_at_30% = 580 + (1720 - 580) × 0.30
ADC_at_30% = 580 + 342
ADC_at_30% = 922
```

Set: `ADC_WARNING_THRESH = 922`

---

## 5. Turbidity Sensor Calibration

### 5.1 Understanding Turbidity Mapping

Turbidity sensor measures light scattering:
- **Clear water:** High voltage (~3.0V) → 0 NTU
- **Turbid water:** Low voltage (~0.5V) → 1000 NTU

### 5.2 Quick Calibration (No Standards)

#### Step 1: Clear Water Baseline

1. Fill container with distilled water
2. Submerge turbidity sensor
3. Record voltage

**Example:**
```
Turbidity: 15 (2.95 V) - Clear
```

If not reading ~3.0V, adjust:

```cpp
#define TURBIDITY_CLEAR_VOLTAGE 2.95   // Your measured voltage
```

#### Step 2: Dirty Water Test

1. Add a pinch of milk or clay to water
2. Stir well
3. Record voltage

**Example:**
```
Turbidity: 450 (0.85 V) - Cloudy
```

This is qualitative - no standards needed for hydroponics!

### 5.3 Classification Thresholds

Adjust these based on your observations:

```cpp
#define TURBIDITY_DIRTY_THRESHOLD_V 0.30f  // Below this = "Dirty/Algae"
#define TURBIDITY_CLEAR_THRESHOLD_V 1.00f  // Above this = "Clear"
```

### 5.4 Advanced: Formazin Standard Calibration

If you have formazin NTU standards (20, 100, 800 NTU):

1. Measure voltage at each standard
2. Create a lookup table or polynomial fit
3. Replace the simple linear mapping

---

## 6. Complete Calibration Test Procedure

After calibrating all sensors, run this complete test:

### 6.1 Prepare Test Solutions

- **pH 7.0 buffer** (reference)
- **Known EC solution** (e.g., 1.413 mS/cm)
- **Room temperature water** (measure with thermometer)
- **Clear distilled water** (for turbidity)

### 6.2 Test Sequence

1. Submerge all sensors in test solution
2. Wait 5 minutes for thermal equilibrium
3. Record all readings for 60 seconds
4. Compare to expected values

### 6.3 Expected Accuracy

| Sensor | Expected Accuracy | Acceptable Range |
|--------|------------------|------------------|
| pH | ±0.1 pH units | ±0.2 pH units |
| EC | ±2% | ±5% |
| TDS | ±3% | ±5% |
| Temperature | ±0.5°C | ±1.0°C |
| Water Level | ±3% | ±5% |
| Turbidity | ±10% | ±20% (qualitative) |

### 6.4 Troubleshooting Poor Accuracy

**If readings are still inaccurate:**

1. **Check wiring:** Ensure all grounds are common
2. **Power supply:** Use stable 5V/2A supply
3. **Probe condition:** Clean electrodes, check for damage
4. **Cable length:** Keep sensor cables <30cm if possible
5. **Interference:** Route cables away from power lines
6. **Temperature:** Ensure thermal equilibrium before reading
7. **Age:** Probes degrade over time (pH probe lifespan ~6-12 months)

---

## 7. Calibration Maintenance Schedule

### Weekly
- ✅ Visual inspection of probes for fouling
- ✅ Check Serial Monitor for reading stability
- ✅ Rinse probes with distilled water

### Monthly
- ✅ Verify pH with buffer solution (single point check)
- ✅ Verify EC with standard solution
- ✅ Check all connections for corrosion

### Every 3 Months
- ✅ Full two-point pH calibration
- ✅ EC calibration with standard
- ✅ Water level re-calibration

### Annually
- ✅ Replace pH probe (consumable item)
- ✅ Deep clean all sensors
- ✅ Check for firmware updates
- ✅ Backup calibration constants

---

## 8. Storing Calibration Constants

### 8.1 Document Your Calibration

Create a file named `CALIBRATION_LOG.txt`:

```
SmarTanom Device: SMRT-001
Calibration Date: 2025-11-24

=== pH Sensor ===
Buffer pH 7.0: 2.508 V
Buffer pH 4.0: 2.880 V
Slope: -8.06
Intercept: 27.21

=== EC Sensor ===
Standard: 1.413 mS/cm
Measured (before): 1.27 mS/cm
Calibration Factor: 1.113

=== Temperature Sensor ===
Reference: 25.3°C
Raw reading: 10.5°C
Offset: +14.8°C

=== Water Level ===
Dry ADC: 580
Wet ADC: 1720
Warning Threshold: 922 (30%)

=== Turbidity ===
Clear voltage: 2.95 V
Dirty threshold: 0.30 V
Clear threshold: 1.00 V

Calibrated by: [Your Name]
Next calibration due: 2026-02-24
```

### 8.2 Backup Your Firmware

Save a copy of your calibrated firmware with a clear name:

```
esp32-smartanom-SMRT001-calibrated-2025-11-24.ino
```

### 8.3 Version Control

If using Git, commit calibration changes:

```bash
git add esp32-smartanom-clean.ino CALIBRATION_LOG.txt
git commit -m "Calibration: SMRT-001 (pH, EC, temp, water level)"
git tag calibration-SMRT001-20251124
```

---

## 9. Multi-Device Calibration

If you have multiple devices:

### 9.1 Individual Calibration

Each device needs its own calibration:
- Sensors vary between units
- Power supplies differ
- Cable lengths affect readings

### 9.2 Batch Calibration Workflow

1. Create calibration template spreadsheet
2. Test all devices with same standards
3. Calculate calibration factors for each
4. Flash individual firmware to each device
5. Label devices clearly with serial numbers

### 9.3 Calibration Database

For large deployments, maintain a database:

```csv
DeviceSerial,pH_Slope,pH_Intercept,EC_Factor,Temp_Offset,CalibDate
SMRT-001,-8.06,27.21,1.113,14.8,2025-11-24
SMRT-002,-7.92,26.85,1.095,15.2,2025-11-24
SMRT-003,-8.15,27.50,1.128,14.5,2025-11-24
```

---

## 10. Calibration Troubleshooting

### Problem: pH readings drift over time

**Possible causes:**
- Probe is drying out (store in pH 7 buffer or KCl storage solution)
- Electrolyte depleted (replace probe)
- Temperature compensation issue

**Solution:**
- Re-calibrate
- Store probe properly
- Replace if >1 year old

### Problem: EC readings are very inconsistent

**Possible causes:**
- Air bubbles on electrode
- Temperature fluctuations
- Poor electrical contact

**Solution:**
- Tap probe to release bubbles
- Wait for thermal equilibrium
- Check cable connections

### Problem: Temperature reads -127°C

**Cause:** DS18B20 not detected

**Solution:**
- Check wiring (especially data pin)
- Verify 4.7kΩ pull-up resistor
- Check power supply

### Problem: Water level always reads 0% or 100%

**Cause:** Calibration values are swapped or incorrect

**Solution:**
- Ensure `calibDry < calibWet`
- Re-do calibration carefully
- Check sensor isn't damaged

---

## 🎓 Calibration Best Practices

1. ✅ **Temperature matters:** Always wait for thermal equilibrium
2. ✅ **Clean probes:** Rinse between measurements
3. ✅ **Fresh standards:** Don't reuse buffer solutions
4. ✅ **Document everything:** Keep detailed records
5. ✅ **Test before deploy:** Verify calibration before field use
6. ✅ **Regular maintenance:** Don't wait for obvious errors
7. ✅ **Replace consumables:** pH probes have limited lifespan
8. ✅ **Cross-check:** Verify against commercial meters when possible

---

## 📞 Need Help?

If you're stuck with calibration:
- Check the troubleshooting section above
- Review [README.md](README.md) for wiring verification
- Post in GitHub Discussions with your calibration log
- Email: support@smartanom.com

---

**Remember:** Good calibration is the foundation of accurate monitoring. Take your time and be thorough! 🎯
