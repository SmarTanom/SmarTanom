"""Serializers for sensor management."""

from __future__ import annotations

from rest_framework import serializers

from .models import Sensor, SensorData, Alert, SensorLatest
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
    sensor_type = serializers.CharField(source='sensor.sensor_type', read_only=True)
    unit = serializers.CharField(source='sensor.unit', read_only=True)

    class Meta:
        model = SensorData
        fields = [
            "id",
            "sensor",
            "sensor_id",
            "sensor_type",
            "value",
            "ingest_id",
            "unit",
            "created_at",
        ]
        read_only_fields = ["id", "sensor_type", "unit", "created_at"]


class AlertSerializer(serializers.ModelSerializer):
    """Serializer for Alert model."""

    device_id = serializers.PrimaryKeyRelatedField(
        source="device", queryset=Device.objects.all(), write_only=True, required=False
    )
    device = serializers.StringRelatedField(read_only=True)
    sensor_id = serializers.PrimaryKeyRelatedField(
        source="sensor", queryset=Sensor.objects.all(), write_only=True, required=False, allow_null=True
    )
    sensor = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "device",
            "device_id",
            "sensor",
            "sensor_id",
            "reservoir",
            "metric",
            "trigger",
            "severity",
            "value",
            "unit",
            "min_threshold",
            "max_threshold",
            "buffer",
            "plant_name",
            "plant_category",
            "title",
            "recommendation",
            "is_acknowledged",
            "acknowledged_at",
            "is_resolved",
            "resolved_at",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "device",
            "sensor",
            "created_at",
            "updated_at",
        ]


class LatestReadingSerializer(serializers.Serializer):
    """Serializer for latest reading payloads (non-model, fast path)."""
    sensor_id = serializers.IntegerField()
    value = serializers.FloatField(allow_null=True)
    status = serializers.CharField(allow_blank=True)
    updated_at = serializers.DateTimeField()
