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
 * NEW in v1.1.0:
 * - Auto-retry on WiFi connection failure
 * - Credential clearing on wrong password
 * - ESP32 auto-restart to re-enter AP mode
 * - Auto-redirect to dashboard on success
 * - Improved error feedback with countdown timers
 *
 * IMPORTANT: Set DEVICE_SERIAL before flashing!
 *
 * Author: SmarTanom Team
 * Version: 1.1.0
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <	ArduinoJson.h>

// =============================================
// DEVICE CONFIGURATION - SET BEFORE FLASHING
// =============================================
#define DEVICE_SERIAL "SMRT-0RE-ZQ8"  // *** CHANGE THIS BEFORE FLASHING ***
#define FIRMWARE_VERSION "1.1.0"

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

            // TODO: Start normal sensor operation here
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
    html += "<h1><span class='icon'>📶</span>WiFi Setup</h1>";
    html += "<div class='device-serial'>Device: " + String(DEVICE_SERIAL) + "</div>";
    html += "<div class='info'><span class='icon'>💡</span>Select your WiFi network and enter the password to connect your device to the internet.</div>";
    html += "<form action='/connect' method='POST'>";
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
    html += "<button type='submit'>Connect to WiFi</button>";
    html += "</form>";
    html += FPSTR(HTML_FOOT);

    server.send(200, "text/html", html);
}

void handleConnect() {
    Serial.println("Received connection request...");

    if (!server.hasArg("ssid") || !server.hasArg("password")) {
        String html = FPSTR(HTML_HEAD);
        html += "<h1><span class='icon'>⚠️</span>Error</h1>";
        html += "<div class='status error'><strong>Missing Information!</strong><br>Both WiFi network and password are required.</div>";
        html += "<br><a href='/'><button>← Try Again</button></a>";
        html += FPSTR(HTML_FOOT);
        server.send(400, "text/html", html);
        return;
    }

    String ssid = server.arg("ssid");
    String password = server.arg("password");

    Serial.printf("Attempting to connect to: %s\n", ssid.c_str());

    // Send intermediate response
    String html = FPSTR(HTML_HEAD);
    html += "<h1><span class='icon'>⏳</span>Connecting...</h1>";
    html += "<div class='device-serial'>Network: " + ssid + "</div>";
    html += "<div class='info'><span class='spinner'></span>Connecting to WiFi network. This may take up to 30 seconds...</div>";
    html += "<script>setTimeout(function(){ window.location='/status'; }, 15000);</script>";
    html += FPSTR(HTML_FOOT);
    server.send(200, "text/html", html);

    // Attempt connection
    delay(100);  // Let response send

    if (connectToWiFi(ssid, password)) {
        Serial.println("✓ WiFi connection successful!");

        // Save credentials
        savePreferences(ssid, password);

        // Wake up backend first
        Serial.println("\n--- Preparing to report to backend ---");
        wakeUpBackend();
        delay(2000);  // Give backend time to wake up

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

        // Clear saved credentials (wrong password)
        Serial.println("Clearing saved WiFi credentials...");
        clearPreferences();

        // Wake up backend first (even for failure reporting)
        wakeUpBackend();
        delay(1000);

        reportProvisionStatus("failed");

        // Restart AP mode for retry
        Serial.println("Restarting AP mode for retry...");
        provisioningMode = true;
        wifiConfigured = false;

        // Restart the ESP32 to cleanly re-enter provisioning mode
        delay(2000);
        Serial.println("Restarting ESP32...");
        ESP.restart();
    }
}

void handleStatus() {
    Serial.println("Status check requested...");

    String html = FPSTR(HTML_HEAD);
    html += "<h1><span class='icon'>📊</span>Connection Status</h1>";
    html += "<div class='device-serial'>" + String(DEVICE_SERIAL) + "</div>";

    if (wifiConfigured && WiFi.status() == WL_CONNECTED) {
        html += "<div class='status success'>";
        html += "<span class='icon'>✅</span><strong>Successfully Connected!</strong><br><br>";
        html += "📡 Network: <strong>" + savedSSID + "</strong><br>";
        html += "🌐 IP Address: <strong>" + WiFi.localIP().toString() + "</strong><br>";
        html += "📶 Signal: <strong>" + String(WiFi.RSSI()) + " dBm</strong><br><br>";
        html += "Your SmarTanom device is now online and will appear in your dashboard shortly.<br><br>";
        html += "<div class='info'>🔄 Redirecting to dashboard in 3 seconds...</div>";
        html += "</div>";
        // Auto-redirect to dashboard after 3 seconds
        html += "<script>setTimeout(function(){ window.location.href='http://localhost:5173/dashboard'; }, 3000);</script>";
    } else {
        html += "<div class='status error'>";
        html += "<span class='icon'>❌</span><strong>Connection Failed</strong><br><br>";
        html += "Unable to connect to the WiFi network.<br>";
        html += "This is usually caused by an <strong>incorrect password</strong>.<br><br>";
        html += "📱 The device will restart and you can try again.<br>";
        html += "<div class='info'>🔄 Restarting in 5 seconds...</div>";
        html += "</div>";
        // Auto-restart to allow retry (credentials already cleared)
        html += "<script>setTimeout(function(){ alert('Device restarting. Please reconnect to WiFi: " + String(DEVICE_SERIAL) + "'); }, 5000);</script>";
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
