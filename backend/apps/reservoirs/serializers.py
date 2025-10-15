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
    # Return full plant object with ranges instead of just string
    plant = serializers.SerializerMethodField(read_only=True)
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

    def get_plant(self, obj):
        """Return full plant data with all range information."""
        if obj.plant:
            return {
                "id": obj.plant.id,
                "plant_name": obj.plant.plant_name,
                "ppm_min": obj.plant.ppm_min,
                "ppm_max": obj.plant.ppm_max,
                "ec_min": obj.plant.ec_min,
                "ec_max": obj.plant.ec_max,
                "ph_min": obj.plant.ph_min,
                "ph_max": obj.plant.ph_max,
                "water_temp_min": obj.plant.water_temp_min,
                "water_temp_max": obj.plant.water_temp_max,
                "light_min": obj.plant.light_min,
                "light_max": obj.plant.light_max,
                "environment_temp_min": obj.plant.environment_temp_min,
                "environment_temp_max": obj.plant.environment_temp_max,
                "humidity_min": obj.plant.humidity_min,
                "humidity_max": obj.plant.humidity_max,
            }
        return None


class PlantSerializer(serializers.ModelSerializer):
    """Serializer for Plant reference model."""

    class Meta:
        model = Plant
        fields = [
            "id",
            "plant_name",
            "ppm_min",
            "ppm_max",
            "ec_min",
            "ec_max",
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
