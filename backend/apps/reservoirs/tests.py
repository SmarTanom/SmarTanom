"""Tests for reservoir management."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Reservoir
from apps.devices.models import Device

User = get_user_model()


class ReservoirModelTests(TestCase):
    """Tests for the Reservoir model."""

    def setUp(self):
        self.user = User.objects.create_user(email='test@example.com')
        self.device = Device.objects.create(
            user=self.user,
            device_name='Test Device'
        )

    def test_create_reservoir(self):
        """Test creating a reservoir."""
        today = timezone.now().date()
        end_date = today + timezone.timedelta(days=30)

        reservoir = Reservoir.objects.create(
            device=self.device,
            reservoir_name='Test Reservoir',
            plant_type='Lettuce',
            start_date=today,
            end_date=end_date
        )

        self.assertEqual(reservoir.reservoir_name, 'Test Reservoir')
        self.assertEqual(reservoir.plant_type, 'Lettuce')
        self.assertEqual(reservoir.start_date, today)
        self.assertEqual(reservoir.end_date, end_date)
        self.assertEqual(reservoir.device, self.device)

    def test_invalid_date_range(self):
        """Test validation for invalid date ranges."""
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)

        with self.assertRaises(ValidationError):
            reservoir = Reservoir(
                device=self.device,
                reservoir_name='Invalid Reservoir',
                plant_type='Tomato',
                start_date=today,
                end_date=yesterday
            )
            reservoir.clean()

    def test_far_future_start_date(self):
        """Test validation for start date too far in the future."""
        far_future = timezone.now().date() + timezone.timedelta(days=365 * 6)
        end_date = far_future + timezone.timedelta(days=30)

        with self.assertRaises(ValidationError):
            reservoir = Reservoir(
                device=self.device,
                reservoir_name='Future Reservoir',
                plant_type='Cucumber',
                start_date=far_future,
                end_date=end_date
            )
            reservoir.clean()
