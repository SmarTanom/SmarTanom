"""
Django management command: run_redis_subscriber

Subscribes to a Redis Pub/Sub channel (Upstash-compatible) and persists incoming
sensor readings into the database. Also broadcasts updates via Channels so the
frontend dashboard updates in realtime through the existing WebSocket.

Message format (JSON):
{
  "device_serial": "SMRT-ABC-123",    // preferred (case-insensitive)
  // or: "device_id": 42,
  "timestamp": "2025-11-04T10:11:12Z" | 1730715072, // optional; DB will use server time otherwise
  "readings": {                        // keys are sensor types; values are floats/strings
    "ph": 6.3,
    "ec": 1.85,
    "tds": 980,
    "water_level": 72,
    "water_temperature": 23.4,
    "turbidity": 320,                 // NTU (preferred) or RAW ADC (>1000) which will be converted
    "turbidity_status": "clear"      // optional qualitative flags passed through to WS
  }
}

Resilience:
- Automatic reconnect with exponential backoff when Redis disconnects.
- Defensive JSON parsing; invalid messages are logged and skipped.
- Minimal per-message DB transactions to keep throughput high.

Command counts:
- Uses a single SUBSCRIBE connection. No polling. Keeps Upstash ops minimal.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import time
from contextlib import suppress

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.conf import settings

import redis

logger = logging.getLogger("apps.sensors")


class Command(BaseCommand):
    help = "Run Redis Pub/Sub subscriber to ingest sensor data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--channel",
            dest="channel",
            default=getattr(settings, "REDIS_PUBSUB_CHANNEL", "smartanom:sensors"),
            help="Redis Pub/Sub channel to subscribe to",
        )
        parser.add_argument(
            "--redis-url",
            dest="redis_url",
            default=getattr(settings, "REDIS_URL", os.getenv("REDIS_URL", "")),
            help="Redis connection URL (e.g., rediss://:password@host:port)",
        )

    def handle(self, *args, **options):
        channel = (options.get("channel") or "smartanom:sensors").strip()
        redis_url = (options.get("redis_url") or "").strip()

        if not redis_url:
            self.stderr.write(self.style.ERROR("REDIS_URL is not set. Cannot start subscriber."))
            sys.exit(1)

        self.stdout.write(self.style.SUCCESS(f"[Subscriber] Starting Redis subscriber on channel '{channel}'"))

        backoff = 1.5
        delay = 1.0
        max_delay = 60.0

        while True:
            try:
                # Create a single long-lived Redis connection
                # decode_responses=True gives us str for channel/data
                r = redis.from_url(redis_url, decode_responses=True)
                pubsub = r.pubsub()
                pubsub.subscribe(channel)
                self.stdout.write(self.style.SUCCESS(f"[Subscriber] Subscribed to {channel}"))

                # Blocking listen loop
                for item in pubsub.listen():
                    if not item:
                        continue
                    if item.get("type") != "message":
                        continue

                    raw = item.get("data")
                    if raw is None:
                        continue

                    with suppress(Exception):
                        # Upstash REST /publish endpoint may wrap message in quotes; ensure str
                        if not isinstance(raw, str):
                            raw = str(raw)

                    try:
                        payload = json.loads(raw)
                    except json.JSONDecodeError:
                        logger.warning(f"[Subscriber] Skipping invalid JSON: {str(raw)[:200]}")
                        continue

                    self._process_payload(payload)

                # If we break from listen(), we'll reconnect
                self.stdout.write("[Subscriber] PubSub listen ended, reconnecting...")

            except Exception as e:
                logger.error(f"[Subscriber] Redis error: {e}. Reconnecting in {delay:.1f}s")
                time.sleep(delay)
                delay = min(max_delay, delay * backoff)
                continue
            finally:
                with suppress(Exception):
                    pubsub.close()
                with suppress(Exception):
                    r.close()
                # Reset delay on clean exit from inner loop
                delay = 1.0

    def _process_payload(self, payload: dict):
        from apps.devices.models import Device
        from apps.sensors.models import Sensor, SensorData, SensorLatest
        from apps.sensors.alert_service import SensorAlertService
        from apps.sensors.views import broadcast_sensor_update

        if not isinstance(payload, dict):
            logger.warning("[Subscriber] Received non-dict payload; skipping")
            return

        # Identify device
        device = None
        serial = (payload.get("device_serial") or payload.get("serial") or "").upper().strip()
        device_id = payload.get("device_id")
        try:
            if device_id:
                device = Device.objects.filter(id=device_id).first()
            if not device and serial:
                device, _ = Device.objects.get_or_create(
                    device_serial=serial,
                    defaults={"device_name": serial, "is_bound": False},
                )
            if not device:
                logger.warning("[Subscriber] Payload missing device identifier (device_serial or device_id)")
                return
        except Exception as e:
            logger.error(f"[Subscriber] Failed to resolve device: {e}")
            return

        # Readings map
        readings = payload.get("readings") or {}
        if not isinstance(readings, dict) or not readings:
            logger.info("[Subscriber] Empty readings; nothing to do")
            return

        # Normalize keys and values
        sensor_key_map = {
            'ph': ('ph', 'pH'),
            'tds': ('tds', 'ppm'),
            'ec': ('ec', 'mS/cm'),
            'water_level': ('water_level', '%'),
            'water_temp': ('water_temperature', '°C'),
            'water_temperature': ('water_temperature', '°C'),
            'turbidity': ('turbidity', 'NTU'),
            # qualitative statuses just pass through WS, not stored
        }

        # Store atomically per message
        with transaction.atomic():
            now = timezone.now()
            for key, (stype, unit) in sensor_key_map.items():
                if key not in readings:
                    continue
                raw_val = readings.get(key)
                if raw_val is None:
                    continue
                try:
                    v = float(raw_val)
                except Exception:
                    # skip non-numeric (e.g., turbidity_status)
                    continue


                # Convert turbidity RAW->NTU if value seems ADC range
                if stype == 'turbidity':
                    try:
                        if v > 1000.0:
                            VREF = 3.3
                            ADC_RES = 4095.0
                            TURBIDITY_CLEAR_VOLTAGE = 3.0   # 0 NTU
                            TURBIDITY_MAX_VOLTAGE = 0.5     # 1000 NTU
                            voltage = max(0.0, min(VREF, (v * VREF) / ADC_RES))
                            span_in = TURBIDITY_CLEAR_VOLTAGE - TURBIDITY_MAX_VOLTAGE
                            ntu = 0.0 if span_in == 0 else (TURBIDITY_CLEAR_VOLTAGE - voltage) * (1000.0 / span_in)
                            v = max(0.0, min(1000.0, ntu))
                        # ensure unit kept as NTU
                    except Exception:
                        pass

                sensor, _ = Sensor.objects.get_or_create(
                    device=device,
                    sensor_type=stype,
                    defaults={"unit": unit},
                )

                reading = SensorData.objects.create(sensor=sensor, value=v)

                # Check thresholds and notify if needed
                with suppress(Exception):
                    SensorAlertService.check_and_notify(reading)

                # Update SensorLatest for fast dashboard
                SensorLatest.objects.update_or_create(
                    sensor=sensor,
                    defaults={"value": v, "updated_at": now},
                )

                # Broadcast minimal update to websockets
                with suppress(Exception):
                    broadcast_sensor_update(reading)

        # Optional: pre-broadcast the qualitative flags (e.g., turbidity_status) if provided
        # We piggyback to WS to avoid extra DB ops
        with suppress(Exception):
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer and getattr(settings, "WS_GLOBAL_BROADCAST", False):
                sensors_out = {}
                # pass-through of string statuses without DB writes
                for k in ("turbidity_status", "water_level_state"):
                    if k in readings and readings[k] is not None:
                        sensors_out[k] = str(readings[k])
                if sensors_out:
                    async_to_sync(channel_layer.group_send)(
                        "devices",
                        {
                            "type": "sensor_update",
                            "payload": {
                                "type": "sensor.update",
                                "device_id": device.id,
                                "device_serial": device.device_serial,
                                "timestamp": timezone.now().isoformat(),
                                "sensors": sensors_out,
                                "pre_save": True,
                            },
                        },
                    )

        logger.info(f"[Subscriber] Ingested readings for device={device.device_serial} keys={list(readings.keys())}")
