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
#include <math.h>
// Sensor + WebSocket libraries
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
#define FIRMWARE_VERSION "1.2.0"

// =============================================
// BACKEND CONFIGURATION
// =============================================
// Updated to match Render service domain (ALLOWED_HOSTS)
// Note: Do NOT include a trailing slash to avoid double-slash when joining paths
// Example: health = BACKEND_URL + "/healthz" -> https://smartanom.onrender.com/healthz
#ifndef BACKEND_URL
#define BACKEND_URL "https://smartanom.onrender.com"
#endif
#define PROVISION_ENDPOINT "/api/devices/provision/"
#define CONFIG_ENDPOINT "/api/devices/" DEVICE_SERIAL "/config/"

// Optional: Set if your backend requires device auth
// Set to your production API key for security
#ifndef DEVICE_API_KEY
#define DEVICE_API_KEY "b58e766d66ea4fededf05d3ccfe44475"  // Production API key
#endif

// =============================================
// REALTIME STREAM CONFIGURATION (Upstash Redis via REST)
// =============================================
// Enable publishing readings to Upstash Redis Pub/Sub via REST API.
// When true, readings are POSTed to Upstash and the Django backend
// persists them via a Redis subscriber.
// Disable legacy dual-path publishing by default; firmware now sends a single
// aggregated batch over WebSocket with an ingest_id for backend idempotency.
#ifndef USE_UPSTASH_PUBLISH
#define USE_UPSTASH_PUBLISH false
#endif

// Upstash REST endpoint (no trailing slash), e.g., https://us1-xxx.upstash.io
#ifndef UPSTASH_REDIS_REST_URL
#define UPSTASH_REDIS_REST_URL "https://lenient-ghost-9335.upstash.io"
#endif
// Upstash REST token (Bearer). Keep this secret.
#ifndef UPSTASH_REDIS_REST_TOKEN
#define UPSTASH_REDIS_REST_TOKEN "ASR3AAImcDJiMDQ0MzFiZmQ3MGM0ODA4OGM0OWNlMjhkZjU1NTkzOXAyOTMzNQ"
#endif
// Pub/Sub channel to publish to (must match backend REDIS_PUBSUB_CHANNEL)
#ifndef REDIS_PUBSUB_CHANNEL
#define REDIS_PUBSUB_CHANNEL "smartanom:sensors"
#endif

// Minimum interval between Upstash publishes (ms). 5000ms = ~17.2k msgs/month/device
// assuming 24/7 operation (keeps below 500k ops for a small fleet).
#define UPSTASH_PUBLISH_MIN_INTERVAL_MS 5000UL

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
#define WATER_SENSOR_PIN 33  // HW-03 Water Sensor (AO) on GPIO32
#define ONE_WIRE_BUS 4
#define TDS_PIN 35
#define PH_PIN 34
#define TURBIDITY_PIN 32     // Moved from 32 to 35 (GPIO32 now used for water level)

// Sensor objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensors(&oneWire);

// ADC / calculation constants
#define VREF 3.3
#define ADC_RES 4095.0
#define SCOUNT 30

// =============================================
// pH SENSOR POLARITY
// =============================================
// Some pH signal boards output HIGHER voltage for LOWER pH (inverse relation),
// while others output HIGHER voltage for HIGHER pH (direct relation).
// Set to 1 if your sensor behaves as: high pH -> high voltage; low pH -> low voltage.
// Set to 0 if your sensor behaves as: high pH -> low voltage; low pH -> high voltage.
#define PH_VOLTAGE_ASCENDS_WITH_PH 1

// =============================================
// SENSOR OVERRIDES (for testing / broken sensors)
// =============================================
// Fake pH override removed: always use real pH sensor readings via computePhFromSensor().

// Forward declarations for pH calibration lookup tables used by phFromVoltageTableDesc
extern const uint8_t PH_TABLE_SIZE;
extern const float PH_TABLE_PH[];
extern const float PH_TABLE_V[];


// =============================================
// EC/TDS CALIBRATION CONSTANTS (Adjustable)
// =============================================
// Temperature compensation for conductivity measurements
// Typical aqueous solutions: ~2%/°C referenced to 25°C
#define TEMP_COEFF       0.02f     // 2% per °C
#define TEMP_REF_C       25.0f

// Optional post-polynomial scaling to correct sensor/system bias.
// Set to 1.0 by default. If you have a known EC standard (e.g., 1.413 mS/cm),
// dip the probe, let it stabilize, and set EC_CAL_FACTOR = EC_STANDARD / ecMeasured.
#define EC_CAL_FACTOR    1.1151f   // multiplicative correction for EC (mS/cm)
// Cal note: set so that a previous reading of EC=1.39 mS/cm (TDS≈696 ppm)
// maps to ~1.55 mS/cm (TDS≈775 ppm) → factor ≈ 1.55/1.39 ≈ 1.1151

// TDS conversion factor: TDS(ppm) ≈ EC(µS/cm) × factor
// For potable water, factor ≈ 0.5. Thus, TDS(ppm) = EC(mS/cm) × 1000 × 0.5 = EC(mS/cm) × 500
// This guarantees: EC=1.2 mS/cm → TDS=600 ppm
#define TDS_CAL_FACTOR   1.0f      // additional fine-tune for ppm if needed

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

// Convert pH probe voltage to pH using the calibration table above
// assuming the table voltages DECREASE as pH INCREASES (inverse relation).
// This returns the "descending mapping" pH (for sensors where high V -> low pH).
static float phFromVoltageTableDesc(float v) {
    // Clamp to endpoints
    if (v >= PH_TABLE_V[0]) return PH_TABLE_PH[0];
    if (v <= PH_TABLE_V[PH_TABLE_SIZE - 1]) return PH_TABLE_PH[PH_TABLE_SIZE - 1];
    // Find interval [i, i+1] where V[i] >= v >= V[i+1]
    for (uint8_t i = 0; i + 1 < PH_TABLE_SIZE; ++i) {
        float v1 = PH_TABLE_V[i];
        float v2 = PH_TABLE_V[i + 1];
        if (v1 >= v && v >= v2) {
            float p1 = PH_TABLE_PH[i];
            float p2 = PH_TABLE_PH[i + 1];
            float t = (v1 - v) / (v1 - v2); // 0..1
            return p1 + (p2 - p1) * t;
        }
    }
    // Fallback (shouldn't reach here): return neutral
    return 7.0f;
}

// Wrapper that adapts to sensor polarity.
// If PH_VOLTAGE_ASCENDS_WITH_PH == true (direct relation), mirror the
// descending mapping around pH 7 i.e., pH' = 14 - pH_desc.
static inline float phFromVoltage(float v) {
    float pDesc = phFromVoltageTableDesc(v);
#if PH_VOLTAGE_ASCENDS_WITH_PH
    return 14.0f - pDesc;
#else
    return pDesc;
#endif
}

// =============================================
// New pH calculation (median filtering + linear formula)
// Based on provided calibrated sketch
// =============================================
// Adjust this value based on your calibration buffer readings
static const float PH_CALIBRATION_VALUE = 21.34f - 0.5f;

static float computePhFromSensor() {
    // Read 10 samples from PH_PIN, with small delays, then sort and
    // average the middle 6 samples to reduce noise and outliers.
    int samples[10];
    for (int i = 0; i < 10; i++) {
        samples[i] = analogRead(PH_PIN);
        delay(30);
    }

    // Bubble sort (small fixed-size array)
    for (int i = 0; i < 9; i++) {
        for (int j = i + 1; j < 10; j++) {
            if (samples[i] > samples[j]) {
                int tmp = samples[i];
                samples[i] = samples[j];
                samples[j] = tmp;
            }
        }
    }

    // Average of the middle 6 samples (ignore 2 lowest and 2 highest)
    unsigned long avgSum = 0;
    for (int i = 2; i < 8; i++) {
        avgSum += samples[i];
    }

    // Convert to voltage using 12-bit ADC range and ESP32 reference voltage
    // Divide by 6 because avgSum is the total of 6 readings
    float volt = (float)avgSum * (VREF / ADC_RES) / 6.0f;

    // Convert voltage to pH (linear relation from provided calibration)
    float ph = (-5.70f * volt) + PH_CALIBRATION_VALUE;
    return ph;
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
#define PH_CALIBRATION_OFFSET 0.00  // legacy (no longer used with 2-point calibration)

// === pH Calibration Table (5V-powered sensor) ===
// Based on provided approx. outputs across pH 0–14.
// We'll convert voltage→pH via piecewise linear interpolation on this table.
const uint8_t PH_TABLE_SIZE = 15;
const float PH_TABLE_PH[PH_TABLE_SIZE] = {
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14
};
const float PH_TABLE_V[PH_TABLE_SIZE] = {
    3.09f, 3.03f, 2.91f, 2.79f, 2.68f, 2.59f, 2.53f, 2.50f, 2.44f, 2.38f, 2.32f, 2.26f, 2.20f, 2.14f, 2.08f
};

// Computed at init from the two points (y = m x + b, where y=pH and x=voltage)
float phSlope = 0.0f;     // legacy (two-point) – not used when table is active
float phIntercept = 0.0f; // legacy (two-point) – not used when table is active
#define DRY_VALUE 250
#define WET_VALUE 1000
// Turbidity calibration (adjust per ESP32 + sensor calibration)
// Higher voltage = clearer water, lower voltage = more turbid
#define TURBIDITY_CLEAR_VOLTAGE 3.0   // voltage in clear water (approx; calibrate)
#define TURBIDITY_MAX_VOLTAGE 0.5     // voltage at high turbidity (approx; calibrate)
// Classification thresholds (3.0V-powered sensor):
// ≤0.30 V = dirty/algae, 0.30–1.00 V = cloudy, >1.00 V = clear
#define TURBIDITY_DIRTY_THRESHOLD_V 0.30f
#define TURBIDITY_CLEAR_THRESHOLD_V 1.00f

// Sensor buffers/values
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
// Forward declaration
String getTurbidityStatus(float voltage);

// Ingest id counter for idempotent batch identifiers
static uint32_t ingestCounter = 0;

// Generate a reasonably unique, short ingest_id per batch.
// Format: <serial>-<epochSec>-<counterHex>
// Counter resets on reboot but epoch seconds make collisions across restarts unlikely.
String generateIngestId() {
    uint32_t epochSec = (uint32_t)(millis() / 1000UL); // device-relative seconds since boot
    // Note: backend also prepends server-side fallback if missing, so this is best-effort.
    char buf[64];
    snprintf(buf, sizeof(buf), "%s-%lu-%04X", DEVICE_SERIAL, (unsigned long)epochSec, (unsigned int)(ingestCounter & 0xFFFF));
    ingestCounter++;
    return String(buf);
}

// Produce a best-effort ISO8601-like timestamp (UTC+8 shown as local if time synced), else epoch millis
String buildTimestamp() {
    time_t now = time(nullptr);
    struct tm tm_info;
    localtime_r(&now, &tm_info);
    if (tm_info.tm_year + 1900 >= 2020) {
        char buf[32];
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S%z", &tm_info);
        return String(buf);
    }
    // Fallback to millis if time not yet synced
    char buf2[32];
    snprintf(buf2, sizeof(buf2), "millis-%lu", (unsigned long)millis());
    return String(buf2);
}

// =============================================
// WEBSOCKET (Device -> Backend Channels)
// =============================================
WebSocketsClient wsClient;
bool wsConnected = false;
unsigned long lastSensorSend = 0;
const unsigned long SENSOR_SEND_INTERVAL_MS = UPSTASH_PUBLISH_MIN_INTERVAL_MS;  // align with Upstash publish rate
// Track WS fallback state
bool wsTriedInsecureFallback = false;

// Backoff and scheduling for stable reconnects (primary device WS)
static bool wsWantConnect = false;                // desire to keep the WS connected
static bool wsConnecting = false;                 // currently attempting connect
static uint32_t wsReconnectAttempt = 0;           // attempt counter for backoff
static uint32_t wsNextConnectAtMs = 0;            // next time to attempt connect
static uint32_t lastWsActivityMs = 0;             // last activity (any WS event)
static const uint32_t WS_BACKOFF_BASE_MS = 1000;  // 1s base
static const uint32_t WS_BACKOFF_MAX_MS  = 60000; // cap at 60s
static const uint32_t WS_IDLE_TIMEOUT_MS = 180000; // 3 min idle timeout -> reconnect
static const uint32_t MIN_WS_CONNECT_DELAY_MS = 5000; // avoid racing at boot
// Time sync gating for TLS
static unsigned long lastTimeSyncAttemptMs = 0;
static bool timeSyncedFlag = false;
static const uint32_t TIME_SYNC_RETRY_MS = 30000;

// Upstash publish rate limiting
static unsigned long lastUpstashPublishMs = 0;

// Derived from BACKEND_URL
String WS_HOST = "";      // e.g., smartanom.onrender.com
uint16_t WS_PORT = 443;    // 443 for wss, 80 for ws
String WS_PATH = "";      // e.g., /ws/device/<serial>/
bool WS_SECURE = true;     // wss when true
// --- Dual WebSocket additions (broker + ingest) ---
#ifndef UPSTASH_PUBSUB_WS_URL
#define UPSTASH_PUBSUB_WS_URL "wss://eu1-pubsub.upstash.io/ws" // Full WebSocket URL (for reference)
#endif
#ifndef UPSTASH_PUBSUB_WS_HOST
#define UPSTASH_PUBSUB_WS_HOST "eu1-pubsub.upstash.io" // Host portion for beginSSL
#endif
#ifndef UPSTASH_PUBSUB_WS_PATH
#define UPSTASH_PUBSUB_WS_PATH "/ws" // Path portion for beginSSL
#endif
#ifndef UPSTASH_PUBSUB_WRITE_TOKEN
#define UPSTASH_PUBSUB_WRITE_TOKEN "REPLACE_WRITE_TOKEN" // Device publish token (keep secret)
#endif
#ifndef UPSTASH_PUBSUB_CHANNEL_PREFIX
#define UPSTASH_PUBSUB_CHANNEL_PREFIX "sensors/" // Channel naming convention sensors/<serial>
#endif
// Set true to enable Upstash Pub/Sub realtime publishing
#ifndef USE_UPSTASH_PUBSUB
#define USE_UPSTASH_PUBSUB false
#endif
#ifndef BACKEND_INGEST_PATH_BASE
#define BACKEND_INGEST_PATH_BASE "/ws/ingest/"
#endif
WebSocketsClient wsRealtime; bool wsRealtimeConnected = false; bool wsRealtimeAuthed = false;
WebSocketsClient wsIngest;   bool wsIngestConnected   = false;
const unsigned long REALTIME_INTERVAL_MS = 5000UL;  // 5s
const unsigned long BATCH_INTERVAL_MS    = 20000UL; // 20s
unsigned long lastRealtimeMs = 0, lastBatchMs = 0;
// Ingest WS backoff scheduling
static bool ingestWantConnect = false;
static bool ingestConnecting = false;
static uint32_t ingestReconnectAttempt = 0;
static uint32_t ingestNextConnectAtMs = 0;
static uint32_t lastIngestActivityMs = 0;
struct ReadingPoint { uint64_t t_ms; float ph, tempC, ec, tds, waterPct, turbidity; };
static const int MAX_BATCH_POINTS = 16; ReadingPoint batchBuf[MAX_BATCH_POINTS]; int batchCount = 0;
void pushBatchPoint(){ if(batchCount>=MAX_BATCH_POINTS){ for(int i=1;i<MAX_BATCH_POINTS;i++) batchBuf[i-1]=batchBuf[i]; batchCount=MAX_BATCH_POINTS-1;} ReadingPoint &rp=batchBuf[batchCount++]; rp.t_ms=millis(); rp.ph=phValue; rp.tempC=waterTempC; rp.ec=ecValue; rp.tds=tdsValue; rp.waterPct=waterPercent; rp.turbidity=(rawTurb>1000? turbidityNTU: rawTurb); }
String buildRealtimeJson(){ StaticJsonDocument<512> doc; doc["type"]="sensor.realtime"; doc["serial"]=DEVICE_SERIAL; doc["ts"]=(uint64_t)millis(); JsonObject data=doc.createNestedObject("data"); data["ph"]=phValue; data["temp"]=waterTempC; data["ec"]=ecValue; data["tds"]=tdsValue; data["water_level"]=waterPercent; data["turbidity"]=(rawTurb>1000? turbidityNTU: rawTurb); String out; serializeJson(doc,out); return out; }
String buildBatchJson(){ StaticJsonDocument<1536> doc; doc["type"]="sensor.batch"; doc["serial"]=DEVICE_SERIAL; doc["nonce"]=generateIngestId(); JsonArray pts=doc.createNestedArray("points"); for(int i=0;i<batchCount;i++){ JsonObject p=pts.createNestedObject(); p["t"]=batchBuf[i].t_ms; JsonObject d=p.createNestedObject("data"); d["ph"]=batchBuf[i].ph; d["temp"]=batchBuf[i].tempC; d["ec"]=batchBuf[i].ec; d["tds"]=batchBuf[i].tds; d["water_level"]=batchBuf[i].waterPct; d["turbidity"]=batchBuf[i].turbidity; } String out; serializeJson(doc,out); return out; }
void ensureRealtimeConnected(){
    if(!USE_UPSTASH_PUBSUB) return; // feature disabled
    if(wsRealtimeConnected) return;
    if(wsRealtime.isConnected()){ wsRealtimeConnected=true; return; }
    // Use beginSSL(host, port, path) instead of begin(full_url)
    wsRealtime.beginSSL(UPSTASH_PUBSUB_WS_HOST, 443, UPSTASH_PUBSUB_WS_PATH);
    wsRealtime.onEvent([](WStype_t t,uint8_t * payload,size_t len){
        if(t==WStype_CONNECTED){
            wsRealtimeConnected=true; wsRealtimeAuthed=false;
            Serial.println("[RT] Connected Upstash Pub/Sub");
            // Auth frame
            StaticJsonDocument<256> doc; doc["type"]="auth"; doc["token"] = UPSTASH_PUBSUB_WRITE_TOKEN; String out; serializeJson(doc,out); wsRealtime.sendTXT(out);
        } else if(t==WStype_DISCONNECTED){
            wsRealtimeConnected=false; wsRealtimeAuthed=false;
            Serial.println("[RT] Disconnected Upstash");
        } else if(t==WStype_TEXT){
            StaticJsonDocument<256> in; DeserializationError e = deserializeJson(in, payload, len);
            if(e) return;
            const char* type = in["type"] | "";
            if(strcmp(type,"auth_ok")==0){ wsRealtimeAuthed=true; Serial.println("[RT] Auth OK"); }
            if(strcmp(type,"auth_error")==0){ Serial.println("[RT] Auth ERROR"); }
        }
    });
    // No auto-reconnect timer here; we'll rely on library's default and our WiFi gating
} 
    // Forward declare backoff utility so lambdas below can see it
    uint32_t computeBackoffDelayMs(uint32_t attempt);
void ensureIngestConnected(){
    // Mark desire to connect; actual begin happens in serviceWebSockets()
    ingestWantConnect = true;
    // Ensure event handler is set exactly once per runtime (idempotent)
    wsIngest.onEvent([](WStype_t t, uint8_t* payload, size_t len){
        (void)payload; (void)len;
        if(t==WStype_CONNECTED){
            wsIngestConnected = true;
            ingestConnecting = false;
            ingestReconnectAttempt = 0;
            lastIngestActivityMs = millis();
            Serial.println("[INGEST] ✓ Connected backend ingest");
            // Reset batch buffer on reconnect to avoid stale payloads
            batchCount = 0;
        } else if(t==WStype_DISCONNECTED){
            wsIngestConnected = false;
            ingestConnecting = false;
            lastIngestActivityMs = millis();
            // schedule backoff via service loop
            ingestNextConnectAtMs = millis() + computeBackoffDelayMs(ingestReconnectAttempt++);
            Serial.println("[INGEST] ✗ Disconnected ingest");
        } else if(t==WStype_TEXT || t==WStype_PING || t==WStype_PONG){
            lastIngestActivityMs = millis();
        } else if(t==WStype_ERROR){
            lastIngestActivityMs = millis();
            ingestConnecting = false;
            ingestNextConnectAtMs = millis() + computeBackoffDelayMs(ingestReconnectAttempt++);
            Serial.println("[INGEST] ✗ ERROR (scheduling reconnect)");
        }
    });
}
void sendRealtimeFrameIfDue(unsigned long nowMs){
    if(!USE_UPSTASH_PUBSUB) return; // disabled
    if(nowMs - lastRealtimeMs < REALTIME_INTERVAL_MS) return;
    lastRealtimeMs = nowMs;
    String frame = buildRealtimeJson();
    ensureRealtimeConnected();
    if(wsRealtimeConnected && wsRealtimeAuthed){
        // Wrap in publish envelope: {type:publish, channel:"sensors/<serial>", data:<json string>}
        StaticJsonDocument<1280> doc; doc["type"]="publish"; String channel = String(UPSTASH_PUBSUB_CHANNEL_PREFIX) + String(DEVICE_SERIAL); doc["channel"] = channel; doc["data"] = frame; String out; serializeJson(doc,out); wsRealtime.sendTXT(out);
    }
} 
void sendBatchIfDue(unsigned long nowMs){ if(nowMs-lastBatchMs<BATCH_INTERVAL_MS) return; lastBatchMs=nowMs; if(batchCount==0) return; String batch=buildBatchJson(); ensureIngestConnected(); if(wsIngestConnected){ wsIngest.sendTXT(batch); batchCount=0; }}
// =============================================
// STARTUP STABILIZATION GATE (first payload)
// =============================================
// Gate the very first sensor payload on stability instead of fixed sleep.
// After first payload, normal cadence resumes.

// Overall boot timers
static unsigned long bootStartMs = 0;
static bool firstPayloadSent = false;

// Per-sensor EMA and stability counters
static float emaPH = NAN;        static int phStableN = 0;
static float emaTDS = NAN;       static int tdsStableN = 0;
static int   emaTurbRaw = -1;    static int turbStableN = 0;
static float emaTempC = NAN;     static int tempStableN = 0;
static int   emaWaterRaw = -1;   static int waterStableN = 0;

// Thresholds & windows (power-on only)
const unsigned long WARMUP_MIN_PH_MS    = 15000;  // 15s
const unsigned long WARMUP_MIN_TDS_MS   = 10000;  // 10s
const unsigned long WARMUP_MIN_TURB_MS  = 3000;   // 3s
const unsigned long WARMUP_MIN_TEMP_MS  = 5000;   // 5s
const unsigned long WARMUP_MIN_WATER_MS = 2000;   // 2s

const unsigned long STARTUP_SEND_MAX_WAIT_MS = 180000; // 180s (3 minutes) max before we send anyway

// Stability thresholds
const int   REQ_STABLE_CONSEC = 5;       // consecutive samples required
const float THRESH_PH_ABS      = 0.02f;  // pH units
const float THRESH_TDS_REL     = 0.03f;  // 3% relative
const int   THRESH_TURB_RAW    = 40;     // raw ADC counts
const float THRESH_TEMP_ABS    = 0.20f;  // deg C
const int   THRESH_WATER_RAW   = 50;     // raw ADC counts

// Quality flag for first send (nullptr or "stable"/"warmup")
static const char* firstSendQuality = nullptr;

// Avoid Arduino preprocessor issues with templates in .ino files; provide int-specific abs
static inline int iabs_int(int v) { return v < 0 ? -v : v; }

static bool updateStabilityFloat(float current, float &ema, float absThreshold, int &consec) {
    // Initialize EMA on first sample
    if (isnan(ema)) {
        ema = current;
        consec = 0;
        return false;
    }
    // EMA smoothing (alpha)
    const float alpha = 0.3f;
    ema = alpha * current + (1.0f - alpha) * ema;
    float delta = fabs(current - ema);
    if (delta <= absThreshold) {
        consec++;
    } else {
        consec = 0;
    }
    return consec >= REQ_STABLE_CONSEC;
}

static bool updateStabilityInt(int current, int &emaLike, int absThreshold, int &consec) {
    if (emaLike < 0) { // uninitialized
        emaLike = current;
        consec = 0;
        return false;
    }
    // Simple integer EMA
    emaLike = (int)(0.3f * current + 0.7f * emaLike);
        int delta = iabs_int(current - emaLike);
    if (delta <= absThreshold) {
        consec++;
    } else {
        consec = 0;
    }
    return consec >= REQ_STABLE_CONSEC;
}

static bool updateStabilityTDS(float current, float &ema, float relThreshold, int &consec) {
    if (isnan(ema)) {
        ema = current;
        consec = 0;
        return false;
    }
    const float alpha = 0.3f;
    ema = alpha * current + (1.0f - alpha) * ema;
    float base = (ema == 0.0f) ? 1.0f : fabs(ema);
    float rel = fabs(current - ema) / base;
    if (rel <= relThreshold) {
        consec++;
    } else {
        consec = 0;
    }
    return consec >= REQ_STABLE_CONSEC;
}

static bool computeStartupStability(unsigned long nowMs, bool &phOk, bool &tdsOk, bool &turbOk, bool &tempOk, bool &waterOk) {
    unsigned long sinceBoot = nowMs - bootStartMs;
    // Only evaluate after each sensor's min warmup
    phOk    = (sinceBoot >= WARMUP_MIN_PH_MS)    ? updateStabilityFloat(phValue, emaPH, THRESH_PH_ABS, phStableN)         : false;
    tdsOk   = (sinceBoot >= WARMUP_MIN_TDS_MS)   ? updateStabilityTDS(tdsValue, emaTDS, THRESH_TDS_REL, tdsStableN)       : false;
    turbOk  = (sinceBoot >= WARMUP_MIN_TURB_MS)  ? updateStabilityInt(rawTurb, emaTurbRaw, THRESH_TURB_RAW, turbStableN)  : false;
    tempOk  = (sinceBoot >= WARMUP_MIN_TEMP_MS)  ? updateStabilityFloat(waterTempC, emaTempC, THRESH_TEMP_ABS, tempStableN): false;
    waterOk = (sinceBoot >= WARMUP_MIN_WATER_MS) ? updateStabilityInt(waterRaw, emaWaterRaw, THRESH_WATER_RAW, waterStableN): false;
    return phOk && tdsOk && turbOk && tempOk && waterOk;
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
bool publishToUpstash(const String& jsonMessage);
String buildUpstashJson();
bool syncTimeIfNeeded();  // Returns true if time sync successful
void maintainWiFiConnection();
void serviceWebSockets(); // Backoff-driven WS connect/timeout scheduler
uint32_t computeBackoffDelayMs(uint32_t attempt);

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
        serviceWebSockets();
        wsClient.loop();
    wsRealtime.loop();
    wsIngest.loop();

        unsigned long now = millis();
        if (now - lastSensorSend >= SENSOR_SEND_INTERVAL_MS) {
            lastSensorSend = now;
            readSensorsOnce();

            if (!firstPayloadSent) {
                bool phOk=false, tdsOk=false, turbOk=false, tempOk=false, waterOk=false;
                bool allStable = computeStartupStability(now, phOk, tdsOk, turbOk, tempOk, waterOk);
                unsigned long sinceBoot = now - bootStartMs;
                bool timeoutReached = sinceBoot >= STARTUP_SEND_MAX_WAIT_MS;
                bool minWarmupMet = sinceBoot >= 2000; // at least 2s overall before any send

                if (allStable && minWarmupMet) {
                    firstSendQuality = "stable";
                    sendSensorData(); // legacy path
                    pushBatchPoint();
                    sendRealtimeFrameIfDue(now);
                    firstPayloadSent = true;
                    Serial.println(F("[STAB] ✅ First payload sent after stability gate"));
                } else if (timeoutReached) {
                    firstSendQuality = "warmup"; // sent due to timeout
                    sendSensorData();
                    pushBatchPoint();
                    sendRealtimeFrameIfDue(now);
                    firstPayloadSent = true;
                    Serial.println(F("[STAB] ⏱️ First payload sent after max wait timeout"));
                } else {
                    // Still warming up – skip sending this cycle
                    if ((sinceBoot % 5000) < SENSOR_SEND_INTERVAL_MS) {
                        Serial.printf("[STAB] Waiting... t=%lus ph:%d tds:%d turb:%d temp:%d water:%d\n",
                                      sinceBoot/1000, phOk, tdsOk, turbOk, tempOk, waterOk);
                    }
                }
            } else {
                // Normal sends
                sendSensorData();       // legacy broadcast/persist path
                pushBatchPoint();
                sendRealtimeFrameIfDue(now);
                sendBatchIfDue(now);
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
    // Password input with show/hide toggle button
    html += "<div style='position:relative;'>";
    html += "<input type='password' id='password' name='password' required placeholder='Enter your WiFi password' style='padding-right:90px;'>";
    html += "<button type='button' id='togglePwd' style='position:absolute; right:8px; top:50%; transform:translateY(-50%); padding:8px 10px; background:#f3f3f3; color:#333; border:1px solid #ddd; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;'>Show</button>";
    html += "</div>";
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
    // Password show/hide behavior
    html += "(function(){";
    html += "  var pwd = document.getElementById('password');";
    html += "  var btn = document.getElementById('togglePwd');";
    html += "  if(btn && pwd){";
    html += "    btn.addEventListener('click', function(){";
    html += "      var showing = (pwd.type === 'text');";
    html += "      pwd.type = showing ? 'password' : 'text';";
    html += "      btn.textContent = showing ? 'Show' : 'Hide';";
    html += "    });";
    html += "  }";
    html += "})();";
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

    // Ensure pH ADC pin uses full-scale range
    analogSetPinAttenuation(PH_PIN, ADC_11db);

    // Initialize water level sensor ADC settings
    analogSetPinAttenuation(WATER_SENSOR_PIN, ADC_11db);
    // Ensure full-scale range for TDS and pH ADC pins
    analogSetPinAttenuation(TDS_PIN, ADC_11db);
    analogSetPinAttenuation(PH_PIN, ADC_11db);
    // Ensure full-scale range for Turbidity ADC pin as well
    analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);

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

    // Legacy: two-point pH calibration retained for reference (unused when table active)
    // slope m = (y2 - y1)/(x2 - x1) ; intercept b = y - m x
    // phSlope = (PH_HIGH_PH - PH_LOW_PH) / (PH_HIGH_VOLTAGE - PH_LOW_VOLTAGE);
    // phIntercept = PH_HIGH_PH - (phSlope * PH_HIGH_VOLTAGE);

    Serial.println("✓ Sensors initialized (DS18B20, TDS, pH, Turbidity, HW-03 Water Level)");
    Serial.printf("  Water Level Calibration: 0%%=%d ADC, 100%%=%d ADC\n", calibDry, calibWet);
    Serial.printf("  Water Level Threshold: WARNING < %d ADC (hysteresis=%d)\n", ADC_WARNING_THRESH, HYST_ADC);
    Serial.println("  pH Calibration: median-filter + linear (-5.70*V + 21.34 - 0.9)");
#if PH_VOLTAGE_ASCENDS_WITH_PH
    Serial.println("    Polarity : DIRECT (higher V = higher pH)");
#else
    Serial.println("    Polarity : INVERSE (higher V = lower pH)");
#endif
    Serial.printf("    Range    : %.2f V (min) ↔ %.2f V (max)\n", (double)PH_TABLE_V[PH_TABLE_SIZE-1], (double)PH_TABLE_V[0]);
}

String getTurbidityStatus(float voltage) {
    if (voltage <= TURBIDITY_DIRTY_THRESHOLD_V) {
        return "Dirty/Algae";
    } else if (voltage <= TURBIDITY_CLEAR_THRESHOLD_V) {
        return "Cloudy";
    } else {
        return "Clear";
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

    // EC/TDS Calculation
    // 1) Temperature compensation for the analog TDS circuit output voltage
    //    Compensation referenced to 25°C using TEMP_COEFF (typ. 2%/°C)
    float compCoeff = 1.0f + TEMP_COEFF * (waterTempC - TEMP_REF_C);
    float compVoltage = averageVoltageTDS / compCoeff;

    // 2) Convert compensated voltage to EC (mS/cm) using DFRobot cubic fit.
    //    This polynomial is widely used for the DFRobot TDS sensor board.
    //    It maps analog voltage (V) to conductivity (µS/cm); we divide by 1000 to get mS/cm.
    float ec_mS = (133.42f * powf(compVoltage, 3)
                 - 255.86f * powf(compVoltage, 2)
                 + 857.39f * compVoltage) / 1000.0f; // mS/cm

    // 3) Apply an optional calibration factor for system bias (default 1.0)
    ec_mS *= EC_CAL_FACTOR;
    if (ec_mS < 0.0f) ec_mS = 0.0f;
    ecValue = ec_mS; // keep the named variable for downstream use/telemetry

    // 4) Convert EC (mS/cm) to TDS (ppm): TDS(ppm) = EC(mS/cm) × 1000 × TDS_FACTOR
    //    With TDS_FACTOR = 0.5, this becomes TDS = EC × 500. Ensures 1.2 mS/cm → 600 ppm.
    tdsValue = ec_mS * (1000.0f * TDS_FACTOR) * TDS_CAL_FACTOR;

    // pH calculation using your calibrated method (median filter + linear formula)
    phValue = computePhFromSensor();

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
    // Disable library auto-reconnect and heartbeats; we'll manage reconnection with backoff

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

        // No blocking delay; proceed immediately
    }

    Serial.printf("[WS] Connecting to %s://%s:%u%s\n",
                  WS_SECURE ? "wss" : "ws",
                  WS_HOST.c_str(),
                  WS_PORT,
                  WS_PATH.c_str());

    wsWantConnect = true;
    wsReconnectAttempt = 0;
    wsNextConnectAtMs = 0;
    lastWsActivityMs = millis();

    // Attempt an initial one-off time sync to prime TLS state, but do not connect yet.
    if (WS_SECURE) {
        timeSyncedFlag = syncTimeIfNeeded();
    } else {
        timeSyncedFlag = true;
        Serial.println("[WS] → Using INSECURE WebSocket (ws://). No TLS time sync required.");
    }

    Serial.println("[WS] ✓ WebSocket client prepared");
    Serial.println("[WS] Scheduler will attempt connection based on backoff and time sync");
    wsWantConnect = true;
    wsConnecting = false; // let serviceWebSockets() initiate connect
    wsReconnectAttempt = 0;
    wsNextConnectAtMs = millis();
    lastWsActivityMs = millis();
}

void wsEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED: {
            wsConnected = true;
            wsConnecting = false;
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

            // Update connection state and reset backoff
            lastWsActivityMs = millis();
            wsReconnectAttempt = 0;
            wsNextConnectAtMs = 0;

            sendHandshake();
            break;
        }        case WStype_DISCONNECTED: {
            wsConnected = false;
            wsConnecting = false;
            Serial.println("[WS] ✗ Disconnected from server");
            lastWsActivityMs = millis();

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

            // Schedule backoff-based reconnect
            wsNextConnectAtMs = millis() + computeBackoffDelayMs(wsReconnectAttempt++);
            Serial.printf("[WS] Reconnect scheduled in %lu ms (attempt %lu)\n",
                          (unsigned long)(wsNextConnectAtMs - millis()),
                          (unsigned long)wsReconnectAttempt);

            // If secure WS repeatedly fails and we haven't tried fallback yet
            if (ALLOW_WS_INSECURE_FALLBACK && !wsTriedInsecureFallback && WS_SECURE) {
                Serial.println("[WS] ⚠️  wss:// connection unstable");
                Serial.println("[WS] → Attempting ws:// fallback (insecure)");
                Serial.println("[WS] → Ensure backend has WS_TLS_INSECURE=true");

                wsTriedInsecureFallback = true;
                WS_SECURE = false;
                WS_PORT = 80;
                // Let serviceWebSockets() perform the next begin() when due
            }
            break;
        }

        case WStype_TEXT: {
            lastWsActivityMs = millis();
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
            wsConnecting = false;
            Serial.printf("[WS] WiFi Status: %d, RSSI: %d dBm\n",
                          WiFi.status(),
                          WiFi.RSSI());
            lastWsActivityMs = millis();

            // Check if this is likely a TLS error
            time_t now = time(nullptr);
            struct tm tm_info;
            localtime_r(&now, &tm_info);

            if (WS_SECURE && tm_info.tm_year + 1900 < 2020) {
                Serial.println("[WS] ⚠️  System time NOT synced - TLS will fail!");
                Serial.println("[WS] → This is the root cause of the error");
            }

            // Schedule reconnect on error
            wsNextConnectAtMs = millis() + computeBackoffDelayMs(wsReconnectAttempt++);
            // Trigger fallback if enabled
            if (ALLOW_WS_INSECURE_FALLBACK && !wsTriedInsecureFallback && WS_SECURE) {
                Serial.println("[WS] → Attempting insecure ws:// fallback");
                wsTriedInsecureFallback = true;
                WS_SECURE = false;
                WS_PORT = 80;
                // Schedule reconnect via service loop
                wsNextConnectAtMs = millis() + computeBackoffDelayMs(wsReconnectAttempt++);
            }
            break;
        }        case WStype_BIN:
            Serial.printf("[WS] Binary message (%u bytes)\n", (unsigned)length);
            break;

        case WStype_PING:
            lastWsActivityMs = millis();
            Serial.println("[WS] ← Ping from server");
            break;

        case WStype_PONG:
            lastWsActivityMs = millis();
            Serial.println("[WS] ← Pong from server");
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
    // Single-path: send aggregated batch over WebSocket with ingest_id.
    if (wsConnected) {
        StaticJsonDocument<512> doc;
        doc["type"] = "sensor_data";
        doc["device_serial"] = DEVICE_SERIAL;
    String ingId = generateIngestId();
    doc["ingest_id"] = ingId;
        if (!firstPayloadSent && firstSendQuality != nullptr) {
            doc["quality"] = firstSendQuality; // "stable" or "warmup"
        }
        // Aggregated sensor map expected by backend consumer
    JsonObject sensors = doc.createNestedObject("data");
    sensors["ingest_id"] = ingId; // let backend dedupe entire batch
    sensors["timestamp"] = buildTimestamp();
        sensors["ph"] = phValue;
        sensors["tds"] = tdsValue;      // ppm
        sensors["ec"] = ecValue;        // mS/cm
        sensors["turbidity"] = rawTurb; // RAW (backend converts if > 1000)
        sensors["turbidity_status"] = getTurbidityStatus(voltageTurb);
        sensors["water_temperature"] = waterTempC; // °C
        sensors["water_level"] = waterPercent;     // %
        // Optional state for UI (not ingested as a reading)
        sensors["water_level_state"] = waterLevelStateToText(currentWaterLevelState);
        String out; serializeJson(doc, out);
        wsClient.sendTXT(out);
        firstSendQuality = nullptr;
    }

    // Log to serial for quick debugging
    Serial.println("========== SENSOR READINGS ==========");
    Serial.printf("Device Serial : %s\n", DEVICE_SERIAL);
    Serial.printf("Water Level   : %d%% (raw=%d, state=%s)\n", waterPercent, waterRaw, waterLevelStateToText(currentWaterLevelState));
    Serial.printf("Water Temp    : %.2f °C\n", waterTempC);
    Serial.printf("TDS           : %.0f ppm\n", tdsValue);
    Serial.printf("EC            : %.2f mS/cm\n", ecValue);
    Serial.printf("EC (uS/cm)    : %.0f uS/cm\n", ecValue * 1000.0f);
    Serial.printf("EC→TDS map   : %.2f mS/cm × 500 = %.0f ppm\n", ecValue, ecValue * 500.0f);
    Serial.printf("pH            : %.2f\n", phValue);
    Serial.printf("pH Voltage    : %.3f V\n", averageVoltagePH);
    const float PH_V_MAX = PH_TABLE_V[0];
    const float PH_V_MIN = PH_TABLE_V[PH_TABLE_SIZE - 1];
    // Extra diagnostics for obvious rail/saturation conditions
    if (averageVoltagePH >= (VREF - 0.03f)) {
        Serial.println(F("[pH] Warning  : Input near VREF (~3.3V). Likely saturated high.\n"
                         "               Check wiring: AO->GPIO34, GND common, V+ 5V.\n"
                         "               Adjust pH board trimmer so pH7 ≈ 2.50V.\n"
                         "               If your board outputs inverse polarity, set PH_VOLTAGE_ASCENDS_WITH_PH to 0."));
    } else if (averageVoltagePH <= 0.03f) {
        Serial.println(F("[pH] Warning  : Input near 0V. Likely saturated low or short to GND.\n"
                         "               Verify AO connection and ground. Dip probe in buffer and adjust trimmer."));
    }
    if (averageVoltagePH > PH_V_MAX || averageVoltagePH < PH_V_MIN) {
        Serial.printf("[pH] Note     : Voltage out of cal range (%.2f–%.2f V)\n", PH_V_MAX, PH_V_MIN);
    }
    Serial.printf("Turbidity     : raw=%d (V=%.2f) | est=%.2f NTU | %s\n", rawTurb, voltageTurb, turbidityNTU, getTurbidityStatus(voltageTurb).c_str());
    Serial.println("======================================\n");
}

// =============================================
// Upstash Publisher (REST)
// =============================================
String buildUpstashJson() {
    StaticJsonDocument<512> doc;
    doc["device_serial"] = DEVICE_SERIAL;
    if (!firstPayloadSent && firstSendQuality != nullptr) {
        doc["quality"] = firstSendQuality; // optional hint
    }
    JsonObject readings = doc.createNestedObject("readings");
    readings["ph"] = phValue;
    readings["tds"] = tdsValue;
    readings["ec"] = ecValue;
    readings["water_level"] = waterPercent;
    readings["water_temperature"] = waterTempC;
    // Send RAW ADC for turbidity (backend converts RAW>1000 to NTU)
    readings["turbidity"] = rawTurb;
    readings["turbidity_status"] = getTurbidityStatus(voltageTurb);

    String out; serializeJson(doc, out);
    return out;
}

bool publishToUpstash(const String& jsonMessage) {
    if (!USE_UPSTASH_PUBLISH) return false;
    if (strlen(UPSTASH_REDIS_REST_URL) == 0 || strlen(UPSTASH_REDIS_REST_TOKEN) == 0) {
        Serial.println("[Upstash] Missing REST URL or token; skip publish");
        return false;
    }

    WiFiClientSecure client;
    client.setInsecure(); // optionally replace with proper CA

    HTTPClient https;
    String url = String(UPSTASH_REDIS_REST_URL) + String("/publish/") + String(REDIS_PUBSUB_CHANNEL);
    if (!https.begin(client, url)) {
        Serial.println("[Upstash] ✗ HTTPS begin failed");
        return false;
    }
    https.addHeader("Authorization", String("Bearer ") + String(UPSTASH_REDIS_REST_TOKEN));
    https.addHeader("Content-Type", "application/json");
    https.setTimeout(15000); // 15s

    int code = https.POST(jsonMessage);
    if (code > 0) {
        Serial.printf("[Upstash] HTTP %d\n", code);
    } else {
        Serial.printf("[Upstash] ✗ POST failed: %s\n", https.errorToString(code).c_str());
    }
    https.end();
    return (code == 200 || code == 204);
}

void startNormalOperation() {
    Serial.println("\n=== Starting Normal Operation ===");
    initSensors();
    initWebSocket();
    // Reset stabilization state
    bootStartMs = millis();
    firstPayloadSent = false;
    emaPH = NAN; phStableN = 0;
    emaTDS = NAN; tdsStableN = 0;
    emaTurbRaw = -1; turbStableN = 0;
    emaTempC = NAN; tempStableN = 0;
    emaWaterRaw = -1; waterStableN = 0;
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

// =====================
// WS Backoff Utilities
// =====================
uint32_t computeBackoffDelayMs(uint32_t attempt){
    // Exponential backoff with cap (1s,2s,4s,8s,16s,32s,60s...)
    uint32_t exp = (attempt >= 6) ? 6 : attempt; // cap exponent at 2^6=64
    uint32_t d = WS_BACKOFF_BASE_MS * (1UL << exp);
    if (d > WS_BACKOFF_MAX_MS) d = WS_BACKOFF_MAX_MS;
    return d;
}

void serviceWebSockets(){
    const uint32_t now = millis();

    // Gate all WS activity on WiFi link
    if (WiFi.status() != WL_CONNECTED) {
        // Stop any active sockets and reset attempts to avoid storms when WiFi returns
        if (wsClient.isConnected()) { wsClient.disconnect(); }
        if (wsIngest.isConnected()) { wsIngest.disconnect(); }
        wsConnected = false;
        wsConnecting = false; wsReconnectAttempt = 0; wsNextConnectAtMs = 0;
        ingestReconnectAttempt = 0; ingestNextConnectAtMs = 0;
        return;
    }

    // Primary WS idle timeout protection
    if (wsClient.isConnected()){
        if (now - lastWsActivityMs > WS_IDLE_TIMEOUT_MS){
            Serial.println("[WS] ⏱ TIMEOUT (no activity) -> reconnecting");
            wsClient.disconnect();
            wsConnected = false;
            wsNextConnectAtMs = now + computeBackoffDelayMs(wsReconnectAttempt++);
        }
    } else if (wsWantConnect && !wsConnecting && now >= wsNextConnectAtMs){
        // Avoid racing at boot
        if (now - bootStartMs < MIN_WS_CONNECT_DELAY_MS){
            wsNextConnectAtMs = bootStartMs + MIN_WS_CONNECT_DELAY_MS;
            return;
        }
        // For wss, ensure time is synced. Retry sync at most every TIME_SYNC_RETRY_MS.
        if (WS_SECURE){
            auto timeIsValid = [](){ time_t t=time(nullptr); struct tm tm_i; localtime_r(&t,&tm_i); return (tm_i.tm_year+1900)>=2020; };
            if (!timeIsValid()){
                if (now - lastTimeSyncAttemptMs >= TIME_SYNC_RETRY_MS){
                    Serial.println("[WS] Waiting for valid time (NTP) before wss connect...");
                    timeSyncedFlag = syncTimeIfNeeded();
                    lastTimeSyncAttemptMs = now;
                }
                // Defer connect until time is valid or fallback triggers
                wsNextConnectAtMs = now + 5000;
                return;
            }
        }
        // Attempt (re)connect with current scheme
        Serial.printf("[WS] Connecting (%s) attempt %lu...\n", WS_SECURE?"wss":"ws", (unsigned long)wsReconnectAttempt+1);
        if (WS_SECURE) {
            if (strlen(WS_SSL_FINGERPRINT) > 0) {
                wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str(), WS_SSL_FINGERPRINT);
            } else {
                wsClient.beginSSL(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
            }
        } else {
            wsClient.begin(WS_HOST.c_str(), WS_PORT, WS_PATH.c_str());
        }
        wsConnecting = true;
        // After begin(), WebSocketsClient handles the TCP connect asynchronously
        // If it fails, our onEvent will schedule the next attempt via backoff
        // Push next attempt time forward to avoid tight loops in case of immediate failure
        wsNextConnectAtMs = now + computeBackoffDelayMs(wsReconnectAttempt);
    }

    // Ingest WS idle timeout and scheduled connect
    if (wsIngest.isConnected()){
        if (now - lastIngestActivityMs > WS_IDLE_TIMEOUT_MS){
            Serial.println("[INGEST] ⏱ TIMEOUT (no activity) -> reconnecting");
            wsIngest.disconnect();
            ingestNextConnectAtMs = now + computeBackoffDelayMs(ingestReconnectAttempt++);
            wsIngestConnected = false;
        }
    } else if (ingestWantConnect && !ingestConnecting && now >= ingestNextConnectAtMs && WS_HOST.length()>0){
        String ingestPath = String(BACKEND_INGEST_PATH_BASE) + String(DEVICE_SERIAL) + String("/");
        Serial.printf("[INGEST] Connecting (%s)...\n", WS_SECURE?"wss":"ws");
        // Ensure event handler is bound (idempotent)
        wsIngest.onEvent([](WStype_t t, uint8_t* p, size_t l){ (void)p; (void)l; /* bound in ensureIngestConnected */ });
        if (WS_SECURE){ wsIngest.beginSSL(WS_HOST.c_str(), WS_PORT, ingestPath.c_str()); }
        else { wsIngest.begin(WS_HOST.c_str(), WS_PORT, ingestPath.c_str()); }
        ingestConnecting = true;
        ingestNextConnectAtMs = now + computeBackoffDelayMs(ingestReconnectAttempt);
    }
}
