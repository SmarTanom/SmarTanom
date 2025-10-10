/****************************************************
   ESP32 + BH1750 + DHT22 + HW-03 + DS18B20 + TDS + pH + Turbidity
   -------------------------------------------------
   Connections:
   - BH1750 (I2C)      -> SDA=21, SCL=22, VCC=3.3V, GND=GND
   - DHT22 data pin    -> GPIO5  (10k pull-up to VCC)
   - HW-03 water pin   -> GPIO33
   - DS18B20 data pin  -> GPIO4
   - TDS signal pin    -> GPIO39
   - pH signal pin     -> GPIO36 (VP)
   - Turbidity signal  -> GPIO32
   - All sensors powered from 5V external supply
   - COMMON GND required
   Libraries Required:
     - DHT sensor library (Adafruit)
     - OneWire
     - DallasTemperature
     - BH1750 by Claws
****************************************************/

#include <Arduino.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <BH1750.h>

// ------------------- PIN DEFINITIONS -------------------
#define DHTPIN 5
#define DHTTYPE DHT22
#define WATER_SENSOR_PIN 33
#define ONE_WIRE_BUS 4
#define TDS_PIN 39
#define PH_PIN 36
#define TURBIDITY_PIN 32

// ------------------- SENSOR OBJECTS --------------------
DHT dht(DHTPIN, DHTTYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
BH1750 lightMeter;

// ------------------- CONSTANTS -------------------------
#define VREF 3.3
#define ADC_RES 4095.0
#define SCOUNT 30

// ⚠️ Calibration constants
#define TDS_FACTOR 0.5
#define PH_CALIBRATION_OFFSET 0.00
#define DRY_VALUE 250
#define WET_VALUE 1000

// ------------------- VARIABLES -------------------------
int tdsBuffer[SCOUNT];
int phBuffer[SCOUNT];
int bufferIndex = 0;

float waterTempC = 25.0;
float averageVoltageTDS = 0.0;
float averageVoltagePH = 0.0;
float tdsValue = 0.0;
float phValue = 0.0;

// ------------------- TURBIDITY FUNCTION -------------------
String getTurbidityStatus(int raw) {
  if (raw > 2100) {
    return "Clear";
  } else if (raw > 1800) {
    return "Cloudy";
  } else {
    return "Turbid";
  }
}

// ------------------- LIGHT CLASSIFICATION ----------------
String getLightStatus(float lux) {
  if (lux > 1000) return "Bright daylight";
  else if (lux > 100) return "Indoor lighting";
  else if (lux > 10) return "Dim light";
  else return "Dark";
}

// ------------------- SETUP -------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=================================");
  Serial.println(" ESP32 + Hydroponics Monitoring v4.0 ");
  Serial.println("=================================");
  Serial.println("Notes:");
  Serial.println("  - Power sensors from 5V external supply");
  Serial.println("  - Ensure common GND with ESP32");
  Serial.println("  - Calibrate sensors before use!");
  Serial.println("---------------------------------\n");

  // Initialize sensors
  dht.begin();
  sensors.begin();
  Wire.begin(21, 22);
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 Light Sensor Initialized");
  } else {
    Serial.println("Error initializing BH1750!");
    while (1);
  }

  // Set ADC
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
}

// ------------------- MAIN LOOP -------------------------
void loop() {
  /********** DHT22 **********/
  float humidity = dht.readHumidity();
  float tempAirC = dht.readTemperature();
  float tempAirF = dht.readTemperature(true);

  if (isnan(humidity) || isnan(tempAirC) || isnan(tempAirF)) {
    Serial.println("Failed to read from DHT22!");
  }

  /********** HW-03 Water Sensor **********/
  int rawWater = analogRead(WATER_SENSOR_PIN);
  int waterPercent = map(rawWater, DRY_VALUE, WET_VALUE, 0, 100);
  waterPercent = constrain(waterPercent, 0, 100);

  /********** DS18B20 Water Temp **********/
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC != DEVICE_DISCONNECTED_C) {
    waterTempC = tempC;
  } else {
    Serial.println("Warning: DS18B20 not detected!");
  }

  /********** Collect ADC samples **********/
  tdsBuffer[bufferIndex] = analogRead(TDS_PIN);
  phBuffer[bufferIndex]  = analogRead(PH_PIN);
  bufferIndex++;
  if (bufferIndex >= SCOUNT) bufferIndex = 0;

  /********** Compute averages **********/
  long avgRawTDS = 0, avgRawPH = 0;
  for (int i = 0; i < SCOUNT; i++) {
    avgRawTDS += tdsBuffer[i];
    avgRawPH  += phBuffer[i];
  }
  avgRawTDS /= SCOUNT;
  avgRawPH  /= SCOUNT;

  /********** Convert ADC to Voltages **********/
  averageVoltageTDS = (float)avgRawTDS * (VREF / ADC_RES);
  averageVoltagePH  = (float)avgRawPH  * (VREF / ADC_RES);

  /********** TDS Calculation **********/
  float compCoeff = 1.0 + 0.02 * (waterTempC - 25.0);
  float compVoltage = averageVoltageTDS / compCoeff;
  tdsValue = (133.42 * pow(compVoltage, 3)
             - 255.86 * pow(compVoltage, 2)
             + 857.39 * compVoltage) * TDS_FACTOR;
  if (tdsValue < 0) tdsValue = 0;

  /********** pH Calculation **********/
  phValue = 3.5 * averageVoltagePH + PH_CALIBRATION_OFFSET;

  /********** Turbidity **********/
  int rawTurb = analogRead(TURBIDITY_PIN);
  float voltageTurb = rawTurb * (3.3 / 4095.0);
  String turbStatus = getTurbidityStatus(rawTurb);

  /********** BH1750 Light **********/
  float lux = lightMeter.readLightLevel();
  String lightStatus = getLightStatus(lux);

  /********** Serial Output **********/
  Serial.println("========== SENSOR READINGS ==========");

  Serial.println("-- DHT22 (Air) --");
  Serial.printf("Humidity (Air)      : %.2f %%\n", humidity);
  Serial.printf("Temperature (Air)   : %.2f °C | %.2f °F\n", tempAirC, tempAirF);

  Serial.println("-- HW-03 Water Sensor --");
  Serial.printf("Raw=%d | Level=%d%%\n", rawWater, waterPercent);

  Serial.println("-- DS18B20 (Water Temp) --");
  Serial.printf("Temperature (Water) : %.2f °C\n", waterTempC);

  Serial.println("-- TDS Sensor --");
  Serial.printf("Raw ADC (TDS)       : %4ld\n", avgRawTDS);
  Serial.printf("Voltage (TDS)       : %.3f V\n", averageVoltageTDS);
  Serial.printf("TDS Value           : %.0f ppm\n", tdsValue);

  Serial.println("-- pH Sensor --");
  Serial.printf("Raw ADC (pH)        : %4ld\n", avgRawPH);
  Serial.printf("Voltage (pH)        : %.3f V\n", averageVoltagePH);
  Serial.printf("pH Value            : %.2f\n", phValue);

  Serial.println("-- Turbidity Sensor --");
  Serial.printf("Raw ADC (Turb)      : %4d\n", rawTurb);
  Serial.printf("Voltage (Turb)      : %.2f V\n", voltageTurb);
  Serial.printf("Water Clarity       : %s\n", turbStatus.c_str());

  Serial.println("-- BH1750 Light Sensor --");
  Serial.printf("Light Level         : %.2f lx\n", lux);
  Serial.printf("Light Condition     : %s\n", lightStatus.c_str());

  Serial.println("======================================\n");

  delay(2000);
}
