from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert


class AlertCooldownTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email="u@test.com", password="pass12345")

    def _mk_device_and_sensor(self):
        d = Device.objects.create(
            device_serial=Device.generate_device_serial(),
            device_name="D1",
            is_bound=True,
            bound_email=self.user.email,
        )
        # Device creation auto-populates default sensors; fetch the pH sensor
        s = Sensor.objects.get(device=d, sensor_type=Sensor.SensorType.PH)
        return d, s

    def test_duplicate_warning_suppressed_within_cooldown(self):
        _, sensor = self._mk_device_and_sensor()
        # First warning: pH near min (<= 5.6 with default thresholds)
        SensorData.objects.create(sensor=sensor, value=5.56)
        self.assertEqual(Alert.objects.count(), 1, "First warning should create an alert")

        # Duplicate warning within cooldown should be suppressed
        SensorData.objects.create(sensor=sensor, value=5.58)
        self.assertEqual(Alert.objects.count(), 1, "Duplicate warning within cooldown should be suppressed")

    def test_escalation_allowed_within_cooldown(self):
        _, sensor = self._mk_device_and_sensor()
        # Start with warning
        SensorData.objects.create(sensor=sensor, value=5.58)
        self.assertEqual(Alert.objects.count(), 1)

        # Escalate to critical (< 5.5); should create despite cooldown
        SensorData.objects.create(sensor=sensor, value=5.30)
        self.assertEqual(Alert.objects.count(), 2, "Escalation to critical must bypass suppression")

    def test_same_severity_allowed_after_cooldown(self):
        _, sensor = self._mk_device_and_sensor()
        # First warning
        SensorData.objects.create(sensor=sensor, value=5.56)
        self.assertEqual(Alert.objects.count(), 1)

        # Move last alert outside cooldown window
        last = Alert.objects.first()
        last.created_at = timezone.now() - timedelta(minutes=int(settings.ALERT_COOLDOWN_MINUTES) + 2)
        last.save(update_fields=["created_at"])

        # Now same-severity warning should be allowed
        SensorData.objects.create(sensor=sensor, value=5.58)
        self.assertEqual(Alert.objects.count(), 2, "Same-severity after cooldown should create a new alert")
