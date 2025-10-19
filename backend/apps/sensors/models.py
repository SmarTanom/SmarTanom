"""Models for sensor management."""

from __future__ import annotations

from django.db import models

from apps.common.models import TimeStampedModel
from apps.devices.models import Device
from django.utils.translation import gettext_lazy as _


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
                self.SensorType.AIR_TEMPERATURE: "°C",
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
            models.Index(fields=["sensor", "created_at"], name="idx_sens_data_created"),
            models.Index(fields=["created_at"], name="idx_sens_data_created_at"),
            models.Index(fields=["sensor", "value"], name="idx_sens_data_value"),
        ]

    def __str__(self) -> str:
        return f"SensorData(sensor={self.sensor_id}, value={self.value})"


class Alert(TimeStampedModel):
    """An alert generated from sensor readings with plant-aware thresholds and guidance.

    This table is the single source of truth for the Alerts UI. It is populated
    when new SensorData is ingested and a threshold trigger occurs.
    """

    class Severity(models.TextChoices):
        WARNING = "warning", _("Warning")
        CRITICAL = "critical", _("Critical")

    class Trigger(models.TextChoices):
        BELOW_MIN = "below_min", _("Below minimum")
        NEAR_MIN = "near_min", _("Near minimum")
        NEAR_MAX = "near_max", _("Near maximum")
        ABOVE_MAX = "above_max", _("Above maximum")

    class Metric(models.TextChoices):
        PH = "ph", _("pH")
        TDS = "tds", _("TDS (ppm)")
        EC = "ec", _("Electrical Conductivity (mS/cm)")
        LIGHT = "light", _("Light (lux)")
        ENVIRONMENT_TEMP = "environment_temp", _("Environment Temperature (°C)")
        WATER_TEMPERATURE = "water_temperature", _("Water Temperature (°C)")
        HUMIDITY = "humidity", _("Humidity (%)")

    class PlantCategory(models.TextChoices):
        LETTUCE = "Lettuce", _("Lettuce")
        BASIL = "Basil", _("Basil")
        PECHAY = "Pechay", _("Pechay")
        GENERIC = "Generic", _("Generic")

    device = models.ForeignKey(
        Device, on_delete=models.CASCADE, related_name="alerts", db_index=True
    )
    sensor = models.ForeignKey(
        Sensor, on_delete=models.SET_NULL, related_name="alerts", null=True, blank=True, db_index=True
    )
    # Optional reservoir context for plant-specific ranges
    reservoir = models.ForeignKey(
        "reservoirs.Reservoir", on_delete=models.SET_NULL, related_name="alerts", null=True, blank=True
    )

    # What metric triggered this alert (normalized for UI)
    metric = models.CharField(max_length=32, choices=Metric.choices, db_index=True)
    trigger = models.CharField(max_length=32, choices=Trigger.choices, db_index=True)
    severity = models.CharField(max_length=16, choices=Severity.choices, db_index=True)

    # Measurement context
    value = models.FloatField(help_text="Measured sensor value that triggered this alert")
    unit = models.CharField(max_length=32, blank=True, default="")
    min_threshold = models.FloatField(null=True, blank=True)
    max_threshold = models.FloatField(null=True, blank=True)
    buffer = models.FloatField(null=True, blank=True, help_text="Near-threshold buffer used for near_* triggers")

    # Plant info for recommendation personalization
    plant_name = models.CharField(max_length=100, blank=True, default="")
    plant_category = models.CharField(max_length=32, choices=PlantCategory.choices, default=PlantCategory.GENERIC, db_index=True)

    # Human-friendly context
    title = models.CharField(max_length=255)
    recommendation = models.TextField()

    # Lifecycle controls for UX
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Additional structured data (e.g., reading_id, debug)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["device", "created_at"], name="idx_alert_device_created"),
            models.Index(fields=["sensor"], name="idx_alert_sensor"),
            models.Index(fields=["metric", "trigger"], name="idx_alert_metric_trigger"),
            models.Index(fields=["severity"], name="idx_alert_severity"),
            models.Index(fields=["is_resolved", "created_at"], name="idx_alert_resolved_created"),
        ]
        ordering = ["-created_at"]
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"

    def __str__(self) -> str:
        return f"[{self.severity}] {self.title} (device={self.device_id})"
