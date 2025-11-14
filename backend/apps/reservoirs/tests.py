"""Tests for plant catalog (reservoir model removed)."""

from django.test import TestCase
from django.core.exceptions import ValidationError

from .models import Plant


class PlantModelTests(TestCase):
    """Tests for the Plant model validations."""

    def test_plant_threshold_validations(self):
        """Ensure min values cannot exceed max values across fields."""
        plant = Plant(
            plant_name='TestPlant',
            ppm_min=700, ppm_max=600,  # invalid
            ec_min=2.0, ec_max=1.5,    # invalid
            ph_min=6.6, ph_max=6.5,    # invalid
            water_temp_min=26.0, water_temp_max=24.0,  # invalid
            light_min=50000, light_max=40000,  # invalid
            environment_temp_min=30.0, environment_temp_max=25.0,  # invalid
            humidity_min=80.0, humidity_max=60.0,  # invalid
        )
        with self.assertRaises(ValidationError):
            plant.clean()

    def test_valid_plant(self):
        """A Plant with correct ranges should pass clean()."""
        plant = Plant(
            plant_name='Lettuce',
            ppm_min=300, ppm_max=600,
            ec_min=0.8, ec_max=1.6,
            ph_min=5.5, ph_max=6.5,
            water_temp_min=18.0, water_temp_max=24.0,
            light_min=5000, light_max=40000,
            environment_temp_min=18.0, environment_temp_max=28.0,
            humidity_min=40.0, humidity_max=70.0,
        )
        # Should not raise
        plant.clean()
