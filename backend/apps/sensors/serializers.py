"""Serializers for sensor management."""

from __future__ import annotations

from rest_framework import serializers

from .models import Sensor, SensorData
from apps.devices.models import Device


class SensorSerializer(serializers.ModelSerializer):
    """Serializer for Sensor model."""

    device_id = serializers.PrimaryKeyRelatedField(
        source="device", queryset=Device.objects.all(), write_only=True
    )
    device = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Sensor
        fields = [
            "id",
            "device",
            "device_id",
            "sensor_type",
            "unit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SensorDataSerializer(serializers.ModelSerializer):
    """Serializer for SensorData model."""

    sensor_id = serializers.PrimaryKeyRelatedField(
        source="sensor", queryset=Sensor.objects.all(), write_only=True
    )
    sensor = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = SensorData
        fields = [
            "id",
            "sensor",
            "sensor_id",
            "value",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
