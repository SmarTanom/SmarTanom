"""Models for reservoir management."""

from __future__ import annotations

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.devices.models import Device


class Reservoir(TimeStampedModel):
    """A reservoir (e.g., hydroponic tank) associated with a device."""

    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="reservoirs", db_index=True
    )
    reservoir_name = models.CharField(max_length=100)
    plant_type = models.CharField(max_length=100)
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
