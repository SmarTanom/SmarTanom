"""Models for reservoir management."""

from __future__ import annotations

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.devices.models import Device


class Plant(TimeStampedModel):
    """Reference table describing ideal ranges for a plant/crop.

    Columns (all NOT NULL):
    - plant_name
    - ec_min / ec_max
    - ppm_min / ppm_max
    - ph_min / ph_max
    - water_temp_min / water_temp_max
    - light_min / light_max
    - environment_temp_min / environment_temp_max
    - humidity_min / humidity_max
    """

    plant_name = models.CharField(max_length=100, unique=True)

    # Electrical conductivity (mS/cm) ideal range
    ec_min = models.FloatField(default=0.0)
    ec_max = models.FloatField(default=0.0)

    ppm_min = models.FloatField()
    ppm_max = models.FloatField()

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
        if self.ec_min > self.ec_max:
            errors["ec_min"] = "ec_min cannot be greater than ec_max"
        if self.ppm_min > self.ppm_max:
            errors["ppm_min"] = "ppm_min cannot be greater than ppm_max"
        if self.ph_min > self.ph_max:
            errors["ph_min"] = "ph_min cannot be greater than ph_max"
        if self.water_temp_min > self.water_temp_max:
            errors["water_temp_min"] = "water_temp_min cannot be greater than water_temp_max"
        if self.light_min > self.light_max:
            errors["light_min"] = "light_min cannot be greater than light_max"
        if self.environment_temp_min > self.environment_temp_max:
            errors["environment_temp_min"] = "environment_temp_min cannot be greater than environment_temp_max"
        if self.humidity_min > self.humidity_max:
            errors["humidity_min"] = "humidity_min cannot be greater than humidity_max"
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return self.plant_name


class Reservoir(TimeStampedModel):
    """A reservoir (e.g., hydroponic tank) associated with a device."""

    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="reservoirs", db_index=True
    )
    reservoir_name = models.CharField(max_length=100)
    plant = models.ForeignKey(
        Plant, on_delete=models.PROTECT, related_name="reservoirs", db_index=True
    )
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["device", "reservoir_name"], name="uq_newreservoir_device_name"
            )
        ]
        indexes = [
            models.Index(fields=["device", "start_date"], name="idx_newreservoir_device_start"),
        ]
        verbose_name = "Reservoir"
        verbose_name_plural = "Reservoirs"

    def clean(self):  # Business validation
        """Validate dates with None-safety.

        - Only compare dates if both are provided to avoid TypeError in admin add form.
        - Validate start_date bounds only when present.
        """
        errors = {}

        if self.start_date and self.end_date:
            if self.end_date < self.start_date:
                errors["end_date"] = "End date cannot be before start date."

        if self.start_date:
            if self.start_date > timezone.now().date() + timezone.timedelta(days=365 * 5):
                errors["start_date"] = "Start date too far in the future."

        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.reservoir_name} (device={self.device_id})"
