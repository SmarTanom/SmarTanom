import os
import json
import asyncio
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from apps.devices.models import Device, DeviceCollaboration

try:
    import redis.asyncio as redis_async
except ImportError:  # fallback if redis<4 asyncio import style changes
    import redis as redis_async  # type: ignore

logger = logging.getLogger("apps.devices.relay")

# Mapping from incoming realtime payload keys to internal sensor types
SENSOR_KEY_MAP = {
    "ph": "ph",
    "tds": "tds",
    "ec": "ec",
    "water_level": "water_level",
    "temp": "water_temperature",  # firmware may send temp
    "water_temperature": "water_temperature",
    "turbidity": "turbidity",
}

class Command(BaseCommand):
    help = "Run Redis realtime relay (Redis-only fallback). Subscribes to sensors:* and broadcasts sensor.update frames."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Process a single message then exit (debug)")

    async def _broadcast_payload(self, device: Device, sensors: dict):
        if not sensors:
            return
        channel_layer = get_channel_layer()
        if not channel_layer:
            logger.warning("Channel layer unavailable; skipping broadcast")
            return
        payload = {
            "type": "sensor.update",
            "device_id": device.id,
            "device_serial": device.device_serial,
            "device_name": device.device_name,
            "timestamp": timezone.now().isoformat(),
            "sensors": sensors,
        }
        # Global admin group
        from django.conf import settings
        if getattr(settings, "WS_GLOBAL_BROADCAST", False):
            await channel_layer.group_send("devices", {"type": "sensor_update", "payload": payload})

        # Owner + collaborators targeted groups
        try:
            User = get_user_model()
            if getattr(device, "bound_email", None):
                owner = await asyncio.to_thread(lambda: User.objects.filter(email__iexact=device.bound_email).first())
                if owner:
                    await channel_layer.group_send(f"user_{owner.id}", {"type": "sensor_update", "payload": payload})
            collab_emails = await asyncio.to_thread(lambda: list(DeviceCollaboration.objects.filter(
                device=device,
                status=DeviceCollaboration.Status.ACTIVE
            ).values_list("collaborator_email", flat=True)))
            if collab_emails:
                users = await asyncio.to_thread(lambda: list(User.objects.filter(email__in=collab_emails)))
                for u in users:
                    await channel_layer.group_send(f"user_{u.id}", {"type": "sensor_update", "payload": payload})
        except Exception as e:
            logger.warning("Targeted broadcast failed for %s: %s", device.device_serial, e)

    async def _process_message(self, channel: str, data: str, prefix: str):
        # Expect channel like sensors:SMRT-ABC-123
        if not channel.startswith(prefix):
            return
        serial = channel[len(prefix):].strip().upper()
        if not serial:
            return
        try:
            payload = json.loads(data)
        except json.JSONDecodeError:
            logger.debug("Ignoring non-JSON message on %s", channel)
            return
        if payload.get("type") != "sensor.realtime":
            return
        sensor_map_in = payload.get("data") or {}
        sensors = {}
        for k, v in sensor_map_in.items():
            target = SENSOR_KEY_MAP.get(k)
            if not target:
                continue
            try:
                val = float(v)
                sensors[target] = val
            except Exception:
                continue
        if not sensors:
            return
        # Water level camelCase for frontend
        if "water_level" in sensors:
            sensors["waterLevel"] = sensors.pop("water_level")
        # Acquire / create device
        device = await asyncio.to_thread(lambda: Device.objects.get_or_create(device_serial=serial, defaults={"device_name": serial})[0])
        await self._broadcast_payload(device, sensors)

    async def _run(self, once: bool = False):
        redis_url = os.getenv("REDIS_URL")
        prefix = os.getenv("REDIS_SENSOR_CHANNEL_PREFIX", "sensors:")
        if not redis_url:
            self.stderr.write("REDIS_URL not set")
            return
        client = redis_async.from_url(redis_url, decode_responses=True)
        pubsub = client.pubsub()
        pattern = f"{prefix}*"
        await pubsub.psubscribe(pattern)
        logger.info("Subscribed to pattern %s", pattern)
        try:
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    channel = message.get("channel") or ""
                    data = message.get("data") or ""
                    try:
                        await self._process_message(channel, data, prefix)
                    except Exception as e:
                        logger.warning("Failed processing message on %s: %s", channel, e)
                    finally:
                        close_old_connections()
                    if once:
                        break
                await asyncio.sleep(0.05)
        finally:
            try:
                await pubsub.punsubscribe(pattern)
            except Exception:
                pass
            await client.close()

    def handle(self, *args, **options):
        once = options.get("once")
        self.stdout.write("Starting Redis realtime relay... (pattern sensors:*)")
        try:
            asyncio.run(self._run(once=once))
        except KeyboardInterrupt:
            self.stdout.write("Relay stopped by user")
        except Exception as e:
            self.stderr.write(f"Relay crashed: {e}")
