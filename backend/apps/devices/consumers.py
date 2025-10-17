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
    """

    async def connect(self):
        self.serial = self.scope['url_route']['kwargs'].get('serial')
        await self.accept()
        print(f"[DeviceWS] Device channel connected for serial={self.serial}")

    async def disconnect(self, close_code):
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

        wifi_flag = bool(data.get("wifi_configured") or data.get("status") == "connected")
        if wifi_flag and not device.wifi_configured:
            await self._mark_wifi_configured(device)

        # Respond to device
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
