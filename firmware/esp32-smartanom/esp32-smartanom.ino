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
// Sensor + WebSocket libraries
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WebSocketsClient.h>

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // * CHANGE THIS BEFORE FLASHING *
#define FIRMWARE_VERSION "1.2.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
#define BACKEND_URL "https://smartanom.onrender.com"
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define CONFIG_ENDPOINT "/api/devices/" DEVICE_SERIAL "/config/"

// Optional: Set if your backend requires device auth
// Set to your production API key for security
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"  // Production API key

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
#define WATER_SENSOR_PIN 33
#define ONE_WIRE_BUS 4
#define TDS_PIN 39
#define PH_PIN 36
#define TURBIDITY_PIN 32

// Sensor objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);

// ADC / calculation constants
#define VREF 3.3
#define ADC_RES 4095.0
#define SCOUNT 30

// Calibration constants
#define TDS_FACTOR 0.5
#define PH_CALIBRATION_OFFSET 0.00
#define DRY_VALUE 250
#define WET_VALUE 1000

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
int rawTurb = 0;
float voltageTurb = 0.0;

// =============================================
// WEBSOCKET (Device -> Backend Channels)
// =============================================
WebSocketsClient wsClient;
bool wsConnected = false;
unsigned long lastSensorSend = 0;
const unsigned long SENSOR_SEND_INTERVAL_MS = 2000;  // 2 seconds

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

    // Pre-fill buffers with current readings to avoid initial zeros
    for (int i = 0; i < SCOUNT; i++) {
        tdsBuffer[i] = analogRead(TDS_PIN);
        phBuffer[i] = analogRead(PH_PIN);
    }
    bufferIndex = 0;

    Serial.println("✓ Sensors initialized (DS18B20, TDS, pH, Turbidity, HW-03)");
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
    // HW-03 Water Sensor
    int rawWater = analogRead(WATER_SENSOR_PIN);
    waterPercent = map(rawWater, DRY_VALUE, WET_VALUE, 0, 100);
    waterPercent = constrain(waterPercent, 0, 100);

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
    wsClient.enableHeartbeat(15000, 3000, 2); // ping every 15s

    if (WS_SECURE) {
        wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
        // Note: To validate TLS, set CA cert/fingerprint via library-specific APIs.
    } else {
        wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
    }

    Serial.println("Initializing WebSocket client...");
}

void wsEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            wsConnected = true;
            Serial.println("[WS] Connected to server");
            sendHandshake();
            break;
        case WStype_DISCONNECTED:
            wsConnected = false;
            Serial.println("[WS] Disconnected");
            break;
        case WStype_TEXT: {
            String msg = String((char*)payload).substring(0, length);
            Serial.printf("[WS] Message: %s\n", msg.c_str());
            // Try parse JSON
            StaticJsonDocument<256> doc;
            DeserializationError err = deserializeJson(doc, msg);
            if (!err) {
                const char* action = doc["action"] | "";
                if (String(action) == "reset_wifi") {
                    Serial.println("[WS] Received reset_wifi command -> clearing prefs and restarting provisioning...");
                    clearPreferences();
                    // Soft restart into provisioning mode
                    WiFi.disconnect(true);
                    delay(500);
                    ESP.restart();
                }
            }
            break;
        }
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
    wsClient.sendTXT(out);
}

void sendSensorData() {
    if (!wsConnected) {
        return;
    }
    // Build payload per backend consumer expectations
    StaticJsonDocument<512> doc;
    doc["type"] = "sensor_data";
    doc["device_serial"] = DEVICE_SERIAL;
    JsonObject data = doc.createNestedObject("data");
    data["water_level"] = waterPercent;        // %
    data["water_temp"] = waterTempC;           // °C
    data["tds"] = tdsValue;                    // ppm
    data["ph"] = phValue;                      // pH
    data["turbidity"] = voltageTurb;           // report voltage or map to NTU if calibrated
    // Optional EC approximation (mS/cm); requires calibration
    data["ec"] = tdsValue / 640.0;             // rough estimate

    String out;
    serializeJson(doc, out);
    wsClient.sendTXT(out);

    // Log to serial
    Serial.println("========== SENSOR READINGS ==========");
    Serial.printf("Water Level   : %d%%\n", waterPercent);
    Serial.printf("Water Temp    : %.2f °C\n", waterTempC);
    Serial.printf("TDS           : %.0f ppm\n", tdsValue);
    Serial.printf("pH            : %.2f\n", phValue);
    Serial.printf("Turbidity V   : %.2f V (%s)\n", voltageTurb, getTurbidityStatus(rawTurb).c_str());
    Serial.println("======================================\n");
}

void startNormalOperation() {
    Serial.println("\n=== Starting Normal Operation ===");
    initSensors();
    initWebSocket();
}
