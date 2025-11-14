"""URL configuration for reservoir management."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PlantViewSet

app_name = 'reservoirs'

router = DefaultRouter()
router.register(r"plants", PlantViewSet, basename="plant")

urlpatterns = [
    path("", include(router.urls)),
]
