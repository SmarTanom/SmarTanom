from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData


class SensorDataPermissionTests(TestCase):
    """Verify a user cannot access another user's sensor data even when providing device_serial."""

    def setUp(self):
        User = get_user_model()
        self.user1 = User.objects.create_user(username="u1", email="u1@example.com")
        self.user2 = User.objects.create_user(username="u2", email="u2@example.com")

        # Devices bound to each user
        self.device1 = Device.objects.create(device_serial=Device.generate_device_serial(), device_name="D1", is_bound=True, bound_email=self.user1.email)
        self.device2 = Device.objects.create(device_serial=Device.generate_device_serial(), device_name="D2", is_bound=True, bound_email=self.user2.email)

        # Sensors + data
        self.sensor1 = Sensor.objects.create(device=self.device1, sensor_type="ph", unit="pH")
        self.sensor2 = Sensor.objects.create(device=self.device2, sensor_type="ph", unit="pH")
        SensorData.objects.create(sensor=self.sensor1, value=6.1)
        SensorData.objects.create(sensor=self.sensor2, value=5.9)

        self.client = APIClient()

    def test_user_cannot_access_other_device_sensor_data(self):
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)

        # Attempt to fetch user2's device data by device_serial
        url_other = f"/api/sensors/sensor-data/?device_serial={self.device2.device_serial}"
        resp_other = self.client.get(url_other)
        self.assertEqual(resp_other.status_code, 200)
        self.assertEqual(len(resp_other.json()), 0, "User1 should not see sensor data for user2's device")

        # Fetch own device data by serial
        url_own = f"/api/sensors/sensor-data/?device_serial={self.device1.device_serial}"
        resp_own = self.client.get(url_own)
        self.assertEqual(resp_own.status_code, 200)
        self.assertGreaterEqual(len(resp_own.json()), 1, "User1 should see its own sensor data")

    def test_staff_can_access_any_device(self):
        User = get_user_model()
        staff = User.objects.create_user(username="admin", email="admin@example.com", is_staff=True)
        self.client.force_authenticate(user=staff)
        url = f"/api/sensors/sensor-data/?device_serial={self.device2.device_serial}"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1, "Staff should access sensor data for any device")
