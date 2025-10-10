"""URL configuration for sensor management."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SensorViewSet, SensorDataViewSet

app_name = 'sensors'

router = DefaultRouter()
router.register(r"sensors", SensorViewSet, basename="sensor")
router.register(r"sensor-data", SensorDataViewSet, basename="sensordata")

urlpatterns = [
    path("", include(router.urls)),
]
