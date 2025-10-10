"""Models for device management."""

from __future__ import annotations

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
        User, on_delete=models.CASCADE, related_name="new_devices", db_index=True
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
            models.Index(fields=["user", "status"], name="idx_newdevice_user_status")
        ]
        verbose_name = "Device"
        verbose_name_plural = "Devices"

    def __str__(self) -> str:
        return f"{self.device_name} (user={self.user_id})"
