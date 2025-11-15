"""Seed deterministic sensor data + alerts for device SMRT-R47-4TJ (Oct 15–21 2025).

Idempotent: skips insertion if any pH reading exists for the target device in the
date range. Controlled by env var SEED_SMRT_R47_4TJ=true.

Generates:
* 70 SensorData readings (pH, ec, tds, water_temperature) — 10 timestamps per day.
* 3 Alert rows for slight threshold breaches (pH, EC, TDS) at specified timestamps.

Thresholds (Lettuce Growing stage):
  pH: 5.5 – 6.5
  EC: 1.2 – 3.0 mS/cm
  TDS: 600 – 1500 ppm
  Water Temp: 18 – 24 °C

Run (Procfile snippet example):
  if [ "$SEED_SMRT_R47_4TJ" = "true" ]; then
    python manage.py seed_specific_device_oct2025
  fi

Turn env var off after successful seed to avoid duplicates.
"""

from __future__ import annotations

import os
from typing import List, Tuple
from django.core.management import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert


DEVICE_SERIAL = "SMRT-R47-4TJ"
DATE_START = timezone.datetime(2025, 10, 15, 0, 0, 0)
DATE_END = timezone.datetime(2025, 10, 21, 23, 59, 59)

# (timestamp, ph, ec, tds, water_temp)
READINGS: List[Tuple[str, float, float, float, float]] = [
    # Day 1 2025-10-15
    ("2025-10-15 06:00:12", 5.9, 1.6, 780, 19.4),
    ("2025-10-15 08:30:27", 6.3, 2.1, 910, 20.2),
    ("2025-10-15 10:15:41", 5.7, 1.8, 850, 21.0),
    ("2025-10-15 12:00:05", 6.1, 2.4, 995, 20.6),
    ("2025-10-15 13:45:19", 5.8, 1.5, 760, 19.8),
    ("2025-10-15 15:30:11", 6.2, 2.0, 880, 21.7),
    ("2025-10-15 17:15:52", 5.6, 1.9, 930, 22.1),
    ("2025-10-15 19:00:34", 6.4, 2.5, 1105, 22.4),
    ("2025-10-15 21:30:48", 5.9, 2.2, 1020, 21.3),
    ("2025-10-15 23:50:03", 6.0, 2.3, 1088, 20.1),
    # Day 2 2025-10-16 (alert pH 6.6)
    ("2025-10-16 06:00:16", 5.6, 1.7, 720, 19.2),
    ("2025-10-16 08:30:09", 6.2, 2.2, 980, 20.5),
    ("2025-10-16 10:15:33", 5.8, 1.9, 890, 21.2),
    ("2025-10-16 12:00:07", 6.3, 2.6, 1180, 22.0),
    ("2025-10-16 13:45:24", 6.6, 2.4, 1110, 21.4),  # ALERT pH high
    ("2025-10-16 15:30:46", 5.7, 1.6, 770, 19.9),
    ("2025-10-16 17:15:55", 6.1, 2.1, 940, 22.3),
    ("2025-10-16 19:00:42", 5.9, 1.8, 865, 21.5),
    ("2025-10-16 21:30:58", 6.0, 2.0, 905, 20.7),
    ("2025-10-16 23:50:04", 5.8, 1.5, 740, 19.6),
    # Day 3 2025-10-17
    ("2025-10-17 06:00:21", 5.5, 1.4, 690, 18.9),
    ("2025-10-17 08:30:32", 5.8, 2.0, 930, 20.3),
    ("2025-10-17 10:15:43", 6.3, 2.7, 1210, 22.6),
    ("2025-10-17 12:00:14", 6.1, 1.9, 880, 21.0),
    ("2025-10-17 13:45:08", 5.7, 1.5, 750, 19.7),
    ("2025-10-17 15:30:59", 6.4, 2.3, 1070, 22.1),
    ("2025-10-17 17:15:35", 5.9, 2.1, 990, 21.5),
    ("2025-10-17 19:00:47", 6.2, 2.5, 1140, 23.2),
    ("2025-10-17 21:30:52", 5.6, 1.6, 770, 19.4),
    ("2025-10-17 23:50:06", 5.9, 1.8, 820, 20.0),
    # Day 4 2025-10-18 (alert EC 3.1)
    ("2025-10-18 06:00:11", 5.8, 1.7, 760, 19.3),
    ("2025-10-18 08:30:28", 6.0, 2.1, 905, 20.8),
    ("2025-10-18 10:15:54", 5.6, 1.5, 735, 19.9),
    ("2025-10-18 12:00:02", 6.2, 2.4, 1095, 22.4),
    ("2025-10-18 13:45:39", 5.7, 1.8, 840, 21.3),
    ("2025-10-18 15:30:25", 5.9, 3.1, 1250, 22.0),  # ALERT EC high
    ("2025-10-18 17:15:58", 6.3, 2.2, 1005, 21.8),
    ("2025-10-18 19:00:41", 5.5, 1.3, 660, 19.1),
    ("2025-10-18 21:30:50", 6.1, 2.0, 910, 20.7),
    ("2025-10-18 23:50:05", 6.2, 2.5, 1155, 22.2),
    # Day 5 2025-10-19
    ("2025-10-19 06:00:17", 5.6, 1.6, 740, 19.5),
    ("2025-10-19 08:30:31", 6.4, 2.8, 1290, 23.0),
    ("2025-10-19 10:15:12", 5.9, 2.0, 905, 21.4),
    ("2025-10-19 12:00:09", 6.0, 2.3, 1065, 22.1),
    ("2025-10-19 13:45:56", 5.7, 1.4, 700, 19.6),
    ("2025-10-19 15:30:44", 6.2, 2.5, 1160, 23.3),
    ("2025-10-19 17:15:27", 5.8, 1.9, 860, 21.0),
    ("2025-10-19 19:00:36", 6.1, 2.2, 990, 21.9),
    ("2025-10-19 21:30:49", 5.5, 1.3, 665, 18.9),
    ("2025-10-19 23:50:02", 6.3, 2.6, 1205, 22.5),
    # Day 6 2025-10-20 (alert TDS 1555)
    ("2025-10-20 06:00:14", 5.9, 1.8, 880, 20.4),
    ("2025-10-20 08:30:22", 5.7, 1.5, 750, 19.7),
    ("2025-10-20 10:15:40", 6.2, 2.4, 1120, 22.3),
    ("2025-10-20 12:00:03", 5.6, 1.6, 770, 20.1),
    ("2025-10-20 13:45:47", 6.1, 2.0, 920, 21.6),
    ("2025-10-20 15:30:33", 5.8, 2.2, 1040, 22.0),
    ("2025-10-20 17:15:26", 6.0, 2.1, 1555, 22.4),  # ALERT TDS high
    ("2025-10-20 19:00:51", 5.5, 1.4, 690, 19.4),
    ("2025-10-20 21:30:57", 6.3, 2.7, 1230, 23.1),
    ("2025-10-20 23:50:07", 5.9, 1.9, 905, 20.8),
    # Day 7 2025-10-21
    ("2025-10-21 06:00:19", 5.8, 1.7, 770, 19.9),
    ("2025-10-21 08:30:15", 6.2, 2.3, 1090, 22.2),
    ("2025-10-21 10:15:53", 5.6, 1.5, 725, 19.8),
    ("2025-10-21 12:00:06", 6.0, 2.0, 900, 21.1),
    ("2025-10-21 13:45:32", 6.4, 2.6, 1185, 22.5),
    ("2025-10-21 15:30:45", 5.7, 1.4, 700, 19.5),
    ("2025-10-21 17:15:18", 6.1, 2.2, 1010, 21.7),
    ("2025-10-21 19:00:29", 5.9, 1.9, 880, 21.0),
    ("2025-10-21 21:30:55", 6.3, 2.5, 1150, 22.8),
    ("2025-10-21 23:50:01", 5.8, 1.6, 790, 20.2),
]

# Alert timestamps mapping -> (metric, value, trigger)
ALERT_MAP = {
    "2025-10-16 13:45:24": (Alert.Metric.PH, 6.6, Alert.Trigger.ABOVE_MAX),
    "2025-10-18 15:30:25": (Alert.Metric.EC, 3.1, Alert.Trigger.ABOVE_MAX),
    "2025-10-20 17:15:26": (Alert.Metric.TDS, 1555, Alert.Trigger.ABOVE_MAX),
}

# Thresholds for convenience when creating alerts
THRESHOLDS = {
    Alert.Metric.PH: (5.5, 6.5, "pH"),
    Alert.Metric.EC: (1.2, 3.0, "mS/cm"),
    Alert.Metric.TDS: (600, 1500, "ppm"),
    Alert.Metric.WATER_TEMPERATURE: (18, 24, "°C"),
}


class Command(BaseCommand):
    help = "Seed fixed 7-day sensor dataset + 3 alerts for SMRT-R47-4TJ (Oct 2025)."

    def handle(self, *args, **options):
        if (os.getenv("SEED_SMRT_R47_4TJ") or "").lower() != "true":
            self.stdout.write("SEED_SMRT_R47_4TJ not true; skipping seed_specific_device_oct2025.")
            return

        device = Device.objects.filter(device_serial=DEVICE_SERIAL).first()
        if not device:
            raise CommandError(f"Device {DEVICE_SERIAL} not found.")

        # Make datetimes aware for filtering
        aware_start = timezone.make_aware(DATE_START, timezone.get_current_timezone())
        aware_end = timezone.make_aware(DATE_END, timezone.get_current_timezone())

        ph_sensor = self._get_or_create_sensor(device, Sensor.SensorType.PH)
        ec_sensor = self._get_or_create_sensor(device, Sensor.SensorType.EC)
        tds_sensor = self._get_or_create_sensor(device, Sensor.SensorType.TDS)
        wt_sensor = self._get_or_create_sensor(device, Sensor.SensorType.WATER_TEMPERATURE)

        # Idempotency: If any pH reading in date range exists, abort seeding
        existing = SensorData.objects.filter(
            sensor=ph_sensor, created_at__gte=aware_start, created_at__lte=aware_end
        ).exists()
        if existing:
            self.stdout.write(self.style.WARNING("SensorData already present for range; skipping."))
            return

        created_rows = 0
        alerts_created = 0
        with transaction.atomic():
            for ts_str, ph, ec, tds, wt in READINGS:
                dt_naive = timezone.datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                dt = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                # Insert 4 sensor readings (ph, ec, tds, water_temperature)
                SensorData.objects.bulk_create([
                    SensorData(sensor=ph_sensor, value=ph, created_at=dt, ingest_id=f"seed-{DEVICE_SERIAL}-ph-{dt.strftime('%Y%m%d%H%M')}-v1"),
                    SensorData(sensor=ec_sensor, value=ec, created_at=dt, ingest_id=f"seed-{DEVICE_SERIAL}-ec-{dt.strftime('%Y%m%d%H%M')}-v1"),
                    SensorData(sensor=tds_sensor, value=tds, created_at=dt, ingest_id=f"seed-{DEVICE_SERIAL}-tds-{dt.strftime('%Y%m%d%H%M')}-v1"),
                    SensorData(sensor=wt_sensor, value=wt, created_at=dt, ingest_id=f"seed-{DEVICE_SERIAL}-wt-{dt.strftime('%Y%m%d%H%M')}-v1"),
                ])
                created_rows += 4

                # Create alert if timestamp matches map
                if ts_str in ALERT_MAP:
                    metric, value, trigger = ALERT_MAP[ts_str]
                    min_thr, max_thr, unit = THRESHOLDS[metric]
                    severity = Alert.Severity.WARNING  # slight exceed
                    title = f"{metric.upper()} High: {value} > {max_thr}" if trigger == Alert.Trigger.ABOVE_MAX else f"{metric.upper()} Alert"
                    recommendation = self._recommendation_for(metric, value, min_thr, max_thr)
                    sensor_ref = {
                        Alert.Metric.PH: ph_sensor,
                        Alert.Metric.EC: ec_sensor,
                        Alert.Metric.TDS: tds_sensor,
                        Alert.Metric.WATER_TEMPERATURE: wt_sensor,
                    }.get(metric)
                    Alert.objects.create(
                        device=device,
                        sensor=sensor_ref,
                        metric=metric,
                        trigger=trigger,
                        severity=severity,
                        value=value,
                        unit=unit,
                        min_threshold=min_thr,
                        max_threshold=max_thr,
                        plant_name=(device.plant.plant_name if device.plant else "Lettuce Growing"),
                        plant_category=Alert.PlantCategory.LETTUCE,
                        title=title,
                        recommendation=recommendation,
                        metadata={"seed": True, "timestamp": ts_str},
                        created_at=dt,
                    )
                    alerts_created += 1

        self.stdout.write(self.style.SUCCESS(f"Seed complete: {created_rows} SensorData rows; {alerts_created} Alerts."))

    def _get_or_create_sensor(self, device: Device, sensor_type: str) -> Sensor:
        sensor = Sensor.objects.filter(device=device, sensor_type=sensor_type).first()
        if sensor:
            return sensor
        sensor = Sensor(device=device, sensor_type=sensor_type, unit="")
        sensor.save()
        return sensor

    @staticmethod
    def _recommendation_for(metric: str, value: float, min_thr: float, max_thr: float) -> str:
        if metric == Alert.Metric.PH:
            return "Adjust nutrient solution to bring pH back into 5.5–6.5 range."
        if metric == Alert.Metric.EC:
            return "Dilute solution slightly or top up with fresh water to reduce EC."
        if metric == Alert.Metric.TDS:
            return "Add fresh water or change reservoir to lower TDS below 1500 ppm."
        return "Review system conditions and adjust as needed."
