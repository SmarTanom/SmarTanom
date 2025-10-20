from __future__ import annotations

import random
from typing import List, Dict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.signals import post_save

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData
from apps.sensors.signals import check_sensor_alerts, broadcast_sensor_realtime


SENSOR_TYPES = [
    "ph",
    "ec",
    "tds",
    "water_level",
    "turbidity",
    "water_temperature",
]

# Nominal demo ranges (adjust as needed)
RANGES: Dict[str, tuple] = {
    "ph": (5.4, 6.6),
    "ec": (0.9, 2.1),
    "tds": (820, 1400),
    "water_level": (45, 95),
    "turbidity": (5, 30),
    "water_temperature": (18, 28),
}


class Command(BaseCommand):
    help = "Seed N readings per sensor for a given device id (creates sensors if missing). Suppresses alert/push spam during seeding."

    def add_arguments(self, parser):
        parser.add_argument("device_id", type=int, help="Target device ID")
        parser.add_argument("--count", type=int, default=5, help="Readings per sensor")
        parser.add_argument("--dry-run", action="store_true", help="Simulate without writing")

    def handle(self, *args, **options):
        device_id = options["device_id"]
        count = options["count"]
        dry_run = options["dry_run"]

        try:
            device = Device.objects.get(id=device_id)
        except Device.DoesNotExist:
            raise CommandError(f"Device id {device_id} not found")

        self.stdout.write(self.style.NOTICE(f"Seeding {count} readings per sensor for device {device.device_serial} (id={device.id}) dry_run={dry_run}"))

        # Temporarily disconnect alert + realtime signals to avoid notification storm
        post_save.disconnect(check_sensor_alerts, sender=SensorData)
        post_save.disconnect(broadcast_sensor_realtime, sender=SensorData)

        created_sensors: List[Sensor] = []
        sensors_map: Dict[str, Sensor] = {}

        for st in SENSOR_TYPES:
            sensor, created = Sensor.objects.get_or_create(device=device, sensor_type=st, defaults={"unit": ""})
            sensors_map[st] = sensor
            if created:
                created_sensors.append(sensor)

        if created_sensors:
            self.stdout.write(self.style.SUCCESS(f"Created {len(created_sensors)} sensors: {[s.sensor_type for s in created_sensors]}"))
        else:
            self.stdout.write("All sensors already existed")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run complete (no data written)"))
            # Reconnect signals before return
            post_save.connect(check_sensor_alerts, sender=SensorData)
            post_save.connect(broadcast_sensor_realtime, sender=SensorData)
            return

        # Bulk create readings per sensor inside a transaction
        with transaction.atomic():
            all_new: List[SensorData] = []
            for st, sensor in sensors_map.items():
                lo, hi = RANGES[st]
                for _ in range(count):
                    value = round(random.uniform(lo, hi), 2)
                    all_new.append(SensorData(sensor=sensor, value=value))
            SensorData.objects.bulk_create(all_new)

        self.stdout.write(self.style.SUCCESS(f"Inserted {len(all_new)} SensorData rows."))

        # Optionally trigger a single broadcast after seeding using latest readings
        # Reconnect signals first
        post_save.connect(check_sensor_alerts, sender=SensorData)
        post_save.connect(broadcast_sensor_realtime, sender=SensorData)

        # Manually broadcast once using the last created row (if any)
        if all_new:
            last_row = SensorData.objects.filter(sensor__device=device).order_by('-created_at').first()
            if last_row:
                broadcast_sensor_realtime(SensorData, last_row, created=False)
                self.stdout.write(self.style.SUCCESS("Broadcasted aggregated sensor.update after seeding."))

        self.stdout.write(self.style.SUCCESS("Seeding complete."))
