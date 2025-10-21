/*
 * SmarTanom ESP32 WiFi Provisioning Firmware
 *
 * This firmware enables ESP32 devices to:
 * 1. Boot into AP mode with SSID = device serial number
 * 2. Serve a captive portal for WiFi credential setup
 * 3. Connect to user's WiFi network
 * 4. Report provisioning status to backend API
 * 5. Begin normal sensor operation
 *
 * NEW in v1.2.0:
 * - Dynamic AP password: "smartanom" + device serial
 * - Full captive portal support (auto-redirect on connect)
 * - Enhanced UI with loading screens and animations
 * - Visual countdown timers on status pages
 * - Improved error messaging with troubleshooting steps
 * - Better user feedback throughout provisioning flow
 * - Detailed connection status with network info
 *
 * IMPORTANT: Set DEVICE_SERIAL before flashing!
 *
 * Author: SmarTanom Team
 * Version: 1.2.0
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
// Sensor + WebSocket libraries
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WebSocketsClient.h>

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-DQX-0HO"  // * CHANGE THIS BEFORE FLASHING *
#define FIRMWARE_VERSION "1.2.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
// Updated to match Render service domain (ALLOWED_HOSTS)
// Note: Do NOT include a trailing slash to avoid double-slash when joining paths
// Example: health = BACKEND_URL + "/healthz" -> https://smartanom.onrender.com/healthz
#define BACKEND_URL "https://smartanom.onrender.com"
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define CONFIG_ENDPOINT "/api/devices/" DEVICE_SERIAL "/config/"

// Optional: Set if your backend requires device auth
// Set to your production API key for security
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"  // Production API key

// Optional: Force non-TLS WebSocket (ws) if your ESP32 TLS is failing in dev
// WARNING: Use only for development on trusted networks
// Force non-TLS WebSocket (ws) even if BACKEND_URL is https
// Use only in local development with trusted networks
#define FORCE_WS_INSECURE false

// Optional: Allow automatic fallback to ws (insecure) if wss fails repeatedly.
// This is useful when your backend is configured to accept insecure WS (e.g., WS_TLS_INSECURE=true)
// and the ESP32 cannot validate TLS due to CA/fingerprint issues. Log warns clearly when used.
#define ALLOW_WS_INSECURE_FALLBACK false

// Optional: Send Origin header with WebSocket handshake. Some proxies/servers can be strict.
// Disable by default for device clients to reduce early handshake rejections.
#define WS_SEND_ORIGIN_HEADER false

// Optional TLS server fingerprint for wss (Render issues valid certs; this is optional)
// If you supply a SHA1 fingerprint string (e.g., "AA BB CC ..."), it will be used for validation.
// Leave empty to use default TLS behavior (requires correct time via NTP and a valid CA path in core).
#define WS_SSL_FINGERPRINT ""

// Optional: Let’s Encrypt ISRG Root X1 (PEM) if using a WebSocketsClient variant that supports setCACert.
// Some versions of arduinoWebSockets allow providing a WiFiClientSecure with setCACert.
// Keeping it here for future use when upgrading libraries.
// Placeholder for ISRG Root X1 PEM. Paste the correct CA here when upgrading
// to a WebSocketsClient variant that accepts setCACert on a provided client.
static const char ISRG_ROOT_X1_CA[] PROGMEM = ""; // not used in current build

// =============================================
// AP CONFIGURATION
// =============================================
#define AP_SSID DEVICE_SERIAL
// Password = "smartanom" + device serial (e.g., "smartanomSMRT-0RE-ZQ8")
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

// DNS configuration for captive portal
const byte DNS_PORT = 53;

// WiFi state
String savedSSID = "";
String savedPassword = "";
bool wifiConfigured = false;
bool provisioningMode = true;

// =============================================
// SENSOR PINS (KEEP AS PROVIDED)
// =============================================
#define WATER_SENSOR_PIN 32  // HW-03 Water Sensor (AO) on GPIO32
#define ONE_WIRE_BUS 4
#define TDS_PIN 39
#define PH_PIN 36
#define TURBIDITY_PIN 35     // Moved from 32 to 35 (GPIO32 now used for water level)

// Sensor objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);

// ADC / calculation constants
#define VREF 3.3
#define ADC_RES 4095.0
#define SCOUNT 30

// =============================================
// WATER LEVEL SENSOR - State Machine & Calibration
// =============================================
// State definitions (NORMAL/WARNING based on ADC threshold)
enum LevelState { STATE_WARNING, STATE_NORMAL };
LevelState currentWaterLevelState = STATE_NORMAL;

const char* waterLevelStateToText(LevelState s) {
  switch (s) {
    case STATE_WARNING: return "WARNING";
    case STATE_NORMAL:  return "NORMAL";
    default:            return "UNKNOWN";
  }
}

// Thresholds & Hysteresis for state transitions
int ADC_WARNING_THRESH = 500;  // < 500 => WARNING
int HYST_ADC = 20;             // hysteresis (ADC counts)

LevelState classifyWaterLevelAdc(int adc) {
  switch (currentWaterLevelState) {
    case STATE_WARNING:
      if (adc >= ADC_WARNING_THRESH + HYST_ADC) return STATE_NORMAL;
      return STATE_WARNING;
    case STATE_NORMAL:
      if (adc < ADC_WARNING_THRESH - HYST_ADC) return STATE_WARNING;
      return STATE_NORMAL;
  }
  return STATE_NORMAL;
}

// Moving average filter for water level ADC
constexpr int WATER_SAMPLE_COUNT = 10;
int waterLevelSamples[WATER_SAMPLE_COUNT];
int waterLevelSampleIndex = 0;
bool waterLevelBufferFilled = false;

// Zero fault detection
uint32_t waterLevelZeroStartMs = 0;
bool waterLevelZeroFaultNotified = false;

// Display calibration for percentage (EEPROM-backed)
constexpr size_t EEPROM_SIZE = 64;
constexpr int EEPROM_ADDR_FLAG = 0;
constexpr int EEPROM_ADDR_DRY  = 4;
constexpr int EEPROM_ADDR_WET  = 8;

int calibDry = 600;   // 0% wetness
int calibWet = 1700;  // 100% wetness

// Utility functions for water level percentage
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

// EEPROM calibration persistence
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
// LEGACY CALIBRATION (kept for compatibility)
// =============================================
#define TDS_FACTOR 0.5
#define PH_CALIBRATION_OFFSET 0.00
#define DRY_VALUE 250
#define WET_VALUE 1000
// Turbidity calibration (adjust per ESP32 + sensor calibration)
// Higher voltage = clearer water, lower voltage = more turbid
#define TURBIDITY_CLEAR_VOLTAGE 3.0   // voltage in clear water (approx; calibrate)
#define TURBIDITY_MAX_VOLTAGE 0.5     // voltage at high turbidity (approx; calibrate)

// Sensor buffers/values
int tdsBuffer[SCOUNT];
int phBuffer[SCOUNT];
int bufferIndex = 0;

float waterTempC = 25.0;
float averageVoltageTDS = 0.0;
float averageVoltagePH = 0.0;
float tdsValue = 0.0;
float phValue = 0.0;
int waterPercent = 0;
int waterRaw = 0;
int rawTurb = 0;
float voltageTurb = 0.0;
float turbidityNTU = 0.0;

// =============================================
// WEBSOCKET (Device -> Backend Channels)
// =============================================
WebSocketsClient wsClient;
bool wsConnected = false;
unsigned long lastSensorSend = 0;
const unsigned long SENSOR_SEND_INTERVAL_MS = 2000;  // 2 seconds
// Track WS fallback state
bool wsTriedInsecureFallback = false;

// Derived from BACKEND_URL
String WS_HOST = "";      // e.g., smartanom.onrender.com
uint16_t WS_PORT = 443;    // 443 for wss, 80 for ws
String WS_PATH = "";      // e.g., /ws/device/<serial>/
bool WS_SECURE = true;     // wss when true

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
            position: relative;
            overflow: hidden;
        }
        body::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(127, 212, 133, 0.1) 0%, transparent 70%);
            animation: pulse 15s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.3; }
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(51, 148, 50, 0.1);
            max-width: 480px;
            width: 100%;
            padding: 0;
            position: relative;
            z-index: 1;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #339432 0%, #52B256 100%);
            padding: 32px 30px 24px;
            text-align: center;
            position: relative;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #7FD485, #52B256, #7FD485);
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            color: white;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        .subtitle {
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
            font-weight: 500;
        }
        .content {
            padding: 32px 30px 24px;
        }
        h1 {
            color: #1a1a1a;
            font-size: 22px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .device-serial {
            background: linear-gradient(135deg, #f0f9f1 0%, #e8f5e9 100%);
            padding: 14px 16px;
            border-radius: 10px;
            text-align: center;
            font-weight: 600;
            color: #339432;
            margin-bottom: 24px;
            font-family: 'Courier New', monospace;
            font-size: 15px;
            border: 2px solid #7FD485;
            letter-spacing: 1px;
        }
        .info {
            background: linear-gradient(135deg, #e8f5e9 0%, #f1f9f2 100%);
            border-left: 4px solid #52B256;
            padding: 14px 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #2d5f2e;
            border-radius: 8px;
            line-height: 1.6;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #2d5f2e;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        select, input[type="password"], input[type="text"] {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: white;
            color: #1a1a1a;
        }
        select:focus, input:focus {
            outline: none;
            border-color: #52B256;
            box-shadow: 0 0 0 3px rgba(82, 178, 86, 0.1);
        }
        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23339432' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 40px;
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
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(51, 148, 50, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(51, 148, 50, 0.4);
            background: linear-gradient(135deg, #2d7f2b 0%, #48a04c 100%);
        }
        button:active {
            transform: translateY(0);
            box-shadow: 0 2px 8px rgba(51, 148, 50, 0.3);
        }
        .status {
            margin-top: 20px;
            padding: 16px;
            border-radius: 10px;
            text-align: center;
            font-weight: 500;
            font-size: 14px;
            line-height: 1.6;
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
            border-top: 1px solid #f0f0f0;
        }
        .spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            vertical-align: middle;
            margin-right: 8px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .icon {
            display: inline-block;
            margin-right: 8px;
            font-size: 18px;
        }
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
            SmarTanom &copy; 2025 | Firmware v)rawliteral" FIRMWARE_VERSION R"rawliteral( | 🌱 Growing Smart
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
bool wakeUpBackend();
void loadPreferences();
void savePreferences(const String& ssid, const String& password);
void clearPreferences();
String scanNetworks();
String scanNetworks();

// Sensors + Normal Operation
void initSensors();
void readSensorsOnce();
String getTurbidityStatus(int raw);
void startNormalOperation();

// WebSocket helpers
void deriveWsEndpointFromBackend();
void initWebSocket();
void wsEvent(WStype_t type, uint8_t * payload, size_t length);
void sendHandshake();
void sendSensorData();
bool syncTimeIfNeeded();  // Returns true if time sync successful
void maintainWiFiConnection();

// Utils
static inline float mapFloat(float x, float in_min, float in_max, float out_min, float out_max) {
    if (in_max - in_min == 0) return out_min;
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

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

    // Load saved WiFi credentials
    loadPreferences();

    // If WiFi is already configured, try to connect
    if (wifiConfigured && savedSSID.length() > 0) {
        Serial.println("Found saved WiFi credentials. Attempting connection...");
        if (connectToWiFi(savedSSID, savedPassword)) {
            Serial.println("Successfully connected to saved WiFi!");
            provisioningMode = false;

            // Wake up backend first (Render free tier sleeps after inactivity)
            Serial.println("\n--- Preparing to report to backend ---");
            wakeUpBackend();
            delay(2000);  // Give backend 2 seconds to fully wake up

            // Report success to backend
            reportProvisionStatus("connected", WiFi.localIP().toString());

            // Start normal sensor operation + WebSocket streaming
            startNormalOperation();
            Serial.println("Ready for normal operation.");
            return;
        } else {
            Serial.println("Failed to connect to saved WiFi (incorrect credentials?).");
            Serial.println("Clearing saved credentials and starting provisioning mode...");
            wifiConfigured = false;
            clearPreferences();
        }
    }

    // Start provisioning mode
    Serial.println("Starting WiFi provisioning mode...");
    setupAP();
    setupWebServer();

    Serial.println("\n--- Provisioning Mode Active ---");
    Serial.printf("Connect to WiFi: %s\n", AP_SSID);
    Serial.printf("Password: %s\n", AP_PASSWORD.c_str());
    Serial.println("Then open: http://192.168.4.1");
    Serial.println("Captive portal will auto-redirect");
    Serial.println("--------------------------------\n");
}

// =============================================
// MAIN LOOP
// =============================================
void loop() {
    if (provisioningMode) {
        dnsServer.processNextRequest();  // Handle DNS requests for captive portal
        server.handleClient();
    } else {
        // Normal operation mode
        // WebSocket loop and periodic sensor send
        // Ensure WiFi stays connected
        maintainWiFiConnection();

        wsClient.loop();

        unsigned long now = millis();
        if (now - lastSensorSend >= SENSOR_SEND_INTERVAL_MS) {
            lastSensorSend = now;
            readSensorsOnce();
            sendSensorData();
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

        // Start DNS server for captive portal
        // This redirects all DNS requests to the ESP32's IP (192.168.4.1)
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
    // Main routes
    server.on("/", HTTP_GET, handleRoot);
    server.on("/connect", HTTP_POST, handleConnect);
    server.on("/status", HTTP_GET, handleStatus);

    // Android captive portal detection
    server.on("/generate_204", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    // Microsoft captive portal detection
    server.on("/fwlink", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    // Apple iOS/macOS captive portal detection
    server.on("/hotspot-detect.html", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    // Apple secondary check
    server.on("/library/test/success.html", HTTP_GET, []() {
        server.sendHeader("Location", "http://192.168.4.1/", true);
        server.send(302, "text/plain", "");
    });

    // Catch-all for any other requests
    server.onNotFound(handleNotFound);

    server.begin();
    Serial.println("✓ Web server started on port 80");
    Serial.println("✓ Captive portal endpoints configured");
}// =============================================
// WEB HANDLERS
// =============================================
void handleRoot() {
    Serial.println("Serving WiFi setup page (Captive Portal)...");

    String networks = scanNetworks();

    String html = FPSTR(HTML_HEAD);
    html += "<h1><span class='icon'>📶</span>WiFi Setup</h1>";
    html += "<div class='device-serial'>Device: " + String(DEVICE_SERIAL) + "</div>";
    html += "<div class='info'><span class='icon'>💡</span>Select your WiFi network and enter the password to connect your device to the internet.</div>";
    html += "<form action='/connect' method='POST' id='wifiForm'>";
    html += "<div class='form-group'>";
    html += "<label for='ssid'>📡 WiFi Network</label>";
    html += "<select id='ssid' name='ssid' required>";
    html += "<option value=''>-- Select Network --</option>";
    html += networks;
    html += "</select>";
    html += "</div>";
    html += "<div class='form-group'>";
    html += "<label for='password'>🔐 WiFi Password</label>";
    html += "<input type='password' id='password' name='password' required placeholder='Enter your WiFi password'>";
    html += "</div>";
    html += "<button type='submit' id='connectBtn'>Connect to WiFi</button>";
    html += "</form>";

    // Add loading overlay HTML (hidden by default)
    html += "<div id='loadingOverlay' style='display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;'>";
    html += "<div style='background:white; padding:40px; border-radius:16px; text-align:center; max-width:400px; margin:20px;'>";
    html += "<div style='width:60px; height:60px; border:6px solid #e0e0e0; border-top:6px solid #339432; border-radius:50%; margin:0 auto 20px; animation:spin 1s linear infinite;'></div>";
    html += "<h2 style='color:#339432; margin-bottom:10px;'>Connecting...</h2>";
    html += "<p style='color:#666; margin-bottom:20px;'>Please wait while we connect to your WiFi network.</p>";
    html += "<div style='background:#e8f5e9; padding:12px; border-radius:8px; color:#2d5f2e; font-size:14px;'>⏳ This may take up to 30 seconds</div>";
    html += "</div></div>";

    // Add JavaScript for form submission with loading screen
    html += "<script>";
    html += "document.getElementById('wifiForm').addEventListener('submit', function(e) {";
    html += "  document.getElementById('loadingOverlay').style.display = 'flex';";
    html += "  document.getElementById('connectBtn').disabled = true;";
    html += "  setTimeout(function(){ window.location.href='/status'; }, 15000);";
    html += "});";
    html += "</script>";

    html += FPSTR(HTML_FOOT);

    // Set headers for captive portal
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.sendHeader("Pragma", "no-cache");
    server.sendHeader("Expires", "-1");
    server.send(200, "text/html", html);
}

void handleConnect() {
    Serial.println("Received connection request...");

    if (!server.hasArg("ssid") || !server.hasArg("password")) {
        String html = FPSTR(HTML_HEAD);
        html += "<h1><span class='icon'>⚠️</span>Error</h1>";
        html += "<div class='device-serial'>Missing Information</div>";
        html += "<div class='status error'>";
        html += "<span class='icon'>❌</span><strong>Missing Information!</strong><br><br>";
        html += "Both WiFi network and password are required to continue.";
        html += "</div>";
        html += "<br><a href='/'><button>← Back to Setup</button></a>";
        html += FPSTR(HTML_FOOT);
        server.send(400, "text/html", html);
        return;
    }

    String ssid = server.arg("ssid");
    String password = server.arg("password");

    Serial.printf("Attempting to connect to: %s\n", ssid.c_str());

    // Send immediate acknowledgment (form already shows loading screen via JS)
    String html = FPSTR(HTML_HEAD);
    html += "<h1><span class='icon'>⏳</span>Connecting to WiFi...</h1>";
    html += "<div class='device-serial'>Network: " + ssid + "</div>";
    html += "<div style='text-align:center; padding:30px 0;'>";
    html += "<div style='width:80px; height:80px; border:8px solid #e0e0e0; border-top:8px solid #339432; border-radius:50%; margin:0 auto 30px; animation:spin 1s linear infinite;'></div>";
    html += "<div class='info' style='margin-bottom:20px;'>";
    html += "<strong>⏳ Connecting to WiFi network...</strong><br><br>";
    html += "Please wait while we establish a connection.<br>";
    html += "This may take up to 30 seconds.";
    html += "</div>";
    html += "<div style='background:#fff3cd; border:2px solid #ffc107; border-radius:8px; padding:12px; color:#856404; font-size:13px;'>";
    html += "💡 <strong>Tip:</strong> Stay connected to <strong>" + String(DEVICE_SERIAL) + "</strong> until the process completes.";
    html += "</div>";
    html += "</div>";
    html += "<script>setTimeout(function(){ window.location.href='/status'; }, 15000);</script>";
    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);

    // Attempt connection
    delay(100);  // Let response send

    if (connectToWiFi(ssid, password)) {
        Serial.println("✓ WiFi connection successful!");

        // Save credentials to NVS
        savePreferences(ssid, password);

        // Wake up backend first
        Serial.println("\n--- Preparing to report to backend ---");
        wakeUpBackend();
        delay(2000);  // Give backend time to wake up

        // Report to backend (sets wifi_configured=True in database)
        String ip = WiFi.localIP().toString();
        reportProvisionStatus("connected", ip);

        // Exit provisioning mode
        provisioningMode = false;
        wifiConfigured = true;

        Serial.println("✓ Provisioning complete. Shutting down AP...");
        delay(2000);
        WiFi.softAPdisconnect(true);

        // Normal operation starts
        startNormalOperation();

    } else {
        Serial.println("✗ WiFi connection failed!");

        // Clear saved credentials (wrong password or network issue)
        Serial.println("Clearing saved WiFi credentials from NVS...");
        clearPreferences();

        // Wake up backend (even for failure reporting)
        wakeUpBackend();
        delay(1000);

        // Report failure to backend (sets wifi_configured=False)
        reportProvisionStatus("failed");

        // Restart AP mode for retry
        Serial.println("Restarting AP mode for user retry...");
        provisioningMode = true;
        wifiConfigured = false;

        // Restart the ESP32 to cleanly re-enter provisioning mode
        delay(2000);
        Serial.println("Restarting ESP32 in 2 seconds...");
        ESP.restart();
    }
}

void handleStatus() {
    Serial.println("Status check requested...");

    String html = FPSTR(HTML_HEAD);
    html += "<h1><span class='icon'>📊</span>Connection Status</h1>";
    html += "<div class='device-serial'>" + String(DEVICE_SERIAL) + "</div>";

    if (wifiConfigured && WiFi.status() == WL_CONNECTED) {
        // SUCCESS - Connected to WiFi
        html += "<div style='text-align:center; padding:20px 0;'>";
        html += "<div style='width:100px; height:100px; background:linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius:50%; margin:0 auto 24px; display:flex; align-items:center; justify-content:center; font-size:50px;'>✅</div>";
        html += "</div>";

        html += "<div class='status success'>";
        html += "<strong style='font-size:18px; color:#2d5f2e;'>🎉 Successfully Connected!</strong><br><br>";
        html += "<div style='text-align:left; background:white; padding:16px; border-radius:8px; margin:16px 0;'>";
        html += "<div style='margin-bottom:12px;'><span style='color:#666;'>📡 Network:</span> <strong style='color:#339432;'>" + savedSSID + "</strong></div>";
        html += "<div style='margin-bottom:12px;'><span style='color:#666;'>🌐 IP Address:</span> <strong style='color:#339432;'>" + WiFi.localIP().toString() + "</strong></div>";
        html += "<div><span style='color:#666;'>📶 Signal Strength:</span> <strong style='color:#339432;'>" + String(WiFi.RSSI()) + " dBm</strong></div>";
        html += "</div>";
        html += "<p style='color:#2d5f2e; line-height:1.8;'>Your SmarTanom device is now <strong>online</strong>!<br>";
        html += "The device has been marked as <strong>WiFi configured</strong> in the system.<br>";
        html += "You can now view it in your dashboard.</p>";
        html += "</div>";

        html += "<div style='background:#fff3cd; border:2px solid #ffc107; border-radius:10px; padding:16px; margin-top:20px; color:#856404;'>";
        html += "<div style='font-weight:600; margin-bottom:8px;'>🔄 Auto-redirect in <span id='countdown'>3</span> seconds...</div>";
        html += "<div style='font-size:12px;'>Taking you to: <strong>Dashboard</strong></div>";
        html += "</div>";

        // Auto-redirect to dashboard with countdown
        // Note: User must manually reconnect to their home WiFi to access dashboard
        html += "<script>";
        html += "var count = 3;";
        html += "var countdown = setInterval(function() {";
        html += "  count--;";
        html += "  document.getElementById('countdown').textContent = count;";
        html += "  if (count <= 0) {";
        html += "    clearInterval(countdown);";
        html += "    alert('WiFi Setup Complete!\\n\\nNext Steps:\\n1. Disconnect from " + String(DEVICE_SERIAL) + "\\n2. Reconnect to your home WiFi\\n3. Open your browser and go to:\\n   http://localhost:5173/dashboard\\n\\nYour device is now online!');";
        html += "    // Try to open dashboard (will only work if user is on home WiFi)";
        html += "    window.location.href = 'http://localhost:5173/dashboard';";
        html += "  }";
        html += "}, 1000);";
        html += "</script>";    } else {
        // FAILURE - Wrong password or connection issue
        html += "<div style='text-align:center; padding:20px 0;'>";
        html += "<div style='width:100px; height:100px; background:linear-gradient(135deg, #ffebee, #ffcdd2); border-radius:50%; margin:0 auto 24px; display:flex; align-items:center; justify-content:center; font-size:50px;'>❌</div>";
        html += "</div>";

        html += "<div class='status error'>";
        html += "<strong style='font-size:18px;'>Connection Failed</strong><br><br>";
        html += "<p style='line-height:1.8;'>Unable to connect to the WiFi network.<br><br>";
        html += "<strong>Common reasons:</strong></p>";
        html += "<ul style='text-align:left; margin:16px 0; padding-left:20px; line-height:1.8;'>";
        html += "<li>❌ Incorrect WiFi password</li>";
        html += "<li>📡 Network out of range</li>";
        html += "<li>� Network security type not supported</li>";
        html += "</ul>";
        html += "</div>";

        html += "<div style='background:#fff3cd; border:2px solid #ffc107; border-radius:10px; padding:16px; margin-top:20px; color:#856404;'>";
        html += "<div style='font-weight:600; margin-bottom:8px;'>🔄 Device restarting in <span id='countdown'>5</span> seconds...</div>";
        html += "<div style='font-size:12px;'>You'll be able to re-enter the WiFi password.</div>";
        html += "</div>";

        html += "<div style='margin-top:20px; padding:16px; background:#e8f5e9; border-radius:10px; border-left:4px solid #52B256;'>";
        html += "<strong style='color:#2d5f2e;'>📱 Next Steps:</strong><br>";
        html += "<ol style='margin-top:12px; padding-left:20px; color:#2d5f2e; line-height:1.8;'>";
        html += "<li>Wait for device to restart</li>";
        html += "<li>Reconnect to WiFi: <strong>" + String(DEVICE_SERIAL) + "</strong></li>";
        html += "<li>Password: <strong>" + AP_PASSWORD + "</strong></li>";
        html += "<li>Re-enter the correct WiFi password</li>";
        html += "</ol>";
        html += "</div>";

        // Countdown and alert before restart
        html += "<script>";
        html += "var count = 5;";
        html += "var countdown = setInterval(function() {";
        html += "  count--;";
        html += "  document.getElementById('countdown').textContent = count;";
        html += "  if (count <= 0) {";
        html += "    clearInterval(countdown);";
        html += "    alert('Device is restarting now!\\n\\nPlease reconnect to:\\nWiFi: " + String(DEVICE_SERIAL) + "\\nPassword: " + AP_PASSWORD + "');";
        html += "  }";
        html += "}, 1000);";
        html += "</script>";
    }

    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);
}

void handleNotFound() {
    Serial.printf("Captive portal redirect: %s\n", server.uri().c_str());

    // For captive portal detection, return success HTML instead of redirect
    // This makes the captive portal popup appear on mobile devices
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta http-equiv='refresh' content='0; url=http://192.168.4.1/' />";
    html += "</head><body>";
    html += "<p>Redirecting to WiFi setup...</p>";
    html += "<p>If not redirected, <a href='http://192.168.4.1/'>click here</a>.</p>";
    html += "</body></html>";

    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.sendHeader("Pragma", "no-cache");
    server.sendHeader("Expires", "-1");
    server.send(200, "text/html", html);
}// =============================================
// WiFi CONNECTION
// =============================================
bool connectToWiFi(const String& ssid, const String& password) {
    Serial.printf("Connecting to WiFi: %s\n", ssid.c_str());

    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());

    int attempts = 0;
    const int maxAttempts = 30;  // 30 seconds timeout

    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(1000);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("✓ WiFi connected!");
        Serial.printf("  SSID: %s\n", ssid.c_str());
        Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
        return true;
    } else {
        Serial.println("✗ WiFi connection failed!");
        Serial.printf("  Status code: %d\n", WiFi.status());
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
        Serial.println("No networks found");
        options = "<option value=''>No networks found</option>";
    } else {
        Serial.printf("Found %d networks:\n", n);

        // Sort by signal strength
        int indices[n];
        for (int i = 0; i < n; i++) {
            indices[i] = i;
        }
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (WiFi.RSSI(indices[j]) > WiFi.RSSI(indices[i])) {
                    int temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }

        // Build options HTML
        for (int i = 0; i < n; i++) {
            int idx = indices[i];
            String ssid = WiFi.SSID(idx);
            int rssi = WiFi.RSSI(idx);
            String encryption = (WiFi.encryptionType(idx) == WIFI_AUTH_OPEN) ? " 🔓" : " 🔒";

            // Signal strength indicator
            String signal;
            if (rssi > -50) signal = "▂▄▆█";
            else if (rssi > -60) signal = "▂▄▆_";
            else if (rssi > -70) signal = "▂▄__";
            else signal = "▂___";

            Serial.printf("  %d: %s (%d dBm) %s\n", i+1, ssid.c_str(), rssi, encryption.c_str());

            options += "<option value='" + ssid + "'>" + ssid + " " + signal + encryption + "</option>";
        }
    }

    WiFi.scanDelete();
    return options;
}

// =============================================
// BACKEND COMMUNICATION
// =============================================

// Wake up Render service (if sleeping) by hitting health endpoint
bool wakeUpBackend() {
    Serial.println("Waking up backend service (Render free tier may be sleeping)...");

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(30);  // 30 second timeout for wake-up

    HTTPClient http;
    String healthUrl = String(BACKEND_URL) + "/healthz";

    Serial.printf("GET %s\n", healthUrl.c_str());

    if (!http.begin(client, healthUrl)) {
        Serial.println("✗ Could not connect to health endpoint");
        return false;
    }

    http.setTimeout(30000);  // 30 seconds

    int httpCode = http.GET();
    http.end();

    if (httpCode > 0) {
        Serial.printf("✓ Backend responded (HTTP %d). Service is awake.\n", httpCode);
        return true;
    } else {
        Serial.printf("⚠ Health check failed: %s (may still wake up)\n", http.errorToString(httpCode).c_str());
        return false;  // Continue anyway, might still work
    }
}

bool reportProvisionStatus(const String& status, const String& ipAddress) {
    Serial.printf("Reporting provision status to backend: %s\n", status.c_str());

    if (WiFi.status() != WL_CONNECTED && status == "connected") {
        Serial.println("✗ Cannot report: WiFi not connected");
        return false;
    }

    // Retry logic for sleeping Render services
    const int maxRetries = 3;
    const int retryDelayMs = 2000;  // 2 seconds between retries

    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        Serial.printf("Attempt %d/%d...\n", attempt, maxRetries);

        WiFiClientSecure client;
        client.setInsecure();  // TODO: Replace with proper cert verification

        // Increase timeout for Render's cold start (free tier wakes from sleep)
        client.setTimeout(60);  // 60 seconds timeout

        HTTPClient https;
        String url = String(BACKEND_URL) + String(PROVISION_ENDPOINT);

        Serial.printf("POST %s\n", url.c_str());

        if (!https.begin(client, url)) {
            Serial.println("✗ HTTPS connection failed");
            if (attempt < maxRetries) {
                Serial.printf("Retrying in %d seconds...\n", retryDelayMs / 1000);
                delay(retryDelayMs);
                continue;
            }
            return false;
        }

        // Set timeouts (important for Render cold starts)
        https.setTimeout(60000);  // 60 seconds for HTTP layer
        https.setConnectTimeout(15000);  // 15 seconds for connection

        // Set headers
        https.addHeader("Content-Type", "application/json");
        if (strlen(DEVICE_API_KEY) > 0) {
            https.addHeader("X-Device-Auth", DEVICE_API_KEY);
        }

        // Build JSON payload
        StaticJsonDocument<256> doc;
        doc["serial"] = DEVICE_SERIAL;
        doc["status"] = status;
        if (ipAddress.length() > 0) {
            doc["ip"] = ipAddress;
        }
        doc["firmware_version"] = FIRMWARE_VERSION;
        doc["attempt"] = attempt;

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        Serial.printf("Payload: %s\n", jsonPayload.c_str());

        // Send request
        Serial.println("Sending POST request (this may take up to 60s if server is waking up)...");
        int httpCode = https.POST(jsonPayload);

        if (httpCode > 0) {
            Serial.printf("✓ Response code: %d\n", httpCode);
            String response = https.getString();
            Serial.printf("Response: %s\n", response.c_str());

            https.end();

            if (httpCode == 200 || httpCode == 201) {
                Serial.println("✓ Provisioning status reported successfully");

                // Give Render backend time to fully wake up WebSocket service
                // Free-tier instances may need extra time after initial HTTP wake
                Serial.println("[Backend] Allowing 3s for WebSocket service to initialize...");
                delay(3000);

                return true;
            } else if (httpCode == 429) {
                Serial.println("✗ Rate limited. Try again later.");
                return false;  // Don't retry on rate limit
            } else if (httpCode >= 500) {
                Serial.printf("✗ Server error (%d). ", httpCode);
                if (attempt < maxRetries) {
                    Serial.printf("Retrying in %d seconds...\n", retryDelayMs / 1000);
                    delay(retryDelayMs);
                    continue;
                }
            } else {
                Serial.printf("✗ HTTP error: %d\n", httpCode);
                return false;
            }
        } else {
            Serial.printf("✗ Request failed: %s\n", https.errorToString(httpCode).c_str());
            https.end();

            if (attempt < maxRetries) {
                Serial.printf("Retrying in %d seconds...\n", retryDelayMs / 1000);
                delay(retryDelayMs);
                continue;
            }
        }

        https.end();
    }

    Serial.println("✗ All retry attempts exhausted");
    return false;
}

// =============================================
// PREFERENCES (NVS) MANAGEMENT
// =============================================
void loadPreferences() {
    preferences.begin(PREF_NAMESPACE, true);  // Read-only

    savedSSID = preferences.getString(PREF_SSID, "");
    savedPassword = preferences.getString(PREF_PASSWORD, "");
    wifiConfigured = preferences.getBool(PREF_CONFIGURED, false);

    preferences.end();

    if (wifiConfigured) {
        Serial.println("✓ Found saved WiFi configuration");
        Serial.printf("  SSID: %s\n", savedSSID.c_str());
    } else {
        Serial.println("No saved WiFi configuration");
    }
}

void savePreferences(const String& ssid, const String& password) {
    preferences.begin(PREF_NAMESPACE, false);  // Read-write

    preferences.putString(PREF_SSID, ssid);
    preferences.putString(PREF_PASSWORD, password);
    preferences.putBool(PREF_CONFIGURED, true);

    preferences.end();

    savedSSID = ssid;
    savedPassword = password;
    wifiConfigured = true;

    Serial.println("✓ WiFi credentials saved to NVS");
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
// NORMAL OPERATION: Sensors + WebSocket
// =============================================

void initSensors() {
    // Initialize DS18B20 and ADC
    tempSensors.begin();
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Initialize water level sensor ADC settings
    analogSetPinAttenuation(WATER_SENSOR_PIN, ADC_11db);

    // Load water level calibration from EEPROM
    eepromLoadWaterCalibration();

    // Pre-fill water level moving average buffer
    for (int i = 0; i < WATER_SAMPLE_COUNT; i++) {
        waterLevelSamples[i] = 0;
    }

    // Pre-fill buffers with current readings to avoid initial zeros
    for (int i = 0; i < SCOUNT; i++) {
        tdsBuffer[i] = analogRead(TDS_PIN);
        phBuffer[i] = analogRead(PH_PIN);
    }
    bufferIndex = 0;

    Serial.println("✓ Sensors initialized (DS18B20, TDS, pH, Turbidity, HW-03 Water Level)");
    Serial.printf("  Water Level Calibration: 0%%=%d ADC, 100%%=%d ADC\n", calibDry, calibWet);
    Serial.printf("  Water Level Threshold: WARNING < %d ADC (hysteresis=%d)\n", ADC_WARNING_THRESH, HYST_ADC);
}

String getTurbidityStatus(int raw) {
    if (raw > 2100) {
        return "Clear";
    } else if (raw > 1800) {
        return "Cloudy";
    } else {
        return "Turbid";
    }
}

void readSensorsOnce() {
    // ========================================
    // HW-03 Water Sensor - Moving Average & State Machine
    // ========================================
    int rawWater = analogRead(WATER_SENSOR_PIN);

    // Add to moving average buffer
    waterLevelSamples[waterLevelSampleIndex] = rawWater;
    waterLevelSampleIndex = (waterLevelSampleIndex + 1) % WATER_SAMPLE_COUNT;
    if (waterLevelSampleIndex == 0) waterLevelBufferFilled = true;

    // Compute moving average
    long sumWater = 0;
    int countWater = waterLevelBufferFilled ? WATER_SAMPLE_COUNT : waterLevelSampleIndex;
    if (countWater == 0) countWater = 1;
    for (int i = 0; i < countWater; ++i) sumWater += waterLevelSamples[i];
    int adcAvgWater = sumWater / countWater;

    // Store for reporting
    waterRaw = adcAvgWater;

    // Map to percentage (display-only, based on calibration)
    waterPercent = (int)waterAdcToPercent(adcAvgWater);

    // State decision (WARNING/NORMAL) with hysteresis
    LevelState newState = classifyWaterLevelAdc(adcAvgWater);
    if (newState != currentWaterLevelState) {
        Serial.printf("[WATER LEVEL STATE] %s -> %s (ADC=%d)\n",
                      waterLevelStateToText(currentWaterLevelState),
                      waterLevelStateToText(newState),
                      adcAvgWater);
        currentWaterLevelState = newState;
    }

    // Zero fault detection (ADC stuck at 0)
    uint32_t now = millis();
    if (adcAvgWater == 0) {
        if (waterLevelZeroStartMs == 0) waterLevelZeroStartMs = now;
        if (!waterLevelZeroFaultNotified && (now - waterLevelZeroStartMs > 5000)) {
            waterLevelZeroFaultNotified = true;
            Serial.println(F("[WATER LEVEL FAULT] ADC stuck at 0. Check: AO->GPIO32, GND common, VCC"));
        }
    } else {
        waterLevelZeroStartMs = 0;
        waterLevelZeroFaultNotified = false;
    }

    // DS18B20 Water Temp
    tempSensors.requestTemperatures();
    float tempC = tempSensors.getTempCByIndex(0);
    if (tempC > -100 && tempC < 150) { // sanity check
        waterTempC = tempC;
    }

    // Collect ADC samples
    tdsBuffer[bufferIndex] = analogRead(TDS_PIN);
    phBuffer[bufferIndex]  = analogRead(PH_PIN);
    bufferIndex++;
    if (bufferIndex >= SCOUNT) bufferIndex = 0;

    // Compute averages
    long avgRawTDS = 0, avgRawPH = 0;
    for (int i = 0; i < SCOUNT; i++) {
        avgRawTDS += tdsBuffer[i];
        avgRawPH  += phBuffer[i];
    }
    avgRawTDS /= SCOUNT;
    avgRawPH  /= SCOUNT;

    // Voltages
    averageVoltageTDS = (float)avgRawTDS * (VREF / ADC_RES);
    averageVoltagePH  = (float)avgRawPH  * (VREF / ADC_RES);

    // TDS Calculation
    float compCoeff = 1.0 + 0.02 * (waterTempC - 25.0);
    float compVoltage = averageVoltageTDS / compCoeff;
    tdsValue = (133.42 * pow(compVoltage, 3)
               - 255.86 * pow(compVoltage, 2)
               + 857.39 * compVoltage) * TDS_FACTOR;
    if (tdsValue < 0) tdsValue = 0;

    // pH Calculation (linear approximation; calibrate as needed)
    phValue = 3.5 * averageVoltagePH + PH_CALIBRATION_OFFSET;

    // Turbidity
    rawTurb = analogRead(TURBIDITY_PIN);
    voltageTurb = rawTurb * (VREF / ADC_RES);
    // Convert to NTU using simple linear model between calibrated endpoints
    // 0 NTU at clear voltage, increasing to 1000 NTU at max turbidity voltage
    turbidityNTU = mapFloat(voltageTurb, TURBIDITY_CLEAR_VOLTAGE, TURBIDITY_MAX_VOLTAGE, 0.0, 1000.0);
    if (turbidityNTU < 0) turbidityNTU = 0;
}

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
    if (FORCE_WS_INSECURE) {
        WS_SECURE = false;
        WS_PORT = 80;
    }
    // Strip trailing slash
    if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
    // Up to first '/'
    int slash = url.indexOf('/');
    WS_HOST = (slash >= 0) ? url.substring(0, slash) : url;
    WS_PATH = String("/ws/device/") + String(DEVICE_SERIAL) + String("/");

    Serial.printf("WebSocket endpoint -> %s://%s:%u%s\n", WS_SECURE ? "wss" : "ws", WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
}

void initWebSocket() {
    deriveWsEndpointFromBackend();

    wsClient.onEvent(wsEvent);
    wsClient.setReconnectInterval(5000); // 5s

    // Enable protocol-level heartbeat to keep connection alive behind proxies
    wsClient.enableHeartbeat(15000, 3000, 2); // ping every 15s, 3s timeout, 2 fails

    Serial.println("[WS] Heartbeat enabled (15s/3s/2)");

    // Set Origin header to match backend host (helps when strict origin checks are enabled)
    // Optionally send Origin header if required by server
    if (WS_SEND_ORIGIN_HEADER) {
        String originHeader = String("Origin: ") + String(BACKEND_URL) + String("\r\n");
        wsClient.setExtraHeaders(originHeader.c_str());
        Serial.printf("[WS] Extra header set: %s\n", originHeader.c_str());
    } else {
        // Clear any previous extra headers
        wsClient.setExtraHeaders("");
    }

    // ==========================================
    // CRITICAL: Ensure NTP time sync before TLS
    // ==========================================
    if (WS_SECURE) {
        Serial.println("[WS] Secure WebSocket (wss) requires valid system time...");

        bool timeOk = syncTimeIfNeeded();

        if (!timeOk) {
            Serial.println("[WS] ⚠️  WARNING: Time sync failed!");
            Serial.println("[WS] TLS handshake will likely fail.");

            if (ALLOW_WS_INSECURE_FALLBACK) {
                Serial.println("[WS] → Falling back to insecure ws:// immediately");
                WS_SECURE = false;
                WS_PORT = 80;
            } else {
                Serial.println("[WS] → Will attempt wss anyway (expect failures)");
                Serial.println("[WS] → Set ALLOW_WS_INSECURE_FALLBACK=true to auto-fallback");
            }
        } else {
            Serial.println("[WS] ✓ Time synced - TLS handshake can proceed");
        }

        // Small delay to ensure time propagates through system
        delay(1000);
    }

    Serial.printf("[WS] Connecting to %s://%s:%u%s\n",
                  WS_SECURE ? "wss" : "ws",
                  WS_HOST.c_str(),
                  WS_PORT,
                  WS_PATH.c_str());

    if (WS_SECURE) {
        if (strlen(WS_SSL_FINGERPRINT) > 0) {
            Serial.println("[WS] → Using TLS with SHA1 fingerprint validation");
            wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str(), WS_SSL_FINGERPRINT);
        } else {
            Serial.println("[WS] → Using TLS with default certificate validation");
            Serial.println("[WS] → Server must have valid certificate chain");
            wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
        }
    } else {
        Serial.println("[WS] → Using INSECURE WebSocket (ws://)");
        Serial.println("[WS] ⚠️  Data transmitted in PLAIN TEXT!");
        wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
    }

    Serial.println("[WS] ✓ WebSocket client initialized");
    Serial.println("[WS] Waiting for connection...");
}

void wsEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED: {
            wsConnected = true;
            wsTriedInsecureFallback = true; // mark that a successful connection occurred
            Serial.println("[WS] ✓✓✓ Connected to server ✓✓✓");
            Serial.printf("[WS] Protocol: %s://%s:%u\n",
                          WS_SECURE ? "wss" : "ws",
                          WS_HOST.c_str(),
                          WS_PORT);
            Serial.printf("[WS] Path: %s\n", WS_PATH.c_str());

            // Get current time for debugging
            time_t now = time(nullptr);
            struct tm tm_info;
            localtime_r(&now, &tm_info);
            char timeBuf[32];
            strftime(timeBuf, sizeof(timeBuf), "%Y-%m-%d %H:%M:%S", &tm_info);
            Serial.printf("[WS] Connected at: %s PHT\n", timeBuf);

            // Small delay to ensure connection is fully established
            Serial.println("[WS] Waiting 500ms for connection stabilization...");
            delay(500);

            sendHandshake();
            break;
        }        case WStype_DISCONNECTED: {
            wsConnected = false;
            Serial.println("[WS] ✗ Disconnected from server");

            // Check if we received a close code
            if (length >= 2) {
                uint16_t closeCode = (payload[0] << 8) | payload[1];
                Serial.printf("[WS] Close code: %u\n", closeCode);

                // Decode common close codes
                switch (closeCode) {
                    case 1000: Serial.println("[WS] → Normal closure"); break;
                    case 1001: Serial.println("[WS] → Going away"); break;
                    case 1002: Serial.println("[WS] → Protocol error"); break;
                    case 1003: Serial.println("[WS] → Unsupported data"); break;
                    case 1006: Serial.println("[WS] → Abnormal closure (no close frame)"); break;
                    case 1007: Serial.println("[WS] → Invalid frame payload"); break;
                    case 1008: Serial.println("[WS] → Policy violation"); break;
                    case 1009: Serial.println("[WS] → Message too big"); break;
                    case 1011: Serial.println("[WS] → Internal server error"); break;
                    default: Serial.printf("[WS] → Unknown close code: %u\n", closeCode); break;
                }

                if (length > 2) {
                    String reason = String((char*)(payload + 2)).substring(0, length - 2);
                    Serial.printf("[WS] Close reason: %s\n", reason.c_str());
                }
            }

            Serial.printf("[WS] Auto-reconnect in 5s...\n");

            // If secure WS repeatedly fails and we haven't tried fallback yet
            if (ALLOW_WS_INSECURE_FALLBACK && !wsTriedInsecureFallback && WS_SECURE) {
                Serial.println("[WS] ⚠️  wss:// connection unstable");
                Serial.println("[WS] → Attempting ws:// fallback (insecure)");
                Serial.println("[WS] → Ensure backend has WS_TLS_INSECURE=true");

                wsTriedInsecureFallback = true;
                WS_SECURE = false;
                WS_PORT = 80;

                // Reinitialize with insecure connection
                wsClient.disconnect();
                delay(500);
                wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
                wsClient.setReconnectInterval(5000);
                wsClient.enableHeartbeat(15000, 3000, 2);
            }
            break;
        }

        case WStype_TEXT: {
            String msg = String((char*)payload).substring(0, length);
            Serial.printf("[WS] ← Message: %s\n", msg.c_str());

            // Try parse JSON
            StaticJsonDocument<256> doc;
            DeserializationError err = deserializeJson(doc, msg);
            if (!err) {
                const char* type = doc["type"] | "";
                if (strcmp(type, "ping") == 0) {
                    // Application-level pong response to server keepalive
                    StaticJsonDocument<128> pong;
                    pong["type"] = "pong";
                    pong["t"] = (uint32_t)millis();
                    String out; serializeJson(pong, out);
                    wsClient.sendTXT(out);
                    Serial.println("[WS] → pong");
                    break;
                }
                {
                    const char* status = doc["status"] | "";
                    if (strcmp(type, "ack") == 0 || strcmp(status, "ok") == 0) {
                    // Explicitly mark connection as healthy after ACK
                    wsConnected = true;
                    Serial.println("[WS] ✓ ACK received from server");
                        break;
                    }
                }
                const char* action = doc["action"] | "";
                if (String(action) == "reset_wifi") {
                    Serial.println("[WS] ⚠️  Received reset_wifi command");
                    Serial.println("[WS] → Clearing credentials and restarting...");
                    clearPreferences();
                    delay(500);
                    ESP.restart();
                }
            }
            break;
        }

        case WStype_ERROR: {
            Serial.println("[WS] ✗✗✗ ERROR EVENT ✗✗✗");
            Serial.printf("[WS] WiFi Status: %d, RSSI: %d dBm\n",
                          WiFi.status(),
                          WiFi.RSSI());

            // Check if this is likely a TLS error
            time_t now = time(nullptr);
            struct tm tm_info;
            localtime_r(&now, &tm_info);

            if (WS_SECURE && tm_info.tm_year + 1900 < 2020) {
                Serial.println("[WS] ⚠️  System time NOT synced - TLS will fail!");
                Serial.println("[WS] → This is the root cause of the error");
            }

            // Trigger fallback if enabled
            if (ALLOW_WS_INSECURE_FALLBACK && !wsTriedInsecureFallback && WS_SECURE) {
                Serial.println("[WS] → Attempting insecure ws:// fallback");
                wsTriedInsecureFallback = true;
                WS_SECURE = false;
                WS_PORT = 80;

                wsClient.disconnect();
                delay(500);
                wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
                wsClient.setReconnectInterval(5000);
                wsClient.enableHeartbeat(15000, 3000, 2);
            }
            break;
        }        case WStype_BIN:
            Serial.printf("[WS] Binary message (%u bytes)\n", (unsigned)length);
            break;

        case WStype_PING:
            Serial.println("[WS] ← Ping from server");
            break;

        case WStype_PONG:
            Serial.println("[WS] ← Pong from server (heartbeat OK)");
            break;

        default:
            Serial.printf("[WS] Unknown event type: %d\n", type);
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

    Serial.println("[WS] → Sending handshake...");
    Serial.printf("[WS] Payload: %s\n", out.c_str());

    bool sent = wsClient.sendTXT(out);
    if (sent) {
        Serial.println("[WS] ✓ Handshake sent successfully");
    } else {
        Serial.println("[WS] ✗ Failed to send handshake");
    }
}

void sendSensorData() {
    if (!wsConnected) {
        Serial.println("[WS] Not connected, skipping sensor send");
        return;
    }

    // Build array-based payload per requirement
    StaticJsonDocument<512> doc;
    doc["type"] = "sensor_data"; // explicit type for backend
    doc["device_serial"] = DEVICE_SERIAL;
    JsonArray arr = doc.createNestedArray("data");

    JsonObject o1 = arr.createNestedObject();
    o1["type"] = "ph";
    o1["value"] = phValue;

    JsonObject o2 = arr.createNestedObject();
    o2["type"] = "tds";
    o2["value"] = tdsValue; // ppm

    JsonObject o3 = arr.createNestedObject();
    o3["type"] = "ec";
    o3["value"] = tdsValue / 640.0; // rough estimate mS/cm

    // NOTE: Backend/Frontend thresholds expect the RAW analog value (~1800-2100 clear).
    // Send raw ADC reading here to match dashboard/alerts expectations.
    JsonObject o4 = arr.createNestedObject();
    o4["type"] = "turbidity";
    o4["value"] = rawTurb; // raw ADC units (0-4095)

    JsonObject o5 = arr.createNestedObject();
    o5["type"] = "water_temperature"; // preferred key
    o5["value"] = waterTempC; // °C
    // Also include legacy alias to ensure consumer variants pick it up
    JsonObject o5b = arr.createNestedObject();
    o5b["type"] = "water_temp"; // legacy alias
    o5b["value"] = waterTempC;

    JsonObject o6 = arr.createNestedObject();
    o6["type"] = "water_level";
    o6["value"] = waterPercent; // %

    // Add water level state (NORMAL/WARNING)
    JsonObject o7 = arr.createNestedObject();
    o7["type"] = "water_level_state";
    o7["value"] = waterLevelStateToText(currentWaterLevelState);

    String out;
    serializeJson(doc, out);
    wsClient.sendTXT(out);

    // Log to serial for quick debugging
    Serial.println("========== SENSOR READINGS ==========");
    Serial.printf("Water Level   : %d%% (raw=%d, state=%s)\n", waterPercent, waterRaw, waterLevelStateToText(currentWaterLevelState));
    Serial.printf("Water Temp    : %.2f °C\n", waterTempC);
    Serial.printf("TDS           : %.0f ppm\n", tdsValue);
    Serial.printf("EC (est)      : %.2f mS/cm\n", (tdsValue / 640.0));
    Serial.printf("pH            : %.2f\n", phValue);
    Serial.printf("Turbidity     : raw=%d (V=%.2f) | est=%.2f NTU | %s\n", rawTurb, voltageTurb, turbidityNTU, getTurbidityStatus(rawTurb).c_str());
    Serial.println("======================================\n");
}

void startNormalOperation() {
    Serial.println("\n=== Starting Normal Operation ===");
    initSensors();
    initWebSocket();
}

// =============================================
// Connectivity helpers
// =============================================

/**
 * Synchronize system time via NTP with extended timeout and retry logic.
 *
 * Critical for TLS/SSL certificate validation on WebSocket connections.
 * Without proper time sync, certificate validation will fail and cause
 * immediate disconnections.
 *
 * Returns: true if time is synced successfully, false on timeout
 */
bool syncTimeIfNeeded() {
    time_t now = time(nullptr);
    struct tm tm_info;
    localtime_r(&now, &tm_info);

    // Check if time is already set
    if (tm_info.tm_year + 1900 >= 2020) {
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm_info);
        Serial.printf("[Time] ✓ Already synced: %s PHT (UTC+8)\n", buf);
        return true;
    }

    Serial.println("[Time] ⏳ System time not set. Syncing via NTP...");
    Serial.println("[Time] This may take 20-30 seconds on some networks...");

    // Configure NTP with Philippine servers and timezone offset
    // GMT+8 = 28800 seconds offset (8 hours * 3600 seconds)
    // Using Philippine NTP servers for better connectivity
    configTime(28800, 0, "ph.pool.ntp.org", "asia.pool.ntp.org", "time.google.com");

    const uint32_t TIMEOUT_MS = 30000; // 30 seconds - extended for reliability
    const uint32_t start = millis();
    uint8_t dots = 0;

    while ((millis() - start) < TIMEOUT_MS) {
        now = time(nullptr);
        localtime_r(&now, &tm_info);

        // Check if sync succeeded
        if (tm_info.tm_year + 1900 >= 2020) {
            Serial.println(); // new line after dots
            char buf[32];
            strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &tm_info);
            Serial.printf("[Time] ✓ NTP sync successful: %s PHT (UTC+8)\n", buf);
            Serial.printf("[Time] Sync took %lu ms\n", millis() - start);
            return true;
        }

        // Visual progress indicator
        if (dots++ % 4 == 0) {
            Serial.print(".");
        }

        delay(500);
    }

    // Timeout - critical failure
    Serial.println(); // new line after dots
    Serial.println("[Time] ✗ NTP sync FAILED after 30s timeout");
    Serial.println("[Time] ⚠️  TLS certificate validation WILL FAIL");
    Serial.println("[Time] → Check: WiFi connectivity, firewall, NTP port 123");
    return false;
}

void maintainWiFiConnection() {
    static unsigned long lastCheck = 0;
    const unsigned long CHECK_INTERVAL = 5000; // 5s

    unsigned long now = millis();
    if (now - lastCheck < CHECK_INTERVAL) return;
    lastCheck = now;

    wl_status_t st = WiFi.status();
    if (st != WL_CONNECTED) {
        Serial.printf("[WiFi] Disconnected (status=%d). Attempting reconnect to %s...\n", st, savedSSID.c_str());
        if (savedSSID.length() > 0) {
            WiFi.disconnect();
            delay(100);
            WiFi.begin(savedSSID.c_str(), savedPassword.c_str());

            uint8_t attempts = 0;
            while (WiFi.status() != WL_CONNECTED && attempts < 30) {
                delay(250);
                attempts++;
            }

            if (WiFi.status() == WL_CONNECTED) {
                Serial.printf("[WiFi] Reconnected. IP: %s, RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
            } else {
                Serial.println("[WiFi] Reconnect attempt failed");
            }
        }
    }
}
