"""Serializers for reservoir management."""

from __future__ import annotations

from rest_framework import serializers

from .models import Reservoir
from apps.devices.models import Device


class ReservoirSerializer(serializers.ModelSerializer):
    """Serializer for Reservoir model."""

    device_id = serializers.PrimaryKeyRelatedField(
        source="device", queryset=Device.objects.all(), write_only=True
    )
    device = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reservoir
        fields = [
            "id",
            "device",
            "device_id",
            "reservoir_name",
            "plant_type",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
