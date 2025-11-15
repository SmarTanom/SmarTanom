"""Seed deterministic sensor data + alerts for device SMRT-R47-4TJ (Oct 22–28 2025).

Idempotent: skips insertion if any pH reading exists for the target device in the
date range. Controlled by env var SEED_OCT22_28=true.

Generates:
* 70 SensorData timestamps with 6 metrics each: pH, EC, TDS, Water Temperature, Water Level, Turbidity — 10 timestamps per day.
* 3 Alert rows for slight threshold breaches (pH, EC, TDS) at specified timestamps.

Thresholds (Lettuce Growing stage):
  pH: 5.5 – 6.5
  EC: 1.2 – 3.0 mS/cm
  TDS: 600 – 1500 ppm
  Water Temp: 18 – 24 °C

Run (Procfile snippet example):
  if [ "$SEED_OCT22_28" = "true" ]; then
    python manage.py seed_oct22_28
  fi

Turn env var off after successful seed to avoid duplicates.
"""

from __future__ import annotations

import os
from typing import List, Tuple
from datetime import datetime
from django.core.management import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert


DEVICE_SERIAL = "SMRT-R47-4TJ"
DATE_START = timezone.datetime(2025, 10, 22, 0, 0, 0)
DATE_END = timezone.datetime(2025, 10, 28, 23, 59, 59)

# (timestamp, ph, ec, tds, water_temp)
READINGS: List[Tuple[str, float, float, float, float]] = [
    # Day 1 2025-10-22
    ("2025-10-22 06:00:15", 5.8, 1.7, 810, 19.8),
    ("2025-10-22 08:30:22", 6.1, 2.2, 975, 20.5),
    ("2025-10-22 10:15:38", 5.6, 1.9, 870, 21.3),
    ("2025-10-22 12:00:11", 6.3, 2.5, 1120, 21.9),
    ("2025-10-22 13:45:27", 5.9, 1.6, 785, 20.2),
    ("2025-10-22 15:30:44", 6.2, 2.1, 925, 22.0),
    ("2025-10-22 17:15:59", 5.7, 1.8, 845, 22.4),
    ("2025-10-22 19:00:33", 6.4, 2.6, 1145, 22.7),
    ("2025-10-22 21:30:46", 5.8, 2.3, 1055, 21.6),
    ("2025-10-22 23:50:08", 6.0, 2.4, 1095, 20.4),
    # Day 2 2025-10-23
    ("2025-10-23 06:00:19", 5.7, 1.5, 730, 19.4),
    ("2025-10-23 08:30:25", 6.1, 2.3, 1010, 20.7),
    ("2025-10-23 10:15:42", 5.9, 2.0, 920, 21.5),
    ("2025-10-23 12:00:14", 6.2, 2.7, 1220, 22.3),
    ("2025-10-23 13:45:31", 5.6, 1.4, 695, 19.9),
    ("2025-10-23 15:30:48", 6.3, 2.5, 1150, 22.8),
    ("2025-10-23 17:15:54", 5.8, 1.9, 875, 21.7),
    ("2025-10-23 19:00:37", 6.0, 2.2, 995, 21.2),
    ("2025-10-23 21:30:52", 5.5, 1.3, 670, 19.1),
    ("2025-10-23 23:50:06", 6.2, 2.6, 1180, 22.1),
    # Day 3 2025-10-24 (alert pH 6.7)
    ("2025-10-24 06:00:23", 5.9, 1.8, 865, 20.1),
    ("2025-10-24 08:30:17", 5.7, 1.6, 760, 19.7),
    ("2025-10-24 10:15:36", 6.3, 2.4, 1110, 22.0),
    ("2025-10-24 12:00:09", 5.6, 1.7, 795, 20.5),
    ("2025-10-24 13:45:41", 6.7, 2.1, 945, 21.8),  # ALERT pH high
    ("2025-10-24 15:30:55", 5.8, 2.3, 1065, 22.2),
    ("2025-10-24 17:15:28", 6.1, 2.0, 910, 21.4),
    ("2025-10-24 19:00:44", 5.5, 1.4, 705, 19.6),
    ("2025-10-24 21:30:58", 6.4, 2.8, 1255, 23.0),
    ("2025-10-24 23:50:03", 5.9, 1.9, 890, 20.9),
    # Day 4 2025-10-25 (alert EC 3.2)
    ("2025-10-25 06:00:12", 5.8, 1.7, 780, 19.5),
    ("2025-10-25 08:30:29", 6.0, 2.2, 935, 20.8),
    ("2025-10-25 10:15:47", 5.6, 1.5, 745, 20.0),
    ("2025-10-25 12:00:05", 6.2, 2.5, 1125, 22.5),
    ("2025-10-25 13:45:34", 5.7, 1.8, 855, 21.4),
    ("2025-10-25 15:30:21", 5.9, 3.2, 1310, 22.3),  # ALERT EC high
    ("2025-10-25 17:15:56", 6.3, 2.3, 1020, 21.9),
    ("2025-10-25 19:00:39", 5.5, 1.2, 650, 19.3),
    ("2025-10-25 21:30:49", 6.1, 2.1, 925, 20.8),
    ("2025-10-25 23:50:07", 6.2, 2.6, 1170, 22.4),
    # Day 5 2025-10-26
    ("2025-10-26 06:00:16", 5.6, 1.6, 750, 19.6),
    ("2025-10-26 08:30:33", 6.4, 2.9, 1320, 23.2),
    ("2025-10-26 10:15:19", 5.9, 2.0, 915, 21.5),
    ("2025-10-26 12:00:08", 6.0, 2.4, 1080, 22.2),
    ("2025-10-26 13:45:51", 5.7, 1.4, 710, 19.8),
    ("2025-10-26 15:30:42", 6.2, 2.6, 1175, 23.4),
    ("2025-10-26 17:15:24", 5.8, 1.9, 870, 21.1),
    ("2025-10-26 19:00:35", 6.1, 2.3, 1005, 22.0),
    ("2025-10-26 21:30:47", 5.5, 1.3, 675, 19.0),
    ("2025-10-26 23:50:04", 6.3, 2.7, 1220, 22.6),
    # Day 6 2025-10-27 (alert TDS 1580)
    ("2025-10-27 06:00:13", 5.9, 1.8, 895, 20.5),
    ("2025-10-27 08:30:26", 5.7, 1.5, 765, 19.8),
    ("2025-10-27 10:15:43", 6.2, 2.5, 1140, 22.4),
    ("2025-10-27 12:00:02", 5.6, 1.7, 785, 20.2),
    ("2025-10-27 13:45:48", 6.1, 2.1, 935, 21.7),
    ("2025-10-27 15:30:37", 5.8, 2.3, 1065, 22.1),
    ("2025-10-27 17:15:29", 6.0, 2.2, 1580, 22.5),  # ALERT TDS high
    ("2025-10-27 19:00:53", 5.5, 1.4, 700, 19.5),
    ("2025-10-27 21:30:59", 6.3, 2.8, 1245, 23.2),
    ("2025-10-27 23:50:09", 5.9, 1.9, 915, 20.9),
    # Day 7 2025-10-28
    ("2025-10-28 06:00:18", 5.8, 1.7, 780, 20.0),
    ("2025-10-28 08:30:14", 6.2, 2.4, 1105, 22.3),
    ("2025-10-28 10:15:51", 5.6, 1.5, 735, 19.9),
    ("2025-10-28 12:00:07", 6.0, 2.1, 915, 21.2),
    ("2025-10-28 13:45:36", 6.4, 2.7, 1200, 22.6),
    ("2025-10-28 15:30:43", 5.7, 1.4, 710, 19.6),
    ("2025-10-28 17:15:16", 6.1, 2.3, 1025, 21.8),
    ("2025-10-28 19:00:27", 5.9, 2.0, 895, 21.1),
    ("2025-10-28 21:30:54", 6.3, 2.6, 1165, 22.9),
    ("2025-10-28 23:50:02", 5.8, 1.6, 800, 20.3),
]

# Alert timestamps mapping -> (metric, value, trigger)
ALERT_MAP = {
    "2025-10-24 13:45:41": (Alert.Metric.PH, 6.7, Alert.Trigger.ABOVE_MAX),
    "2025-10-25 15:30:21": (Alert.Metric.EC, 3.2, Alert.Trigger.ABOVE_MAX),
    "2025-10-27 17:15:29": (Alert.Metric.TDS, 1580, Alert.Trigger.ABOVE_MAX),
}

# Thresholds for convenience when creating alerts
THRESHOLDS = {
    Alert.Metric.PH: (5.5, 6.5, "pH"),
    Alert.Metric.EC: (1.2, 3.0, "mS/cm"),
    Alert.Metric.TDS: (600, 1500, "ppm"),
    Alert.Metric.WATER_TEMPERATURE: (18, 24, "°C"),
}


class Command(BaseCommand):
    help = "Seed fixed 7-day sensor dataset + 3 alerts for SMRT-R47-4TJ (Oct 22-28 2025)."

    def handle(self, *args, **options):
        flag = (os.getenv("SEED_OCT22_28") or "").strip().lower()
        truthy = {"true", "1", "yes", "y", "on", "repair"}
        if flag not in truthy:
            self.stdout.write("SEED_OCT22_28 not enabled; set to true/1/yes/on/repair to run.")
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
        wl_sensor = self._get_or_create_sensor(device, Sensor.SensorType.WATER_LEVEL)
        turb_sensor = self._get_or_create_sensor(device, Sensor.SensorType.TURBIDITY)

        # Idempotency check v2:
        # Prefer strong check by ingest_id prefix, since previous versions may have wrong created_at
        seed_prefix = f"seed-oct22_28-{DEVICE_SERIAL}-"
        existing_seed = SensorData.objects.filter(
            sensor__in=[ph_sensor, ec_sensor, tds_sensor, wt_sensor, wl_sensor, turb_sensor],
            ingest_id__startswith=seed_prefix,
        ).exists()

        if existing_seed and flag != "repair":
            self.stdout.write(
                self.style.WARNING(
                    f"Seed already present (Oct 22-28). Set SEED_OCT22_28=repair to fix timestamps if needed."
                )
            )
            return

        if existing_seed and flag == "repair":
            # If seed already exists, repair timestamps if needed (created_at should match embedded timestamp)
            repaired_sd = self._repair_sensor_data_seed_timestamps(
                [ph_sensor, ec_sensor, tds_sensor, wt_sensor, wl_sensor, turb_sensor], seed_prefix
            )
            repaired_alerts = self._repair_alert_seed_timestamps(device, "oct22_28")
            self.stdout.write(
                self.style.WARNING(
                    f"Seed already present. Repaired timestamps for {repaired_sd} SensorData rows and {repaired_alerts} Alerts."
                )
            )
            return

        created_rows = 0
        alerts_created = 0
        alerts_buffer: List[Alert] = []
        idx = 0
        with transaction.atomic():
            for ts_str, ph, ec, tds, wt in READINGS:
                dt_naive = timezone.datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                dt = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                # Deterministic synthetic values for Water Level (%) and Turbidity (NTU)
                # Water Level oscillates gently between ~70–95%
                wl = max(70.0, min(95.0, 95.0 - (idx % 12) * 2.1))
                # Turbidity small values ~0.8–5.0 NTU
                turb = round(0.8 + (idx % 8) * 0.55, 2)
                # Insert 6 sensor readings (ph, ec, tds, water_temperature, water_level, turbidity)
                SensorData.objects.bulk_create(
                    [
                        SensorData(
                            sensor=ph_sensor,
                            value=ph,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-ph-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=ec_sensor,
                            value=ec,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-ec-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=tds_sensor,
                            value=tds,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-tds-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=wt_sensor,
                            value=wt,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-wt-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=wl_sensor,
                            value=wl,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-wl-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=turb_sensor,
                            value=turb,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct22_28-{DEVICE_SERIAL}-turb-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                    ],
                    ignore_conflicts=True,
                )
                created_rows += 6

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
                    alerts_buffer.append(
                        Alert(
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
                            metadata={"seed": True, "seed_batch": "oct22_28", "timestamp": ts_str},
                            created_at=dt,
                            updated_at=dt,
                        )
                    )
                    alerts_created += 1
                idx += 1

            # Bulk create alerts in one go so created_at is preserved (auto_now_add not triggered)
            if alerts_buffer:
                Alert.objects.bulk_create(alerts_buffer, ignore_conflicts=True)

            # Ensure SensorLatest is populated so dashboard cards don't show "Loading..."
            # Use the last timestamp (end of loop) for updated_at and the last values for current readings.
            last_ts_naive = timezone.datetime.strptime(READINGS[-1][0], "%Y-%m-%d %H:%M:%S")
            last_dt = timezone.make_aware(last_ts_naive, timezone.get_current_timezone())
            last_ph, last_ec, last_tds, last_wt = READINGS[-1][1:]
            # recompute deterministic WL/Turbidity indexes for the last row
            last_idx = len(READINGS) - 1
            last_wl = max(70.0, min(95.0, 95.0 - (last_idx % 12) * 2.1))
            last_turb = round(0.8 + (last_idx % 8) * 0.55, 2)

            from apps.sensors.models import SensorLatest
            SensorLatest.objects.update_or_create(
                sensor=ph_sensor,
                defaults={"value": last_ph, "status": "", "updated_at": last_dt},
            )
            SensorLatest.objects.update_or_create(
                sensor=ec_sensor,
                defaults={"value": last_ec, "status": "", "updated_at": last_dt},
            )
            SensorLatest.objects.update_or_create(
                sensor=tds_sensor,
                defaults={"value": last_tds, "status": "", "updated_at": last_dt},
            )
            SensorLatest.objects.update_or_create(
                sensor=wt_sensor,
                defaults={"value": last_wt, "status": "", "updated_at": last_dt},
            )
            SensorLatest.objects.update_or_create(
                sensor=wl_sensor,
                defaults={"value": last_wl, "status": "", "updated_at": last_dt},
            )
            SensorLatest.objects.update_or_create(
                sensor=turb_sensor,
                defaults={"value": last_turb, "status": "", "updated_at": last_dt},
            )

        self.stdout.write(self.style.SUCCESS(f"Seed complete (Oct 22-28): {created_rows} SensorData rows; {alerts_created} Alerts."))

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

    def _repair_sensor_data_seed_timestamps(self, sensors: List[Sensor], seed_prefix: str) -> int:
        """Repair created_at/updated_at for previously-seeded SensorData rows that may have "now()" timestamps.

        We derive the intended timestamp from the ingest_id token: seed-oct22_28-<DEVICE>-<metric>-YYYYMMDDHHMM-v1
        """
        repaired = 0
        for sensor in sensors:
            qs = SensorData.objects.filter(sensor=sensor, ingest_id__startswith=seed_prefix)
            for row in qs.iterator():
                ingest_id = row.ingest_id or ""
                try:
                    # Strip the device-specific prefix to get e.g. "ph-202510220600-v1"
                    if ingest_id.startswith(seed_prefix):
                        suffix = ingest_id[len(seed_prefix):]
                    else:
                        # Not expected, but skip
                        continue
                    parts = suffix.split("-")
                    # Expect [metric, YYYYMMDDHHMM, v1]
                    if len(parts) < 3:
                        continue
                    ts_token = parts[1]
                    dt_naive = datetime.strptime(ts_token, "%Y%m%d%H%M")
                    dt = timezone.make_aware(dt_naive, timezone.get_current_timezone())
                except Exception:
                    continue

                # Only update if different to avoid needless writes
                if row.created_at != dt or getattr(row, "updated_at", dt) != dt:
                    SensorData.objects.filter(pk=row.pk).update(created_at=dt, updated_at=dt)
                    repaired += 1

        return repaired

    def _repair_alert_seed_timestamps(self, device: Device, seed_batch: str) -> int:
        """Repair created_at/updated_at for seed Alerts using their metadata.timestamp."""
        repaired = 0
        qs = Alert.objects.filter(device=device, metadata__seed=True, metadata__seed_batch=seed_batch)
        for a in qs.iterator():
            ts_str = (a.metadata or {}).get("timestamp")
            if not ts_str:
                continue
            try:
                dt_naive = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
                dt = timezone.make_aware(dt_naive, timezone.get_current_timezone())
            except Exception:
                continue

            if a.created_at != dt or getattr(a, "updated_at", dt) != dt:
                Alert.objects.filter(pk=a.pk).update(created_at=dt, updated_at=dt)
                repaired += 1

        return repaired
