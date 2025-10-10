"""Device app views."""

from __future__ import annotations

from rest_framework import filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.common.views import BaseAuthViewSet
from .models import Device
from .serializers import DeviceSerializer


class DeviceViewSet(BaseAuthViewSet):
    """ViewSet for Device model with user-based filtering."""

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
