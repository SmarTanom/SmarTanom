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
 * IMPORTANT: Set DEVICE_SERIAL before flashing!
 *
 * Author: SmarTanom Team
 * Version: 1.0.0
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // *** CHANGE THIS BEFORE FLASHING ***
#define FIRMWARE_VERSION "1.0.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
#define BACKEND_URL "https://smartanom-backend.onrender.com"
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define CONFIG_ENDPOINT "/api/devices/" DEVICE_SERIAL "/config/"

// Optional: Set if your backend requires device auth
// Set to your production API key for security
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"  // Production API key

// =============================================
// AP CONFIGURATION
// =============================================
#define AP_SSID DEVICE_SERIAL
#define AP_PASSWORD "smartanom123"
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

// WiFi state
String savedSSID = "";
String savedPassword = "";
bool wifiConfigured = false;
bool provisioningMode = true;

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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px 30px;
        }
        h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
            text-align: center;
        }
        .device-serial {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 16px;
        }
        .info {
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            color: #1976D2;
            border-radius: 4px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
            font-size: 14px;
        }
        select, input[type="password"], input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 15px;
            transition: border-color 0.3s;
        }
        select:focus, input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        .status {
            margin-top: 20px;
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
        }
        .status.success {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }
        .status.error {
            background: #ffebee;
            color: #c62828;
            border: 1px solid #f44336;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #999;
        }
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
)rawliteral";

const char HTML_FOOT[] PROGMEM = R"rawliteral(
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

            // Report success to backend
            reportProvisionStatus("connected", WiFi.localIP().toString());

            // TODO: Start normal sensor operation here
            Serial.println("Ready for normal operation.");
            return;
        } else {
            Serial.println("Failed to connect to saved WiFi. Starting provisioning mode.");
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
    Serial.printf("Password: %s\n", AP_PASSWORD);
    Serial.println("Then open: http://192.168.4.1");
    Serial.println("--------------------------------\n");
}

// =============================================
// MAIN LOOP
// =============================================
void loop() {
    if (provisioningMode) {
        server.handleClient();
    } else {
        // Normal operation mode
        // TODO: Add sensor reading and data transmission logic here
        delay(10000);  // Placeholder
    }
}

// =============================================
// WiFi AP SETUP
// =============================================
void setupAP() {
    WiFi.mode(WIFI_AP);

    bool result = WiFi.softAP(AP_SSID, AP_PASSWORD, AP_CHANNEL, AP_HIDDEN, AP_MAX_CLIENTS);

    if (result) {
        Serial.println("✓ Access Point started successfully");
        Serial.printf("  SSID: %s\n", AP_SSID);
        Serial.printf("  Password: %s\n", AP_PASSWORD);
        Serial.printf("  IP: %s\n", WiFi.softAPIP().toString().c_str());
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
    server.onNotFound(handleNotFound);

    server.begin();
    Serial.println("✓ Web server started on port 80");
}

// =============================================
// WEB HANDLERS
// =============================================
void handleRoot() {
    Serial.println("Serving WiFi setup page...");

    String networks = scanNetworks();

    String html = FPSTR(HTML_HEAD);
    html += "<h1>WiFi Setup</h1>";
    html += "<div class='device-serial'>Device: " + String(DEVICE_SERIAL) + "</div>";
    html += "<div class='info'>Select your WiFi network and enter the password to connect your device.</div>";
    html += "<form action='/connect' method='POST'>";
    html += "<div class='form-group'>";
    html += "<label for='ssid'>WiFi Network:</label>";
    html += "<select id='ssid' name='ssid' required>";
    html += "<option value=''>-- Select Network --</option>";
    html += networks;
    html += "</select>";
    html += "</div>";
    html += "<div class='form-group'>";
    html += "<label for='password'>WiFi Password:</label>";
    html += "<input type='password' id='password' name='password' required placeholder='Enter WiFi password'>";
    html += "</div>";
    html += "<button type='submit'>Connect</button>";
    html += "</form>";
    html += FPSTR(HTML_FOOT);

    server.send(200, "text/html", html);
}

void handleConnect() {
    Serial.println("Received connection request...");

    if (!server.hasArg("ssid") || !server.hasArg("password")) {
        String html = FPSTR(HTML_HEAD);
        html += "<h1>Error</h1>";
        html += "<div class='status error'>Missing SSID or password!</div>";
        html += "<a href='/'><button>Try Again</button></a>";
        html += FPSTR(HTML_FOOT);
        server.send(400, "text/html", html);
        return;
    }

    String ssid = server.arg("ssid");
    String password = server.arg("password");

    Serial.printf("Attempting to connect to: %s\n", ssid.c_str());

    // Send intermediate response
    String html = FPSTR(HTML_HEAD);
    html += "<h1>Connecting...</h1>";
    html += "<div class='device-serial'>Network: " + ssid + "</div>";
    html += "<div class='info'><div class='spinner'></div> Connecting to WiFi. Please wait...</div>";
    html += "<script>setTimeout(function(){ window.location='/status'; }, 15000);</script>";
    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);

    // Attempt connection
    delay(100);  // Let response send

    if (connectToWiFi(ssid, password)) {
        Serial.println("✓ WiFi connection successful!");

        // Save credentials
        savePreferences(ssid, password);

        // Report to backend
        String ip = WiFi.localIP().toString();
        reportProvisionStatus("connected", ip);

        // Exit provisioning mode
        provisioningMode = false;
        wifiConfigured = true;

        Serial.println("Provisioning complete. Shutting down AP...");
        delay(2000);
        WiFi.softAPdisconnect(true);

        // TODO: Start normal operation

    } else {
        Serial.println("✗ WiFi connection failed!");
        reportProvisionStatus("failed");
    }
}

void handleStatus() {
    Serial.println("Status check requested...");

    String html = FPSTR(HTML_HEAD);
    html += "<h1>Connection Status</h1>";
    html += "<div class='device-serial'>" + String(DEVICE_SERIAL) + "</div>";

    if (wifiConfigured && WiFi.status() == WL_CONNECTED) {
        html += "<div class='status success'>";
        html += "✓ Successfully connected!<br><br>";
        html += "Network: <strong>" + savedSSID + "</strong><br>";
        html += "IP Address: <strong>" + WiFi.localIP().toString() + "</strong><br><br>";
        html += "Your device is now online and will appear in your dashboard.";
        html += "</div>";
    } else {
        html += "<div class='status error'>";
        html += "✗ Connection failed. Please try again.";
        html += "</div>";
        html += "<br><a href='/'><button>Try Again</button></a>";
    }

    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);
}

void handleNotFound() {
    // Redirect to root for captive portal behavior
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
}

// =============================================
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
bool reportProvisionStatus(const String& status, const String& ipAddress) {
    Serial.printf("Reporting provision status to backend: %s\n", status.c_str());

    if (WiFi.status() != WL_CONNECTED && status == "connected") {
        Serial.println("✗ Cannot report: WiFi not connected");
        return false;
    }

    WiFiClientSecure client;
    client.setInsecure();  // TODO: Replace with proper cert verification

    HTTPClient https;
    String url = String(BACKEND_URL) + String(PROVISION_ENDPOINT);

    Serial.printf("POST %s\n", url.c_str());

    if (!https.begin(client, url)) {
        Serial.println("✗ HTTPS connection failed");
        return false;
    }

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

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.printf("Payload: %s\n", jsonPayload.c_str());

    // Send request
    int httpCode = https.POST(jsonPayload);

    if (httpCode > 0) {
        Serial.printf("✓ Response code: %d\n", httpCode);
        String response = https.getString();
        Serial.printf("Response: %s\n", response.c_str());

        if (httpCode == 200) {
            Serial.println("✓ Provisioning status reported successfully");
            https.end();
            return true;
        }
    } else {
        Serial.printf("✗ Request failed: %s\n", https.errorToString(httpCode).c_str());
    }

    https.end();
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
