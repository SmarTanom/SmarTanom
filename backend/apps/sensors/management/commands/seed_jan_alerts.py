"""
Management command to seed random alerts for January 1-25, 2026 based on plant thresholds.
Generates alerts for threshold violations across all devices.

Usage:
  Set environment variable SEED_JAN_ALERTS=true in Render dashboard
  The command will run automatically during deployment

Or run manually:
  python manage.py seed_jan_alerts [--device-serial SMRT-XXX-XXX] [--alerts-per-day 2] [--dry-run]
"""
from __future__ import annotations

import os
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert
from apps.reservoirs.models import Plant


class Command(BaseCommand):
    help = "Seed random alerts from Jan 1-25, 2026 based on plant threshold violations (controlled by SEED_JAN_ALERTS env var)"

    # Plant thresholds based on your data
    PLANT_THRESHOLDS = {
        "Generic": {
            "ppm": (300.0, 1200.0),
            "ec": (0.0, 3.0),
            "ph": (5.5, 6.5),
            "water_temp": (18.0, 26.0),
        },
        "Lettuce (Romaine / Butterhead)": {
            "ppm": (560.0, 840.0),
            "ec": (1.1, 1.7),
            "ph": (5.5, 6.5),
            "water_temp": (18.0, 24.0),
        },
        "Pechay (Bok Choy)": {
            "ppm": (800.0, 1200.0),
            "ec": (1.6, 2.4),
            "ph": (5.5, 6.5),
            "water_temp": (20.0, 30.0),
        },
        "Basil (Sweet Basil)": {
            "ppm": (700.0, 1120.0),
            "ec": (1.4, 2.3),
            "ph": (5.5, 6.8),
            "water_temp": (20.0, 28.0),
        },
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--device-serial",
            type=str,
            help="Target specific device by serial (optional, seeds all devices if not provided)"
        )
        parser.add_argument(
            "--alerts-per-day",
            type=int,
            default=2,
            help="Average number of alerts per day (default: 2)"
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate without writing to database"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force run even if SEED_JAN_ALERTS env var is not set"
        )

    def handle(self, *args, **options):
        # Check environment variable flag
        flag = (os.getenv("SEED_JAN_ALERTS") or "").strip().lower()
        enabled = flag in ("true", "1", "yes", "on")
        force = options.get("force", False)

        if not enabled and not force:
            self.stdout.write(
                self.style.WARNING(
                    "SEED_JAN_ALERTS not enabled. Set environment variable to true/1/yes/on to run.\n"
                    "Or use --force flag to run manually."
                )
            )
            return

        device_serial = options.get("device_serial")
        alerts_per_day = options["alerts_per_day"]
        dry_run = options["dry_run"]

        # Check if alerts already exist
        existing_alerts = Alert.objects.filter(metadata__seed_batch="jan2026_alerts")
        if existing_alerts.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"Found {existing_alerts.count()} existing alerts with seed_batch='jan2026_alerts'.\n"
                    "Alerts already seeded. Skipping to avoid duplicates."
                )
            )
            return

        # Find devices
        devices = Device.objects.filter(is_bound=True)
        if device_serial:
            devices = devices.filter(device_serial=device_serial)

        if not devices.exists():
            self.stdout.write(self.style.ERROR("No bound devices found"))
            return

        self.stdout.write(
            self.style.NOTICE(
                f"Seeding alerts for {devices.count()} device(s)\n"
                f"Date range: Jan 1-25, 2026\n"
                f"Average alerts per day: {alerts_per_day}\n"
                f"Dry run: {dry_run}"
            )
        )

        total_alerts = 0

        for device in devices:
            # Get device plant info
            plant_name = device.plant.plant_name if device.plant else "Generic"
            thresholds = self.PLANT_THRESHOLDS.get(plant_name, self.PLANT_THRESHOLDS["Generic"])

            self.stdout.write(f"\nProcessing device: {device.device_serial} (Plant: {plant_name})")

            # Get or create sensors for this device
            sensors = self._ensure_sensors(device)

            if dry_run:
                self.stdout.write(self.style.WARNING("  Dry run - skipping alert generation"))
                continue

            # Generate alerts for Jan 1-25, 2026
            alerts_created = self._generate_alerts(device, sensors, thresholds, alerts_per_day)
            total_alerts += alerts_created

            self.stdout.write(
                self.style.SUCCESS(f"  Generated {alerts_created} alerts for {device.device_serial}")
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Successfully seeded {total_alerts} alerts across {devices.count()} device(s)"
            )
        )

    def _ensure_sensors(self, device: Device) -> Dict[str, Sensor]:
        """Ensure all necessary sensors exist for the device."""
        sensor_types = {
            "ph": "pH",
            "tds": "ppm",
            "ec": "mS/cm",
            "water_temperature": "°C",
        }

        sensors = {}
        for sensor_type, unit in sensor_types.items():
            sensor, created = Sensor.objects.get_or_create(
                device=device,
                sensor_type=sensor_type,
                defaults={"unit": unit}
            )
            sensors[sensor_type] = sensor

        return sensors

    def _generate_alerts(
        self, 
        device: Device, 
        sensors: Dict[str, Sensor],
        thresholds: Dict[str, Tuple[float, float]],
        alerts_per_day: int
    ) -> int:
        """Generate random alerts for January 1-25, 2026."""
        
        start_date = datetime(2026, 1, 1, 0, 0, 0)
        end_date = datetime(2026, 1, 25, 23, 59, 59)
        total_days = 25

        alerts_to_create = []
        
        # Map sensor types to Alert metrics
        metric_map = {
            'ph': Alert.Metric.PH,
            'tds': Alert.Metric.TDS,
            'ec': Alert.Metric.EC,
            'water_temperature': Alert.Metric.WATER_TEMPERATURE
        }

        # Map threshold keys to sensor types
        threshold_to_sensor = {
            'ppm': 'tds',
            'ec': 'ec',
            'ph': 'ph',
            'water_temp': 'water_temperature'
        }

        plant_name = device.plant.plant_name if device.plant else "Generic"

        for day_offset in range(total_days):
            current_date = start_date + timedelta(days=day_offset)
            
            # Random number of alerts for this day (Poisson-like distribution)
            num_alerts_today = random.choices(
                [0, 1, 2, 3, 4],
                weights=[20, 30, 30, 15, 5]  # Most days have 1-2 alerts
            )[0]

            if alerts_per_day == 0 or num_alerts_today == 0:
                continue

            for _ in range(num_alerts_today):
                # Random time during the day
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                timestamp = current_date + timedelta(hours=hour, minutes=minute)
                timestamp = timezone.make_aware(timestamp, timezone.get_current_timezone())

                # Select random metric to trigger alert
                threshold_key = random.choice(list(thresholds.keys()))
                sensor_type = threshold_to_sensor[threshold_key]
                sensor = sensors[sensor_type]
                metric = metric_map[sensor_type]

                min_val, max_val = thresholds[threshold_key]

                # Determine violation type
                violation_type = random.choice(['below_min', 'above_max', 'near_min', 'near_max'])
                
                # Generate appropriate value and determine severity
                if violation_type == 'below_min':
                    # Critical low
                    value = round(random.uniform(min_val * 0.6, min_val * 0.85), 2)
                    trigger = Alert.Trigger.BELOW_MIN
                    severity = Alert.Severity.CRITICAL
                    title = f"{metric.label} critically low"
                    recommendation = f"Immediately check and adjust {metric.label}. Current value is dangerously below the recommended range for {plant_name}."
                    
                elif violation_type == 'above_max':
                    # Critical high
                    value = round(random.uniform(max_val * 1.15, max_val * 1.4), 2)
                    trigger = Alert.Trigger.ABOVE_MAX
                    severity = Alert.Severity.CRITICAL
                    title = f"{metric.label} critically high"
                    recommendation = f"Immediately check and adjust {metric.label}. Current value is dangerously above the recommended range for {plant_name}."
                    
                elif violation_type == 'near_min':
                    # Warning low
                    value = round(random.uniform(min_val * 0.88, min_val * 0.98), 2)
                    trigger = Alert.Trigger.NEAR_MIN
                    severity = Alert.Severity.WARNING
                    title = f"{metric.label} approaching minimum"
                    recommendation = f"Monitor {metric.label} closely. Value is approaching the lower threshold for {plant_name}."
                    
                else:  # near_max
                    # Warning high
                    value = round(random.uniform(max_val * 1.02, max_val * 1.12), 2)
                    trigger = Alert.Trigger.NEAR_MAX
                    severity = Alert.Severity.WARNING
                    title = f"{metric.label} approaching maximum"
                    recommendation = f"Monitor {metric.label} closely. Value is approaching the upper threshold for {plant_name}."

                # Create alert object (will be bulk created later)
                alert = Alert(
                    device=device,
                    sensor=sensor,
                    metric=metric,
                    trigger=trigger,
                    severity=severity,
                    value=value,
                    unit=sensor.unit,
                    min_threshold=min_val,
                    max_threshold=max_val,
                    plant_name=plant_name,
                    title=title,
                    recommendation=recommendation,
                    is_read=random.choice([True, False]),  # Some alerts already read
                    is_acknowledged=False,
                    is_resolved=random.choice([True, False]),  # Some resolved
                    metadata={
                        "seed": True,
                        "seed_batch": "jan2026_alerts",
                        "timestamp": timestamp.isoformat()
                    }
                )
                alerts_to_create.append((alert, timestamp))

        # Bulk create alerts with proper timestamps
        with transaction.atomic():
            created_alerts = []
            for alert, timestamp in alerts_to_create:
                created_alerts.append(alert)
            
            # Bulk create
            Alert.objects.bulk_create(created_alerts, batch_size=100)
            
            # Update timestamps
            from django.db import connection
            with connection.cursor() as cursor:
                for idx, alert in enumerate(created_alerts):
                    timestamp = alerts_to_create[idx][1]
                    cursor.execute(
                        "UPDATE sensors_alert SET created_at = %s, updated_at = %s WHERE id = %s",
                        [timestamp, timestamp, alert.id]
                    )

        return len(created_alerts)
