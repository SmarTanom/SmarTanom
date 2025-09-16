"""API views (ViewSets) for monitoring app."""

from __future__ import annotations

from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Device, Reservoir, Sensor, SensorData
from .serializers import (
	DeviceSerializer,
	ReservoirSerializer,
	SensorSerializer,
	SensorDataSerializer,
)


class BaseAuthViewSet(viewsets.ModelViewSet):
	permission_classes = [IsAuthenticated]


class DeviceViewSet(BaseAuthViewSet):
	queryset = Device.objects.select_related("user").all()
	serializer_class = DeviceSerializer
	filter_backends = [filters.SearchFilter, filters.OrderingFilter]
	search_fields = ["device_name", "status", "user__username", "user__email"]
	ordering_fields = ["device_name", "status", "created_at"]
	ordering = ["-created_at"]

	def get_queryset(self):  # Users see only their devices unless staff
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff:
			return qs
		return qs.filter(user=user)


class ReservoirViewSet(BaseAuthViewSet):
	queryset = Reservoir.objects.select_related("device", "device__user").all()
	serializer_class = ReservoirSerializer
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_fields = ["device", "plant_type"]
	search_fields = ["reservoir_name", "plant_type", "device__device_name"]
	ordering_fields = ["start_date", "end_date", "created_at"]
	ordering = ["-created_at"]

	def get_queryset(self):
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff:
			return qs
		return qs.filter(device__user=user)


class SensorViewSet(BaseAuthViewSet):
	queryset = Sensor.objects.select_related("device", "device__user").all()
	serializer_class = SensorSerializer
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_fields = ["device", "sensor_type"]
	search_fields = ["sensor_type", "unit", "device__device_name"]
	ordering_fields = ["sensor_type", "created_at"]
	ordering = ["-created_at"]

	def get_queryset(self):
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff:
			return qs
		return qs.filter(device__user=user)


class SensorDataViewSet(BaseAuthViewSet):
	queryset = SensorData.objects.select_related("sensor", "sensor__device").all()
	serializer_class = SensorDataSerializer
	filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
	filterset_fields = ["sensor", "sensor__device"]
	ordering_fields = ["created_at", "value"]
	ordering = ["-created_at"]

	def get_queryset(self):
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff:
			return qs
		return qs.filter(sensor__device__user=user)

