"""Views for sensor management."""

from __future__ import annotations

from rest_framework import filters
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

# WebSocket support
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from apps.common.views import BaseAuthViewSet
from .models import Sensor, SensorData
from apps.devices.models import DeviceCollaboration
from .serializers import SensorSerializer, SensorDataSerializer
from .alert_service import SensorAlertService

logger = logging.getLogger(__name__)


def broadcast_sensor_update(sensor_data):
    """
    Broadcast new sensor data via WebSocket to all connected clients.

    Args:
        sensor_data (SensorData): The sensor data instance
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            sensor = sensor_data.sensor
            device = sensor.device if sensor else None

            # Prepare complete sensor data payload
            payload_data = {
                "device_id": device.id if device else None,
                "device_serial": device.device_serial if device else None,
                "device_name": device.device_name if device else None,
                "sensor_id": sensor.id if sensor else None,
                "sensor_type": sensor.sensor_type if sensor else None,
                "sensor_data_id": sensor_data.id if sensor_data else None,
                "value": float(sensor_data.value) if sensor_data.value is not None else None,
                "unit": sensor.unit if sensor else "",
                "timestamp": sensor_data.created_at.isoformat() if sensor_data.created_at else timezone.now().isoformat(),
            }

            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "device_update",
                    "action": "sensor_data",
                    "data": payload_data
                }
            )
            logger.info(f"[WebSocket] Broadcasted sensor_data: {sensor.sensor_type if sensor else 'unknown'}={payload_data.get('value')} for device {device.device_serial if device else 'unknown'}")
    except Exception as e:
        # Don't fail the request if WebSocket broadcast fails
        logger.error(f"[WebSocket] Broadcast failed: {str(e)}", exc_info=True)


class SensorViewSet(BaseAuthViewSet):
    """ViewSet for Sensor model with email-based filtering."""

    queryset = Sensor.objects.select_related("device").all()
    serializer_class = SensorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["device", "sensor_type"]
    search_fields = ["sensor_type", "unit", "device__device_name"]
    ordering_fields = ["sensor_type", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions, including shared devices."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs

        shared_device_ids = DeviceCollaboration.objects.filter(
            collaborator_email__iexact=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
        ).values_list("device_id", flat=True)

        return qs.filter(
            Q(device__bound_email=user.email, device__is_bound=True)
            | Q(device_id__in=shared_device_ids)
        )

    def _has_manage_permissions(self, device) -> bool:
        """Return True if requester can manage resources on this device."""
        user = self.request.user
        if user.is_staff:
            return True
        if getattr(device, "bound_email", None) == user.email:
            return True
        return DeviceCollaboration.objects.filter(
            device=device,
            collaborator_email__iexact=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
            permissions=DeviceCollaboration.Permission.MANAGE,
        ).exists()

    def perform_create(self, serializer):
        device = serializer.validated_data.get("device")
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to create sensors on this device."
            )
        serializer.save()

    def perform_update(self, serializer):
        device = getattr(serializer.instance, "device", None)
        if device is None:
            device = serializer.validated_data.get("device")
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to update sensors on this device."
            )
        serializer.save()

    def perform_destroy(self, instance):
        device = getattr(instance, "device", None)
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to delete sensors on this device."
            )
        instance.delete()


class SensorDataViewSet(BaseAuthViewSet):
    """ViewSet for SensorData model with email-based filtering."""

    queryset = SensorData.objects.select_related("sensor", "sensor__device").all()
    serializer_class = SensorDataSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["sensor", "sensor__device"]
    ordering_fields = ["created_at", "value"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions, including shared devices."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs

        shared_device_ids = DeviceCollaboration.objects.filter(
            collaborator_email__iexact=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
        ).values_list("device_id", flat=True)

        return qs.filter(
            Q(sensor__device__bound_email=user.email, sensor__device__is_bound=True)
            | Q(sensor__device_id__in=shared_device_ids)
        )

    def _has_manage_permissions(self, device) -> bool:
        """Return True if requester can manage data for this device."""
        user = self.request.user
        if user.is_staff:
            return True
        if getattr(device, "bound_email", None) == user.email:
            return True
        return DeviceCollaboration.objects.filter(
            device=device,
            collaborator_email__iexact=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
            permissions=DeviceCollaboration.Permission.MANAGE,
        ).exists()

    def perform_create(self, serializer):
        sensor = serializer.validated_data.get("sensor")
        device = getattr(sensor, "device", None)
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to create sensor data on this device."
            )
        sensor_data = serializer.save()

        # Check thresholds and send push notifications if alerts detected
        try:
            SensorAlertService.check_and_notify(sensor_data)
            logger.debug(f"Alert check completed for sensor data {sensor_data.id}")
        except Exception as e:
            logger.error(f"Alert notification failed for sensor data {sensor_data.id}: {str(e)}")

        # Broadcast WebSocket update for real-time data
        broadcast_sensor_update(sensor_data)

    def perform_update(self, serializer):
        sensor = getattr(serializer.instance, "sensor", None)
        device = getattr(sensor, "device", None)
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to update sensor data on this device."
            )
        serializer.save()

    def perform_destroy(self, instance):
        sensor = getattr(instance, "sensor", None)
        device = getattr(sensor, "device", None)
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to delete sensor data on this device."
            )
        instance.delete()
