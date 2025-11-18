from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from apps.accounts.models import OTPCode
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.devices.models import Device, DeviceInvitation, DeviceCollaboration, DeviceOTPCode
from apps.sensors.models import Sensor, SensorData, Alert, SensorLatest

User = get_user_model()


@override_settings(DEBUG=True)
class OTPResendCooldownTests(TestCase):
    def setUp(self):
        # Ensure clean slate
        OTPCode.objects.all().delete()
        self.url = reverse('accounts:request_otp')
        self.email = 'cooldown@test.com'
        self.purpose = OTPCode.PURPOSE_LOGIN

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=120)
    def test_request_otp_twice_within_cooldown_reuses_code_and_no_duplicate_send(self):
        # First request creates a new OTP
        resp1 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp1.status_code, 200)
        code1 = resp1.json().get('debug_code')
        self.assertIsNotNone(code1)

        # DB should have exactly one active OTP
        self.assertEqual(OTPCode.objects.filter(email=self.email, purpose=self.purpose).count(), 1)

        # Second request immediately should reuse existing OTP and not create a new one
        resp2 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp2.status_code, 200)
        code2 = resp2.json().get('debug_code')
        self.assertEqual(code1, code2)

        # Still only one OTP record for this email/purpose
        self.assertEqual(OTPCode.objects.filter(email=self.email, purpose=self.purpose).count(), 1)

    @override_settings(OTP_RESEND_COOLDOWN_SECONDS=1)
    def test_request_otp_after_cooldown_creates_new_and_invalidates_old(self):
        # Create an OTP via the endpoint
        resp1 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp1.status_code, 200)
        code1 = resp1.json().get('debug_code')
        self.assertIsNotNone(code1)

        # Manually age the OTP beyond cooldown
        otp = OTPCode.objects.get(email=self.email, purpose=self.purpose, is_used=False)
        otp.created_at = timezone.now() - timezone.timedelta(seconds=10)
        otp.save(update_fields=['created_at'])

        # Second request should create a new OTP (and invalidate the old unused one)
        resp2 = self.client.post(self.url, {'email': self.email, 'purpose': self.purpose}, content_type='application/json')
        self.assertEqual(resp2.status_code, 200)
        code2 = resp2.json().get('debug_code')
        self.assertIsNotNone(code2)
        self.assertNotEqual(code1, code2)

        # There should be two OTP rows total, but only the latest is unused
        total = OTPCode.objects.filter(email=self.email, purpose=self.purpose).count()
        unused = OTPCode.objects.filter(email=self.email, purpose=self.purpose, is_used=False).count()
        self.assertGreaterEqual(total, 2)
        self.assertEqual(unused, 1)


@override_settings(DEBUG=True)
class DeleteUserCleanupTests(TestCase):
    def setUp(self):
        # Create admin user and regular user
        self.admin = User.objects.create_superuser('admin@test.com', password='adminpass')
        self.user = User.objects.create_user('owner@test.com')

        # Create a device owned by the user (bound by email)
        self.device = Device.objects.create(
            device_serial="SMRT-AAA-BBB",
            device_name="Test Device",
            is_bound=True,
            bound_email=self.user.email,
            wifi_configured=True,
            ip_address="192.168.1.100",
            location="Lab"
        )

        # Add a sensor and readings for the device
        self.sensor = Sensor.objects.create(
            device=self.device,
            sensor_type=Sensor.SensorType.PH,
            unit="pH"
        )
        SensorData.objects.create(sensor=self.sensor, value=6.5)

        # Denormalized latest row
        SensorLatest.objects.create(sensor=self.sensor, value=6.5, status="ok")

        # Alerts tied to this device/sensor
        Alert.objects.create(
            device=self.device,
            sensor=self.sensor,
            metric=Alert.Metric.PH,
            trigger=Alert.Trigger.NEAR_MIN,
            severity=Alert.Severity.WARNING,
            value=6.5,
            unit="pH",
            title="pH near minimum",
            recommendation="Add base"
        )

        # Sharing records and OTPs referencing this user/device
        DeviceCollaboration.objects.create(
            device=self.device,
            collaborator_email=self.user.email,
            permissions=DeviceCollaboration.Permission.VIEW_ONLY,
            shared_by_email=self.user.email
        )
        DeviceInvitation.objects.create(
            device=self.device,
            invite_email=self.user.email,
            invited_by_email=self.user.email
        )
        DeviceOTPCode.objects.create(device=self.device, email=self.user.email)

        # DRF test client
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_delete_user_preserves_device_and_clears_data(self):
        url = reverse('accounts:delete_user', kwargs={'user_id': self.user.id})
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, 200, resp.content)

        # User removed
        self.assertFalse(User.objects.filter(id=self.user.id).exists())

        # Device preserved but unbound and reset
        device = Device.objects.get(id=self.device.id)
        self.assertFalse(device.is_bound)
        self.assertIsNone(device.bound_email)
        self.assertFalse(device.wifi_configured)
        self.assertIsNone(device.ip_address)

        # Sensors remain
        self.assertTrue(Sensor.objects.filter(id=self.sensor.id).exists())

        # Data cleared
        self.assertEqual(SensorData.objects.filter(sensor__device=device).count(), 0)
        self.assertEqual(Alert.objects.filter(device=device).count(), 0)

        # Latest reset (row remains, values cleared)
        latest = SensorLatest.objects.get(sensor=self.sensor)
        self.assertIsNone(latest.value)
        self.assertEqual(latest.status, "")

        # Sharing/OTPs cleared
        self.assertEqual(DeviceCollaboration.objects.filter(device=device).count(), 0)
        self.assertEqual(DeviceInvitation.objects.filter(device=device).count(), 0)
        self.assertEqual(DeviceOTPCode.objects.filter(device=device).count(), 0)
