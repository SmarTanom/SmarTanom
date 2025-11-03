/*
  Upstash Redis Publisher Example for ESP32

  Publishes sensor readings (JSON) to Upstash Redis via REST Publish endpoint.
  Works with the Django backend subscriber to persist data and update the
  React dashboard in realtime.

  Requires:
    - WiFi credentials
    - Upstash REST URL (no trailing slash)
    - Upstash REST Token (Bearer token)
    - Pub/Sub channel name (must match backend REDIS_PUBSUB_CHANNEL)

  Notes:
    - We use HTTPS with Bearer token.
    - REST PUBLISH endpoint supports URL-encoded message in path; we prefer
      POST with JSON body to avoid path length issues.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>

// ===== Configure these =====
const char* WIFI_SSID     = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

// Upstash REST
// Example: https://us1-warm-thunder-12345.upstash.io
const char* UPSTASH_REST_URL = "https://YOUR-REST-SUBDOMAIN.upstash.io";
const char* UPSTASH_REST_TOKEN = "YOUR_UPSTASH_REDIS_REST_TOKEN";  // Keep secret

// Pub/Sub channel (should match backend REDIS_PUBSUB_CHANNEL)
const char* PUBSUB_CHANNEL = "smartanom:sensors";

WiFiClientSecure httpsClient;

String buildJsonPayload() {
  // Replace these with real firmware sensor variables
  float ph = 6.42;
  float ec = 1.82;     // mS/cm
  int   tds = 980;     // ppm
  int   waterLevel = 72; // percent
  float waterTemp = 23.5; // °C
  float turbidity = 320.0; // NTU (preferred). If RAW ADC, send as-is; backend converts.

  // Device identifier: use your actual serial (uppercase). Example: SMRT-ABC-123
  String serial = "SMRT-ABC-123";

  // Construct JSON string
  String json = "{\"device_serial\":\"" + serial + "\",";
  json += "\"readings\":{";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"ec\":" + String(ec, 2) + ",";
  json += "\"tds\":" + String(tds) + ",";
  json += "\"water_level\":" + String(waterLevel) + ",";
  json += "\"water_temperature\":" + String(waterTemp, 2) + ",";
  json += "\"turbidity\":" + String(turbidity, 1);
  json += "}}";
  return json;
}

bool publishToUpstash(const String& jsonMessage) {
  // Build request path: POST /publish/<channel>
  // We'll send the JSON as the request body to avoid URL length/encoding issues.
  String host;
  uint16_t port = 443;
  String path = "/publish/" + String(PUBSUB_CHANNEL);

  // Parse host from UPSTASH_REST_URL
  String base = String(UPSTASH_REST_URL);
  if (!base.startsWith("https://")) {
    Serial.println("[Upstash] UPSTASH_REST_URL must start with https://");
    return false;
  }
  base.remove(0, String("https://").length()); // strip scheme
  int slash = base.indexOf('/');
  host = (slash >= 0) ? base.substring(0, slash) : base;
  if (slash >= 0) {
    String prefix = base.substring(slash); // include leading '/'
    path = prefix + path;
  }

  httpsClient.setInsecure(); // or load proper root CA
  Serial.printf("[Upstash] Connecting to %s:%u\n", host.c_str(), port);
  if (!httpsClient.connect(host.c_str(), port)) {
    Serial.println("[Upstash] Connection failed");
    return false;
  }

  // Prepare HTTP POST request
  String req = String("POST ") + path + " HTTP/1.1\r\n";
  req += String("Host: ") + host + "\r\n";
  req += "Authorization: Bearer " + String(UPSTASH_REST_TOKEN) + "\r\n";
  req += "Content-Type: application/json\r\n";
  req += String("Content-Length: ") + String(jsonMessage.length()) + "\r\n";
  req += "Connection: close\r\n\r\n";
  req += jsonMessage;

  httpsClient.print(req);

  // Read minimal response
  String statusLine = httpsClient.readStringUntil('\n');
  Serial.println(statusLine);

  // Simple success check (HTTP/1.1 200 OK or 204)
  bool ok = statusLine.indexOf("200") > 0 || statusLine.indexOf("204") > 0;

  // Consume and close
  while (httpsClient.connected()) {
    while (httpsClient.available()) (void)httpsClient.read();
    delay(10);
  }
  httpsClient.stop();
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { Serial.print("."); delay(500); }
  Serial.println();
  Serial.print("Connected. IP: "); Serial.println(WiFi.localIP());
}

void loop() {
  String payload = buildJsonPayload();
  bool ok = publishToUpstash(payload);
  Serial.println(ok ? "[Upstash] Publish OK" : "[Upstash] Publish FAILED");
  delay(5000); // publish interval (adjust to your needs)
}
