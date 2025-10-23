/*
 * ESP32 Complete Example Code for Analog pH Meter v1.1
 *
 * This code is set up for a two-point calibration using
 * two known solutions: pH 7.50 and pH 5.50.
 *
 * --- WIRING ---
 * pH Sensor Module   ->   ESP32
 * ---------------------------------
 * V+ (VCC)           ->   5V (Use the 'VIN' or '5V' pin on your ESP32 board)
 * G (GND)            ->   GND
 * Po (Analog Out)    ->   GPIO 34 (Any ADC1 pin will work: 32-36, 39)
 *
 */

// --- Sensor Pin ---
const int PH_PIN = 34;

// --- Calibration Parameters ---
// !! YOU MUST CHANGE THESE VALUES !!
// 1. Put the probe in your 7.50 pH buffer solution.
// 2. Wait for the "Voltage" value in the Serial Monitor to stabilize.
// 3. Replace 'PH_HIGH_VOLTAGE' with that stable voltage.
#define PH_HIGH_PH      8.62
#define PH_HIGH_VOLTAGE 1.83  // Placeholder! Replace this value.

// 4. Clean the probe, put it in your 5.50 pH buffer solution.
// 5. Wait for the "Voltage" to stabilize.
// 6. Replace 'PH_LOW_VOLTAGE' with that stable voltage.
#define PH_LOW_PH       3.70
#define PH_LOW_VOLTAGE  1.64  // Placeholder! Replace this value.


// --- Averaging Settings ---
// Number of samples to read and average to reduce noise
#define SAMPLE_COUNT 20

// --- ADC Configuration ---
#define ADC_RESOLUTION 4095.0 // 12-bit ADC (0-4095)
#define V_REF 3.3             // Reference voltage for ESP32 ADC

// --- Calculated Calibration Variables ---
// These will be calculated in setup() based on your calibration values
float slope = 0.0;
float intercept = 0.0;


void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 pH Meter v1.1");
  Serial.println("Calibration set for pH 5.50 and 7.50");

  // Set the ADC attenuation for the PH_PIN.
  // This allows the ADC to read the full 0 - 3.3V range.
  analogSetPinAttenuation(PH_PIN, ADC_11db);

  // --- Calculate the linear equation (y = mx + b) ---
  // y = pH value
  // x = voltage
  // m = slope
  // b = intercept
  
  // Calculate the slope (m)
  // (y2 - y1) / (x2 - x1)
  slope = (PH_HIGH_PH - PH_LOW_PH) / (PH_HIGH_VOLTAGE - PH_LOW_VOLTAGE);

  // Calculate the intercept (b) using the high pH point
  // b = y - mx
  intercept = PH_HIGH_PH - (slope * PH_HIGH_VOLTAGE);

  Serial.println("--- Calibration Settings ---");
  Serial.print("Using pH ");
  Serial.print(PH_HIGH_PH);
  Serial.print(" @ ");
  Serial.print(PH_HIGH_VOLTAGE);
  Serial.println(" V (Placeholder)");
  
  Serial.print("Using pH ");
  Serial.print(PH_LOW_PH);
  Serial.print(" @ ");
  Serial.print(PH_LOW_VOLTAGE);
  Serial.println(" V (Placeholder)");
  
  Serial.println("----------------------------");
  Serial.print("Calculated Slope (m): ");
  Serial.println(slope);
  Serial.print("Calculated Intercept (b): ");
  Serial.println(intercept);
  Serial.println("----------------------------");
  Serial.println("Starting measurements...");
}


void loop() {
  
  long adc_total = 0;
  
  // 1. Read multiple samples
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    adc_total += analogRead(PH_PIN);
    delay(10); // Short delay between samples
  }

  // 2. Calculate the average ADC value
  float adc_avg = adc_total / (float)SAMPLE_COUNT;

  // 3. Convert the average ADC value to voltage
  float voltage = (adc_avg / ADC_RESOLUTION) * V_REF;

  // 4. Convert voltage to pH using the calibration equation
  float ph_value = (slope * voltage) + intercept;

  // 5. Print the results
  Serial.print("Raw ADC: ");
  Serial.print(adc_avg);
  
  Serial.print("  |  Voltage: ");
  Serial.print(voltage, 2); // Print voltage to 2 decimal places
  Serial.print(" V");
  
  Serial.print("  |  Calculated pH: ");
  Serial.println(ph_value, 2); // Print pH to 2 decimal places

  // Wait 2 seconds before the next reading
  delay(2000);
}