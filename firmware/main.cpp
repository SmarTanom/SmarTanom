// main.cpp - SmarTanom WiFi Setup + WebSocket Integration (merge-friendly)
// Admin: set DEVICE_SERIAL before flashing
// Branding: SMRT-SVI-SRM-xxxxx (e.g., SMRT-SVI-SRM-00123)
#define DEVICE_SERIAL "SMRT-SVI-SRM-00123" // <-- edit before upload

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include <WebSocketsClient.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// Required libraries (install via Library Manager / PlatformIO):
// - ESPAsyncWebServer (requires AsyncTCP on ESP32)
// - Links2004/WebSockets (WebSocketsClient)
// - ArduinoJson
// - Preferences is part of the ESP32 Arduino core

// ------------------- Config -------------------
static const char* AP_PASSWORD = "smartanom123"; // optional password for setup AP
static const char* BACKEND_HOST = "smartanom.onrender.com"; // Render backend host
static const uint16_t BACKEND_PORT = 443;                     // wss
static const unsigned long SENSOR_SEND_INTERVAL_MS = 10000UL; // 10s
static const unsigned long WEBSOCKET_RETRY_MS = 10000UL;      // retry WS every 10s
static const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000UL; // 30s WiFi connect timeout
static const unsigned long WS_FAILOVER_MS = 120000UL;         // 2 min without WS -> fall back to AP

// Preferences namespace/keys
// Use same NVS namespace/keys as existing .ino for compatibility
static const char* PREF_NS = "smartanom";
static const char* PREF_KEY_SSID = "wifi_ssid";
static const char* PREF_KEY_PASS = "wifi_pass";
static const char* PREF_KEY_SAVED = "wifi_saved";

Preferences preferences;
AsyncWebServer server(80);
WebSocketsClient webSocket;

enum ConnState {
  STATE_NO_CRED,
  STATE_AP,
  STATE_STA_CONNECTING,
  STATE_STA_CONNECTED,
  STATE_WS_CONNECTED
};
static ConnState currentState = STATE_NO_CRED;

static String saved_ssid;
static String saved_pass;

static unsigned long lastSensorSend = 0;
static unsigned long lastWSRetry = 0;
static unsigned long wifiConnectStart = 0;
static unsigned long wsConnectWindowStart = 0; // track total time attempting WS
static unsigned long wifiLostSince = 0;        // detect persistent WiFi loss

// Forward declarations
static void startAPMode();
static void stopAPMode();
static void startSTAFromSaved();
static void clearCredentials();
static void connectToWebSocket();
static void sendHandshake();
static void sendSensorPayload();
static void handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
static void setupAPRoutes();
static String buildWebSocketPath();

// ------------------- Setup -------------------
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("SmarTanom booting...");
  Serial.print("Device serial: ");
  Serial.println(DEVICE_SERIAL);

  preferences.begin(PREF_NS, false);
  saved_ssid = preferences.getString(PREF_KEY_SSID, "");
  saved_pass = preferences.getString(PREF_KEY_PASS, "");

  // Initialize state based on stored credentials
  if (saved_ssid.length() > 0) {
    Serial.println("Found stored credentials; attempting STA connect...");
    currentState = STATE_STA_CONNECTING;
    wifiConnectStart = millis();
    WiFi.mode(WIFI_STA);
    WiFi.begin(saved_ssid.c_str(), saved_pass.c_str());
  } else {
    Serial.println("No stored credentials - entering AP mode");
    currentState = STATE_AP;
    startAPMode();
  }

  // WebSocket callbacks (connection attempts will be initiated after WiFi connects)
  webSocket.onEvent(handleWebSocketEvent);
  webSocket.setReconnectInterval(0); // we will manage retry logic
}

// ------------------- Loop (non-blocking) -------------------
void loop() {
  // WiFi STA connection management
  if (currentState == STATE_STA_CONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected: ");
      Serial.println(WiFi.localIP());
      currentState = STATE_STA_CONNECTED;
      wsConnectWindowStart = millis();
      connectToWebSocket();
    } else if (millis() - wifiConnectStart > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("WiFi connect timeout. Clearing credentials and returning to AP mode.");
      clearCredentials();
      startAPMode();
      currentState = STATE_AP;
    }
  }

  // WebSocket service when STA connected
  if (currentState == STATE_STA_CONNECTED || currentState == STATE_WS_CONNECTED) {
    webSocket.loop();

    // Retry WS connection periodically when not connected
    if (currentState == STATE_STA_CONNECTED && (millis() - lastWSRetry >= WEBSOCKET_RETRY_MS)) {
      lastWSRetry = millis();
      connectToWebSocket();
    }

    // Failover to AP if WS hasn't connected within window
    if (currentState == STATE_STA_CONNECTED && (millis() - wsConnectWindowStart > WS_FAILOVER_MS)) {
      Serial.println("WebSocket failed to connect persistently. Clearing credentials and reverting to AP mode.");
      clearCredentials();
      stopAPMode(); // in case running
      startAPMode();
      currentState = STATE_AP;
    }
  }

  // Detect persistent WiFi loss even after initial connection
  if ((currentState == STATE_STA_CONNECTED || currentState == STATE_WS_CONNECTED)) {
    if (WiFi.status() != WL_CONNECTED) {
      if (wifiLostSince == 0) wifiLostSince = millis();
      if (millis() - wifiLostSince > WIFI_CONNECT_TIMEOUT_MS) {
        Serial.println("WiFi lost persistently. Clearing credentials and reverting to AP mode.");
        clearCredentials();
        stopAPMode();
        startAPMode();
        currentState = STATE_AP;
        wifiLostSince = 0;
      }
    } else {
      wifiLostSince = 0; // reset when WiFi is healthy
    }
  }

  // Periodic sensor payloads only when WS is connected
  if (currentState == STATE_WS_CONNECTED && millis() - lastSensorSend >= SENSOR_SEND_INTERVAL_MS) {
    lastSensorSend = millis();
    sendSensorPayload();
  }
}

// ------------------- AP mode -------------------
static void startAPMode() {
  Serial.println("Starting AP mode...");
  WiFi.mode(WIFI_AP);
  String apName = String("SmarTanom_Setup_") + DEVICE_SERIAL;
  bool ok = WiFi.softAP(apName.c_str(), AP_PASSWORD);
  IPAddress ip = WiFi.softAPIP();
  Serial.printf("AP %s started (%s). IP: %s\n", apName.c_str(), ok ? "ok" : "failed", ip.toString().c_str());

  setupAPRoutes();
  server.begin();
}

static void stopAPMode() {
  server.end();
  WiFi.softAPdisconnect(true);
}

// ------------------- AP HTTP routes -------------------
static void setupAPRoutes() {
  // GET /scan -> JSON array of SSIDs
  server.on("/scan", HTTP_GET, [](AsyncWebServerRequest* request) {
    int n = WiFi.scanNetworks();
    DynamicJsonDocument doc(2048);
    JsonArray arr = doc.to<JsonArray>();
    for (int i = 0; i < n; ++i) {
      arr.add(WiFi.SSID(i));
    }
    WiFi.scanDelete();
    String out; serializeJson(doc, out);
    request->send(200, "application/json", out);
  });

  // POST /connect -> {"ssid":"...","password":"..."}
  server.on("/connect", HTTP_POST,
    // onRequest - no-op; body handled in onBody
    [](AsyncWebServerRequest* request) {},
    // onUpload (unused)
    NULL,
    // onBody - parse and initiate connection
      [](AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
        static String body; // safe for single concurrent request during setup
        if (index == 0) {
          body = "";
          body.reserve(total + 1);
        }
        body.concat((const char*)data, len);

        if (index + len < total) return; // wait for full body

        DynamicJsonDocument doc(512);
        DeserializationError err = deserializeJson(doc, body);
        body = ""; // clear for next request
        if (err) {
          request->send(400, "application/json", "{\"result\":\"error\",\"message\":\"invalid json\"}");
          return;
        }
        const char* ssid = doc["ssid"] | "";
        const char* password = doc["password"] | "";
        if (strlen(ssid) == 0) {
          request->send(400, "application/json", "{\"result\":\"error\",\"message\":\"missing ssid\"}");
          return;
        }

        // Respond immediately
        request->send(200, "application/json", "{\"result\":\"ok\"}");

        Serial.printf("Received WiFi connect request: SSID='%s'\n", ssid);
        saved_ssid = String(ssid);
        saved_pass = String(password);
        preferences.putString(PREF_KEY_SSID, saved_ssid);
        preferences.putString(PREF_KEY_PASS, saved_pass);
        preferences.putBool(PREF_KEY_SAVED, true);

        // Switch to STA and attempt connect (non-blocking)
        stopAPMode();
        WiFi.mode(WIFI_STA);
        WiFi.begin(saved_ssid.c_str(), saved_pass.c_str());
        wifiConnectStart = millis();
        currentState = STATE_STA_CONNECTING;
  );

  // GET /status -> {"status":"connecting"|"connected"|"failed"}
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest* request) {
    const char* statusStr = "failed"; // default
    if (currentState == STATE_STA_CONNECTING) statusStr = "connecting";
    else if (currentState == STATE_STA_CONNECTED || currentState == STATE_WS_CONNECTED) statusStr = "connected";
    // In AP mode or no creds -> treat as failed per spec

    DynamicJsonDocument doc(128);
    doc["status"] = statusStr;
    String out; serializeJson(doc, out);
    request->send(200, "application/json", out);
  });
}

// ------------------- STA / WebSocket -------------------
static void startSTAFromSaved() {
  if (saved_ssid.isEmpty()) return;
  Serial.println("Starting STA from saved credentials...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(saved_ssid.c_str(), saved_pass.c_str());
  wifiConnectStart = millis();
  currentState = STATE_STA_CONNECTING;
}

static void clearCredentials() {
  Serial.println("Clearing saved WiFi credentials...");
  preferences.remove(PREF_KEY_SSID);
  preferences.remove(PREF_KEY_PASS);
  preferences.remove(PREF_KEY_SAVED);
  saved_ssid = "";
  saved_pass = "";
}

static String buildWebSocketPath() {
  String path = "/ws/device/";
  path += DEVICE_SERIAL;
  path += "/";
  return path;
}

static void connectToWebSocket() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected; skipping WS connect");
    return;
  }
  String path = buildWebSocketPath();
  Serial.printf("Connecting to WS: wss://%s%s\n", BACKEND_HOST, path.c_str());

  // beginSSL(host, port, urlPath, protocol)
  webSocket.beginSSL(BACKEND_HOST, BACKEND_PORT, path.c_str(), "");
  webSocket.setReconnectInterval(0); // manual retry
}

static void sendHandshake() {
  DynamicJsonDocument doc(256);
  doc["device_serial"] = DEVICE_SERIAL;
  doc["status"] = "connected";
  doc["firmware_version"] = "v1.0.0";
  String out; serializeJson(doc, out);
  webSocket.sendTXT(out);
}

// Replace the dummy readings with your existing sensor functions.
// Keep it fast and non-blocking.
static void sendSensorPayload() {
  // TODO: YOUR SENSOR READINGS HERE
  float temp = 25.4;   // e.g., readTemperature()
  float ph = 6.9;      // e.g., readPH()
  int tds = 430;       // e.g., readTDSppm()
  int humidity = 72;   // e.g., readHumidity()

  DynamicJsonDocument doc(256);
  doc["device_serial"] = DEVICE_SERIAL;
  doc["temp"] = temp;
  doc["ph"] = ph;
  doc["tds"] = tds;
  doc["humidity"] = humidity;
  String out; serializeJson(doc, out);
  webSocket.sendTXT(out);
  Serial.println(String("Sent sensor payload: ") + out);
}

static void handleWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WS disconnected");
      currentState = STATE_STA_CONNECTED; // back to WiFi-connected state
      lastWSRetry = 0; // allow immediate retry
      break;
    case WStype_CONNECTED:
      Serial.println("WS connected");
      currentState = STATE_WS_CONNECTED;
      sendHandshake();
      break;
    case WStype_TEXT: {
      String msg((char*)payload, length);
      Serial.print("WS msg: ");
      Serial.println(msg);
      // TODO: parse and handle commands from server if needed
      break;
    }
    case WStype_ERROR:
      Serial.println("WS error event");
      break;
    default:
      break;
  }
}

// ------------------- Notes -------------------
// - This file is designed to be merged without removing your existing sensor code.
// - Integrate your sensor read functions into sendSensorPayload().
// - Admin must set DEVICE_SERIAL before flashing.
// - On first boot without saved WiFi, device exposes an AP named:
//   SmarTanom_Setup_<DEVICE_SERIAL> with password 'smartanom123'.
// - Setup endpoints (AP mode):
//   GET  /scan      -> ["ssid1","ssid2",...]
//   POST /connect   -> {"ssid":"...","password":"..."} -> {result: "ok"}
//   GET  /status    -> {"status":"connecting|connected|failed"}
// - After WiFi connects, device opens WebSocket to:
//   wss://smartanom.onrender.com/ws/device/<DEVICE_SERIAL>/
//   and sends handshake JSON on connect.
// - Sensor payloads are sent every 10s only when WS is connected.
// - On persistent WiFi/WS failure, credentials are cleared and AP mode resumes.
