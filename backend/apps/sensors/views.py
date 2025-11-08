"""Views for sensor management."""

from __future__ import annotations

from rest_framework import filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

# WebSocket support
from channels.layers import get_channel_layer
from django.conf import settings
from asgiref.sync import async_to_sync
import logging

from apps.common.views import BaseAuthViewSet
from .models import Sensor, SensorData, Alert, SensorLatest
from apps.devices.models import DeviceCollaboration
from django.contrib.auth import get_user_model
from .serializers import SensorSerializer, SensorDataSerializer, AlertSerializer, LatestReadingSerializer
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

            # Optimized: Single broadcast format for Redis efficiency
            if getattr(settings, "WS_GLOBAL_BROADCAST", False):
                async_to_sync(channel_layer.group_send)(
                    "devices",
                    {
                        "type": "sensor_update",
                        "payload": {
                            "type": "sensor.update",
                            "device_id": payload_data.get("device_id"),
                            "device_serial": payload_data.get("device_serial"),
                            "sensor_id": payload_data.get("sensor_id"),
                            "sensor_type": payload_data.get("sensor_type"),
                            "value": payload_data.get("value"),
                            "unit": payload_data.get("unit"),
                            "timestamp": payload_data.get("timestamp"),
                        },
                    }
                )

            # 3) Target user-specific channels (owner and active collaborators)
            try:
                User = get_user_model()
                owner_group = None
                if getattr(device, "bound_email", None):
                    user = User.objects.filter(email__iexact=device.bound_email).first()
                    if user:
                        owner_group = f"user_{user.id}"
                        async_to_sync(channel_layer.group_send)(
                            owner_group,
                            {
                                "type": "sensor_update",
                                "payload": {
                                    "type": "sensor.update",
                                    **payload_data,
                                },
                            },
                        )

                # Collaborators
                collaborator_ids = list(
                    DeviceCollaboration.objects.filter(
                        device=device,
                        status=DeviceCollaboration.Status.ACTIVE,
                    ).values_list("collaborator_email", flat=True)
                )
                if collaborator_ids:
                    users = User.objects.filter(email__in=collaborator_ids)
                    for u in users:
                        group = f"user_{u.id}"
                        # Avoid duplicate send if same as owner
                        if group == owner_group:
                            continue
                        async_to_sync(channel_layer.group_send)(
                            group,
                            {
                                "type": "sensor_update",
                                "payload": {
                                    "type": "sensor.update",
                                    **payload_data,
                                },
                            },
                        )
            except Exception as ex:
                logger.warning(f"[WebSocket] User-specific broadcast failed: {ex}")

            logger.info(
                f"[WebSocket] Broadcasted sensor_data: {sensor.sensor_type if sensor else 'unknown'}="
                f"{payload_data.get('value')} for device {device.device_serial if device else 'unknown'}"
            )
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
        request = self.request
        user = request.user

        # Optional strict device_serial filtering (prevents cross-device mixing)
        device_serial = request.query_params.get("device_serial")
        if device_serial:
            device_serial = device_serial.strip().upper()

        if user.is_staff:
            # Apply multi-sensor filter support for staff as well
            sensor_in = request.query_params.get("sensor__in")
            if sensor_in:
                try:
                    ids = [int(s) for s in sensor_in.split(",") if s.strip()]
                    if ids:
                        qs = qs.filter(sensor_id__in=ids)
                except ValueError:
                    pass
            if device_serial:
                qs = qs.filter(sensor__device__device_serial=device_serial)
            return qs

        shared_device_ids = DeviceCollaboration.objects.filter(
            collaborator_email__iexact=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
        ).values_list("device_id", flat=True)

        scoped = qs.filter(
            Q(sensor__device__bound_email=user.email, sensor__device__is_bound=True)
            | Q(sensor__device_id__in=shared_device_ids)
        )

        # Custom multi-sensor filter: sensor__in=<id,id,...>
        sensor_in = request.query_params.get("sensor__in")
        if sensor_in:
            try:
                ids = [int(s) for s in sensor_in.split(",") if s.strip()]
                if ids:
                    scoped = scoped.filter(sensor_id__in=ids)
            except ValueError:
                # Ignore malformed list silently
                pass

        if device_serial:
            # Apply extra serial constraint AFTER ownership scoping
            scoped = scoped.filter(sensor__device__device_serial=device_serial)

        return scoped

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


class AlertViewSet(BaseAuthViewSet):
    """ViewSet for Alert model with email-based filtering and management."""

    queryset = Alert.objects.select_related("device", "sensor", "reservoir").all()
    serializer_class = AlertSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        "device",
        "sensor",
        "metric",
        "trigger",
        "severity",
        "is_resolved",
        "is_acknowledged",
        "plant_category",
    ]
    search_fields = ["title", "recommendation", "plant_name", "device__device_name"]
    ordering_fields = ["created_at", "severity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        # Owner-only visibility for non-admins: filter alerts to devices bound to the user's email
        return qs.filter(Q(device__bound_email=user.email, device__is_bound=True))

    def perform_update(self, serializer):
        # Only allow ack/resolve updates; device ownership enforced by queryset scoping
        serializer.save()


def _user_can_manage_device(user, device) -> bool:
    """Return True if user can manage resources on this device (owner/staff/collab MANAGE)."""
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


class IngestLatestView(APIView):
    """HTTP ingest for latest readings from devices.

    Body: { readings: [ {sensor_id, value, status?} ... ] }
    Authentication: standard DRF auth (JWT/Token/Session). Device must be owned by or shared (MANAGE) with user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        readings = request.data.get("readings", [])
        if not isinstance(readings, list) or not readings:
            return Response({"detail": "readings must be a non-empty list"}, status=status.HTTP_400_BAD_REQUEST)

        # Coerce and collect sensor IDs
        try:
            sensor_ids = [int(r.get("sensor_id")) for r in readings if isinstance(r, dict) and r.get("sensor_id") is not None]
        except Exception:
            return Response({"detail": "sensor_id must be integer"}, status=status.HTTP_400_BAD_REQUEST)
        if not sensor_ids:
            return Response({"detail": "no valid sensor_id values"}, status=status.HTTP_400_BAD_REQUEST)

        # Load sensors and enforce device-level manage permissions
        sensors = Sensor.objects.select_related("device").filter(id__in=sensor_ids)
        sensors_by_id = {s.id: s for s in sensors}
        # Precompute allowed sensor ids by checking once per device
        allowed_ids = set()
        checked_devices = {}
        for s in sensors:
            dev = s.device
            if dev.id not in checked_devices:
                checked_devices[dev.id] = _user_can_manage_device(request.user, dev)
            if checked_devices[dev.id]:
                allowed_ids.add(s.id)

        if not allowed_ids:
            return Response({"detail": "no permission to ingest for provided sensors"}, status=status.HTTP_403_FORBIDDEN)

        from django.db import transaction
        from django.utils import timezone
        from django.core.cache import cache
        import hashlib, json

        now = timezone.now()
        updated_rows = []
        latest_cache = {}

        with transaction.atomic():
            for r in readings:
                sid = r.get("sensor_id")
                if sid not in allowed_ids:
                    continue
                try:
                    val = float(r.get("value")) if r.get("value") is not None else None
                except Exception:
                    # skip invalid value
                    continue
                status_str = str(r.get("status") or "")[:32]

                sl, _created = SensorLatest.objects.update_or_create(
                    sensor_id=sid,
                    defaults={"value": val, "status": status_str, "updated_at": now},
                )

                updated_rows.append({
                    "sensor_id": sid,
                    "value": sl.value,
                    "status": sl.status,
                    "updated_at": sl.updated_at,
                })

                # prepare cache entry
                latest_cache[f"latest:v1:{sid}"] = json.dumps({
                    "sensor_id": sid,
                    "value": sl.value,
                    "status": sl.status,
                    "updated_at": sl.updated_at.isoformat(),
                })

            if latest_cache:
                cache.set_many(latest_cache, timeout=120)

            if updated_rows:
                # per-user ETag seed: only sensors user just updated (sufficient to signal client)
                seed = "|".join(f"{r['sensor_id']}:{int(r['updated_at'].timestamp())}" for r in updated_rows)
                etag = hashlib.md5(seed.encode()).hexdigest()
                cache.set(f"latest:etag:user:{request.user.id}", etag, timeout=120)

        return Response({"updated": len(updated_rows)}, status=status.HTTP_200_OK)


class LatestReadingsView(APIView):
    """Return latest readings for sensors visible to the user (owner or collaborator)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache
        import json, hashlib
        device_id = request.query_params.get("device")
        device_serial = request.query_params.get("device_serial")

        # Build sensor queryset with sharing rules similar to SensorViewSet
        qs = Sensor.objects.select_related("device").only("id")
        user = request.user
        if not user.is_staff:
            shared_device_ids = DeviceCollaboration.objects.filter(
                collaborator_email__iexact=user.email,
                status=DeviceCollaboration.Status.ACTIVE,
            ).values_list("device_id", flat=True)
            qs = qs.filter(
                Q(device__bound_email=user.email, device__is_bound=True) | Q(device_id__in=shared_device_ids)
            )
        if device_id:
            qs = qs.filter(device_id=device_id)
        if device_serial:
            qs = qs.filter(device__device_serial=str(device_serial).strip().upper())

        sensor_ids = list(qs.values_list("id", flat=True))
        if not sensor_ids:
            return Response([], status=status.HTTP_200_OK)

        # ETag conditional handling (fast path via cached per-user ETag)
        client_etag = request.headers.get("If-None-Match")
        server_etag = cache.get(f"latest:etag:user:{user.id}")
        if client_etag and server_etag and client_etag.strip('"') == server_etag:
            from django.http import HttpResponseNotModified
            return HttpResponseNotModified()

        keys = [f"latest:v1:{sid}" for sid in sensor_ids]
        cached = cache.get_many(keys)
        found = []
        missing = []
        for sid, key in zip(sensor_ids, keys):
            blob = cached.get(key)
            if blob:
                found.append(json.loads(blob))
            else:
                missing.append(sid)

        if missing:
            rows = list(
                SensorLatest.objects.filter(sensor_id__in=missing).values(
                    "sensor_id", "value", "status", "updated_at"
                )
            )
            # backfill cache
            cache.set_many({
                f"latest:v1:{r['sensor_id']}": json.dumps({
                    **r, "updated_at": r["updated_at"].isoformat()
                }) for r in rows
            }, timeout=120)
            for r in rows:
                found.append({
                    "sensor_id": r["sensor_id"],
                    "value": r["value"],
                    "status": r["status"],
                    "updated_at": r["updated_at"],
                })

        etag_seed = "|".join(
            f"{r['sensor_id']}:{int((r['updated_at']).timestamp())}" for r in found if r.get("updated_at")
        )
        response_etag = hashlib.md5(etag_seed.encode()).hexdigest() if etag_seed else "0" * 32

        serializer = LatestReadingSerializer(found, many=True)
        # If client provided ETag and it matches the computed one, respond 304
        if client_etag and client_etag.strip('"') == response_etag:
            from django.http import HttpResponseNotModified
            return HttpResponseNotModified()

        resp = Response(serializer.data, status=status.HTTP_200_OK)
        resp["ETag"] = f'"{response_etag}"'
        resp["Cache-Control"] = "private, max-age=2"
        return resp
