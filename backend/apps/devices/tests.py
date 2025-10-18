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

    def test_create_device(self):
        """Test creating a device."""
        device = Device.objects.create(
            device_name='Test Device',
            device_serial='SMRT-TST-001',
            status=Device.Status.ACTIVE
        )
        self.assertEqual(device.device_name, 'Test Device')
        self.assertEqual(device.device_serial, 'SMRT-TST-001')
        self.assertEqual(device.status, Device.Status.ACTIVE)
        self.assertFalse(device.is_bound)
        self.assertIsNone(device.bound_email)

    def test_auto_create_sensors_on_device_create(self):
        """When a Device is created, the default sensors should be auto-created via signals."""
        device = Device.objects.create(
            device_name='AutoSensor Device',
            device_serial='SMRT-AUT-001',
            status=Device.Status.ACTIVE
        )

        # Import Sensor model here to avoid circular imports at module load
        from apps.sensors.models import Sensor

        # Ensure at least one sensor is present and that each sensor_type has a sensor
        sensor_types = [st.value for st in Sensor.SensorType]
        sensors = Sensor.objects.filter(device=device)
        self.assertTrue(sensors.exists())
        existing_types = set(s.sensor_type for s in sensors)
        # All defined sensor types should have at least one Sensor row for this device
        for st in sensor_types:
            self.assertIn(st, existing_types)


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
        """Test that authenticated users can access their bound devices."""
        # Create devices bound to different emails
        Device.objects.create(
            device_name='User Device',
            device_serial='SMRT-USR-001',
            is_bound=True,
            bound_email='test@example.com'
        )
        Device.objects.create(
            device_name='Staff Device',
            device_serial='SMRT-STF-001',
            is_bound=True,
            bound_email='staff@example.com'
        )

        self.client.force_authenticate(user=self.user)
        url = reverse('devices:device-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['device_name'], 'User Device')

    def test_staff_can_see_all_devices(self):
        """Test that staff users can access all devices."""
        Device.objects.create(
            device_name='User Device',
            device_serial='SMRT-USR-002',
            is_bound=True,
            bound_email='test@example.com'
        )
        Device.objects.create(
            device_name='Staff Device',
            device_serial='SMRT-STF-002',
            is_bound=True,
            bound_email='staff@example.com'
        )
        Device.objects.create(
            device_name='Unbound Device',
            device_serial='SMRT-UBD-001',
            is_bound=False
        )

        self.client.force_authenticate(user=self.staff_user)
        url = reverse('devices:device-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)


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


class DeviceProvisioningTests(TestCase):
    """Tests for device WiFi provisioning endpoints."""

    def setUp(self):
        self.client = APIClient()
        # Create a test device
        self.device = Device.objects.create(
            device_name='Test Provision Device',
            device_serial='SMRT-PRV-001',
            status=Device.Status.ACTIVE,
            wifi_configured=False
        )

    def test_provision_device_success(self):
        """Test successful device provisioning."""
        url = '/api/devices/provision/'
        data = {
            'serial': 'SMRT-PRV-001',
            'status': 'connected',
            'ip': '192.168.1.100',
            'firmware_version': '1.0.0'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['device_serial'], 'SMRT-PRV-001')
        self.assertTrue(response.data['wifi_configured'])

        # Verify database update
        self.device.refresh_from_db()
        self.assertTrue(self.device.wifi_configured)

    def test_provision_device_failed(self):
        """Test device provisioning failure."""
        url = '/api/devices/provision/'
        data = {
            'serial': 'SMRT-PRV-001',
            'status': 'failed'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertFalse(response.data['wifi_configured'])

        # Verify database update
        self.device.refresh_from_db()
        self.assertFalse(self.device.wifi_configured)

    def test_provision_invalid_serial_format(self):
        """Test provisioning with invalid serial format."""
        url = '/api/devices/provision/'
        data = {
            'serial': 'INVALID-SERIAL',
            'status': 'connected',
            'ip': '192.168.1.100'
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('serial', response.data)

    def test_provision_missing_ip_for_connected(self):
        """Test that IP is required when status is connected."""
        url = '/api/devices/provision/'
        data = {
            'serial': 'SMRT-PRV-001',
            'status': 'connected'
            # Missing IP
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_provision_nonexistent_device_auto_create_enabled(self):
        """Test auto-creating device on first provision when enabled."""
        from django.conf import settings

        # Ensure auto-create is enabled (default)
        url = '/api/devices/provision/'
        data = {
            'serial': 'SMRT-NEW-001',
            'status': 'connected',
            'ip': '192.168.1.101'
        }

        response = self.client.post(url, data, format='json')

        # Should succeed if auto-create is enabled
        if getattr(settings, 'AUTO_CREATE_DEVICE_ON_FIRST_CONNECT', True):
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(Device.objects.filter(device_serial='SMRT-NEW-001').exists())

            # Verify device was created with correct settings
            device = Device.objects.get(device_serial='SMRT-NEW-001')
            self.assertTrue(device.wifi_configured)
            self.assertEqual(device.device_name, 'Device SMRT-NEW-001')

    def test_provision_auth_required_in_production(self):
        """Test that authentication is required in production mode for non-localhost IPs."""
        from django.conf import settings
        from unittest.mock import patch

        # Mock production mode (DEBUG=False) AND non-localhost IP
        with patch.object(settings, 'DEBUG', False):
            with patch('apps.devices.views.get_client_ip', return_value='203.0.113.1'):  # Example non-localhost IP
                url = '/api/devices/provision/'
                data = {
                    'serial': 'SMRT-PRV-001',
                    'status': 'connected',
                    'ip': '192.168.1.100'
                }

                # Request without auth header from external IP should fail in production
                response = self.client.post(url, data, format='json')

                # Should require authentication for non-localhost IPs
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_provision_with_valid_auth_header(self):
        """Test provisioning with valid X-Device-Auth header."""
        from django.conf import settings

        url = '/api/devices/provision/'
        data = {
            'serial': 'SMRT-PRV-001',
            'status': 'connected',
            'ip': '192.168.1.100'
        }

        # Add auth header
        api_key = getattr(settings, 'DEVICE_PROVISION_API_KEY', '')
        response = self.client.post(
            url,
            data,
            format='json',
            HTTP_X_DEVICE_AUTH=api_key
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_device_config(self):
        """Test fetching device configuration."""
        url = f'/api/devices/{self.device.device_serial}/config/'

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_serial'], 'SMRT-PRV-001')
        self.assertEqual(response.data['device_name'], 'Test Provision Device')
        self.assertFalse(response.data['wifi_configured'])
        self.assertIn('backend_url', response.data)
        self.assertIn('websocket_url', response.data)

    def test_get_device_config_invalid_serial(self):
        """Test fetching config with invalid serial format."""
        url = '/api/devices/INVALID-SERIAL/config/'

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_device_config_not_found(self):
        """Test fetching config for non-existent device."""
        url = '/api/devices/SMRT-XXX-999/config/'

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_provision_normalizes_serial(self):
        """Test that serial number is normalized to uppercase."""
        url = '/api/devices/provision/'
        data = {
            'serial': 'smrt-prv-001',  # Lowercase
            'status': 'connected',
            'ip': '192.168.1.100'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['device_serial'], 'SMRT-PRV-001')  # Uppercase

