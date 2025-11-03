"""URL configuration for sensor management."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SensorViewSet, SensorDataViewSet, AlertViewSet, IngestLatestView, LatestReadingsView

app_name = 'sensors'

router = DefaultRouter()
router.register(r"sensors", SensorViewSet, basename="sensor")
router.register(r"sensor-data", SensorDataViewSet, basename="sensordata")
router.register(r"alerts", AlertViewSet, basename="alert")

urlpatterns = [
    path("", include(router.urls)),
    path("ingest/latest/", IngestLatestView.as_view(), name="ingest-latest"),
    path("latest/", LatestReadingsView.as_view(), name="latest-readings"),
]
