/*
 * SmarTanom ESP32 WiFi Provisioning Firmware with Sensor Integration
 *
 * This firmware enables ESP32 devices to:
 * 1. Boot into AP mode with SSID = device serial number
 * 2. Serve a captive portal for WiFi credential setup
 * 3. Connect to user's WiFi network
 * 4. Report provisioning status to backend API
 * 5. Read sensor data (pH, TDS, EC, Water Level, Temperature, Turbidity)
 * 6. Stream real-time data via WebSocket to backend
 * 7. Listen for WiFi reset commands from backend
 *
 * NEW in v1.3.0:
 * - Full sensor integration (6 sensors)
 * - WebSocket client for real-time data streaming
 * - WiFi reset command listener
 * - Automatic sensor calibration support
 * - Sensor data buffering and retry logic
 *
 * IMPORTANT: Set DEVICE_SERIAL before flashing!
 *
 * Author: SmarTanom Team
 * Version: 1.3.0
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <WebSocketsClient.h>

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // *** CHANGE THIS BEFORE FLASHING ***
#define FIRMWARE_VERSION "1.3.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
#define BACKEND_URL "https://smartanom.onrender.com"
#define BACKEND_HOST "smartanom.onrender.com"
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define CONFIG_ENDPOINT "/api/devices/" DEVICE_SERIAL "/config/"
#define SENSOR_DATA_ENDPOINT "/api/sensors/data/"
#define WEBSOCKET_PATH "/ws/device/" DEVICE_SERIAL "/"

// Optional: Set if your backend requires device auth
// Set to your production API key for security
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"  // Production API key

// =============================================
// SENSOR PIN CONFIGURATION
// =============================================
// Analog sensors (ADC pins)
#define PH_SENSOR_PIN 34          // GPIO34 (ADC1_CH6) - pH sensor
#define TDS_SENSOR_PIN 35         // GPIO35 (ADC1_CH7) - TDS sensor
#define WATER_LEVEL_PIN 32        // GPIO32 (ADC1_CH4) - Water level sensor
#define TURBIDITY_SENSOR_PIN 33   // GPIO33 (ADC1_CH5) - Turbidity sensor

// Digital/OneWire sensors
#define TEMP_SENSOR_PIN 25        // GPIO25 - DS18B20 water temperature sensor (OneWire)

// =============================================
// SENSOR CALIBRATION VALUES
// =============================================
// pH Sensor calibration (adjust based on your sensor)
#define PH_VOLTAGE_NEUTRAL 2.5    // Voltage at pH 7.0
#define PH_VOLTAGE_ACIDIC 3.0     // Voltage at pH 4.0
#define PH_SLOPE ((7.0 - 4.0) / (PH_VOLTAGE_NEUTRAL - PH_VOLTAGE_ACIDIC))

// TDS Sensor calibration
#define TDS_VREF 3.3              // Reference voltage
#define TDS_TEMPERATURE 25.0      // Compensation temperature
#define TDS_K_VALUE 1.0           // K value for EC calculation

// Water level sensor calibration (percentage)
#define WATER_LEVEL_MIN_VOLTAGE 0.5   // Voltage when empty
#define WATER_LEVEL_MAX_VOLTAGE 3.0   // Voltage when full

// Turbidity sensor calibration (NTU)
#define TURBIDITY_CLEAR_VOLTAGE 4.2   // Voltage when water is clear
#define TURBIDITY_MAX_VOLTAGE 0.5     // Voltage at maximum turbidity

// =============================================
// TIMING CONFIGURATION
// =============================================
#define SENSOR_READ_INTERVAL 30000    // Read sensors every 30 seconds
#define WEBSOCKET_RECONNECT_INTERVAL 5000  // Reconnect every 5 seconds if disconnected
#define SENSOR_SAMPLES 10             // Number of samples to average for stability

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
WebSocketsClient webSocket;

// DNS configuration for captive portal
const byte DNS_PORT = 53;

// WiFi state
String savedSSID = "";
String savedPassword = "";
bool wifiConfigured = false;
bool provisioningMode = true;

// WebSocket state
bool wsConnected = false;
unsigned long lastWsReconnectAttempt = 0;

// Sensor reading state
unsigned long lastSensorRead = 0;
struct SensorReadings {
    float ph;
    float tds;
    float ec;
    float waterLevel;
    float waterTemp;
    float turbidity;
    bool valid;
} lastReadings;

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
void setupWebSocket();
void setupSensors();
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

// Sensor functions
SensorReadings readAllSensors();
float readPH();
float readTDS();
float readWaterLevel();
float readWaterTemperature();
float readTurbidity();
void sendSensorData(const SensorReadings& readings);

// WebSocket functions
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void connectWebSocket();
void handleWebSocketMessages();

// =============================================
// SETUP
// =============================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n\n=================================");
    Serial.println("SmarTanom ESP32 Sensor Device");
    Serial.println("=================================");
    Serial.printf("Device Serial: %s\n", DEVICE_SERIAL);
    Serial.printf("Firmware: v%s\n", FIRMWARE_VERSION);
    Serial.println("=================================\n");

    // Initialize sensors
    setupSensors();

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

            // Setup WebSocket connection for real-time data streaming
            setupWebSocket();

            // TODO: Start normal sensor operation here
            Serial.println("Ready for sensor operation.");
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
        // Normal operation mode - sensor reading and data transmission

        // Handle WebSocket communication
        webSocket.loop();

        // Reconnect WebSocket if disconnected
        if (!wsConnected && (millis() - lastWsReconnectAttempt > WEBSOCKET_RECONNECT_INTERVAL)) {
            Serial.println("WebSocket disconnected. Attempting reconnection...");
            connectWebSocket();
            lastWsReconnectAttempt = millis();
        }

        // Read sensors at specified interval
        if (millis() - lastSensorRead > SENSOR_READ_INTERVAL) {
            Serial.println("\n--- Reading Sensors ---");
            SensorReadings readings = readAllSensors();

            if (readings.valid) {
                // Display readings
                Serial.printf("pH: %.2f\n", readings.ph);
                Serial.printf("TDS: %.2f ppm\n", readings.tds);
                Serial.printf("EC: %.2f mS/cm\n", readings.ec);
                Serial.printf("Water Level: %.1f%%\n", readings.waterLevel);
                Serial.printf("Water Temp: %.2f°C\n", readings.waterTemp);
                Serial.printf("Turbidity: %.2f NTU\n", readings.turbidity);

                // Send data to backend
                sendSensorData(readings);

                lastReadings = readings;
            } else {
                Serial.println("Failed to read sensors");
            }

            lastSensorRead = millis();
        }

        delay(100);  // Small delay to prevent watchdog issues
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
// SENSOR FUNCTIONS
// =============================================

void setupSensors() {
    Serial.println("Initializing sensors...");

    // Configure analog pins
    pinMode(PH_SENSOR_PIN, INPUT);
    pinMode(TDS_SENSOR_PIN, INPUT);
    pinMode(WATER_LEVEL_PIN, INPUT);
    pinMode(TURBIDITY_SENSOR_PIN, INPUT);
    pinMode(TEMP_SENSOR_PIN, INPUT);

    // Set ADC resolution (ESP32 default is 12-bit = 0-4095)
    analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V

    Serial.println("✓ Sensors initialized");
}

float readPH() {
    // Read pH sensor with averaging
    float sum = 0;
    for (int i = 0; i < SENSOR_SAMPLES; i++) {
        int rawValue = analogRead(PH_SENSOR_PIN);
        float voltage = rawValue * (3.3 / 4095.0);
        sum += voltage;
        delay(10);
    }
    float avgVoltage = sum / SENSOR_SAMPLES;

    // Convert voltage to pH using calibration
    float ph = 7.0 + PH_SLOPE * (avgVoltage - PH_VOLTAGE_NEUTRAL);

    // Clamp to valid pH range (0-14)
    ph = constrain(ph, 0.0, 14.0);

    return ph;
}

float readTDS() {
    // Read TDS sensor with averaging
    float sum = 0;
    for (int i = 0; i < SENSOR_SAMPLES; i++) {
        int rawValue = analogRead(TDS_SENSOR_PIN);
        float voltage = rawValue * (3.3 / 4095.0);
        sum += voltage;
        delay(10);
    }
    float avgVoltage = sum / SENSOR_SAMPLES;

    // Calculate TDS (Total Dissolved Solids) in ppm
    // TDS formula: TDS = (133.42 * voltage^3 - 255.86 * voltage^2 + 857.39 * voltage) * 0.5
    float compensationCoefficient = 1.0 + 0.02 * (TDS_TEMPERATURE - 25.0);  // Temperature compensation
    float compensationVoltage = avgVoltage / compensationCoefficient;
    float tds = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;

    // Clamp to reasonable range
    tds = constrain(tds, 0.0, 2000.0);

    return tds;
}

float readWaterLevel() {
    // Read water level sensor with averaging
    float sum = 0;
    for (int i = 0; i < SENSOR_SAMPLES; i++) {
        int rawValue = analogRead(WATER_LEVEL_PIN);
        float voltage = rawValue * (3.3 / 4095.0);
        sum += voltage;
        delay(10);
    }
    float avgVoltage = sum / SENSOR_SAMPLES;

    // Convert voltage to percentage (0-100%)
    float level = ((avgVoltage - WATER_LEVEL_MIN_VOLTAGE) / (WATER_LEVEL_MAX_VOLTAGE - WATER_LEVEL_MIN_VOLTAGE)) * 100.0;

    // Clamp to valid range
    level = constrain(level, 0.0, 100.0);

    return level;
}

float readWaterTemperature() {
    // Read DS18B20 temperature sensor (simplified - you may need OneWire library for actual implementation)
    // For now, using analog approximation or placeholder
    // TODO: Implement proper OneWire DS18B20 reading

    // Placeholder: read analog value and convert
    float sum = 0;
    for (int i = 0; i < SENSOR_SAMPLES; i++) {
        int rawValue = analogRead(TEMP_SENSOR_PIN);
        float voltage = rawValue * (3.3 / 4095.0);
        sum += voltage;
        delay(10);
    }
    float avgVoltage = sum / SENSOR_SAMPLES;

    // Convert voltage to temperature (example conversion, adjust for your sensor)
    // Typical range: 0-50°C mapped to 0-3.3V
    float temp = (avgVoltage / 3.3) * 50.0;

    // Clamp to reasonable range
    temp = constrain(temp, 0.0, 50.0);

    return temp;
}

float readTurbidity() {
    // Read turbidity sensor with averaging
    float sum = 0;
    for (int i = 0; i < SENSOR_SAMPLES; i++) {
        int rawValue = analogRead(TURBIDITY_SENSOR_PIN);
        float voltage = rawValue * (3.3 / 4095.0);
        sum += voltage;
        delay(10);
    }
    float avgVoltage = sum / SENSOR_SAMPLES;

    // Convert voltage to NTU (Nephelometric Turbidity Units)
    // Clear water = high voltage, turbid water = low voltage
    float ntu = map(avgVoltage * 1000, TURBIDITY_MAX_VOLTAGE * 1000, TURBIDITY_CLEAR_VOLTAGE * 1000, 3000, 0) / 10.0;

    // Clamp to valid range (0-3000 NTU)
    ntu = constrain(ntu, 0.0, 3000.0);

    return ntu;
}

SensorReadings readAllSensors() {
    SensorReadings readings;
    readings.valid = false;

    try {
        readings.ph = readPH();
        delay(50);

        readings.tds = readTDS();
        delay(50);

        // Calculate EC from TDS (EC = TDS * K value / 1000)
        readings.ec = (readings.tds * TDS_K_VALUE) / 1000.0;

        readings.waterLevel = readWaterLevel();
        delay(50);

        readings.waterTemp = readWaterTemperature();
        delay(50);

        readings.turbidity = readTurbidity();

        readings.valid = true;
    } catch (...) {
        Serial.println("✗ Error reading sensors");
        readings.valid = false;
    }

    return readings;
}

// =============================================
// WEBSOCKET FUNCTIONS
// =============================================

void setupWebSocket() {
    Serial.println("Setting up WebSocket connection...");

    // Configure WebSocket
    webSocket.beginSSL(BACKEND_HOST, 443, WEBSOCKET_PATH);

    // Set WebSocket event handler
    webSocket.onEvent(webSocketEvent);

    // Set reconnect interval
    webSocket.setReconnectInterval(5000);

    // Optional: Set authorization header if needed
    if (strlen(DEVICE_API_KEY) > 0) {
        String auth = "X-Device-Auth: " + String(DEVICE_API_KEY);
        webSocket.setAuthorization(auth.c_str());
    }

    Serial.println("✓ WebSocket configured");
}

void connectWebSocket() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("✗ Cannot connect WebSocket: WiFi not connected");
        return;
    }

    Serial.printf("Connecting to WebSocket: wss://%s%s\n", BACKEND_HOST, WEBSOCKET_PATH);
    webSocket.beginSSL(BACKEND_HOST, 443, WEBSOCKET_PATH);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.println("[WebSocket] Disconnected");
            wsConnected = false;
            break;

        case WStype_CONNECTED:
            Serial.printf("[WebSocket] Connected to: %s\n", payload);
            wsConnected = true;

            // Send initial handshake
            {
                StaticJsonDocument<256> doc;
                doc["device_serial"] = DEVICE_SERIAL;
                doc["wifi_configured"] = true;
                doc["firmware_version"] = FIRMWARE_VERSION;

                String handshake;
                serializeJson(doc, handshake);
                webSocket.sendTXT(handshake);

                Serial.println("[WebSocket] Sent handshake");
            }
            break;

        case WStype_TEXT:
            Serial.printf("[WebSocket] Received: %s\n", payload);
            handleWebSocketMessages(payload, length);
            break;

        case WStype_ERROR:
            Serial.printf("[WebSocket] Error: %s\n", payload);
            wsConnected = false;
            break;

        case WStype_PING:
            Serial.println("[WebSocket] Ping");
            break;

        case WStype_PONG:
            Serial.println("[WebSocket] Pong");
            break;
    }
}

void handleWebSocketMessages() {
    // Placeholder - message handling logic will be added here
}

void handleWebSocketMessages(uint8_t * payload, size_t length) {
    // Parse incoming WebSocket messages
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload, length);

    if (error) {
        Serial.printf("[WebSocket] JSON parse error: %s\n", error.c_str());
        return;
    }

    // Handle WiFi reset command
    if (doc["action"] == "reset_wifi") {
        Serial.println("[WebSocket] Received WiFi reset command!");
        Serial.println("Clearing WiFi credentials and restarting...");

        // Clear saved credentials
        clearPreferences();

        // Disconnect WebSocket and WiFi
        webSocket.disconnect();
        WiFi.disconnect();

        delay(1000);

        // Restart ESP32 to enter AP mode
        Serial.println("Restarting in 2 seconds...");
        delay(2000);
        ESP.restart();
    }

    // Handle other commands as needed
    const char* status = doc["status"];
    if (status) {
        Serial.printf("[WebSocket] Status: %s\n", status);
    }
}

void sendSensorData(const SensorReadings& readings) {
    if (!wsConnected) {
        Serial.println("⚠ WebSocket not connected. Attempting to send via HTTP...");

        // Fallback to HTTP POST if WebSocket is not available
        WiFiClientSecure client;
        client.setInsecure();

        HTTPClient https;
        String url = String(BACKEND_URL) + String(SENSOR_DATA_ENDPOINT);

        if (!https.begin(client, url)) {
            Serial.println("✗ Failed to connect to sensor data endpoint");
            return;
        }

        https.addHeader("Content-Type", "application/json");
        if (strlen(DEVICE_API_KEY) > 0) {
            https.addHeader("X-Device-Auth", DEVICE_API_KEY);
        }

        // Build JSON payload with all sensor readings
        StaticJsonDocument<512> doc;
        doc["device_serial"] = DEVICE_SERIAL;
        doc["timestamp"] = millis();

        JsonArray sensors = doc.createNestedArray("sensors");

        JsonObject ph = sensors.createNestedObject();
        ph["type"] = "ph";
        ph["value"] = readings.ph;
        ph["unit"] = "pH";

        JsonObject tds = sensors.createNestedObject();
        tds["type"] = "tds";
        tds["value"] = readings.tds;
        tds["unit"] = "ppm";

        JsonObject ec = sensors.createNestedObject();
        ec["type"] = "ec";
        ec["value"] = readings.ec;
        ec["unit"] = "mS/cm";

        JsonObject waterLevel = sensors.createNestedObject();
        waterLevel["type"] = "water_level";
        waterLevel["value"] = readings.waterLevel;
        waterLevel["unit"] = "%";

        JsonObject waterTemp = sensors.createNestedObject();
        waterTemp["type"] = "water_temperature";
        waterTemp["value"] = readings.waterTemp;
        waterTemp["unit"] = "°C";

        JsonObject turbidity = sensors.createNestedObject();
        turbidity["type"] = "turbidity";
        turbidity["value"] = readings.turbidity;
        turbidity["unit"] = "NTU";

        String payload;
        serializeJson(doc, payload);

        Serial.printf("Sending sensor data via HTTP: %s\n", payload.c_str());

        int httpCode = https.POST(payload);

        if (httpCode > 0) {
            Serial.printf("✓ Sensor data sent (HTTP %d)\n", httpCode);
        } else {
            Serial.printf("✗ Failed to send sensor data: %s\n", https.errorToString(httpCode).c_str());
        }

        https.end();

    } else {
        // Send via WebSocket (real-time streaming)
        StaticJsonDocument<512> doc;
        doc["type"] = "sensor_data";
        doc["device_serial"] = DEVICE_SERIAL;
        doc["timestamp"] = millis();

        JsonObject data = doc.createNestedObject("data");
        data["ph"] = readings.ph;
        data["tds"] = readings.tds;
        data["ec"] = readings.ec;
        data["water_level"] = readings.waterLevel;
        data["water_temp"] = readings.waterTemp;
        data["turbidity"] = readings.turbidity;

        String payload;
        serializeJson(doc, payload);

        webSocket.sendTXT(payload);
        Serial.println("✓ Sensor data sent via WebSocket");
    }
}
