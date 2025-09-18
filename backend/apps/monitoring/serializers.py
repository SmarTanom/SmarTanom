"""Serializers for monitoring app models."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from . import models

User = get_user_model()


class DeviceSerializer(serializers.ModelSerializer):
	user_id = serializers.PrimaryKeyRelatedField(
		source="user", queryset=User.objects.all(), write_only=True
	)
	user = serializers.StringRelatedField(read_only=True)

	class Meta:
		model = models.Device
		fields = [
			"id",
			"user",
			"user_id",
			"device_name",
			"status",
			"created_at",
			"updated_at",
		]
		read_only_fields = ["id", "created_at", "updated_at"]


class ReservoirSerializer(serializers.ModelSerializer):
	device_id = serializers.PrimaryKeyRelatedField(
		source="device", queryset=models.Device.objects.all(), write_only=True
	)
	device = serializers.StringRelatedField(read_only=True)

	class Meta:
		model = models.Reservoir
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


class SensorSerializer(serializers.ModelSerializer):
	device_id = serializers.PrimaryKeyRelatedField(
		source="device", queryset=models.Device.objects.all(), write_only=True
	)
	device = serializers.StringRelatedField(read_only=True)

	class Meta:
		model = models.Sensor
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
	sensor_id = serializers.PrimaryKeyRelatedField(
		source="sensor", queryset=models.Sensor.objects.all(), write_only=True
	)
	sensor = serializers.StringRelatedField(read_only=True)

	class Meta:
		model = models.SensorData
		fields = [
			"id",
			"sensor",
			"sensor_id",
			"value",
			"created_at",
		]
		read_only_fields = ["id", "created_at"]

