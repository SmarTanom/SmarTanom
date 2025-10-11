"""Views for sensor management."""

from __future__ import annotations

from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.views import BaseAuthViewSet
from .models import Sensor, SensorData
from .serializers import SensorSerializer, SensorDataSerializer


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
        """Filter queryset based on user permissions."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(device__bound_email=user.email, device__is_bound=True)


class SensorDataViewSet(BaseAuthViewSet):
    """ViewSet for SensorData model with email-based filtering."""

    queryset = SensorData.objects.select_related("sensor", "sensor__device").all()
    serializer_class = SensorDataSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["sensor", "sensor__device"]
    ordering_fields = ["created_at", "value"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(sensor__device__bound_email=user.email, sensor__device__is_bound=True)
