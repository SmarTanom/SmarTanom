"""Models for sensor management."""

from __future__ import annotations

from django.db import models

from apps.common.models import TimeStampedModel
from apps.devices.models import Device


class Sensor(TimeStampedModel):
    """A sensor attached to a device."""

    class SensorType(models.TextChoices):
        """Sensor types matching actual hardware."""
        # Water quality sensors
        PH = "ph", "pH Sensor"
        TDS = "tds", "TDS Sensor (ppm)"
        EC = "ec", "Electrical Conductivity (mS/cm)"
        WATER_TEMPERATURE = "water_temperature", "Water Temperature Sensor (°C)"
        WATER_LEVEL = "water_level", "Water Level Sensor"
        TURBIDITY = "turbidity", "Turbidity Sensor (NTU)"

        # DHT22 sensor (dual function)
        AIR_TEMPERATURE = "air_temperature", "Air Temperature - DHT22 (°C)"
        HUMIDITY = "humidity", "Humidity - DHT22 (%)"

        # BH1750 light sensor
        LIGHT = "light", "Light Sensor - BH1750 (lux)"

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
                name="uq_newsensor_device_type_unit",
            )
        ]
        indexes = [
            models.Index(fields=["device", "sensor_type"], name="idx_newsensor_device_type"),
        ]
        verbose_name = "Sensor"
        verbose_name_plural = "Sensors"

    def __str__(self) -> str:
        return f"{self.sensor_type} (device={self.device_id})"

    def save(self, *args, **kwargs):
        """Set default units based on sensor type."""
        if not self.unit:
            # Set default units based on sensor type
            default_units = {
                self.SensorType.WATER_TEMPERATURE: "°C",
                self.SensorType.HUMIDITY: "%",
                self.SensorType.PH: "pH",
                self.SensorType.TDS: "ppm",
                self.SensorType.EC: "mS/cm",
                self.SensorType.LIGHT: "lux",
                self.SensorType.WATER_LEVEL: "%",
                self.SensorType.TURBIDITY: "NTU",
            }
            self.unit = default_units.get(self.sensor_type, "")

        super().save(*args, **kwargs)


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
            models.Index(fields=["sensor", "created_at"], name="idx_newsens_data_created"),
        ]

    def __str__(self) -> str:
        return f"SensorData(sensor={self.sensor_id}, value={self.value})"
