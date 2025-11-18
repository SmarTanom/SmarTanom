// pH Sensor Code for ESP32 (Serial Monitor Only)
// Core Arduino definitions
#include <Arduino.h>
// Removed LCD dependencies

// Define Analog Pin for pH Sensor
// Note: On ESP32, ADC2 pins (GPIO 0, 2, 4, 12-15, 25-27) cannot be used when WiFi is used.
// GPIO 34, 35, 36, 39 are input-only ADC1 pins and are safe to use.
#define PH_SENSOR_PIN 34 

float calibration_value = 21.34 - 1.0; // Adjust this value based on your calibration buffer
unsigned long int avgval;
int buffer_arr[10], temp;
float ph_act;

void setup() {
  Serial.begin(115200);  // Standard baudrate for ESP32
  delay(1000);           // Small delay to ensure Serial is ready
  Serial.println("pH Sensor Initialized");
  Serial.println("Ready to read...");
}

void loop() {
  // 1. Read Analog Data
  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(PH_SENSOR_PIN);
    delay(30);
  }

  // 2. Sort Data (Bubble Sort) to find median
  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {
      if (buffer_arr[i] > buffer_arr[j]) {
        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;
      }
    }
  }

  // 3. Calculate Average of the middle 6 samples (ignore 2 lowest and 2 highest)
  avgval = 0;
  for (int i = 2; i < 8; i++) {
    avgval += buffer_arr[i];
  }

  // 4. Convert to Voltage (ESP32 logic: 12-bit resolution = 4095, Reference = 3.3V)
  // We divide by 6 because 'avgval' is the sum of 6 readings
  float volt = (float)avgval * 3.3 / 4095.0 / 6;

  // 5. Convert Voltage to pH
  ph_act = -5.70 * volt + calibration_value;

  // 6. Output to Serial Monitor
  Serial.print("Analog (Avg): ");
  Serial.print(avgval / 6); // Print the raw average reading
  Serial.print(" | Voltage: ");
  Serial.print(volt, 3);
  Serial.print("V | pH Value: ");
  Serial.println(ph_act, 2);

  delay(1000); // Wait 1 second before next reading
}