"""Signal handlers for sensor data monitoring and alerting."""

from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import SensorData
from .alert_service import SensorAlertService


logger = logging.getLogger("apps.sensors")


@receiver(post_save, sender=SensorData)
def check_sensor_alerts(sender, instance, created, **kwargs):
    """
    Check for sensor threshold breaches and send push notifications.

    This signal fires after every SensorData save. Only processes new data (created=True).
    """
    if not created:
        # Only check new sensor readings, not updates
        return

    try:
        SensorAlertService.check_and_notify(instance)
    except Exception as e:
        # Don't fail sensor data creation if notification fails
        logger.error(
            f"Error checking alerts for sensor {instance.sensor_id}, "
            f"value={instance.value}: {e}",
            exc_info=True,
        )
