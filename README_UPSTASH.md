# Upstash Pub/Sub Integration Guide

This document explains how SmarTanom uses Upstash Pub/Sub for low‑latency realtime sensor streaming (ESP32 → Browser) while retaining periodic batch persistence to the Django backend.

## 1. Overview
- ESP32 publishes a realtime frame every 5s to an Upstash Pub/Sub channel: `sensors/<DEVICE_SERIAL>`.
- Browser subscribes directly to the same channel using a **read token** and updates the UI immediately (cards, charts).
- Every 20s the ESP32 sends a batched payload via backend WebSocket `/ws/ingest/<serial>/` for durable storage.
- Backend continues to enforce idempotency and access control; broker remains stateless for reads.

## 2. Channel & Payload Conventions
### Realtime Publish Envelope (device → Upstash)
```
{ "type": "publish", "channel": "sensors/SMRT-ABC-123", "data": "{\"type\":\"sensor.realtime\",\"serial\":\"SMRT-ABC-123\",\"ts\":1732020000,\"data\":{...}}" }
```
Inner `data` string (sensor frame):
```
{
  "type": "sensor.realtime",
  "serial": "SMRT-ABC-123",
  "ts": <device_millis>,
  "data": { "ph": 6.92, "temp": 25.1, "ec": 1.54, "tds": 770, "water_level": 64, "turbidity": 0.88 }
}
```
### Batch (device → backend WebSocket)
```
{
  "type": "sensor.batch",
  "serial": "SMRT-ABC-123",
  "nonce": "SMRT-ABC-123-123456-00AF",
  "points": [
    {"t": 1234567, "data": {"ph":6.92, "temp":25.1, ...}},
    ...
  ]
}
```
Backend persists each point; `nonce` used for idempotency.

## 3. Environment Variables
### Obtaining Values (Free Tier)
If you only see Redis credentials (REST URL, REST TOKEN, Redis URL) in Upstash and not a Pub/Sub "WebSocket" endpoint, you have provisioned a Redis database, not a Pub/Sub instance. You need a separate Upstash Pub/Sub project to use the `wss://<region>-pubsub.upstash.io/ws` broker.

Steps:
1. Log in to the Upstash dashboard.
2. Click "Create" and choose "Pub/Sub" (not Redis/Kafka).
3. Select a free tier region (e.g. `eu1`). After creation you'll see:
  - WebSocket endpoint: `wss://eu1-pubsub.upstash.io/ws`
  - Access Tokens list (create one with Publish+Subscribe permissions for devices; create a second Subscribe-only for browsers).
4. Copy the WebSocket endpoint into:
  - `BROKER_WS_URL` (backend) and `VITE_BROKER_WS_URL` (frontend).
5. Generate tokens:
  - Device write token → `UPSTASH_PUBSUB_WRITE_TOKEN` (firmware / backend only).
  - Browser read token → `UPSTASH_PUBSUB_READ_TOKEN` and `VITE_BROKER_WS_TOKEN` (frontend). If Upstash does not distinguish read vs write, create two tokens and limit one to Subscribe only.
6. Choose a channel naming convention (prefix + serial). Recommended: `sensors/<DEVICE_SERIAL>`. Set `UPSTASH_PUBSUB_CHANNEL_PREFIX=sensors/`.

If you cannot (or prefer not to) create a Pub/Sub instance yet, you can still use Redis only:
- Firmware: HTTP POST to Upstash REST `/publish/<channel>` every 5s.
- Backend: Maintain a Redis SUBSCRIBE consumer to broadcast to frontend via existing Django Channels WebSocket.
- Frontend: Use current backend WS path instead of direct broker.

However, direct browser subscription over WebSocket requires Pub/Sub (Redis itself does not expose a generic WS endpoint).

### Frontend `.env` / `env.example`
```
VITE_BROKER_WS_URL=wss://<region>-pubsub.upstash.io/ws
VITE_BROKER_WS_TOKEN=PUBLIC_READ_TOKEN
```
- `VITE_BROKER_WS_TOKEN`: A **read-only** token; never use a write token in the browser.

### Backend `env.example`
```
BROKER_WS_URL=wss://<region>-pubsub.upstash.io/ws
UPSTASH_PUBSUB_WRITE_TOKEN=SECRET_WRITE_TOKEN   # used only for server/device provisioning (not in frontend)
UPSTASH_PUBSUB_READ_TOKEN=PUBLIC_READ_TOKEN     # can be issued short-lived to clients if desired
UPSTASH_PUBSUB_CHANNEL_PREFIX=sensors/
REDIS_PUBSUB_CHANNEL=smartanom:sensors          # legacy, retained for fallback
```
Optionally implement an endpoint to mint short‑lived read tokens (signed JWT embedding channel restrictions) and map to Upstash server-side token rotation.

## 4. Firmware Configuration
Edit `esp32-smartanom.ino` macros:
```
#define UPSTASH_PUBSUB_WS_URL "wss://<region>-pubsub.upstash.io/ws"
#define UPSTASH_PUBSUB_WRITE_TOKEN "REPLACE_WRITE_TOKEN"
#define USE_UPSTASH_PUBSUB true
```
The firmware now:
1. Opens WS to Upstash.
2. Sends `{"type":"auth","token":"<write token>"}`.
3. Publishes every 5s with `{type:publish, channel:"sensors/<serial>", data:<frame>}`.
4. Sends batch ingest every 20s to backend.

## 5. Frontend Subscription Flow
Upon Dashboard mount, the store creates a `RealtimeBrokerClient` per device serial:
1. Connect → send auth (read token).
2. Subscribe to `sensors/<serial>`.
3. On each message frame, merge `data` into `deviceData` state.

## 6. Security & Concurrency Notes
- Write token stays on device / server only.
- Read token can be public or short‑lived; if revocation needed, adopt backend endpoint to proxy token issuance.
- Idempotency: batch ingestion uses `nonce` pattern `<serial>-<epochSec>-<counterHex>`; backend rejects duplicate nonce.
- Ordering: UI uses `ts` (device millis) for monotonic merge; ignore frames older than last seen per serial.
- Retry/Backoff: Firmware and frontend implement exponential backoff (1s → 20s) for broker reconnection.
- Time Skew: Device timestamp is relative (millis); backend assigns server-side timestamp for persisted points.
- Authentication Errors: Frontend marks `auth_error` status; optionally display banner advising refresh or contact support.

## 7. Operational Runbook
| Action | Step |
|--------|------|
| Rotate write token | Update firmware macro + redeploy devices; old token invalidates publish. |
| Add new device | Flash with serial & updated write token; confirm Upstash auth_ok then first realtime frame. |
| Revoke compromised read token | Issue new PUBLIC_READ_TOKEN; deploy new frontend `.env` & rebuild. |
| Broker outage | Frontend falls back to last cached readings; backend batch ingest still persists; investigate Upstash status page. |
| Disable realtime | Set `USE_UPSTASH_PUBSUB=false` in firmware, remove broker client init in store (feature flag). |

## 8. Testing Checklist
- Firmware serial prints `[RT] Auth OK` then publish envelopes.
- Upstash dashboard shows channel traffic for `sensors/<serial>`.
- Browser DevTools WS frames show `message` events with embedded `sensor.realtime` JSON.
- Backend DB gains new rows every 20s (batch ingest) – verify via Django admin or SQL query.

## 9. Migration From Legacy Redis Pub/Sub
- Keep legacy broadcast until stable.
- Introduce `ENABLE_LEGACY_WS=false` feature flag (backend + frontend) then remove old WS client usage.
- Clean up unused Redis publish code to reduce costs.

## 10. Next Steps
- Implement backend endpoint: `POST /api/broker/tokens/issue` returning short-lived read token.
- Add monitoring for publish latency & missed batch intervals (e.g., Prometheus counters or simple DB check). 
- Document token rotation process in primary `README.md`.

---
Reference: Consult Upstash official Pub/Sub WebSocket documentation for region endpoints & token management specifics.
