from __future__ import annotations

import random
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.monitoring.models import Device, Reservoir, Sensor, SensorData


class Command(BaseCommand):
    help = "Seed realistic mock data: users, devices, reservoirs, sensors, sensor data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--readings-per-sensor",
            type=int,
            default=24,
            help="How many SensorData readings to create per sensor",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=3,
            help="Generate readings spread over the last N days",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="If set, will create additional mock records even if some already exist (but still idempotent per unique constraints)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        readings_per_sensor: int = options["readings_per_sensor"]
        days: int = options["days"]
        force: bool = options["force"]

        User = get_user_model()

        # 1) Create a few normal users (never create or touch superusers)
        users_spec = [
            {"username": "alice", "email": "alice@example.com"},
            {"username": "bob", "email": "bob@example.com"},
            {"username": "charlie", "email": "charlie@example.com"},
        ]

        users = []
        for spec in users_spec:
            u, created = User.objects.get_or_create(
                username=spec["username"],
                defaults={
                    "email": spec["email"],
                    "is_staff": False,
                    "is_superuser": False,
                },
            )
            # Ensure not superuser; do not demote existing superusers; also do not create any new superusers
            if created:
                # Set an unusable password (not for login/security)
                u.set_unusable_password()
                # Explicitly ensure flags are safe
                u.is_superuser = False
                u.is_staff = False
                u.save(update_fields=["password", "is_superuser", "is_staff"])
            users.append(u)

        # Helper: device statuses
        device_statuses = [
            Device.Status.ACTIVE,
            Device.Status.MAINTENANCE,
            Device.Status.INACTIVE,
        ]

        # 2) Create devices per user
        devices: list[Device] = []
        for u in users:
            for i in range(1, 3):
                name = f"{u.username.capitalize()} Device {i}"
                dev, _ = Device.objects.get_or_create(
                    user=u,
                    device_name=name,
                    defaults={"status": random.choice(device_statuses)},
                )
                devices.append(dev)

        # 3) Create reservoirs per device
        plant_types = ["Lettuce", "Basil", "Spinach", "Kale"]
        reservoirs: list[Reservoir] = []
        today = date.today()
        for d in devices:
            for i in range(1, 3):
                rname = f"Reservoir {i}"
                start = today - timedelta(days=14 + random.randint(0, 7))
                end = start + timedelta(days=21 + random.randint(0, 7))
                r, _ = Reservoir.objects.get_or_create(
                    device=d,
                    reservoir_name=rname,
                    defaults={
                        "plant_type": random.choice(plant_types),
                        "start_date": start,
                        "end_date": end,
                    },
                )
                reservoirs.append(r)

        # 4) Create sensors per device as specified by project requirements
        # Essential sensors and environmental monitoring sensors
        # Mapping of SensorType to unit and realistic operational ranges
        # Ranges reflect the provided specs
        sensor_specs = [
            # Essential water quality sensors
            {"type": Sensor.SensorType.PH, "unit": "pH", "range": (5.5, 6.5)},
            {"type": Sensor.SensorType.EC, "unit": "mS/cm", "range": (1.2, 2.4)},
            {"type": Sensor.SensorType.WATER_TEMPERATURE, "unit": "C", "range": (18.0, 26.0)},  # DS18B20 (water)
            # Environmental monitoring
            {"type": Sensor.SensorType.HUMIDITY, "unit": "%RH", "range": (50.0, 70.0)},  # DHT22 humidity
            {"type": Sensor.SensorType.AIR_TEMPERATURE, "unit": "C", "range": (22.0, 30.0)},  # DHT22 air temp
            {"type": Sensor.SensorType.LIGHT, "unit": "Lux", "range": (60000.0, 100000.0)},  # BH1750
            # CO2 (MQ135)
            {"type": Sensor.SensorType.CO2, "unit": "ppm", "range": (400.0, 600.0)},
            # Water level (float 0-100%)
            {"type": Sensor.SensorType.WATER_LEVEL, "unit": "%", "range": (0.0, 100.0)},
            # Turbidity (NTU)
            {"type": Sensor.SensorType.TURBIDITY, "unit": "NTU", "range": (0.0, 3000.0)},
        ]

        sensors: list[Sensor] = []
        for d in devices:
            for spec in sensor_specs:
                defaults = {"unit": spec["unit"]}
                s, _ = Sensor.objects.get_or_create(
                    device=d,
                    sensor_type=spec["type"],
                    unit=spec["unit"],
                    defaults=defaults,
                )
                sensors.append((s, spec))

        # 5) Generate sensor data readings within realistic ranges
        # Distribute readings across the past `days`, newest first
        now = datetime.now()
        total_created = 0
        for s, spec in sensors:
            low, high = spec["range"]
            existing = s.readings.count()
            if force:
                to_create = readings_per_sensor
            else:
                to_create = max(0, readings_per_sensor - min(existing, readings_per_sensor))
                if to_create == 0:
                    continue

            # Build timestamps distributed over the time window
            readings = []
            step_seconds = int(days * 24 * 3600 / max(readings_per_sensor, 1))
            for i in range(to_create):
                ts = now - timedelta(seconds=i * step_seconds)
                value = random.uniform(low, high)

                # For water_level, bias towards "not empty" values
                if spec["type"] == Sensor.SensorType.WATER_LEVEL:
                    # 10% chance low level
                    value = 10.0 if random.random() < 0.1 else random.uniform(60.0, 100.0)

                readings.append(SensorData(sensor=s, value=round(value, 3), created_at=ts, updated_at=ts))

            # Bulk create while respecting unique/indexes; no unique on SensorData so safe
            SensorData.objects.bulk_create(readings, ignore_conflicts=True)
            total_created += len(readings)

        unique_sensor_count = Sensor.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"Seed complete: users={len(users)} devices={len(devices)} reservoirs={len(reservoirs)} sensors={unique_sensor_count} readings_created~={total_created}"
        ))
