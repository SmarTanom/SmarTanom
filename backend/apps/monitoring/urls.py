"""Monitoring app API routes."""

from __future__ import annotations

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
	DeviceViewSet,
	ReservoirViewSet,
	SensorViewSet,
	SensorDataViewSet,
)

router = DefaultRouter()
router.register(r"devices", DeviceViewSet, basename="device")
router.register(r"reservoirs", ReservoirViewSet, basename="reservoir")
router.register(r"sensors", SensorViewSet, basename="sensor")
router.register(r"sensor-data", SensorDataViewSet, basename="sensordata")

urlpatterns = [
	path("", include(router.urls)),
]

