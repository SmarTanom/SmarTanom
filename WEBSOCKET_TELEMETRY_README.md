# Device → Backend WebSocket Telemetry

This document summarizes the ESP32 → Django Channels WebSocket flow, payload format, and quick checks for local development.

## Endpoint
- Path: `/ws/device/<DEVICE_SERIAL>/`
- Protocol: `wss://` in production; `ws://` in local dev
- Firmware dev flag: `FORCE_WS_INSECURE` to force `ws://` when testing locally without TLS

## Payload Format (from device)
Send a single JSON object containing the serial and an array of type/value readings:

{
  "device_serial": "SMRT-ABC-123",
  "data": [
    {"type": "ph", "value": 6.8},
    {"type": "tds", "value": 420},
    {"type": "ec",  "value": 0.85},
    {"type": "turbidity", "value": 10.2},
    {"type": "water_temp", "value": 24.1},
    {"type": "water_level", "value": 78}
  ]
}

Accepted types map to sensors as follows:
- ph → SensorType.ph (unit pH)
- tds → SensorType.tds (unit ppm)
- ec → SensorType.ec (unit mS/cm)
- turbidity → SensorType.turbidity (unit NTU)
- water_temp → SensorType.water_temperature (unit °C)
- water_level → SensorType.water_level (unit %)

Notes:
- The device onboarding consumer also accepts a dict-shaped `data` for backward compatibility.
- The first handshake can include `{ "wifi_configured": true }` which marks the device as configured.

## Backend behavior
- DeviceOnboardingConsumer parses the payload and upserts Sensor + SensorData rows.
- Device heartbeat is updated: `device.last_seen = now()` and `device.ip_address` set from WebSocket client.
- Real-time broadcasts are emitted to:
  - Global admin group "devices" with both legacy action payloads and typed `sensor.update` events.
  - Owner and collaborators (when bound) on user-specific groups.

## Frontend
- Admin dashboard now connects to the global stream and handles `sensor.update` typed events.
- User dashboard already listens to `sensor.update`.

## Local quick test
- Backend: from the repo root run `python backend/manage.py runserver`.
- Simulate device intake via Channels test is available at `apps/sensors/tests/test_device_ws_intake.py`.
- Minimal manual check (optional): open a WebSocket client to `/ws/device/SMRT-TEST-001/` and send a payload matching the example above; observe stored SensorData and device `last_seen` update in the admin.

## Troubleshooting
- If sqlite is used locally, all composite indexes and unique constraints are present; ensure migrations are applied.
- If tests fail due to unique constraint on Sensor, remember sensors are auto-created via `apps.devices.signals` when a Device is created; use `get()` or `get_or_create()` in tests.
- For TLS issues on ESP32 in dev, enable `FORCE_WS_INSECURE` to force `ws://`.
