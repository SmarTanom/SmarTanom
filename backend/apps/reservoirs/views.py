"""Views for reservoir management."""

from __future__ import annotations

from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.views import BaseAuthViewSet
from .models import Reservoir
from .serializers import ReservoirSerializer


class ReservoirViewSet(BaseAuthViewSet):
    """ViewSet for Reservoir model with user-based filtering."""

    queryset = Reservoir.objects.select_related("device", "device__user").all()
    serializer_class = ReservoirSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["device", "plant_type"]
    search_fields = ["reservoir_name", "plant_type", "device__device_name"]
    ordering_fields = ["start_date", "end_date", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Filter queryset based on user permissions."""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(device__user=user)
