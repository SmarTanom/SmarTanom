"""URL configuration for reservoir management."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ReservoirViewSet

app_name = 'reservoirs'

router = DefaultRouter()
router.register(r"reservoirs", ReservoirViewSet, basename="reservoir")

urlpatterns = [
    path("", include(router.urls)),
]
