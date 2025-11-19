# Redis-Only Realtime Mode (Fallback Without Pub/Sub)

This mode streams sensor readings directly from devices to the frontend every 5s WITHOUT persisting those realtime frames. Persistence occurs only every 20s via the batch WebSocket ingest (`/ws/ingest/<serial>/`).

## Why
Pub/Sub WebSocket tokens not available (no Upstash Pub/Sub project). We reuse existing Upstash Redis (REST publish + Redis pattern subscription) and Django Channels broadcast to achieve low-latency UI updates.

## Data Flow
```
ESP32 (every 5s) --HTTP REST--> Upstash Redis (publish sensors:SERIAL)
Redis (pattern psubscribe sensors:*) --run_redis_relay--> Django Channels groups
Browser Dashboard <--backend WS /ws/devices or /ws/user/<id>-- receives sensor.update
ESP32 (every 20s) --WebSocket--> /ws/ingest/<serial>/ (batch persisted)
```

## Environment Variables
Add to backend `.env`:
```
REDIS_URL=rediss://default:PASSWORD@alert-thrush-6337.upstash.io:6379
REDIS_SENSOR_CHANNEL_PREFIX=sensors:
USE_REDIS_REALTIME=true
WS_GLOBAL_BROADCAST=true            # allow admin/global broadcast
```
Frontend `.env`:
```
VITE_USE_DIRECT_BROKER=false
```
Disable any broker URL/token (`VITE_BROKER_WS_URL`, `VITE_BROKER_WS_TOKEN`).

## Firmware REST Publish Snippet
```cpp
#include <HTTPClient.h>
const char* UPSTASH_TOKEN = "REPLACE_WITH_REST_TOKEN"; // same as UPSTASH_REDIS_REST_TOKEN
String channel = String("sensors:") + DEVICE_SERIAL; // e.g. sensors:SMRT-ABC-123
String baseUrl = "https://alert-thrush-6337.upstash.io/publish/" + channel;

void publishRealtimeFrame(float ph, float tempC, float ec, float tds, int waterPct, float turbidity) {
  StaticJsonDocument<384> doc;
  doc["type"] = "sensor.realtime";
  doc["serial"] = DEVICE_SERIAL;
  JsonObject data = doc.createNestedObject("data");
  data["ph"] = ph; data["temp"] = tempC; data["ec"] = ec; data["tds"] = tds;
  data["water_level"] = waterPct; data["turbidity"] = turbidity;
  String payload; serializeJson(doc, payload);
  HTTPClient http; http.begin(baseUrl); http.addHeader("Authorization", String("Bearer ") + UPSTASH_TOKEN);
  http.addHeader("Content-Type", "text/plain");
  int code = http.POST(payload); http.end();
}
```
Call `publishRealtimeFrame()` every 5000ms after readings are stable.

## Relay Worker
Procfile now uses:
```
worker: python manage.py run_redis_relay
```
This management command:
- Pattern subscribes to `sensors:*`
- Parses JSON frames with `type=sensor.realtime`
- Broadcasts values only (no DB writes)

## Batch Persistence (20s)
Firmware sends aggregated batch over `/ws/ingest/<serial>/` consumer (`BatchedIngestConsumer`). Those readings are written to DB (long-term history).

## Frontend Behavior
- `VITE_USE_DIRECT_BROKER=false` prevents broker client creation.
- Store listens only to backend WebSocket sensor.update events.
- Dashboard cards show the latest broadcast values (5s cadence).
- Historical charts still load initial history from DB; they are not overwritten by broadcast unless newer in time.

## Testing Checklist
1. Start relay: `python manage.py run_redis_relay` (or rely on Procfile worker).
2. Publish a test frame manually:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     -H "Content-Type: text/plain" \
     https://alert-thrush-6337.upstash.io/publish/sensors:SMRT-TEST-001 \
     -d '{"type":"sensor.realtime","serial":"SMRT-TEST-001","data":{"ph":6.7,"temp":24.8,"ec":1.5,"tds":900,"water_level":55,"turbidity":300}}'
   ```
3. Open dashboard; confirm device card updates within ~1s.
4. After 20s batch is ingested, verify DB rows created (Django admin or direct query). Card values still come from realtime.

## Notes & Gotchas
- Do not run both `run_redis_subscriber` and `run_redis_relay` simultaneously or realtime frames will be persisted (contrary to design).
- If you need lightweight persistence of realtime for audit, extend relay with optional sampling (e.g., every Nth frame). Keep disabled by default.
- Rate limits: Upstash free tier allows limited requests—5000ms cadence per device scales modestly; monitor usage.
- Security: REST token grants publish rights; keep it out of frontend bundles.

## Migration Back to Pub/Sub
When Pub/Sub becomes available:
1. Set `VITE_USE_DIRECT_BROKER=true` and provide broker URL/token.
2. Switch worker back to `run_redis_subscriber` (or new Pub/Sub subscriber) if you want persistence of realtime stream.
3. Disable `run_redis_relay`.

---
This README documents the fallback path implemented on branch `prod` for environments without Upstash Pub/Sub.
