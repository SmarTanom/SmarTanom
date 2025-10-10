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
        """Validate that end date is not before start date and start date isn't too far in future."""
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before start date."})
        if self.start_date > timezone.now().date() + timezone.timedelta(days=365 * 5):
            raise ValidationError({"start_date": "Start date too far in the future."})

    def __str__(self) -> str:
        return f"{self.reservoir_name} (device={self.device_id})"
