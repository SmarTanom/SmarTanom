"""Tests for sensor management."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import Sensor, SensorData
from apps.devices.models import Device

User = get_user_model()


class SensorModelTests(TestCase):
    """Tests for the Sensor model."""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com')
        self.device = Device.objects.create(
            user=self.user,
            device_name='Test Device'
        )

    def test_create_sensor(self):
        """Test creating a sensor."""
        sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.PH,
            unit='pH'
        )
        self.assertEqual(sensor.sensor_type, Sensor.SensorType.PH)
        self.assertEqual(sensor.unit, 'pH')
        self.assertEqual(sensor.device, self.device)

    def test_default_units(self):
        """Test that default units are set based on sensor type."""
        sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.TDS
        )
        self.assertEqual(sensor.unit, 'ppm')

        sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.WATER_TEMPERATURE
        )
        self.assertEqual(sensor.unit, '°C')

        sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.TURBIDITY
        )
        self.assertEqual(sensor.unit, 'NTU')


class SensorDataModelTests(TestCase):
    """Tests for the SensorData model."""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com')
        self.device = Device.objects.create(
            user=self.user,
            device_name='Test Device'
        )
        self.sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.PH,
            unit='pH'
        )

    def test_create_sensor_data(self):
        """Test creating sensor data."""
        data = SensorData.objects.create(
            sensor=self.sensor,
            value=7.0
        )
        self.assertEqual(data.value, 7.0)
        self.assertEqual(data.sensor, self.sensor)
