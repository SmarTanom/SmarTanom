"""
Management command to seed sensor data for January 1-29, 2026 for a specific device.
Includes both normal readings and alert-triggering values.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Dict, List

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.signals import post_save
from django.utils import timezone

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData
from apps.sensors.signals import check_sensor_alerts, broadcast_sensor_realtime


class Command(BaseCommand):
    help = "Seed sensor data from Jan 1-29, 2026 for device SMRT-G6M-E0Q with normal and alert-triggering values"

    def add_arguments(self, parser):
        parser.add_argument(
            "--device-serial",
            type=str,
            default="SMRT-G6M-E0Q",
            help="Device serial number (default: SMRT-G6M-E0Q)"
        )
        parser.add_argument(
            "--readings-per-day",
            type=int,
            default=8,
            help="Number of readings per day per sensor (default: 8)"
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate without writing to database"
        )

    def handle(self, *args, **options):
        device_serial = options["device_serial"]
        readings_per_day = options["readings_per_day"]
        dry_run = options["dry_run"]

        # Find the device
        try:
            device = Device.objects.get(device_serial=device_serial)
        except Device.DoesNotExist:
            raise CommandError(f"Device with serial {device_serial} not found")

        self.stdout.write(
            self.style.NOTICE(
                f"Seeding data for device {device.device_serial} (id={device.id})\n"
                f"Date range: Jan 1-29, 2026\n"
                f"Readings per day per sensor: {readings_per_day}\n"
                f"Dry run: {dry_run}"
            )
        )

        # Temporarily disconnect signals to avoid alert spam during bulk seeding
        post_save.disconnect(check_sensor_alerts, sender=SensorData)
        post_save.disconnect(broadcast_sensor_realtime, sender=SensorData)

        try:
            # Define sensor types and their configurations
            sensor_configs = {
                "ph": {
                    "unit": "pH",
                    "normal_range": (5.8, 6.5),
                    "critical_low": (4.5, 5.4),
                    "critical_high": (7.0, 8.0),
                },
                "tds": {
                    "unit": "ppm",
                    "normal_range": (800, 1200),
                    "critical_low": (300, 600),
                    "critical_high": (1500, 2000),
                },
                "ec": {
                    "unit": "mS/cm",
                    "normal_range": (1.2, 2.0),
                    "critical_low": (0.5, 0.9),
                    "critical_high": (2.5, 3.5),
                },
                "water_temperature": {
                    "unit": "°C",
                    "normal_range": (18, 24),
                    "critical_low": (10, 15),
                    "critical_high": (28, 35),
                },
                "water_level": {
                    "unit": "%",
                    "normal_range": (50, 90),
                    "critical_low": (10, 30),
                    "critical_high": (95, 100),
                },
                "turbidity": {
                    "unit": "NTU",
                    "normal_range": (5, 20),
                    "critical_low": (0, 3),
                    "critical_high": (50, 100),
                },
            }

            # Create or get sensors
            sensors_map: Dict[str, Sensor] = {}
            for sensor_type, config in sensor_configs.items():
                sensor, created = Sensor.objects.get_or_create(
                    device=device,
                    sensor_type=sensor_type,
                    defaults={"unit": config["unit"]}
                )
                sensors_map[sensor_type] = sensor
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(f"Created sensor: {sensor_type}")
                    )

            if dry_run:
                self.stdout.write(
                    self.style.WARNING("Dry run complete (no data written)")
                )
                return

            # Generate data for Jan 1-29, 2026
            start_date = datetime(2026, 1, 1, 0, 0, 0)
            end_date = datetime(2026, 1, 29, 23, 59, 59)
            
            all_readings: List[SensorData] = []
            total_days = 29

            # For each sensor type
            for sensor_type, sensor in sensors_map.items():
                config = sensor_configs[sensor_type]
                
                # Generate readings for each day
                for day_offset in range(total_days):
                    current_date = start_date + timedelta(days=day_offset)
                    
                    # Decide if this day should have alerts (25% chance)
                    has_alert = random.random() < 0.25
                    
                    # Generate readings for this day
                    for reading_num in range(readings_per_day):
                        # Spread readings throughout the day
                        hour_offset = (24 / readings_per_day) * reading_num
                        timestamp = current_date + timedelta(hours=hour_offset)
                        
                        # Make timezone aware
                        timestamp = timezone.make_aware(
                            timestamp, timezone.get_current_timezone()
                        )
                        
                        # Determine value based on alert status
                        if has_alert and reading_num >= readings_per_day - 2:
                            # Last 2 readings of alert day - use critical values
                            if random.random() < 0.5:
                                # Critical low
                                value = round(
                                    random.uniform(
                                        config["critical_low"][0],
                                        config["critical_low"][1]
                                    ),
                                    2
                                )
                            else:
                                # Critical high
                                value = round(
                                    random.uniform(
                                        config["critical_high"][0],
                                        config["critical_high"][1]
                                    ),
                                    2
                                )
                        else:
                            # Normal range
                            value = round(
                                random.uniform(
                                    config["normal_range"][0],
                                    config["normal_range"][1]
                                ),
                                2
                            )
                        
                        # Store reading data with timestamp
                        all_readings.append({
                            'sensor': sensor,
                            'value': value,
                            'timestamp': timestamp
                        })

            # Bulk insert all readings with proper timestamps
            with transaction.atomic():
                # Create SensorData objects
                sensor_data_objects = []
                for reading_data in all_readings:
                    obj = SensorData(
                        sensor=reading_data['sensor'],
                        value=reading_data['value']
                    )
                    sensor_data_objects.append(obj)
                
                # Bulk create (this will use current timestamp)
                created_objects = SensorData.objects.bulk_create(sensor_data_objects, batch_size=500)
                
                # Now update timestamps using raw SQL for efficiency
                from django.db import connection
                with connection.cursor() as cursor:
                    for idx, obj in enumerate(created_objects):
                        timestamp = all_readings[idx]['timestamp']
                        cursor.execute(
                            "UPDATE sensors_sensordata SET created_at = %s, updated_at = %s WHERE id = %s",
                            [timestamp, timestamp, obj.id]
                        )

            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSuccessfully inserted {len(all_readings)} sensor readings!\n"
                    f"Date range: Jan 1-29, 2026\n"
                    f"Device: {device.device_serial}"
                )
            )

            # Show summary by sensor type
            self.stdout.write("\nReadings per sensor:")
            for sensor_type in sensor_configs.keys():
                count = len([r for r in all_readings if r.sensor.sensor_type == sensor_type])
                self.stdout.write(f"  {sensor_type}: {count} readings")

        finally:
            # Reconnect signals
            post_save.connect(check_sensor_alerts, sender=SensorData)
            post_save.connect(broadcast_sensor_realtime, sender=SensorData)
            
            self.stdout.write(
                self.style.WARNING(
                    "\nNote: Signals reconnected. Future saves will trigger alerts."
                )
            )
