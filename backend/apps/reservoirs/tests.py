"""Tests for reservoir management."""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Reservoir, Plant
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
        self.lettuce = Plant.objects.create(
            plant_name='Lettuce',
            ppm_min=300, ppm_max=600,
            ph_min=5.5, ph_max=6.5,
            water_temp_min=18, water_temp_max=24,
            light_min=5000, light_max=40000,
        )
        self.tomato = Plant.objects.create(
            plant_name='Tomato',
            ppm_min=700, ppm_max=1400,
            ph_min=5.5, ph_max=6.5,
            water_temp_min=18, water_temp_max=26,
            light_min=10000, light_max=50000,
        )

    def test_create_reservoir(self):
        """Test creating a reservoir."""
        today = timezone.now().date()
        end_date = today + timezone.timedelta(days=30)

        reservoir = Reservoir.objects.create(
            device=self.device,
            reservoir_name='Test Reservoir',
            plant=self.lettuce,
            start_date=today,
            end_date=end_date
        )

        self.assertEqual(reservoir.reservoir_name, 'Test Reservoir')
        self.assertEqual(reservoir.plant, self.lettuce)
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
                plant=self.tomato,
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
                plant=self.lettuce,
                start_date=far_future,
                end_date=end_date
            )
            reservoir.clean()
