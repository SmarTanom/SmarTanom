"""
WebSocket consumers for real-time device and collaborator updates.
Broadcasts changes to all connected clients (admin and users).
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from apps.devices.models import Device


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
        # Join the "devices" group for broadcasting
        await self.channel_layer.group_add("devices", self.channel_name)
        await self.accept()
        print(f"[WebSocket] Client connected: {self.channel_name}")

    async def disconnect(self, close_code):
        """Remove from broadcast group on disconnect."""
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
        self.serial = self.scope['url_route']['kwargs'].get('serial')
        self.device_group = f"device_{self.serial}"

        # Join device-specific group for targeted messages
        await self.channel_layer.group_add(self.device_group, self.channel_name)
        await self.accept()
        print(f"[DeviceWS] Device channel connected for serial={self.serial}, joined group={self.device_group}")

    async def disconnect(self, close_code):
        # Leave device-specific group
        if hasattr(self, 'device_group'):
            await self.channel_layer.group_discard(self.device_group, self.channel_name)
        print(f"[DeviceWS] Device channel disconnected serial={getattr(self, 'serial', None)} code={close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data or '{}')
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"status": "error", "message": "invalid json"}))
            return

        serial = (data.get("device_serial") or self.serial or "").upper()
        if not serial:
            await self.send(text_data=json.dumps({"status": "error", "message": "missing device_serial"}))
            return

        device = await self._get_or_create_device(serial)

        # Handle WiFi configuration handshake
        wifi_flag = bool(data.get("wifi_configured") or data.get("status") == "connected")
        if wifi_flag and not device.wifi_configured:
            await self._mark_wifi_configured(device)

        # Handle sensor data streaming
        if data.get("type") == "sensor_data":
            sensor_data = data.get("data", {})
            if sensor_data:
                await self._process_sensor_data(device, sensor_data)

                # Acknowledge receipt
                await self.send(text_data=json.dumps({
                    "status": "ok",
                    "message": "Sensor data received",
                    "timestamp": timezone.now().isoformat(),
                }))
                return

        # Respond to device (initial handshake)
        await self.send(text_data=json.dumps({
            "status": "ok",
            "device_registered": True,
            "serial": serial,
            "server_time": timezone.now().isoformat(),
        }))

        # Broadcast to UI listeners
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
    def _process_sensor_data(self, device, sensor_data):
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

        sensor_types = {
            'ph': ('ph', 'pH'),
            'tds': ('tds', 'ppm'),
            'ec': ('ec', 'mS/cm'),
            'water_level': ('water_level', '%'),
            'water_temp': ('water_temperature', '°C'),
            'turbidity': ('turbidity', 'NTU'),
        }

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

                    # Create sensor data reading
                    reading = SensorData.objects.create(
                        sensor=sensor,
                        value=float(value)
                    )

                    # Broadcast to WebSocket clients
                    broadcast_sensor_update(reading)

                    print(f"[DeviceWS] Stored {sensor_type}={value}{unit} for device {device.device_serial}")

                except Exception as e:
                    print(f"[DeviceWS] Error storing {sensor_type} data: {str(e)}")
