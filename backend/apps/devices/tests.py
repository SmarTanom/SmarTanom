"""Device app tests."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from .models import Device

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
