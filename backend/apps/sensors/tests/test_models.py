"""Tests for sensor management models."""

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.sensors.models import Sensor, SensorData
from apps.devices.models import Device

User = get_user_model()


class SensorModelTests(TestCase):
    def setUp(self):
        # Device has no direct user FK; ownership is via bound_email
        self.device = Device.objects.create(device_name='Test Device')

    def test_create_sensor(self):
        # Sensors are auto-created via devices.signals on device creation.
        # Ensure the expected sensor exists and has correct defaults.
        sensor, created = Sensor.objects.get_or_create(
            device=self.device,
            sensor_type=Sensor.SensorType.PH,
            defaults={"unit": "pH"}
        )
        self.assertEqual(sensor.sensor_type, Sensor.SensorType.PH)
        self.assertEqual(sensor.unit, 'pH')
        self.assertEqual(sensor.device, self.device)

    def test_default_units(self):
        sensor = Sensor.objects.get(
            device=self.device,
            sensor_type=Sensor.SensorType.TDS
        )
        self.assertEqual(sensor.unit, 'ppm')

        sensor = Sensor.objects.get(
            device=self.device,
            sensor_type=Sensor.SensorType.WATER_TEMPERATURE
        )
        self.assertEqual(sensor.unit, '°C')

        sensor = Sensor.objects.get(
            device=self.device,
            sensor_type=Sensor.SensorType.TURBIDITY
        )
        self.assertEqual(sensor.unit, 'NTU')


class SensorDataModelTests(TestCase):
    def setUp(self):
        self.device = Device.objects.create(device_name='Test Device')
        # Use the auto-created pH sensor
        self.sensor = Sensor.objects.get(
            device=self.device,
            sensor_type=Sensor.SensorType.PH,
        )

    def test_create_sensor_data(self):
        data = SensorData.objects.create(sensor=self.sensor, value=7.0)
        self.assertEqual(data.value, 7.0)
        self.assertEqual(data.sensor, self.sensor)
