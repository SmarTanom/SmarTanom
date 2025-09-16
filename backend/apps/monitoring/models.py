"""Domain models for monitoring application.

Implements the ERD:
User (Django auth user) -> Device -> (Reservoir, Sensor) -> SensorData.

Best practice notes:
 - Use Django's built-in User model via get_user_model
 - Abstract base class for timestamps
 - Add indexes & constraints for query performance/integrity
 - Provide __str__ for admin readability
 - Provide clean() validations for business rules (e.g. reservoir date range)
 - Use verbose_name / verbose_name_plural where helpful
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

User = get_user_model()


class TimeStampedModel(models.Model):
	"""Abstract base model that supplies created/updated timestamps."""

	created_at = models.DateTimeField(auto_now_add=True, db_index=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		abstract = True
		ordering = ("-created_at",)


class Device(TimeStampedModel):
	"""A physical or logical device owned by a user that hosts sensors & reservoirs."""

	class Status(models.TextChoices):
		ACTIVE = "active", "Active"
		INACTIVE = "inactive", "Inactive"
		MAINTENANCE = "maintenance", "Maintenance"
		DECOMMISSIONED = "decommissioned", "Decommissioned"

	user = models.ForeignKey(
		User, on_delete=models.CASCADE, related_name="devices", db_index=True
	)
	device_name = models.CharField(max_length=100)
	status = models.CharField(
		max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
	)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["user", "device_name"], name="uq_device_user_name"
			)
		]
		indexes = [
			models.Index(fields=["user", "status"], name="idx_device_user_status")
		]
		verbose_name = "Device"
		verbose_name_plural = "Devices"

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"{self.device_name} (user={self.user_id})"


class Reservoir(TimeStampedModel):
	"""A reservoir (e.g., hydroponic tank) associated with a device."""

	device = models.ForeignKey(
		Device, on_delete=models.CASCADE, related_name="reservoirs", db_index=True
	)
	reservoir_name = models.CharField(max_length=100)
	plant_type = models.CharField(max_length=100)
	start_date = models.DateField()
	end_date = models.DateField()

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["device", "reservoir_name"], name="uq_reservoir_device_name"
			)
		]
		indexes = [
			models.Index(fields=["device", "start_date"], name="idx_reservoir_device_start"),
		]
		verbose_name = "Reservoir"
		verbose_name_plural = "Reservoirs"

	def clean(self):  # Business validation
		if self.end_date < self.start_date:
			raise ValidationError({"end_date": "End date cannot be before start date."})
		if self.start_date > timezone.now().date() + timezone.timedelta(days=365 * 5):
			raise ValidationError({"start_date": "Start date too far in the future."})

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"{self.reservoir_name} (device={self.device_id})"


class Sensor(TimeStampedModel):
	"""A sensor attached to a device (e.g. temperature, humidity)."""

	class SensorType(models.TextChoices):
		TEMPERATURE = "temperature", "Temperature"
		HUMIDITY = "humidity", "Humidity"
		PH = "ph", "pH"
		EC = "ec", "Electrical Conductivity"
		LIGHT = "light", "Light"
		OTHER = "other", "Other"

	device = models.ForeignKey(
		Device, on_delete=models.CASCADE, related_name="sensors", db_index=True
	)
	sensor_type = models.CharField(
		max_length=30, choices=SensorType.choices, db_index=True
	)
	unit = models.CharField(max_length=50)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["device", "sensor_type", "unit"],
				name="uq_sensor_device_type_unit",
			)
		]
		indexes = [
			models.Index(fields=["device", "sensor_type"], name="idx_sensor_device_type"),
		]
		verbose_name = "Sensor"
		verbose_name_plural = "Sensors"

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"{self.sensor_type} (device={self.device_id})"


class SensorData(TimeStampedModel):
	"""A single data point emitted by a sensor."""

	sensor = models.ForeignKey(
		Sensor, on_delete=models.CASCADE, related_name="readings", db_index=True
	)
	value = models.FloatField()

	class Meta(TimeStampedModel.Meta):  # Inherit ordering (newest first)
		verbose_name = "Sensor Data"
		verbose_name_plural = "Sensor Data"
		indexes = [
			models.Index(fields=["sensor", "created_at"], name="idx_sensordata_sensor_created"),
		]

	def __str__(self) -> str:  # pragma: no cover - trivial
		return f"SensorData(sensor={self.sensor_id}, value={self.value})"

