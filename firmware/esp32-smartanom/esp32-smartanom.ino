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
   WiFi Setup:
   - Device starts in AP mode (SmarTanom-XXXX)
   - User connects to AP and sends WiFi credentials via HTTP
   - Device attempts to connect to user's WiFi
   - If connection fails, returns to AP mode
   Libraries Required:
     - DHT sensor library (Adafruit)
     - OneWire
     - DallasTemperature
     - BH1750 by Claws
     - WiFi (ESP32 built-in)
     - WebServer (ESP32 built-in)
     - Preferences (ESP32 built-in)
****************************************************/

#include <Arduino.h>
#include "DHT.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <BH1750.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>

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

// ------------------- WiFi & SERVER VARIABLES -----------
WebServer server(80);
Preferences preferences;

String deviceId = "";
bool wifiConnected = false;
bool apMode = true;
unsigned long lastWiFiCheck = 0;
const unsigned long WIFI_CHECK_INTERVAL = 30000; // Check WiFi every 30 seconds
const unsigned long WIFI_CONNECT_TIMEOUT = 20000; // Wait 20 seconds for WiFi connection

// ------------------- SENSOR VARIABLES -------------------------
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

// ------------------- WiFi FUNCTIONS -------------------------
void generateDeviceId() {
  uint64_t macAddress = ESP.getEfuseMac();
  uint32_t uniqueId = (uint32_t)(macAddress >> 16);
  deviceId = "SmarTanom-" + String(uniqueId, HEX);
  deviceId.toUpperCase();
}

void startAccessPoint() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(deviceId.c_str(), "12345678"); // Default password

  IPAddress IP = WiFi.softAPIP();
  Serial.println("Access Point Started");
  Serial.println("Network Name (SSID): " + deviceId);
  Serial.println("Password: 12345678");
  Serial.print("IP address: ");
  Serial.println(IP);

  apMode = true;
  wifiConnected = false;
}

bool connectToWiFi(String ssid, String password) {
  Serial.println("Attempting to connect to WiFi: " + ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_CONNECT_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());

    // Save credentials
    preferences.putString("wifi_ssid", ssid);
    preferences.putString("wifi_pass", password);
    preferences.putBool("wifi_saved", true);

    apMode = false;
    wifiConnected = true;
    return true;
  } else {
    Serial.println("WiFi connection failed!");
    return false;
  }
}

void handleWiFiCredentials() {
  if (server.hasArg("ssid") && server.hasArg("password")) {
    String ssid = server.arg("ssid");
    String password = server.arg("password");

    Serial.println("Received WiFi credentials:");
    Serial.println("SSID: " + ssid);

    // Send response immediately
    server.send(200, "application/json", "{\"status\":\"connecting\",\"message\":\"Attempting to connect to WiFi...\"}");

    // Try to connect
    if (connectToWiFi(ssid, password)) {
      Serial.println("WiFi setup completed successfully");
    } else {
      Serial.println("WiFi setup failed, returning to AP mode");
      startAccessPoint();
      setupWebServer();
    }
  } else {
    server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Missing SSID or password\"}");
  }
}

void handleStatus() {
  String status = apMode ? "ap_mode" : "connected";
  String response = "{";
  response += "\"status\":\"" + status + "\",";
  response += "\"device_id\":\"" + deviceId + "\",";
  response += "\"ip\":\"" + (apMode ? WiFi.softAPIP().toString() : WiFi.localIP().toString()) + "\",";
  response += "\"wifi_connected\":" + String(wifiConnected ? "true" : "false");
  response += "}";

  server.send(200, "application/json", response);
}

void handleSensorData() {
  String json = "{";
  json += "\"device_id\":\"" + deviceId + "\",";
  json += "\"timestamp\":" + String(millis()) + ",";
  json += "\"sensors\":{";
  json += "\"temperature_air\":" + String(dht.readTemperature()) + ",";
  json += "\"humidity\":" + String(dht.readHumidity()) + ",";
  json += "\"temperature_water\":" + String(waterTempC) + ",";
  json += "\"tds\":" + String(tdsValue) + ",";
  json += "\"ph\":" + String(phValue) + ",";
  json += "\"light\":" + String(lightMeter.readLightLevel()) + ",";
  json += "\"water_level\":" + String(map(analogRead(WATER_SENSOR_PIN), DRY_VALUE, WET_VALUE, 0, 100)) + ",";
  json += "\"turbidity\":" + String(analogRead(TURBIDITY_PIN));
  json += "}}";

  server.send(200, "application/json", json);
}

void setupWebServer() {
  // CORS headers for all responses
  server.onNotFound([]() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (server.method() == HTTP_OPTIONS) {
      server.send(200);
      return;
    }
    server.send(404, "text/plain", "Not found");
  });

  // Add CORS to all endpoints
  server.on("/wifi-setup", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    handleWiFiCredentials();
  });

  server.on("/status", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    handleStatus();
  });

  server.on("/sensors", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    handleSensorData();
  });

  server.begin();
  Serial.println("Web server started");
}

void checkWiFiConnection() {
  if (!apMode && millis() - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi connection lost, returning to AP mode");
      startAccessPoint();
      setupWebServer();
    }
  }
}

// ------------------- SETUP -------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=================================");
  Serial.println(" ESP32 + SmarTanom Monitoring v5.0 ");
  Serial.println("=================================");
  Serial.println("Features:");
  Serial.println("  - WiFi Setup via AP Mode");
  Serial.println("  - Sensor Data Collection");
  Serial.println("  - Web API Endpoints");
  Serial.println("  - Auto WiFi Reconnection");
  Serial.println("---------------------------------\n");

  // Initialize preferences
  preferences.begin("smartanom", false);

  // Generate unique device ID
  generateDeviceId();
  Serial.println("Device ID: " + deviceId);

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

  // Initialize WiFi
  WiFi.setHostname(deviceId.c_str());

  // Check if WiFi credentials are saved
  if (preferences.getBool("wifi_saved", false)) {
    String savedSSID = preferences.getString("wifi_ssid", "");
    String savedPass = preferences.getString("wifi_pass", "");

    Serial.println("Found saved WiFi credentials, attempting to connect...");
    if (!connectToWiFi(savedSSID, savedPass)) {
      Serial.println("Saved WiFi connection failed, starting AP mode");
      startAccessPoint();
    }
  } else {
    Serial.println("No saved WiFi credentials, starting AP mode");
    startAccessPoint();
  }

  // Setup web server
  setupWebServer();

  Serial.println("Setup completed!");
  Serial.println("Device ready for sensor monitoring and WiFi setup");
}

// ------------------- MAIN LOOP -------------------------
void loop() {
  // Handle web server requests
  server.handleClient();

  // Check WiFi connection periodically
  checkWiFiConnection();

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

  Serial.println("-- WiFi Status --");
  Serial.printf("Device ID           : %s\n", deviceId.c_str());
  Serial.printf("Mode                : %s\n", apMode ? "Access Point" : "Station");
  if (apMode) {
    Serial.printf("AP IP               : %s\n", WiFi.softAPIP().toString().c_str());
    Serial.printf("Connected Clients   : %d\n", WiFi.softAPgetStationNum());
  } else {
    Serial.printf("WiFi SSID           : %s\n", WiFi.SSID().c_str());
    Serial.printf("IP Address          : %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("Signal Strength     : %d dBm\n", WiFi.RSSI());
  }

  Serial.println("======================================\n");

  delay(2000);
}
