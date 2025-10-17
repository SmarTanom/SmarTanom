"""
Signal handlers for broadcasting device and user changes via WebSocket.
Ensures admin frontend stays synchronized with database changes in real-time.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime

from .models import Device
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@receiver(post_save, sender=Device)
def broadcast_device_change(sender, instance, created, **kwargs):
    """
    Broadcast device create/update events to admin WebSocket channel.
    Triggered whenever a Device model is saved (created or updated).
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        action_type = "admin.device_created" if created else "admin.device_updated"

        # Serialize device data for frontend
        device_data = {
            "id": getattr(instance, 'id', None),
            "device_serial": getattr(instance, 'device_serial', None),
            "device_name": getattr(instance, 'device_name', None),
            "status": getattr(instance, 'status', None),
            "is_bound": getattr(instance, 'is_bound', None),
            "bound_email": getattr(instance, 'bound_email', None),
            # Only include timestamps if present on model
            "created_at": instance.created_at.isoformat() if hasattr(instance, 'created_at') and instance.created_at else None,
            "updated_at": instance.updated_at.isoformat() if hasattr(instance, 'updated_at') and instance.updated_at else None,
        }

        payload = {
            "type": action_type,
            "data": device_data,
            "timestamp": datetime.now().isoformat()
        }

        # Broadcast to all admin clients
        async_to_sync(channel_layer.group_send)(
            "devices",
            {
                "type": "admin_update",
                "payload": payload
            }
        )

        print(f"[Signal] Broadcasted {action_type} for device {instance.device_serial}")

        # Auto-create default sensors for newly created devices.
        if created:
            try:
                # Local import to avoid circular import at module load time
                from apps.sensors.models import Sensor

                # Build list of sensor type values from the SensorType TextChoices
                sensor_types = [st.value for st in Sensor.SensorType]

                with transaction.atomic():
                    created_count = 0
                    for sensor_type in sensor_types:
                        # Use get_or_create to be idempotent in case fixtures or other flows
                        obj, was_created = Sensor.objects.get_or_create(
                            device=instance,
                            sensor_type=sensor_type,
                        )
                        if was_created:
                            created_count += 1

                logger.info(f"Auto-created {created_count} sensors for device {instance.device_serial}")
            except Exception as e:
                # Don't let sensor creation break device creation; log and continue
                logger.exception(f"Failed to auto-create sensors for device {instance.device_serial}: {e}")

    except Exception as e:
        print(f"[Signal] Error broadcasting device change: {e}")


@receiver(post_delete, sender=Device)
def broadcast_device_delete(sender, instance, **kwargs):
    """
    Broadcast device deletion events to admin WebSocket channel.
    Triggered when a Device model is deleted.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        payload = {
            "type": "admin.device_deleted",
            "data": {
                "id": instance.id,
                "device_serial": instance.device_serial,
                "device_name": instance.device_name
            },
            "timestamp": datetime.now().isoformat()
        }

        async_to_sync(channel_layer.group_send)(
            "devices",
            {
                "type": "admin_update",
                "payload": payload
            }
        )

        print(f"[Signal] Broadcasted device deletion for {instance.device_serial}")

    except Exception as e:
        print(f"[Signal] Error broadcasting device deletion: {e}")


@receiver(post_save, sender=User)
def broadcast_user_change(sender, instance, created, **kwargs):
    """
    Broadcast user create/update events to admin WebSocket channel.
    Triggered whenever a User model is saved (created or updated).
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        action_type = "admin.user_created" if created else "admin.user_updated"

        # Serialize user data for frontend
        user_data = {
            "id": getattr(instance, 'id', None),
            "email": getattr(instance, 'email', None),
            "first_name": getattr(instance, 'first_name', ''),
            "last_name": getattr(instance, 'last_name', ''),
            "username": getattr(instance, 'username', None),
            "is_active": getattr(instance, 'is_active', None),
            "is_staff": getattr(instance, 'is_staff', None),
            "date_joined": instance.date_joined.isoformat() if hasattr(instance, 'date_joined') and instance.date_joined else None,
            "last_login": instance.last_login.isoformat() if getattr(instance, 'last_login', None) else None,
        }

        payload = {
            "type": action_type,
            "data": user_data,
            "timestamp": datetime.now().isoformat()
        }

        # Broadcast to all admin clients
        async_to_sync(channel_layer.group_send)(
            "devices",
            {
                "type": "admin_update",
                "payload": payload
            }
        )

        print(f"[Signal] Broadcasted {action_type} for user {instance.email}")

    except Exception as e:
        print(f"[Signal] Error broadcasting user change: {e}")


@receiver(post_delete, sender=User)
def broadcast_user_delete(sender, instance, **kwargs):
    """
    Broadcast user deletion events to admin WebSocket channel.
    Triggered when a User model is deleted.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        payload = {
            "type": "admin.user_deleted",
            "data": {
                "id": instance.id,
                "email": instance.email,
                "name": instance.name
            },
            "timestamp": datetime.now().isoformat()
        }

        async_to_sync(channel_layer.group_send)(
            "devices",
            {
                "type": "admin_update",
                "payload": payload
            }
        )

        print(f"[Signal] Broadcasted user deletion for {instance.email}")

    except Exception as e:
        print(f"[Signal] Error broadcasting user deletion: {e}")
