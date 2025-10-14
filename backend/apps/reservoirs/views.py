"""Views for reservoir management."""

from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.views import BaseAuthViewSet
from .models import Reservoir, Plant
from apps.devices.models import DeviceCollaboration
from .serializers import ReservoirSerializer, PlantSerializer


class ReservoirViewSet(BaseAuthViewSet):
    """ViewSet for Reservoir model with email-based filtering."""

    queryset = Reservoir.objects.select_related("device", "plant").all()
    serializer_class = ReservoirSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["device", "plant"]
    search_fields = ["reservoir_name", "plant__plant_name", "device__device_name"]
    ordering_fields = ["start_date", "end_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions, including shared devices."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs

        shared_device_ids = DeviceCollaboration.objects.filter(
            collaborator_email=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
        ).values_list("device_id", flat=True)

        return qs.filter(
            Q(device__bound_email=user.email, device__is_bound=True)
            | Q(device_id__in=shared_device_ids)
        )

    def _has_manage_permissions(self, device) -> bool:
        user = self.request.user
        if user.is_staff:
            return True
        if getattr(device, "bound_email", None) == user.email:
            return True
        return DeviceCollaboration.objects.filter(
            device=device,
            collaborator_email=user.email,
            status=DeviceCollaboration.Status.ACTIVE,
            permissions=DeviceCollaboration.Permission.MANAGE,
        ).exists()

    def perform_create(self, serializer):
        device = serializer.validated_data.get("device")
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to create reservoirs on this device."
            )
        serializer.save()

    def perform_update(self, serializer):
        device = getattr(serializer.instance, "device", None)
        if device is None:
            device = serializer.validated_data.get("device")
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to update reservoirs on this device."
            )
        serializer.save()

    def perform_destroy(self, instance):
        device = getattr(instance, "device", None)
        if not self._has_manage_permissions(device):
            raise PermissionDenied(
                "Permission denied. You need manage permissions to delete reservoirs on this device."
            )
        instance.delete()


class PlantViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only endpoints for Plant catalog used by reservoirs."""

    queryset = Plant.objects.all().order_by("plant_name")
    serializer_class = PlantSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["plant_name"]
    search_fields = ["plant_name"]
    ordering_fields = ["plant_name", "created_at"]
    ordering = ["plant_name"]
