from __future__ import annotations

import json
from asgiref.sync import async_to_sync
from channels.testing import WebsocketCommunicator
from django.test import TestCase
from smartanom.asgi import application
from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData


class TestDeviceWebSocketIntake(TestCase):
    def test_device_sensor_payload_array_intake(self):
        serial = "SMRT-AAA-111"
        Device.objects.create(device_serial=serial, device_name=serial)

        async def run_case():
            path = f"/ws/device/{serial}/"
            communicator = WebsocketCommunicator(application, path)
            connected, _ = await communicator.connect()
            assert connected is True

            payload = {
                "device_serial": serial,
                "data": [
                    {"type": "ph", "value": 6.8},
                    {"type": "tds", "value": 450},
                    {"type": "ec", "value": 0.9},
                    {"type": "turbidity", "value": 12.5},
                    {"type": "water_temp", "value": 24.5},
                    {"type": "water_level", "value": 80},
                ],
            }

            await communicator.send_to(text_data=json.dumps(payload))
            # Read ack
            _ = await communicator.receive_from()
            await communicator.disconnect()

        async_to_sync(run_case)()

        device = Device.objects.get(device_serial=serial)
        # Ensure sensors created and data stored
        self.assertGreaterEqual(Sensor.objects.filter(device=device).count(), 5)
        self.assertTrue(SensorData.objects.filter(sensor__device=device).exists())
        # Heartbeat should update last_seen
        self.assertIsNotNone(device.last_seen)
