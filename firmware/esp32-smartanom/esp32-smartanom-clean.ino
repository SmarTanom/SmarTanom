/*
 * SmarTanom ESP32 WiFi Provisioning & Sensor Monitoring Firmware
 *
 * Features:
 * 1. WiFi Provisioning via captive portal (AP mode)
 * 2. WebSocket connection to backend for real-time sensor data
 * 3. Multi-sensor monitoring: pH, TDS/EC, Temperature, Turbidity, Water Level
 * 4. Automatic reconnection with exponential backoff
 * 5. NTP time synchronization for TLS/SSL
 *
 * IMPORTANT: Set DEVICE_SERIAL and BACKEND_URL before flashing!
 *
 * Author: SmarTanom Team
 * Version: 2.0.0 (Cleaned & Finalized)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <time.h>
#include <EEPROM.h>
#include <math.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WebSocketsClient.h>

// Allow local overrides for secrets and environment without editing this file
#if __has_include("device_config.h")
#include "device_config.h"
#endif

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#ifndef DEVICE_SERIAL
#define DEVICE_SERIAL "SMRT-DNX-XYS"  // * CHANGE THIS BEFORE FLASHING *
#endif
#define FIRMWARE_VERSION "2.0.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
#ifndef BACKEND_URL
#define BACKEND_URL "https://smartanom.onrender.com"
#endif
#define PROVISION_ENDPOINT "/api/devices/provision/"

#ifndef DEVICE_API_KEY
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"
#endif

// =============================================
// AP CONFIGURATION
// =============================================
#define AP_SSID DEVICE_SERIAL
#define AP_PASSWORD_PREFIX "smartanom"
String AP_PASSWORD = String(AP_PASSWORD_PREFIX) + String(DEVICE_SERIAL);
#define AP_CHANNEL 6
#define AP_HIDDEN false
#define AP_MAX_CLIENTS 4

// =============================================
// PREFERENCES (NVS) KEYS
// =============================================
#define PREF_NAMESPACE "smartanom"
#define PREF_SSID "wifi_ssid"
#define PREF_PASSWORD "wifi_pass"
#define PREF_CONFIGURED "wifi_ok"

// =============================================
// GLOBAL OBJECTS
// =============================================
WebServer server(80);
Preferences preferences;
DNSServer dnsServer;
const byte DNS_PORT = 53;

// WiFi state
String savedSSID = "";
String savedPassword = "";
bool wifiConfigured = false;
bool provisioningMode = true;

// =============================================
// SENSOR PINS
// =============================================
#define WATER_SENSOR_PIN 33  // HW-03 Water Level Sensor
#define ONE_WIRE_BUS 4       // DS18B20 Temperature
#define TDS_PIN 35           // TDS/EC Sensor
#define PH_PIN 34            // pH Sensor
#define TURBIDITY_PIN 32     // Turbidity Sensor

// Sensor objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);

// ADC / calculation constants
#define VREF 3.3
#define ADC_RES 4095.0
#define SCOUNT 30

// =============================================
// pH SENSOR CONFIGURATION
// =============================================
#define PH_VOLTAGE_ASCENDS_WITH_PH 1
static const float PH_CALIBRATION_VALUE = 20.84f; // 21.34 - 0.5

// =============================================
// EC/TDS CALIBRATION CONSTANTS
// =============================================
#define TEMP_COEFF 0.02f      // 2% per °C
#define TEMP_REF_C 25.0f
#define EC_CAL_FACTOR 1.1151f
#define TDS_FACTOR 0.5

// =============================================
// WATER LEVEL SENSOR - State Machine
// =============================================
enum LevelState { STATE_WARNING, STATE_NORMAL };
LevelState currentWaterLevelState = STATE_NORMAL;

const char* waterLevelStateToText(LevelState s) {
  return (s == STATE_WARNING) ? "WARNING" : "NORMAL";
}

int ADC_WARNING_THRESH = 500;
int HYST_ADC = 20;

LevelState classifyWaterLevelAdc(int adc) {
  switch (currentWaterLevelState) {
    case STATE_WARNING:
      return (adc >= ADC_WARNING_THRESH + HYST_ADC) ? STATE_NORMAL : STATE_WARNING;
    case STATE_NORMAL:
      return (adc < ADC_WARNING_THRESH - HYST_ADC) ? STATE_WARNING : STATE_NORMAL;
  }
  return STATE_NORMAL;
}

// Moving average filter
constexpr int WATER_SAMPLE_COUNT = 10;
int waterLevelSamples[WATER_SAMPLE_COUNT];
int waterLevelSampleIndex = 0;
bool waterLevelBufferFilled = false;

// EEPROM calibration
constexpr size_t EEPROM_SIZE = 64;
constexpr int EEPROM_ADDR_FLAG = 0;
constexpr int EEPROM_ADDR_DRY  = 4;
constexpr int EEPROM_ADDR_WET  = 8;

int calibDry = 600;   // 0% wetness
int calibWet = 1700;  // 100% wetness

// Utility functions
float clampf(float x, float a, float b) {
  if (x < a) return a;
  if (x > b) return b;
  return x;
}

float waterAdcToPercent(int adc) {
  int span = calibWet - calibDry;
  if (span <= 0) return 0.0f;
  float pct = 100.0f * (float)(adc - calibDry) / (float)span;
  return clampf(pct, 0.0f, 100.0f);
}

void eepromLoadWaterCalibration() {
  EEPROM.begin(EEPROM_SIZE);
  uint8_t flag = EEPROM.read(EEPROM_ADDR_FLAG);
  if (flag == 0xA5) {
    calibDry = EEPROM.readInt(EEPROM_ADDR_DRY);
    calibWet = EEPROM.readInt(EEPROM_ADDR_WET);
  }
}

void eepromSaveWaterCalibration() {
  EEPROM.write(EEPROM_ADDR_FLAG, 0xA5);
  EEPROM.writeInt(EEPROM_ADDR_DRY, calibDry);
  EEPROM.writeInt(EEPROM_ADDR_WET, calibWet);
  EEPROM.commit();
}

// =============================================
// pH CALCULATION
// =============================================
static float computePhFromSensor() {
    int samples[10];
    for (int i = 0; i < 10; i++) {
        samples[i] = analogRead(PH_PIN);
        delay(30);
    }

    // Bubble sort
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (samples[i] > samples[j]) {
                int tmp = samples[i];
                samples[i] = samples[j];
                samples[j] = tmp;
            }
        }
    }

    // Average of middle 6 samples
    unsigned long avgSum = 0;
    for (int i = 2; i < 8; i++) {
        avgSum += samples[i];
    }

    float volt = (float)avgSum * (VREF / ADC_RES) / 6.0f;
    float ph = (-5.70f * volt) + PH_CALIBRATION_VALUE;
    return ph;
}

// =============================================
// TURBIDITY CALIBRATION
// =============================================
#define TURBIDITY_CLEAR_VOLTAGE 3.0
#define TURBIDITY_MAX_VOLTAGE 0.5
#define TURBIDITY_DIRTY_THRESHOLD_V 0.30f
#define TURBIDITY_CLEAR_THRESHOLD_V 1.00f

String getTurbidityStatus(float voltage) {
    if (voltage <= TURBIDITY_DIRTY_THRESHOLD_V) return "Dirty/Algae";
    else if (voltage <= TURBIDITY_CLEAR_THRESHOLD_V) return "Cloudy";
    else return "Clear";
}

// =============================================
// SENSOR BUFFERS AND VALUES
// =============================================
int tdsBuffer[SCOUNT];
int phBuffer[SCOUNT];
int bufferIndex = 0;

float waterTempC = 25.0;
float averageVoltageTDS = 0.0;
float averageVoltagePH = 0.0;
float tdsValue = 0.0;
float ecValue = 0.0;
float phValue = 0.0;
int waterPercent = 0;
int waterRaw = 0;
int rawTurb = 0;
float voltageTurb = 0.0;
float turbidityNTU = 0.0;

// =============================================
// WEBSOCKET
// =============================================
WebSocketsClient wsClient;
bool wsConnected = false;
unsigned long lastSensorSend = 0;
const unsigned long SENSOR_SEND_INTERVAL_MS = 5000;  // 5 seconds

String WS_HOST = "";
uint16_t WS_PORT = 443;
String WS_PATH = "";
bool WS_SECURE = true;

// Backoff and scheduling
static bool wsWantConnect = false;
static bool wsConnecting = false;
static uint32_t wsReconnectAttempt = 0;
static uint32_t wsNextConnectAtMs = 0;
static uint32_t lastWsActivityMs = 0;
static const uint32_t WS_BACKOFF_BASE_MS = 1000;
static const uint32_t WS_BACKOFF_MAX_MS  = 60000;
static const uint32_t WS_IDLE_TIMEOUT_MS = 180000;
static const uint32_t MIN_WS_CONNECT_DELAY_MS = 5000;

// Time sync
static unsigned long lastTimeSyncAttemptMs = 0;
static const uint32_t TIME_SYNC_RETRY_MS = 30000;

// Warmup
static bool firstPayloadSent = false;
static unsigned long bootStartMs = 0;
static const unsigned long WARMUP_DELAY_MS = 30000; // 30 seconds warmup

// =============================================
// TIMESTAMP GENERATION
// =============================================
String buildTimestamp() {
    time_t now = time(nullptr);
    struct tm tm_info;
    localtime_r(&now, &tm_info);
    if (tm_info.tm_year + 1900 >= 2020) {
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S%z", &tm_info);
        return String(buf);
    }
    char buf2[32];
    snprintf(buf2, sizeof(buf2), "millis-%lu", (unsigned long)millis());
    return String(buf2);
}

// =============================================
// HTML TEMPLATES
// =============================================
const char HTML_HEAD[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmarTanom - WiFi Setup</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #339432 0%, #52B256 50%, #7FD485 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            max-width: 480px;
            width: 100%;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #339432 0%, #52B256 100%);
            padding: 32px 30px 24px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
        }
        .subtitle {
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
        }
        .content { padding: 32px 30px 24px; }
        h1 { color: #1a1a1a; font-size: 22px; margin-bottom: 8px; }
        .device-serial {
            background: linear-gradient(135deg, #f0f9f1 0%, #e8f5e9 100%);
            padding: 14px 16px;
            border-radius: 10px;
            text-align: center;
            font-weight: 600;
            color: #339432;
            margin-bottom: 24px;
            font-family: 'Courier New', monospace;
        }
        .info {
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f9f2 100%);
            border-left: 4px solid #52B256;
            padding: 14px 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #2d5f2e;
            border-radius: 8px;
        }
        .form-group { margin-bottom: 20px; }
        label {
            display: block;
            margin-bottom: 8px;
            color: #2d5f2e;
            font-weight: 600;
            font-size: 13px;
        }
        select, input[type="password"] {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.3s ease;
        }
        select:focus, input:focus {
            outline: none;
            border-color: #52B256;
            box-shadow: 0 0 0 3px rgba(82, 178, 86, 0.1);
        }
        button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #339432 0%, #52B256 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(51, 148, 50, 0.4);
        }
        .status {
            margin-top: 20px;
            padding: 16px;
            border-radius: 10px;
            text-align: center;
        }
        .status.success {
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f9f2 100%);
            color: #2d5f2e;
            border: 2px solid #52B256;
        }
        .status.error {
            background: linear-gradient(135deg, #ffebee 0%, #fff5f5 100%);
            color: #c62828;
            border: 2px solid #f44336;
        }
        .footer {
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: #999;
            background: #fafafa;
        }
        .spinner {
            display: inline-block;
            width: 60px;
            height: 60px;
            border: 6px solid #e0e0e0;
            border-top: 6px solid #339432;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌱 SMARTANOM</div>
            <div class="subtitle">Smart Aquaponics Monitoring</div>
        </div>
        <div class="content">
)rawliteral";

const char HTML_FOOT[] PROGMEM = R"rawliteral(
        </div>
        <div class="footer">
            SmarTanom &copy; 2025 | Firmware v)rawliteral" FIRMWARE_VERSION R"rawliteral(
        </div>
    </div>
</body>
</html>
)rawliteral";

// =============================================
// FUNCTION DECLARATIONS
// =============================================
void setupAP();
void setupWebServer();
void handleRoot();
void handleConnect();
void handleStatus();
void handleNotFound();
bool connectToWiFi(const String& ssid, const String& password);
bool reportProvisionStatus(const String& status, const String& ipAddress = "");
void loadPreferences();
void savePreferences(const String& ssid, const String& password);
void clearPreferences();
String scanNetworks();
void initSensors();
void readSensorsOnce();
void startNormalOperation();
void deriveWsEndpointFromBackend();
void initWebSocket();
void wsEvent(WStype_t type, uint8_t * payload, size_t length);
void sendHandshake();
void sendSensorData();
bool syncTimeIfNeeded();
void maintainWiFiConnection();
void serviceWebSockets();
uint32_t computeBackoffDelayMs(uint32_t attempt);
float mapFloat(float x, float in_min, float in_max, float out_min, float out_max);

// =============================================
// SETUP
// =============================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n\n=================================");
    Serial.println("SmarTanom ESP32 Provisioning");
    Serial.println("=================================");
    Serial.printf("Device Serial: %s\n", DEVICE_SERIAL);
    Serial.printf("Firmware: v%s\n", FIRMWARE_VERSION);
    Serial.println("=================================\n");

    loadPreferences();

    if (wifiConfigured && savedSSID.length() > 0) {
        Serial.println("Found saved WiFi credentials. Attempting connection...");
        if (connectToWiFi(savedSSID, savedPassword)) {
            Serial.println("Successfully connected to saved WiFi!");
            provisioningMode = false;
            reportProvisionStatus("connected", WiFi.localIP().toString());
            startNormalOperation();
            Serial.println("Ready for normal operation.");
            return;
        } else {
            Serial.println("Failed to connect to saved WiFi.");
            Serial.println("Clearing saved credentials and starting provisioning mode...");
            wifiConfigured = false;
            clearPreferences();
        }
    }

    Serial.println("Starting WiFi provisioning mode...");
    setupAP();
    setupWebServer();

    Serial.println("\n--- Provisioning Mode Active ---");
    Serial.printf("Connect to WiFi: %s\n", AP_SSID);
    Serial.printf("Password: %s\n", AP_PASSWORD.c_str());
    Serial.println("Then open: http://192.168.4.1");
    Serial.println("--------------------------------\n");
}

// =============================================
// MAIN LOOP
// =============================================
void loop() {
    if (provisioningMode) {
        dnsServer.processNextRequest();
        server.handleClient();
    } else {
        maintainWiFiConnection();
        serviceWebSockets();
        wsClient.loop();

        unsigned long now = millis();
        if (now - lastSensorSend >= SENSOR_SEND_INTERVAL_MS) {
            lastSensorSend = now;
            readSensorsOnce();

            // Simple warmup delay for first payload
            if (!firstPayloadSent) {
                if (now - bootStartMs >= WARMUP_DELAY_MS) {
                    sendSensorData();
                    firstPayloadSent = true;
                    Serial.println("[SENSOR] ✓ First payload sent after warmup");
                } else {
                    Serial.printf("[SENSOR] Warming up... %lu/%lu seconds\n", 
                                  (now - bootStartMs)/1000, WARMUP_DELAY_MS/1000);
                }
            } else {
                sendSensorData();
            }
        }
        delay(5);
    }
}

// =============================================
// WiFi AP SETUP
// =============================================
void setupAP() {
    WiFi.mode(WIFI_AP);
    bool result = WiFi.softAP(AP_SSID, AP_PASSWORD.c_str(), AP_CHANNEL, AP_HIDDEN, AP_MAX_CLIENTS);

    if (result) {
        Serial.println("✓ Access Point started successfully");
        Serial.printf("  SSID: %s\n", AP_SSID);
        Serial.printf("  Password: %s\n", AP_PASSWORD.c_str());
        Serial.printf("  IP: %s\n", WiFi.softAPIP().toString().c_str());
        
        dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
        Serial.println("✓ DNS server started for captive portal");
    } else {
        Serial.println("✗ Failed to start Access Point!");
    }
}

// =============================================
// WEB SERVER SETUP
// =============================================
void setupWebServer() {
    server.on("/", HTTP_GET, handleRoot);
    server.on("/connect", HTTP_POST, handleConnect);
    server.on("/status", HTTP_GET, handleStatus);

    // Captive portal detection endpoints
    server.on("/generate_204", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });
    
    server.on("/fwlink", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    server.onNotFound(handleNotFound);
    server.begin();
    Serial.println("✓ Web server started");
}

// =============================================
// WEB HANDLERS
// =============================================
void handleRoot() {
    Serial.println("Serving WiFi setup page...");
    String networks = scanNetworks();

    String html = FPSTR(HTML_HEAD);
    html += "<h1>📶 WiFi Setup</h1>";
    html += "<div class='device-serial'>Device: " + String(DEVICE_SERIAL) + "</div>";
    html += "<div class='info'>💡 Select your WiFi network and enter the password.</div>";
    html += "<form action='/connect' method='POST'>";
    html += "<div class='form-group'>";
    html += "<label for='ssid'>WiFi Network</label>";
    html += "<select id='ssid' name='ssid' required>";
    html += "<option value=''>-- Select Network --</option>";
    html += networks;
    html += "</select></div>";
    html += "<div class='form-group'>";
    html += "<label for='password'>WiFi Password</label>";
    html += "<input type='password' id='password' name='password' required placeholder='Enter password'>";
    html += "</div>";
    html += "<button type='submit'>Connect to WiFi</button>";
    html += "</form>";
    html += FPSTR(HTML_FOOT);

    server.send(200, "text/html", html);
}

void handleConnect() {
    Serial.println("Received connection request...");

    if (!server.hasArg("ssid") || !server.hasArg("password")) {
        String html = FPSTR(HTML_HEAD);
        html += "<h1>⚠️ Error</h1>";
        html += "<div class='status error'>Missing WiFi credentials!</div>";
        html += "<br><a href='/'><button>← Back to Setup</button></a>";
        html += FPSTR(HTML_FOOT);
        server.send(400, "text/html", html);
        return;
    }

    String ssid = server.arg("ssid");
    String password = server.arg("password");

    Serial.printf("Attempting to connect to: %s\n", ssid.c_str());

    String html = FPSTR(HTML_HEAD);
    html += "<h1>⏳ Connecting...</h1>";
    html += "<div class='device-serial'>Network: " + ssid + "</div>";
    html += "<div style='text-align:center;'>";
    html += "<div class='spinner'></div>";
    html += "<div class='info'>Please wait while connecting...</div>";
    html += "</div>";
    html += "<script>setTimeout(function(){ window.location.href='/status'; }, 15000);</script>";
    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);

    delay(100);

    if (connectToWiFi(ssid, password)) {
        Serial.println("✓ WiFi connection successful!");
        savePreferences(ssid, password);
        reportProvisionStatus("connected", WiFi.localIP().toString());
        provisioningMode = false;
        wifiConfigured = true;

        Serial.println("✓ Provisioning complete. Shutting down AP...");
        delay(2000);
        WiFi.softAPdisconnect(true);
        startNormalOperation();
    } else {
        Serial.println("✗ WiFi connection failed!");
        clearPreferences();
        reportProvisionStatus("failed");
        delay(2000);
        ESP.restart();
    }
}

void handleStatus() {
    Serial.println("Status check requested...");

    String html = FPSTR(HTML_HEAD);
    html += "<h1>📊 Connection Status</h1>";
    html += "<div class='device-serial'>" + String(DEVICE_SERIAL) + "</div>";

    if (wifiConfigured && WiFi.status() == WL_CONNECTED) {
        html += "<div class='status success'>";
        html += "<h2>✅ Successfully Connected!</h2>";
        html += "<p>Network: <strong>" + savedSSID + "</strong></p>";
        html += "<p>IP Address: <strong>" + WiFi.localIP().toString() + "</strong></p>";
        html += "<p>Signal: <strong>" + String(WiFi.RSSI()) + " dBm</strong></p>";
        html += "</div>";
        html += "<script>setTimeout(function(){ alert('Setup complete! Reconnect to your home WiFi.'); }, 3000);</script>";
    } else {
        html += "<div class='status error'>";
        html += "<h2>❌ Connection Failed</h2>";
        html += "<p>Unable to connect to the WiFi network.</p>";
        html += "<p>Device will restart in 5 seconds...</p>";
        html += "</div>";
        html += "<script>setTimeout(function(){ alert('Restarting...'); }, 5000);</script>";
    }

    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);
}

void handleNotFound() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta http-equiv='refresh' content='0; url=http://192.168.4.1/' />";
    html += "</head><body><p>Redirecting...</p></body></html>";
    server.send(200, "text/html", html);
}

// =============================================
// WiFi CONNECTION
// =============================================
bool connectToWiFi(const String& ssid, const String& password) {
    Serial.printf("Connecting to WiFi: %s\n", ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());

    int attempts = 0;
    const int maxAttempts = 30;

    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(1000);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("✓ WiFi connected!");
        Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
        return true;
    } else {
        Serial.println("✗ WiFi connection failed!");
        WiFi.disconnect();
        return false;
    }
}

// =============================================
// NETWORK SCANNING
// =============================================
String scanNetworks() {
    Serial.println("Scanning for WiFi networks...");
    int n = WiFi.scanNetworks();
    String options = "";

    if (n == 0) {
        options = "<option value=''>No networks found</option>";
    } else {
        Serial.printf("Found %d networks\n", n);
        
        // Sort by signal strength
        int indices[n];
        for (int i = 0; i < n; i++) indices[i] = i;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (WiFi.RSSI(indices[j]) > WiFi.RSSI(indices[i])) {
                    int temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }

        for (int i = 0; i < n; i++) {
            int idx = indices[i];
            String ssid = WiFi.SSID(idx);
            int rssi = WiFi.RSSI(idx);
            String encryption = (WiFi.encryptionType(idx) == WIFI_AUTH_OPEN) ? " 🔓" : " 🔒";
            
            String signal;
            if (rssi > -50) signal = "▂▄▆█";
            else if (rssi > -60) signal = "▂▄▆_";
            else if (rssi > -70) signal = "▂▄__";
            else signal = "▂___";

            options += "<option value='" + ssid + "'>" + ssid + " " + signal + encryption + "</option>";
        }
    }

    WiFi.scanDelete();
    return options;
}

// =============================================
// BACKEND COMMUNICATION
// =============================================
bool reportProvisionStatus(const String& status, const String& ipAddress) {
    Serial.printf("Reporting provision status: %s\n", status.c_str());

    if (WiFi.status() != WL_CONNECTED && status == "connected") {
        Serial.println("✗ Cannot report: WiFi not connected");
        return false;
    }

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(60);

    HTTPClient https;
    String url = String(BACKEND_URL) + String(PROVISION_ENDPOINT);

    if (!https.begin(client, url)) {
        Serial.println("✗ HTTPS connection failed");
        return false;
    }

    https.setTimeout(60000);
    https.setConnectTimeout(15000);
    https.addHeader("Content-Type", "application/json");
    if (strlen(DEVICE_API_KEY) > 0) {
        https.addHeader("X-Device-Auth", DEVICE_API_KEY);
    }

    StaticJsonDocument<256> doc;
    doc["serial"] = DEVICE_SERIAL;
    doc["status"] = status;
    if (ipAddress.length() > 0) doc["ip"] = ipAddress;
    doc["firmware_version"] = FIRMWARE_VERSION;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println("Sending POST request...");
    int httpCode = https.POST(jsonPayload);

    if (httpCode > 0) {
        Serial.printf("✓ Response code: %d\n", httpCode);
        https.end();
        return (httpCode == 200 || httpCode == 201);
    } else {
        Serial.printf("✗ Request failed: %s\n", https.errorToString(httpCode).c_str());
        https.end();
        return false;
    }
}

// =============================================
// PREFERENCES MANAGEMENT
// =============================================
void loadPreferences() {
    preferences.begin(PREF_NAMESPACE, true);
    savedSSID = preferences.getString(PREF_SSID, "");
    savedPassword = preferences.getString(PREF_PASSWORD, "");
    wifiConfigured = preferences.getBool(PREF_CONFIGURED, false);
    preferences.end();

    if (wifiConfigured) {
        Serial.println("✓ Found saved WiFi configuration");
    } else {
        Serial.println("No saved WiFi configuration");
    }
}

void savePreferences(const String& ssid, const String& password) {
    preferences.begin(PREF_NAMESPACE, false);
    preferences.putString(PREF_SSID, ssid);
    preferences.putString(PREF_PASSWORD, password);
    preferences.putBool(PREF_CONFIGURED, true);
    preferences.end();

    savedSSID = ssid;
    savedPassword = password;
    wifiConfigured = true;
    Serial.println("✓ WiFi credentials saved");
}

void clearPreferences() {
    preferences.begin(PREF_NAMESPACE, false);
    preferences.clear();
    preferences.end();

    savedSSID = "";
    savedPassword = "";
    wifiConfigured = false;
    Serial.println("✓ Preferences cleared");
}

// =============================================
// SENSOR INITIALIZATION
// =============================================
void initSensors() {
    tempSensors.begin();
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
    analogSetPinAttenuation(PH_PIN, ADC_11db);
    analogSetPinAttenuation(WATER_SENSOR_PIN, ADC_11db);
    analogSetPinAttenuation(TDS_PIN, ADC_11db);
    analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);

    eepromLoadWaterCalibration();

    for (int i = 0; i < WATER_SAMPLE_COUNT; i++) {
        waterLevelSamples[i] = 0;
    }

    for (int i = 0; i < SCOUNT; i++) {
        tdsBuffer[i] = analogRead(TDS_PIN);
        phBuffer[i] = analogRead(PH_PIN);
    }
    bufferIndex = 0;

    Serial.println("✓ Sensors initialized");
    Serial.printf("  Water Level Calibration: 0%%=%d, 100%%=%d\n", calibDry, calibWet);
}

// =============================================
// SENSOR READING
// =============================================
void readSensorsOnce() {
    // Water Level
    int rawWater = analogRead(WATER_SENSOR_PIN);
    waterLevelSamples[waterLevelSampleIndex] = rawWater;
    waterLevelSampleIndex = (waterLevelSampleIndex + 1) % WATER_SAMPLE_COUNT;
    if (waterLevelSampleIndex == 0) waterLevelBufferFilled = true;

    long sumWater = 0;
    int countWater = waterLevelBufferFilled ? WATER_SAMPLE_COUNT : waterLevelSampleIndex;
    if (countWater == 0) countWater = 1;
    for (int i = 0; i < countWater; ++i) sumWater += waterLevelSamples[i];
    int adcAvgWater = sumWater / countWater;

    waterRaw = adcAvgWater;
    waterPercent = (int)waterAdcToPercent(adcAvgWater);
    LevelState newState = classifyWaterLevelAdc(adcAvgWater);
    if (newState != currentWaterLevelState) {
        currentWaterLevelState = newState;
    }

    // Temperature
    tempSensors.requestTemperatures();
    waterTempC = tempSensors.getTempCByIndex(0) + 14.80; // Apply correction

    // TDS/EC
    tdsBuffer[bufferIndex] = analogRead(TDS_PIN);
    phBuffer[bufferIndex]  = analogRead(PH_PIN);
    bufferIndex++;
    if (bufferIndex >= SCOUNT) bufferIndex = 0;

    long avgRawTDS = 0;
    for (int i = 0; i < SCOUNT; i++) avgRawTDS += tdsBuffer[i];
    avgRawTDS /= SCOUNT;

    averageVoltageTDS = (float)avgRawTDS * (VREF / ADC_RES);

    // Temperature compensation
    float compCoeff = 1.0f + TEMP_COEFF * (waterTempC - TEMP_REF_C);
    float compVoltage = averageVoltageTDS / compCoeff;

    // EC calculation (DFRobot cubic polynomial)
    float ec_mS = (133.42f * powf(compVoltage, 3)
                 - 255.86f * powf(compVoltage, 2)
                 + 857.39f * compVoltage) / 1000.0f;
    ec_mS *= EC_CAL_FACTOR;
    if (ec_mS < 0.0f) ec_mS = 0.0f;
    ecValue = ec_mS;

    tdsValue = ec_mS * (1000.0f * TDS_FACTOR);

    // pH
    phValue = computePhFromSensor();

    // Turbidity
    rawTurb = analogRead(TURBIDITY_PIN);
    voltageTurb = rawTurb * (VREF / ADC_RES);
    turbidityNTU = mapFloat(voltageTurb, TURBIDITY_CLEAR_VOLTAGE, TURBIDITY_MAX_VOLTAGE, 0.0, 1000.0);
    if (turbidityNTU < 0) turbidityNTU = 0;
}

// =============================================
// WEBSOCKET SETUP
// =============================================
void deriveWsEndpointFromBackend() {
    String url = String(BACKEND_URL);
    url.trim();
    WS_SECURE = url.startsWith("https://");
    if (url.startsWith("http://")) {
        url = url.substring(7);
        WS_PORT = 80;
    } else if (url.startsWith("https://")) {
        url = url.substring(8);
        WS_PORT = 443;
    }
    if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
    
    int slash = url.indexOf('/');
    WS_HOST = (slash >= 0) ? url.substring(0, slash) : url;
    WS_PATH = String("/ws/device/") + String(DEVICE_SERIAL) + String("/");

    Serial.printf("WebSocket: %s://%s:%u%s\n", 
                  WS_SECURE ? "wss" : "ws", WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
}

void initWebSocket() {
    deriveWsEndpointFromBackend();
    wsClient.onEvent(wsEvent);

    if (WS_SECURE) {
        Serial.println("[WS] Syncing time for TLS...");
        syncTimeIfNeeded();
    }

    Serial.println("[WS] WebSocket client prepared");
    wsWantConnect = true;
    wsConnecting = false;
    wsReconnectAttempt = 0;
    wsNextConnectAtMs = millis();
    lastWsActivityMs = millis();
}

void wsEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            wsConnected = true;
            wsConnecting = false;
            Serial.println("[WS] ✓ Connected");
            lastWsActivityMs = millis();
            wsReconnectAttempt = 0;
            sendHandshake();
            break;

        case WStype_DISCONNECTED:
            wsConnected = false;
            wsConnecting = false;
            Serial.println("[WS] ✗ Disconnected");
            lastWsActivityMs = millis();
            wsNextConnectAtMs = millis() + computeBackoffDelayMs(wsReconnectAttempt++);
            break;

        case WStype_TEXT:
            lastWsActivityMs = millis();
            Serial.printf("[WS] ← %s\n", (char*)payload);
            
            // Handle ping/pong
            StaticJsonDocument<256> doc;
            if (!deserializeJson(doc, payload, length)) {
                const char* type = doc["type"] | "";
                if (strcmp(type, "ping") == 0) {
                    StaticJsonDocument<128> pong;
                    pong["type"] = "pong";
                    String out; serializeJson(pong, out);
                    wsClient.sendTXT(out);
                }
            }
            break;

        case WStype_ERROR:
            Serial.println("[WS] ✗ ERROR");
            wsConnecting = false;
            lastWsActivityMs = millis();
            wsNextConnectAtMs = millis() + computeBackoffDelayMs(wsReconnectAttempt++);
            break;

        case WStype_PING:
        case WStype_PONG:
            lastWsActivityMs = millis();
            break;

        default:
            break;
    }
}

void sendHandshake() {
    StaticJsonDocument<256> doc;
    doc["device_serial"] = DEVICE_SERIAL;
    doc["wifi_configured"] = true;
    doc["status"] = "connected";
    String out;
    serializeJson(doc, out);

    Serial.println("[WS] → Sending handshake");
    wsClient.sendTXT(out);
}

void sendSensorData() {
    if (wsConnected) {
        StaticJsonDocument<512> doc;
        doc["type"] = "sensor_data";
        doc["device_serial"] = DEVICE_SERIAL;
        
        JsonObject sensors = doc.createNestedObject("data");
        sensors["timestamp"] = buildTimestamp();
        sensors["ph"] = phValue;
        sensors["tds"] = tdsValue;
        sensors["ec"] = ecValue;
        sensors["turbidity"] = rawTurb;
        sensors["turbidity_status"] = getTurbidityStatus(voltageTurb);
        sensors["water_temperature"] = waterTempC;
        sensors["water_level"] = waterPercent;
        sensors["water_level_state"] = waterLevelStateToText(currentWaterLevelState);
        
        String out; 
        serializeJson(doc, out);
        wsClient.sendTXT(out);
    }

    // Serial logging
    Serial.println("========== SENSOR READINGS ==========");
    Serial.printf("Water Level : %d%% (raw=%d, %s)\n", waterPercent, waterRaw, 
                  waterLevelStateToText(currentWaterLevelState));
    Serial.printf("Water Temp  : %.2f °C\n", waterTempC);
    Serial.printf("TDS         : %.0f ppm\n", tdsValue);
    Serial.printf("EC          : %.2f mS/cm\n", ecValue);
    Serial.printf("pH          : %.2f\n", phValue);
    Serial.printf("Turbidity   : %d (%.2f V) - %s\n", rawTurb, voltageTurb, 
                  getTurbidityStatus(voltageTurb).c_str());
    Serial.println("======================================\n");
}

// =============================================
// NORMAL OPERATION
// =============================================
void startNormalOperation() {
    Serial.println("\n=== Starting Normal Operation ===");
    initSensors();
    initWebSocket();
    bootStartMs = millis();
    firstPayloadSent = false;
}

// =============================================
// CONNECTIVITY HELPERS
// =============================================
bool syncTimeIfNeeded() {
    time_t now = time(nullptr);
    struct tm tm_info;
    localtime_r(&now, &tm_info);

    if (tm_info.tm_year + 1900 >= 2020) {
        Serial.println("[Time] ✓ Already synced");
        return true;
    }

    Serial.println("[Time] Syncing via NTP...");
    configTime(28800, 0, "ph.pool.ntp.org", "asia.pool.ntp.org", "time.google.com");

    const uint32_t TIMEOUT_MS = 30000;
    const uint32_t start = millis();

    while ((millis() - start) < TIMEOUT_MS) {
        now = time(nullptr);
        localtime_r(&now, &tm_info);

        if (tm_info.tm_year + 1900 >= 2020) {
            Serial.println("[Time] ✓ NTP sync successful");
            return true;
        }
        delay(500);
    }

    Serial.println("[Time] ✗ NTP sync FAILED");
    return false;
}

void maintainWiFiConnection() {
    static unsigned long lastCheck = 0;
    const unsigned long CHECK_INTERVAL = 5000;

    unsigned long now = millis();
    if (now - lastCheck < CHECK_INTERVAL) return;
    lastCheck = now;

    if (WiFi.status() != WL_CONNECTED && savedSSID.length() > 0) {
        Serial.println("[WiFi] Reconnecting...");
        WiFi.disconnect();
        delay(100);
        WiFi.begin(savedSSID.c_str(), savedPassword.c_str());

        uint8_t attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 30) {
            delay(250);
            attempts++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("[WiFi] ✓ Reconnected. IP: %s\n", WiFi.localIP().toString().c_str());
        }
    }
}

uint32_t computeBackoffDelayMs(uint32_t attempt) {
    uint32_t exp = (attempt >= 6) ? 6 : attempt;
    uint32_t d = WS_BACKOFF_BASE_MS * (1UL << exp);
    if (d > WS_BACKOFF_MAX_MS) d = WS_BACKOFF_MAX_MS;
    return d;
}

void serviceWebSockets() {
    const uint32_t now = millis();

    if (WiFi.status() != WL_CONNECTED) {
        if (wsClient.isConnected()) wsClient.disconnect();
        wsConnected = false;
        wsConnecting = false;
        wsReconnectAttempt = 0;
        return;
    }

    // Idle timeout
    if (wsClient.isConnected()) {
        if (now - lastWsActivityMs > WS_IDLE_TIMEOUT_MS) {
            Serial.println("[WS] ⏱ Timeout - reconnecting");
            wsClient.disconnect();
            wsConnected = false;
            wsNextConnectAtMs = now + computeBackoffDelayMs(wsReconnectAttempt++);
        }
    } else if (wsWantConnect && !wsConnecting && now >= wsNextConnectAtMs) {
        if (now - bootStartMs < MIN_WS_CONNECT_DELAY_MS) {
            wsNextConnectAtMs = bootStartMs + MIN_WS_CONNECT_DELAY_MS;
            return;
        }

        Serial.printf("[WS] Connecting attempt %lu...\n", (unsigned long)wsReconnectAttempt + 1);
        
        if (WS_SECURE) {
            wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
        } else {
            wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
        }
        
        wsConnecting = true;
        wsNextConnectAtMs = now + computeBackoffDelayMs(wsReconnectAttempt);
    }
}

float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
    if (in_max - in_min == 0) return out_min;
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
