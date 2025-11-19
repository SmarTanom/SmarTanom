"""
WebSocket consumers for real-time device and collaborator updates.
Broadcasts changes to all connected clients (admin and users).

Production hardening notes:
- Render can aggressively close idle WebSocket connections. We implement an
    application-level heartbeat (ping/pong JSON messages) to keep connections
    alive even if Daphne does not send protocol-level pings.
- The device (ESP32) should also send periodic pings; we reply with pong.
"""
import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from apps.devices.models import Device
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from apps.devices.models import DeviceCollaboration


class DeviceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for device updates.

    Handles real-time notifications when:
    - Device is bound/unbound
    - Collaborator is added/revoked
    - Device data changes

    URL: ws://localhost:8000/ws/devices/
    Production: wss://your-render-app.onrender.com/ws/devices/
    """

    async def connect(self):
        """Accept WebSocket connection and add to broadcast group."""
        # SECURITY: Only staff users may join the global broadcast group.
        # Non-staff clients should use the user-specific endpoint to receive
        # filtered updates for their own devices only. This prevents leakage
        # of other users' sensor data when a DRF token (non-JWT) fails the
        # frontend's user id extraction logic.
        user = getattr(self.scope, 'user', None)
        if getattr(settings, "WS_GLOBAL_BROADCAST", False) and user and getattr(user, 'is_staff', False):
            await self.channel_layer.group_add("devices", self.channel_name)
        await self.accept()
        print(f"[WebSocket] Client connected: {self.channel_name}")

    async def disconnect(self, close_code):
        """Remove from broadcast group on disconnect."""
        user = getattr(self.scope, 'user', None)
        if getattr(settings, "WS_GLOBAL_BROADCAST", False) and user and getattr(user, 'is_staff', False):
            await self.channel_layer.group_discard("devices", self.channel_name)
        print(f"[WebSocket] Client disconnected: {self.channel_name} (code: {close_code})")

    async def receive(self, text_data):
        """
        Handle incoming WebSocket messages (optional).
        Currently not used - all updates are server-initiated.
        """
        try:
            data = json.loads(text_data)
            print(f"[WebSocket] Received message: {data}")
        except json.JSONDecodeError:
            print(f"[WebSocket] Invalid JSON received: {text_data}")

    async def device_update(self, event):
        """
        Broadcast device update to all connected clients.

        Called via:
            channel_layer.group_send("devices", {
                "type": "device_update",
                "data": {...}
            })

        Event structure:
        {
            "type": "device_update",
            "action": "bind" | "unbind" | "collaborator_added" | "collaborator_revoked",
            "data": {
                "device_id": int,
                "device_serial": str,
                "bound_email": str | null,
                "collaborator_email": str (if applicable),
                ...
            }
        }
        """
        # Send the update to the WebSocket client
        await self.send(text_data=json.dumps({
            "action": event.get("action"),
            "data": event.get("data"),
            "timestamp": event.get("timestamp")
        }))
        print(f"[WebSocket] Broadcasted: {event.get('action')}")

    async def sensor_update(self, event):
        """
        Broadcast real-time sensor data updates to all connected clients.

        Called via:
            channel_layer.group_send("devices", {
                "type": "sensor_update",
                "payload": {
                    "type": "sensor.update",
                    "device_id": 1,
                    "timestamp": "...",
                    "sensors": {...}
                }
            })
        """
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))
        print(f"[WebSocket] Broadcasted sensor.update for device {payload.get('device_id')}")

    async def alert_update(self, event):
        """
        Broadcast alert updates to all connected clients.

        Called via:
            channel_layer.group_send("devices", {
                "type": "alert_update",
                "payload": {
                    "type": "alert.new",
                    "device_id": 1,
                    "alert": {...}
                }
            })
        """
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))
        print(f"[WebSocket] Broadcasted alert.new for device {payload.get('device_id')}")

    async def admin_update(self, event):
        """
        Broadcast admin-specific updates (device/user CRUD operations).

        Called via:
            channel_layer.group_send("devices", {
                "type": "admin_update",
                "payload": {
                    "type": "admin.device_created" | "admin.device_updated" | "admin.device_deleted" |
                           "admin.user_created" | "admin.user_updated" | "admin.user_deleted",
                    "data": {...}
                }
            })
        """
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))
        print(f"[WebSocket] Broadcasted admin update: {payload.get('type')}")


class UserConsumer(AsyncWebsocketConsumer):
    """
    User-specific WebSocket consumer for personalized updates.

    Joins a user-specific group to receive targeted notifications.
    URL: ws://localhost:8000/ws/user/<user_id>/
    """

    async def connect(self):
        """Connect to user-specific channel."""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f"user_{self.user_id}"

        # Join user-specific group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        print(f"[WebSocket] User {self.user_id} connected")

    async def disconnect(self, close_code):
        """Disconnect from user-specific channel."""
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        print(f"[WebSocket] User {self.user_id} disconnected")

    async def user_notification(self, event):
        """
        Send user-specific notifications.

        Event structure:
        {
            "type": "user_notification",
            "message": str,
            "data": {...}
        }
        """
        await self.send(text_data=json.dumps({
            "message": event.get("message"),
            "data": event.get("data"),
            "timestamp": event.get("timestamp")
        }))

    async def sensor_update(self, event):
        """
        Send real-time sensor data updates to user-specific channels.

        Event structure:
        {
            "type": "sensor_update",
            "payload": {
                "type": "sensor.update",
                "device_id": 1,
                "timestamp": "...",
                "sensors": {...}
            }
        }
        """
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))
        print(f"[WebSocket] Sent sensor.update to user {self.user_id} for device {payload.get('device_id')}")

    async def alert_update(self, event):
        """
        Send alert updates to user-specific channels.

        Event structure:
        {
            "type": "alert_update",
            "payload": {
                "type": "alert.new",
                "device_id": 1,
                "alert": {...}
            }
        }
        """
        payload = event.get("payload", {})
        await self.send(text_data=json.dumps(payload))
        print(f"[WebSocket] Sent alert to user {self.user_id} for device {payload.get('device_id')}")


class DeviceOnboardingConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for device onboarding/handshake.

    Path: ws://<host>/ws/device/<device_serial>/

    Expected first message (JSON):
        {"device_serial": "SMRT-XXX-XXX", "wifi_configured": true}

    Behavior:
    - Ensure Device exists; if not, create placeholder with serial as name
    - Mark wifi_configured=True when indicated
    - Echo back confirmation: {status: "ok", device_registered: true}
    - Broadcast device_update to "devices" group for UI refresh
    - Listen for WiFi reset commands from backend
    """

    async def connect(self):
        # Normalize and capture serial from URL
        raw_serial = (self.scope.get('url_route') or {}).get('kwargs', {}).get('serial', '')
        self.serial = (raw_serial or '').upper()
        self.device_group = f"device_{self.serial}" if self.serial else None
        self._keepalive_task = None

        print(f"[DeviceWS] ⇢ Connection attempt serial={self.serial} path={self.scope.get('path')} scheme={self.scope.get('scheme')}")

        if not self.serial:
            print("[DeviceWS] ✗ Missing device serial in URL")
            await self.close(code=4003)
            return

        try:
            # Join device-specific group for targeted messages
            await self.channel_layer.group_add(self.device_group, self.channel_name)
            print(f"[DeviceWS] ✓ Joined group: {self.device_group}")

            # Accept the WebSocket connection ONCE here
            await self.accept()
            print(f"[DeviceWS] ✓ Connection accepted for serial={self.serial}")

            # Start server-side keepalive pings (JSON) every 30 seconds
            # This helps prevent Render proxy timeouts and keeps the TCP flow active
            self._keepalive_task = asyncio.create_task(self._keepalive_loop())
        except Exception as e:
            print(f"[DeviceWS] ✗ Connection failed: {e}")
            # Use an application-defined close code in the allowed range (3000-4999)
            await self.close(code=4000)

    async def disconnect(self, close_code):
        # Leave device-specific group
        if hasattr(self, 'device_group'):
            await self.channel_layer.group_discard(self.device_group, self.channel_name)
        # Stop keepalive task if any
        if getattr(self, '_keepalive_task', None):
            try:
                self._keepalive_task.cancel()
            except Exception:
                pass
        # Best-effort extra context
        try:
            client = self.scope.get("client")
            headers = {k.decode(): v.decode(errors='ignore') for k, v in (self.scope.get("headers") or [])}
        except Exception:
            client, headers = None, {}
        print(f"[DeviceWS] ⇠ Disconnected serial={getattr(self, 'serial', None)} code={close_code} client={client} ua={headers.get('user-agent')} proto={headers.get('x-forwarded-proto')} host={headers.get('host')}")

    async def receive(self, text_data=None, bytes_data=None):
        # Support both text and binary payloads (common in ESP32 libs)
        raw = text_data
        if raw is None and bytes_data is not None:
            try:
                raw = bytes_data.decode('utf-8', errors='replace')
            except Exception:
                raw = ''

        print(f"[DeviceWS] ← Received message from {getattr(self, 'serial', 'unknown')}: {str(raw)[:200]}")

        try:
            data = json.loads(raw or '{}')
        except json.JSONDecodeError:
            print(f"[DeviceWS] ✗ Invalid JSON received")
            await self.send(text_data=json.dumps({"status": "error", "message": "invalid json"}))
            return

        # Respond to device heartbeat pings promptly
        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong", "t": timezone.now().isoformat()}))
            return

        serial = (data.get("device_serial") or self.serial or "").upper()
        if not serial:
            await self.send(text_data=json.dumps({"status": "error", "message": "missing device_serial"}))
            return

        # Send immediate ACK to keep client connected; do heavier work after
        try:
            await self.send(text_data=json.dumps({
                "status": "ok",
                "type": "ack",
                "serial": serial,
                "server_time": timezone.now().isoformat(),
            }))
        except Exception as _e_ack:
            print(f"[DeviceWS] Warning: failed to send immediate ACK to {serial}: {_e_ack}")

        device = await self._get_or_create_device(serial)

        # Handle WiFi configuration handshake
        wifi_flag = bool(data.get("wifi_configured") or data.get("status") == "connected")
        if wifi_flag and not device.wifi_configured:
            await self._mark_wifi_configured(device)

        # Handle sensor data streaming (accept dict or array formats)
        payload_type = data.get("type")
        sensor_data = data.get("data", {})

        # Support array payloads as per firmware requirement
        # Example: {"device_serial":"...","data":[{"type":"ph","value":6.8}, ...]}
        if isinstance(sensor_data, list):
            parsed = {}
            for item in sensor_data:
                try:
                    t = str(item.get("type", "")).strip().lower()
                    v = item.get("value", None)
                    if t and v is not None:
                        parsed[t] = v
                except Exception:
                    # Skip malformed entries
                    continue
            sensor_data = parsed

        # If type explicitly says sensor_data OR data looks like sensor dict, process
        if payload_type == "sensor_data" or isinstance(sensor_data, dict) and sensor_data:
            if sensor_data:
                # Debug log
                try:
                    keys = ",".join(list(sensor_data.keys()))
                except Exception:
                    keys = ""
                print(f"[DeviceWS] RX sensor data for {serial}: keys=[{keys}] raw={sensor_data}")

                # Capture client IP from scope
                client = self.scope.get("client") or (None, None)
                client_ip = client[0] if isinstance(client, (list, tuple)) and client else None

                # 1) IMMEDIATE BROADCAST: push updates to UI first (optimistic), then persist
                try:
                    normalized = self._normalize_sensor_updates(sensor_data)
                    if normalized:
                        await self._broadcast_sensor_update_immediate(device, normalized)
                except Exception as _bex:
                    print(f"[DeviceWS] Warning: immediate broadcast failed for {serial}: {_bex}")

                # 2) Persist in the background without blocking the socket handler
                try:
                    asyncio.create_task(self._persist_sensor_data(device, sensor_data, client_ip))
                except Exception as _pex:
                    print(f"[DeviceWS] Warning: scheduling persistence failed for {serial}: {_pex}")

                # 3) Early ACK so the device doesn't wait for DB I/O
                await self.send(text_data=json.dumps({
                    "status": "ok",
                    "message": "Sensor data received",
                    "timestamp": timezone.now().isoformat(),
                }))
                return

        # Not a sensor payload; treat as handshake/keepalive
        print(f"[DeviceWS] Handshake/keepalive received from {serial}")

        # Responded with immediate ACK above; include device_registered here as a follow-up if needed
        await self.send(text_data=json.dumps({
            "status": "ok",
            "type": "ack",
            "device_registered": True,
            "serial": serial,
            "server_time": timezone.now().isoformat(),
        }))

        # Broadcast to UI listeners
        if getattr(settings, "WS_GLOBAL_BROADCAST", False):
            await self.channel_layer.group_send(
                "devices",
                {
                    "type": "device_update",
                    "action": "onboarded",
                    "data": {
                        "device_serial": serial,
                        "wifi_configured": True,
                    },
                    "timestamp": timezone.now().isoformat(),
                },
            )

    async def _keepalive_loop(self):
        """Send periodic application-level pings to keep the WebSocket alive."""
        try:
            while True:
                await asyncio.sleep(30)  # seconds
                payload = {"type": "ping", "t": timezone.now().isoformat(), "serial": self.serial}
                try:
                    await self.send(text_data=json.dumps(payload))
                    # Note: ESP32 should reply with {"type":"pong"}; absence is tolerated
                    print(f"[DeviceWS] → Keepalive ping sent to {self.serial}")
                except Exception as e:
                    print(f"[DeviceWS] Keepalive send failed for {self.serial}: {e}")
                    # Break to let connection close gracefully
                    break
        except asyncio.CancelledError:
            # Task cancelled on disconnect
            pass

    @database_sync_to_async
    def _get_or_create_device(self, serial: str):
        device, _ = Device.objects.get_or_create(
            device_serial=serial,
            defaults={
                "device_name": serial,
                "is_bound": False,
            },
        )
        return device

    @database_sync_to_async
    def _mark_wifi_configured(self, device: Device):
        device.wifi_configured = True
        device.save(update_fields=["wifi_configured", "updated_at"]) if hasattr(device, "updated_at") else device.save(update_fields=["wifi_configured"])

    async def wifi_reset_command(self, event):
        """
        Handle WiFi reset command from backend.

        When backend triggers WiFi reset via API, this method receives
        the command and forwards it to the connected ESP32 device.

        Event structure:
        {
            "type": "wifi_reset_command",
            "action": "reset_wifi",
            "device_serial": "SMRT-XXX-XXX",
            "timestamp": "..."
        }
        """
        # Forward the reset command to the ESP32 device
        await self.send(text_data=json.dumps({
            "action": "reset_wifi",
            "device_serial": event.get("device_serial"),
            "timestamp": event.get("timestamp"),
            "message": "Clear WiFi credentials and restart into AP mode"
        }))
        print(f"[DeviceWS] Sent WiFi reset command to device {event.get('device_serial')}")

    @database_sync_to_async
    def _process_sensor_data(self, device, sensor_data, client_ip: str | None = None, do_broadcast: bool = False):
        """
        Process incoming sensor data from ESP32 device.

        Creates or updates Sensor objects and stores SensorData readings.
        Broadcasts updates via WebSocket to all connected clients.

        Args:
            device: Device instance
            sensor_data: Dict with sensor readings (ph, tds, ec, water_level, water_temp, turbidity)
        """
        from apps.sensors.models import Sensor, SensorData
        from apps.sensors.views import broadcast_sensor_update

        # Rate limiting per device (max 20 messages per minute)
        try:
            minute_bucket = timezone.now().strftime('%Y%m%d%H%M')
            rl_key = f"rl:dev:{device.device_serial}:{minute_bucket}"
            cnt = cache.get(rl_key, 0)
            if cnt >= 20:
                print(f"[DeviceWS] Rate limit exceeded for {device.device_serial} — skipping this batch")
                return
            cache.set(rl_key, cnt + 1, timeout=75)
        except Exception:
            pass

        # Update device heartbeat info
        try:
            device.last_seen = timezone.now()
            if client_ip:
                device.ip_address = client_ip
            # Save without touching other fields
            device.save(update_fields=["last_seen", "ip_address"])
        except Exception as e:
            print(f"[DeviceWS] Warning: failed to update heartbeat for {device.device_serial}: {e}")

        # Accept both 'water_temp' (legacy) and 'water_temperature' (preferred)
        sensor_types = {
            'ph': ('ph', 'pH'),
            'tds': ('tds', 'ppm'),
            'ec': ('ec', 'mS/cm'),
            'water_level': ('water_level', '%'),
            'water_temp': ('water_temperature', '°C'),
            'water_temperature': ('water_temperature', '°C'),
            # Turbidity stored as NTU (dashboard displays NTU)
            'turbidity': ('turbidity', 'NTU'),
        }

    # Removed pre-save aggregated broadcast to prevent double updates and ensure consistent ingestion

        saved_updates = {}
        for key, (sensor_type, unit) in sensor_types.items():
            value = sensor_data.get(key)
            if value is not None:
                try:
                    # Get or create sensor
                    sensor, created = Sensor.objects.get_or_create(
                        device=device,
                        sensor_type=sensor_type,
                        defaults={'unit': unit}
                    )

                    save_value = float(value)
                    # Convert turbidity RAW -> NTU at ingestion if needed
                    if sensor_type == 'turbidity':
                        try:
                            # If value looks like RAW (range up to 4095), convert; if already in NTU (<= 1000), leave
                            if save_value > 1000.0:
                                VREF = 3.3
                                ADC_RES = 4095.0
                                TURBIDITY_CLEAR_VOLTAGE = 3.0   # 0 NTU
                                TURBIDITY_MAX_VOLTAGE = 0.5     # 1000 NTU
                                voltage = max(0.0, min(VREF, (save_value * VREF) / ADC_RES))
                                span_in = TURBIDITY_CLEAR_VOLTAGE - TURBIDITY_MAX_VOLTAGE
                                ntu = 0.0 if span_in == 0 else (TURBIDITY_CLEAR_VOLTAGE - voltage) * (1000.0 / span_in)
                                save_value = max(0.0, min(1000.0, ntu))
                            # Ensure sensor unit reflects NTU
                            if sensor.unit != 'NTU':
                                sensor.unit = 'NTU'
                                sensor.save(update_fields=['unit'])
                        except Exception:
                            pass

                    # Idempotent create using ingest_id when provided
                    ingest_id = str(sensor_data.get('ingest_id') or '')
                    if not ingest_id:
                        # Fallback: derive a simple windowed id from server time to reduce duplicates
                        # Note: real dedupe relies on firmware-provided ingest_id
                        ingest_id = f"srv-{int(timezone.now().timestamp())}-{sensor_type}"

                    reading, created_rd = SensorData.objects.get_or_create(
                        sensor=sensor,
                        ingest_id=ingest_id,
                        defaults={"value": save_value}
                    )

                    # Update SensorLatest only if newer
                    try:
                        from apps.sensors.models import SensorLatest
                        latest, _ = SensorLatest.objects.get_or_create(sensor=sensor)
                        # Compare timestamps; created_at may be auto-set if newly created
                        ts_new = getattr(reading, 'created_at', timezone.now())
                        ts_old = getattr(latest, 'updated_at', None)
                        if not ts_old or ts_new >= ts_old:
                            latest.value = reading.value
                            latest.status = ""
                            latest.save(update_fields=["value", "status", "updated_at"]) if hasattr(latest, "updated_at") else latest.save(update_fields=["value", "status"])
                    except Exception as e:
                        print(f"[DeviceWS] Warning: failed to update SensorLatest for {device.device_serial}: {e}")

                    # Accumulate for batched broadcast
                    saved_updates[sensor_type] = reading.value

                    print(f"[DeviceWS] Stored {sensor_type}={value}{unit} for device {device.device_serial}")

                except Exception as e:
                    print(f"[DeviceWS] Error storing {sensor_type} data: {str(e)}")

        # Post-persist broadcast is optional now; default off to avoid duplicate messages
        if do_broadcast:
            try:
                if saved_updates:
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        payload = {
                            "type": "sensor.update",
                            "device_id": device.id,
                            "device_serial": device.device_serial,
                            "device_name": device.device_name,
                            "timestamp": timezone.now().isoformat(),
                            "sensors": saved_updates,
                        }
                        if getattr(settings, "WS_GLOBAL_BROADCAST", False):
                            async_to_sync(channel_layer.group_send)(
                                "devices",
                                {
                                    "type": "sensor_update",
                                    "payload": payload,
                                },
                            )
                        # Owner + collaborators targeted broadcast
                        try:
                            User = get_user_model()
                            owner_group = None
                            if getattr(device, "bound_email", None):
                                user = User.objects.filter(email__iexact=device.bound_email).first()
                                if user:
                                    owner_group = f"user_{user.id}"
                                    async_to_sync(channel_layer.group_send)(
                                        owner_group,
                                        {"type": "sensor_update", "payload": payload},
                                    )
                            # Collaborators
                            collaborator_emails = list(
                                DeviceCollaboration.objects.filter(
                                    device=device,
                                    status=DeviceCollaboration.Status.ACTIVE,
                                ).values_list("collaborator_email", flat=True)
                            )
                            if collaborator_emails:
                                users = User.objects.filter(email__in=collaborator_emails)
                                for u in users:
                                    grp = f"user_{u.id}"
                                    if grp == owner_group:
                                        continue
                                    async_to_sync(channel_layer.group_send)(
                                        grp,
                                        {"type": "sensor_update", "payload": payload},
                                    )
                        except Exception as ex:
                            print(f"[DeviceWS] Warning: failed targeted broadcast for {device.device_serial}: {ex}")
            except Exception as e:
                print(f"[DeviceWS] Warning: batched broadcast failed for {device.device_serial}: {e}")

    def _normalize_sensor_updates(self, sensor_data: dict) -> dict:
        """Convert incoming sensor_data to a normalized map suitable for UI broadcast.

        Applies the same turbidity conversion heuristic used for persistence so
        the UI displays the final values immediately.
        """
        updates = {}
        try:
            # Mirror the mapping used in persistence
            sensor_types = {
                'ph': ('ph', 'pH'),
                'tds': ('tds', 'ppm'),
                'ec': ('ec', 'mS/cm'),
                'water_level': ('water_level', '%'),
                'water_temp': ('water_temperature', '°C'),
                'water_temperature': ('water_temperature', '°C'),
                'turbidity': ('turbidity', 'NTU'),
            }
            for key, (stype, _unit) in sensor_types.items():
                if key in sensor_data and sensor_data.get(key) is not None:
                    try:
                        val = float(sensor_data.get(key))
                        if stype == 'turbidity':
                            # Apply the same RAW->NTU heuristic as persistence
                            if val > 1000.0:
                                VREF = 3.3
                                ADC_RES = 4095.0
                                TURBIDITY_CLEAR_VOLTAGE = 3.0
                                TURBIDITY_MAX_VOLTAGE = 0.5
                                voltage = max(0.0, min(VREF, (val * VREF) / ADC_RES))
                                span_in = TURBIDITY_CLEAR_VOLTAGE - TURBIDITY_MAX_VOLTAGE
                                ntu = 0.0 if span_in == 0 else (TURBIDITY_CLEAR_VOLTAGE - voltage) * (1000.0 / span_in)
                                val = max(0.0, min(1000.0, ntu))
                        updates[stype] = val
                    except Exception:
                        # ignore non-numeric values
                        pass
        except Exception:
            return {}
        return updates

    async def _broadcast_sensor_update_immediate(self, device, updates: dict):
        """Broadcast sensor.update to interested clients immediately (pre-DB)."""
        if not updates:
            return
        try:
            channel_layer = get_channel_layer()
            if not channel_layer:
                return
            payload = {
                "type": "sensor.update",
                "device_id": device.id,
                "device_serial": device.device_serial,
                "device_name": device.device_name,
                "timestamp": timezone.now().isoformat(),
                "sensors": updates,
            }
            # Global (admins) if enabled
            if getattr(settings, "WS_GLOBAL_BROADCAST", False):
                await self.channel_layer.group_send("devices", {"type": "sensor_update", "payload": payload})

            # Owner + collaborators targeted broadcast
            try:
                User = get_user_model()
                owner_group = None
                if getattr(device, "bound_email", None):
                    user = await database_sync_to_async(lambda: User.objects.filter(email__iexact=device.bound_email).first())()
                    if user:
                        owner_group = f"user_{user.id}"
                        await self.channel_layer.group_send(owner_group, {"type": "sensor_update", "payload": payload})

                # Collaborators
                async def _get_collabs():
                    return list(DeviceCollaboration.objects.filter(
                        device=device,
                        status=DeviceCollaboration.Status.ACTIVE,
                    ).values_list("collaborator_email", flat=True))
                collaborator_emails = await database_sync_to_async(_get_collabs)()
                if collaborator_emails:
                    async def _get_users():
                        return list(User.objects.filter(email__in=collaborator_emails))
                    users = await database_sync_to_async(_get_users)()
                    for u in users:
                        grp = f"user_{u.id}"
                        if grp == owner_group:
                            continue
                        await self.channel_layer.group_send(grp, {"type": "sensor_update", "payload": payload})
            except Exception as ex:
                print(f"[DeviceWS] Warning: immediate targeted broadcast failed for {device.device_serial}: {ex}")
        except Exception as e:
            print(f"[DeviceWS] Warning: immediate broadcast failed for {device.device_serial}: {e}")

    async def _persist_sensor_data(self, device, sensor_data, client_ip: str | None):
        """Async wrapper to persist sensor data without duplicating broadcast."""
        try:
            await self._process_sensor_data(device, sensor_data, client_ip, do_broadcast=False)
        except Exception as e:
            print(f"[DeviceWS] Warning: persistence task failed for {device.device_serial}: {e}")
