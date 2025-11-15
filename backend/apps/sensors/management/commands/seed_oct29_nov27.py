"""Seed deterministic sensor data + alerts for device SMRT-R47-4TJ (Oct 29 – Nov 27 2025).

Idempotent: skips insertion if any pH reading exists for the target device in the
date range. Controlled by env var SEED_OCT29_NOV27=true.

Generates:
* 300 SensorData timestamps with 6 metrics each: pH, EC, TDS, Water Temperature, Water Level, Turbidity — 10 timestamps per day for 30 days.
* 9 Alert rows for threshold breaches distributed across the month.

Thresholds (Lettuce Growing stage):
  pH: 5.5 – 6.5
  EC: 1.2 – 3.0 mS/cm
  TDS: 600 – 1500 ppm
  Water Temp: 18 – 24 °C

Run (Procfile snippet example):
  if [ "$SEED_OCT29_NOV27" = "true" ]; then
    python manage.py seed_oct29_nov27
  fi

Turn env var off after successful seed to avoid duplicates.
"""

from __future__ import annotations

import os
from typing import List, Tuple
from datetime import datetime, timedelta
from django.core.management import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert


DEVICE_SERIAL = "SMRT-R47-4TJ"
DATE_START = timezone.datetime(2025, 10, 29, 0, 0, 0)
DATE_END = timezone.datetime(2025, 11, 27, 23, 59, 59)


def generate_readings() -> List[Tuple[str, float, float, float, float]]:
    """Generate 30 days of realistic sensor readings (10 per day = 300 total)."""
    readings = []
    base_date = datetime(2025, 10, 29)
    
    # Time slots for 10 readings per day
    time_slots = [
        (6, 0), (8, 30), (10, 15), (12, 0), (13, 45),
        (15, 30), (17, 15), (19, 0), (21, 30), (23, 50)
    ]
    
    for day_offset in range(30):  # 30 days
        current_date = base_date + timedelta(days=day_offset)
        
        for slot_idx, (hour, minute) in enumerate(time_slots):
            # Add some seconds variation
            second = (day_offset * 7 + slot_idx * 3) % 60
            
            timestamp = current_date.replace(hour=hour, minute=minute, second=second)
            ts_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            # Generate realistic values with slight variations
            # pH: oscillates around 5.8-6.2 with occasional spikes
            ph_base = 6.0
            ph_variation = 0.3 * ((day_offset * slot_idx) % 7 - 3) / 3
            ph = round(max(5.5, min(6.5, ph_base + ph_variation)), 1)
            
            # EC: ranges 1.4-2.8 with occasional highs
            ec_base = 2.0
            ec_variation = 0.5 * ((day_offset + slot_idx * 2) % 8 - 4) / 4
            ec = round(max(1.2, min(3.0, ec_base + ec_variation)), 1)
            
            # TDS: correlates with EC (roughly 450-550 per mS/cm)
            tds_base = ec * 500
            tds_variation = 50 * ((day_offset * 3 + slot_idx) % 9 - 4) / 4
            tds = round(max(600, min(1500, tds_base + tds_variation)), 0)
            
            # Water temp: 19-23°C with daily cycles
            temp_base = 21.0
            temp_variation = 2.0 * ((slot_idx - 4.5) / 4.5)  # Warmer in afternoon
            water_temp = round(max(18.0, min(24.0, temp_base + temp_variation)), 1)
            
            readings.append((ts_str, ph, ec, tds, water_temp))
    
    return readings


# Generate the readings
READINGS = generate_readings()

# Define 9 alerts spread across the month - picking specific indices that will have threshold breaches
# We'll intentionally create some breaches by modifying specific readings after generation
ALERT_INDICES = [15, 42, 78, 105, 134, 167, 198, 231, 267]  # Spread across 30 days

# Override specific readings to create alerts
def apply_alert_overrides():
    """Modify specific readings to create threshold breaches for alerts."""
    global READINGS
    readings_list = list(READINGS)
    
    alert_configs = [
        (15, "ph", 6.7),      # Day 2
        (42, "ec", 3.1),      # Day 5
        (78, "tds", 1520),    # Day 8
        (105, "ph", 6.8),     # Day 11
        (134, "ec", 3.2),     # Day 14
        (167, "tds", 1550),   # Day 17
        (198, "ph", 5.3),     # Day 20 - low pH
        (231, "ec", 3.3),     # Day 24
        (267, "tds", 1580),   # Day 27
    ]
    
    for idx, metric, value in alert_configs:
        if idx < len(readings_list):
            ts, ph, ec, tds, wt = readings_list[idx]
            if metric == "ph":
                readings_list[idx] = (ts, value, ec, tds, wt)
            elif metric == "ec":
                readings_list[idx] = (ts, ph, value, tds, wt)
            elif metric == "tds":
                readings_list[idx] = (ts, ph, ec, value, wt)
    
    READINGS = readings_list


apply_alert_overrides()

# Build alert map from the overridden readings
ALERT_MAP = {}
for idx in ALERT_INDICES:
    if idx < len(READINGS):
        ts_str, ph, ec, tds, wt = READINGS[idx]
        if ph > 6.5:
            ALERT_MAP[ts_str] = (Alert.Metric.PH, ph, Alert.Trigger.ABOVE_MAX)
        elif ph < 5.5:
            ALERT_MAP[ts_str] = (Alert.Metric.PH, ph, Alert.Trigger.BELOW_MIN)
        elif ec > 3.0:
            ALERT_MAP[ts_str] = (Alert.Metric.EC, ec, Alert.Trigger.ABOVE_MAX)
        elif tds > 1500:
            ALERT_MAP[ts_str] = (Alert.Metric.TDS, tds, Alert.Trigger.ABOVE_MAX)

# Thresholds for convenience when creating alerts
THRESHOLDS = {
    Alert.Metric.PH: (5.5, 6.5, "pH"),
    Alert.Metric.EC: (1.2, 3.0, "mS/cm"),
    Alert.Metric.TDS: (600, 1500, "ppm"),
    Alert.Metric.WATER_TEMPERATURE: (18, 24, "°C"),
}


class Command(BaseCommand):
    help = "Seed fixed 30-day sensor dataset + alerts for SMRT-R47-4TJ (Oct 29 - Nov 27 2025)."

    def handle(self, *args, **options):
        flag = (os.getenv("SEED_OCT29_NOV27") or "").strip().lower()
        truthy = {"true", "1", "yes", "y", "on", "repair"}
        if flag not in truthy:
            self.stdout.write("SEED_OCT29_NOV27 not enabled; set to true/1/yes/on/repair to run.")
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
        seed_prefix = f"seed-oct29_nov27-{DEVICE_SERIAL}-"
        existing_seed = SensorData.objects.filter(
            sensor__in=[ph_sensor, ec_sensor, tds_sensor, wt_sensor, wl_sensor, turb_sensor],
            ingest_id__startswith=seed_prefix,
        ).exists()

        if existing_seed and flag != "repair":
            self.stdout.write(
                self.style.WARNING(
                    f"Seed already present (Oct 29 - Nov 27). Set SEED_OCT29_NOV27=repair to fix timestamps if needed."
                )
            )
            return

        if existing_seed and flag == "repair":
            # If seed already exists, repair timestamps if needed (created_at should match embedded timestamp)
            repaired_sd = self._repair_sensor_data_seed_timestamps(
                [ph_sensor, ec_sensor, tds_sensor, wt_sensor, wl_sensor, turb_sensor], seed_prefix
            )
            repaired_alerts = self._repair_alert_seed_timestamps(device, "oct29_nov27")
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
        
        self.stdout.write(f"Generating {len(READINGS)} sensor data points across 30 days...")
        
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
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-ph-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=ec_sensor,
                            value=ec,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-ec-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=tds_sensor,
                            value=tds,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-tds-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=wt_sensor,
                            value=wt,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-wt-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=wl_sensor,
                            value=wl,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-wl-{dt.strftime('%Y%m%d%H%M')}-v1",
                        ),
                        SensorData(
                            sensor=turb_sensor,
                            value=turb,
                            created_at=dt,
                            updated_at=dt,
                            ingest_id=f"seed-oct29_nov27-{DEVICE_SERIAL}-turb-{dt.strftime('%Y%m%d%H%M')}-v1",
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
                    
                    if trigger == Alert.Trigger.ABOVE_MAX:
                        title = f"{metric.upper()} High: {value} > {max_thr}"
                    else:
                        title = f"{metric.upper()} Low: {value} < {min_thr}"
                    
                    recommendation = self._recommendation_for(metric, value, min_thr, max_thr, trigger)
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
                            metadata={"seed": True, "seed_batch": "oct29_nov27", "timestamp": ts_str},
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

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed complete (Oct 29 - Nov 27): {created_rows} SensorData rows; {alerts_created} Alerts."
            )
        )

    def _get_or_create_sensor(self, device: Device, sensor_type: str) -> Sensor:
        sensor = Sensor.objects.filter(device=device, sensor_type=sensor_type).first()
        if sensor:
            return sensor
        sensor = Sensor(device=device, sensor_type=sensor_type, unit="")
        sensor.save()
        return sensor

    @staticmethod
    def _recommendation_for(metric: str, value: float, min_thr: float, max_thr: float, trigger) -> str:
        if metric == Alert.Metric.PH:
            if trigger == Alert.Trigger.ABOVE_MAX:
                return "Adjust nutrient solution to bring pH back into 5.5–6.5 range."
            else:
                return "Add pH up solution to raise pH back into optimal range."
        if metric == Alert.Metric.EC:
            return "Dilute solution slightly or top up with fresh water to reduce EC."
        if metric == Alert.Metric.TDS:
            return "Add fresh water or change reservoir to lower TDS below 1500 ppm."
        return "Review system conditions and adjust as needed."

    def _repair_sensor_data_seed_timestamps(self, sensors: List[Sensor], seed_prefix: str) -> int:
        """Repair created_at/updated_at for previously-seeded SensorData rows that may have "now()" timestamps.

        We derive the intended timestamp from the ingest_id token: seed-oct29_nov27-<DEVICE>-<metric>-YYYYMMDDHHMM-v1
        """
        repaired = 0
        for sensor in sensors:
            qs = SensorData.objects.filter(sensor=sensor, ingest_id__startswith=seed_prefix)
            for row in qs.iterator():
                ingest_id = row.ingest_id or ""
                try:
                    # Strip the device-specific prefix to get e.g. "ph-202510290600-v1"
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
