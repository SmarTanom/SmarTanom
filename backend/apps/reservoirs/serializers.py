"""Serializers for reservoir management."""

from __future__ import annotations

from rest_framework import serializers

from .models import Plant


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
