"""Models for reservoir management."""

from __future__ import annotations

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.common.models import TimeStampedModel


class Plant(TimeStampedModel):
    """Reference table describing ideal ranges for a plant/crop.

    Columns (all NOT NULL):
    - plant_name
    - ppm_min / ppm_max
    - ph_min / ph_max
    - water_temp_min / water_temp_max
    - light_min / light_max
    - environment_temp_min / environment_temp_max
    - humidity_min / humidity_max
    """

    plant_name = models.CharField(max_length=100, unique=True)

    ppm_min = models.FloatField()
    ppm_max = models.FloatField()

    # EC (Electrical Conductivity) thresholds
    ec_min = models.FloatField(default=0.0)
    ec_max = models.FloatField(default=3.0)

    ph_min = models.FloatField()
    ph_max = models.FloatField()

    water_temp_min = models.FloatField()
    water_temp_max = models.FloatField()

    light_min = models.FloatField()
    light_max = models.FloatField()

    # New: recommended ambient environment ranges for this plant
    environment_temp_min = models.FloatField(default=18.0)
    environment_temp_max = models.FloatField(default=28.0)
    humidity_min = models.FloatField(default=40.0)
    humidity_max = models.FloatField(default=70.0)

    class Meta:
        verbose_name = "Plant"
        verbose_name_plural = "Plants"
        indexes = [
            models.Index(fields=["plant_name"], name="idx_plant_name"),
        ]

    def clean(self):
        errors = {}
        if self.ppm_min is not None and self.ppm_max is not None and self.ppm_min > self.ppm_max:
            errors["ppm_min"] = "ppm_min cannot be greater than ppm_max"
        if self.ec_min is not None and self.ec_max is not None and self.ec_min > self.ec_max:
            errors["ec_min"] = "ec_min cannot be greater than ec_max"
        if self.ph_min is not None and self.ph_max is not None and self.ph_min > self.ph_max:
            errors["ph_min"] = "ph_min cannot be greater than ph_max"
        if (
            self.water_temp_min is not None
            and self.water_temp_max is not None
            and self.water_temp_min > self.water_temp_max
        ):
            errors["water_temp_min"] = "water_temp_min cannot be greater than water_temp_max"
        if self.light_min is not None and self.light_max is not None and self.light_min > self.light_max:
            errors["light_min"] = "light_min cannot be greater than light_max"
        if (
            self.environment_temp_min is not None
            and self.environment_temp_max is not None
            and self.environment_temp_min > self.environment_temp_max
        ):
            errors["environment_temp_min"] = "environment_temp_min cannot be greater than environment_temp_max"
        if self.humidity_min is not None and self.humidity_max is not None and self.humidity_min > self.humidity_max:
            errors["humidity_min"] = "humidity_min cannot be greater than humidity_max"
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return self.plant_name


"""
Reservoir model removed. Cycle fields (plant, start_date, end_date) now live on Device.
Plant model remains as the catalog for plant ranges.
"""
