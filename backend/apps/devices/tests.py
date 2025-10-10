"""Device app tests."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
import json

from .models import Device, DeviceOTPCode

User = get_user_model()


class DeviceModelTests(TestCase):
    """Tests for the Device model."""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com')

    def test_create_device(self):
        """Test creating a device."""
        device = Device.objects.create(
            user=self.user,
            device_name='Test Device',
            status=Device.Status.ACTIVE
        )
        self.assertEqual(device.device_name, 'Test Device')
        self.assertEqual(device.status, Device.Status.ACTIVE)
        self.assertEqual(device.user, self.user)


class DeviceAPITests(TestCase):
    """Tests for the Device API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='test@example.com')
        self.staff_user = User.objects.create_user(
            email='staff@example.com',
            is_staff=True
        )

    def test_device_list_authenticated(self):
        """Test that authenticated users can access their devices."""
        Device.objects.create(user=self.user, device_name='User Device')
        Device.objects.create(user=self.staff_user, device_name='Staff Device')

        self.client.force_authenticate(user=self.user)
        url = reverse('devices:device-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['device_name'], 'User Device')

    def test_staff_can_see_all_devices(self):
        """Test that staff users can access all devices."""
        Device.objects.create(user=self.user, device_name='User Device')
        Device.objects.create(user=self.staff_user, device_name='Staff Device')

        self.client.force_authenticate(user=self.staff_user)
        url = reverse('devices:device-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)


class DeviceBindingTests(TestCase):
    """Tests for device binding functionality."""

    def setUp(self):
        self.client = APIClient()
        self.device = Device.objects.create(
            device_name="Test Device",
            device_serial="SMRT-TST-001"
        )

    def test_check_device_exists(self):
        """Test checking if a device exists."""
        url = '/api/devices/check/'
        data = {'serial_number': 'SMRT-TST-001'}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertTrue(response_data['exists'])
        self.assertEqual(response_data['serial_number'], 'SMRT-TST-001')
        self.assertEqual(response_data['device_name'], 'Test Device')
        self.assertFalse(response_data['is_bound'])

    def test_check_device_not_exists(self):
        """Test checking a device that doesn't exist."""
        url = '/api/devices/check/'
        data = {'serial_number': 'SMRT-XXX-YYY'}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertFalse(response_data['exists'])
        self.assertEqual(response_data['serial_number'], 'SMRT-XXX-YYY')
        # When device doesn't exist, these fields should not be present
        self.assertNotIn('device_name', response_data)
        self.assertNotIn('is_bound', response_data)

    def test_request_device_otp(self):
        """Test requesting OTP for device binding."""
        url = '/api/devices/request-otp/'
        data = {
            'serial_number': 'SMRT-TST-001',
            'email': 'test@example.com'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertIn('message', response_data)

        # Debug code should be present in DEBUG mode when email is sent successfully
        from django.conf import settings
        if settings.DEBUG:
            # In test mode, email backend is console so it should succeed
            self.assertIn('debug_code', response_data)

        # Check OTP was created
        otp = DeviceOTPCode.objects.filter(device=self.device, email='test@example.com').first()
        self.assertIsNotNone(otp)
        self.assertFalse(otp.is_verified)

    def test_verify_device_otp(self):
        """Test verifying OTP and binding device."""
        # First create an OTP
        otp = DeviceOTPCode.create_otp(self.device, 'test@example.com')

        url = '/api/devices/verify-otp/'
        data = {
            'serial_number': 'SMRT-TST-001',
            'email': 'test@example.com',
            'code': otp.code
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_data = response.data
        self.assertTrue(response_data['success'])
        self.assertIn('Device bound successfully', response_data['message'])

        # Check device is now bound
        self.device.refresh_from_db()
        self.assertTrue(self.device.is_bound)
        self.assertEqual(self.device.bound_email, 'test@example.com')

        # Check OTP is verified
        otp.refresh_from_db()
        self.assertTrue(otp.is_verified)

    def test_verify_invalid_otp(self):
        """Test verifying with invalid OTP code."""
        # Create an OTP but use wrong code
        DeviceOTPCode.create_otp(self.device, 'test@example.com')

        url = '/api/devices/verify-otp/'
        data = {
            'serial_number': 'SMRT-TST-001',
            'email': 'test@example.com',
            'code': '999999'  # Wrong code
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.data
        self.assertIn('error', response_data)

        # Check device is not bound
        self.device.refresh_from_db()
        self.assertFalse(self.device.is_bound)

    def test_cannot_bind_already_bound_device(self):
        """Test that already bound devices cannot be bound again."""
        # Bind the device first
        self.device.is_bound = True
        self.device.bound_email = 'first@example.com'
        self.device.save()

        url = '/api/devices/request-otp/'
        data = {
            'serial_number': 'SMRT-TST-001',
            'email': 'second@example.com'
        }

        response = self.client.post(url, data, format='json')

        # Should return 400 error since device is already bound
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.data
        self.assertIn('error', response_data)
        self.assertIn('already bound', response_data['error'])

        # No new OTP should be created for the second email
        otp_count = DeviceOTPCode.objects.filter(
            device=self.device,
            email='second@example.com'
        ).count()
        self.assertEqual(otp_count, 0)

    def test_invalid_serial_number_format(self):
        """Test validation of serial number format."""
        url = '/api/devices/check/'

        # Test various invalid formats
        invalid_serials = [
            'INVALID',
            'SMRT-XX-YY',  # Too short
            'SMRT-XXXX-YYY',  # Wrong length
            'TEST-ABC-DEF',  # Wrong prefix
            'smrt-abc-def',  # Wrong case (should be auto-corrected)
        ]

        for serial in invalid_serials:
            with self.subTest(serial=serial):
                data = {'serial_number': serial}
                response = self.client.post(url, data, format='json')

                if serial == 'smrt-abc-def':
                    # This should be auto-corrected and work
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                else:
                    # These should fail validation
                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_validation(self):
        """Test email validation in binding requests."""
        url = '/api/devices/request-otp/'

        invalid_emails = [
            'invalid',
            '@example.com',
            'test@',
            'test.example.com',
        ]

        for email in invalid_emails:
            with self.subTest(email=email):
                data = {
                    'serial_number': 'SMRT-TST-001',
                    'email': email
                }
                response = self.client.post(url, data, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_prevent_otp_request_for_nonexistent_device(self):
        """Test that OTP cannot be requested for devices that don't exist."""
        url = '/api/devices/request-otp/'
        data = {
            'serial_number': 'SMRT-NOT-FND',  # Non-existent device
            'email': 'test@example.com'
        }

        response = self.client.post(url, data, format='json')

        # Should return 200 with generic message (to avoid device enumeration)
        # but no OTP should be created
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # No OTP should be created for non-existent device
        otp_count = DeviceOTPCode.objects.filter(email='test@example.com').count()
        self.assertEqual(otp_count, 0)

    def test_verify_otp_for_nonexistent_device(self):
        """Test that OTP verification fails for devices that don't exist."""
        url = '/api/devices/verify-otp/'
        data = {
            'serial_number': 'SMRT-NOT-FND',  # Non-existent device
            'email': 'test@example.com',
            'code': '123456'
        }

        response = self.client.post(url, data, format='json')

        # Should return 400 error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response_data = response.data
        self.assertIn('error', response_data)
        self.assertIn('Invalid or expired', response_data['error'])
