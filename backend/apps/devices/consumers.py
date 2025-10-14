"""
WebSocket consumers for real-time device and collaborator updates.
Broadcasts changes to all connected clients (admin and users).
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


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
