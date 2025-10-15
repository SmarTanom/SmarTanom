"""Serializers for reservoir management."""

from __future__ import annotations

from rest_framework import serializers

from .models import Reservoir, Plant
from apps.devices.models import Device


class ReservoirSerializer(serializers.ModelSerializer):
    """Serializer for Reservoir model."""

    device_id = serializers.PrimaryKeyRelatedField(
        source="device", queryset=Device.objects.all(), write_only=True
    )
    device = serializers.StringRelatedField(read_only=True)
    plant_id = serializers.PrimaryKeyRelatedField(
        source="plant", queryset=Plant.objects.all(), write_only=True
    )
    plant = serializers.StringRelatedField(read_only=True)
    # Backward compatibility: expose plant_type as plant.plant_name (read-only)
    plant_type = serializers.CharField(source="plant.plant_name", read_only=True)

    class Meta:
        model = Reservoir
        fields = [
            "id",
            "device",
            "device_id",
            "reservoir_name",
            "plant",
            "plant_id",
            "plant_type",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlantSerializer(serializers.ModelSerializer):
    """Serializer for Plant reference model."""

    class Meta:
        model = Plant
        fields = [
            "id",
            "plant_name",
            "ppm_min",
            "ppm_max",
            "ph_min",
            "ph_max",
            "water_temp_min",
            "water_temp_max",
            "light_min",
            "light_max",
            "environment_temp_min",
            "environment_temp_max",
            "humidity_min",
            "humidity_max",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
