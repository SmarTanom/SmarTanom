"""Tests for monitoring app models & API endpoints.

These are basic smoke & validation tests; expand as needed.
"""

from __future__ import annotations

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Device, Reservoir, Sensor, SensorData

User = get_user_model()


class MonitoringModelTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="tester", password="pass12345")
		self.device = Device.objects.create(user=self.user, device_name="Dev A")

	def test_reservoir_date_validation(self):
		r = Reservoir(
			device=self.device,
			reservoir_name="R1",
			plant_type="Lettuce",
			start_date=date.today(),
			end_date=date.today() - timedelta(days=1),
		)
		with self.assertRaises(ValidationError):
			r.full_clean()

	def test_sensor_and_data_creation(self):
		sensor = Sensor.objects.create(device=self.device, sensor_type=Sensor.SensorType.TEMPERATURE, unit="C")
		reading = SensorData.objects.create(sensor=sensor, value=23.4)
		self.assertAlmostEqual(reading.value, 23.4)
		self.assertEqual(reading.sensor_id, sensor.id)


class MonitoringAPITests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="apiuser", password="pass12345")
		self.client.login(username="apiuser", password="pass12345")
		self.device = Device.objects.create(user=self.user, device_name="Main Device")

	def test_create_sensor_via_api(self):
		url = reverse("sensor-list")
		resp = self.client.post(
			url,
			{
				"device_id": self.device.id,
				"sensor_type": Sensor.SensorType.TEMPERATURE,
				"unit": "C",
			},
			format="json",
		)
		self.assertEqual(resp.status_code, 201, resp.content)
		self.assertEqual(Sensor.objects.count(), 1)

	def test_list_devices_returns_only_user_devices(self):
		other = User.objects.create_user(username="other", password="pass12345")
		Device.objects.create(user=other, device_name="Other Dev")
		url = reverse("device-list")
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, 200)
		returned_names = [d["device_name"] for d in resp.json()]
		self.assertIn("Main Device", returned_names)
		self.assertNotIn("Other Dev", returned_names)

