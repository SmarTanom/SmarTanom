"""Views for plant catalog (reservoir model removed)."""

from __future__ import annotations

from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import Plant
from .serializers import PlantSerializer


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
