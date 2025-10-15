"""Signal handlers for sensor data monitoring and alerting."""

from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

from .models import SensorData, Sensor
from .alert_service import SensorAlertService


logger = logging.getLogger("apps.sensors")


@receiver(post_save, sender=SensorData)
def check_sensor_alerts(sender, instance, created, **kwargs):
    """Check thresholds and send push notifications.

    Previously this only executed on creation. We now run on every save so that
    admin edits or backend corrections immediately reflect in alerts and the
    frontend (e.g. pH changed from 6.6 to 12.0 via an update).
    """
    try:
        SensorAlertService.check_and_notify(instance)
    except Exception as e:
        logger.error(
            f"Error checking alerts for sensor {instance.sensor_id}, value={instance.value}: {e}",
            exc_info=True,
        )


@receiver(post_save, sender=SensorData)
def broadcast_sensor_realtime(sender, instance, created, **kwargs):
    """Broadcast aggregated sensor data after every save (create or update).

    Optimized version that reduces database queries and improves performance.
    """

    try:
        sensor = instance.sensor
        device = sensor.device

        # Get the device owner's email for user-specific broadcasting
        device_owner_email = device.bound_email if device.is_bound else None

        # Get all latest sensor readings for this device efficiently
        device_sensors = Sensor.objects.filter(device=device).select_related('device')
        
        sensor_data_dict = {}
        for dev_sensor in device_sensors:
            # Get the most recent reading for each sensor type
            latest_reading = (
                SensorData.objects.filter(sensor=dev_sensor)
                .order_by('-created_at')
                .first()
            )
            
            if latest_reading:
                sensor_type = dev_sensor.sensor_type
                value = float(latest_reading.value)

                # Map to your desired payload structure
                sensor_mapping = {
                    'ph': 'ph',
                    'ec': 'ec', 
                    'tds': 'tds',
                    'air_temperature': 'temperature',
                    'humidity': 'humidity',
                    'light': 'light_lux',
                    'water_level': 'water_level',
                    'turbidity': 'turbidity',
                    'water_temperature': 'water_temperature'
                }
                
                if sensor_type in sensor_mapping:
                    sensor_data_dict[sensor_mapping[sensor_type]] = value

        # Calculate nutrient level from TDS (simplified calculation)
        if 'tds' in sensor_data_dict:
            tds_value = sensor_data_dict['tds']
            # Nutrient level: 0-100% based on TDS range (800-1500 ppm optimal)
            if tds_value < 800:
                nutrient_level = (tds_value / 800) * 100
            elif tds_value <= 1500:
                nutrient_level = 100
            else:
                nutrient_level = max(0, 100 - ((tds_value - 1500) / 500) * 100)
            sensor_data_dict['nutrient_level'] = round(nutrient_level, 1)

        # Prepare the broadcast payload
        payload = {
            "type": "sensor.update",
            "device_id": device.id,
            "device_serial": device.device_serial,
            "device_name": device.device_name,
            "timestamp": instance.created_at.isoformat() if instance.created_at else timezone.now().isoformat(),
            "sensors": sensor_data_dict,
            "reading": {
                "sensor_id": instance.sensor_id,
                "sensor_type": instance.sensor.sensor_type,
                "value": float(instance.value),
                "created_at": instance.created_at.isoformat() if instance.created_at else None,
                "id": instance.id,
            },
            "created": created,
        }

        # Broadcast to all connected clients
        channel_layer = get_channel_layer()
        if channel_layer:
            # Broadcast to global devices group (admins, dashboard)
            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "sensor_update",
                    "payload": payload
                }
            )

            # Also broadcast to user-specific group if device is bound
            if device_owner_email:
                # Get user ID from email (optimized lookup)
                from apps.accounts.models import User
                try:
                    user = User.objects.only('id', 'email').get(email=device_owner_email)
                    async_to_sync(channel_layer.group_send)(
                        f"user_{user.id}",
                        {
                            "type": "sensor_update",
                            "payload": payload
                        }
                    )
                    logger.info(
                        f"[WebSocket] Broadcasted sensor.update for device {device.device_serial} "
                        f"to user {user.id} and global group"
                    )
                except User.DoesNotExist:
                    logger.warning(f"User with email {device_owner_email} not found")
            else:
                logger.info(
                    f"[WebSocket] Broadcasted sensor.update for device {device.device_serial} "
                    f"to global group (unbound device)"
                )

    except Exception as e:
        # Don't fail the sensor data save if broadcasting fails
        logger.error(
            f"[WebSocket] Failed to broadcast sensor data for sensor {instance.sensor_id}: {e}",
            exc_info=True
        )
