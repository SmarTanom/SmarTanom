"""Models for device management."""

from __future__ import annotations
import random
import string

from django.db import models
from django.contrib.auth import get_user_model

from apps.common.models import TimeStampedModel

User = get_user_model()


class Device(TimeStampedModel):
    """A physical or logical device owned by a user that hosts sensors & reservoirs."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        MAINTENANCE = "maintenance", "Maintenance"
        DECOMMISSIONED = "decommissioned", "Decommissioned"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="new_devices", db_index=True,
        null=True, blank=True, help_text="Owner of the device. Null for unowned devices."
    )
    device_serial = models.CharField(
        max_length=12,
        unique=True,
        null=True,
        blank=True,
        help_text="Unique device serial number (SMRT-XXX-XXX format)"
    )
    device_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "device_name"], name="uq_newdevice_user_name"
            )
        ]
        indexes = [
            models.Index(fields=["user", "status"], name="idx_newdevice_user_status"),
            models.Index(fields=["device_serial"], name="idx_device_serial")
        ]
        verbose_name = "Device"
        verbose_name_plural = "Devices"

    @staticmethod
    def generate_device_serial():
        """Generate a unique device serial in format SMRT-XXX-XXX."""
        while True:
            # Generate two sets of 3 random alphanumeric characters
            part1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=3))
            part2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=3))
            serial = f"SMRT-{part1}-{part2}"

            # Check if serial already exists
            if not Device.objects.filter(device_serial=serial).exists():
                return serial

    def save(self, *args, **kwargs):
        """Override save to generate device serial if not set."""
        if not self.device_serial:
            self.device_serial = self.generate_device_serial()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.device_name} ({self.device_serial})"
