from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData


class Command(BaseCommand):
    help = (
        "Seed sensors and one SensorData per sensor for the specified devices. "
        "Ensures key sensors exist (ph, tds, water_level, air_temperature) and assigns values "
        "that will trigger dashboard alerts (e.g., low TDS, high pH, low water level, high temp)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--serial",
            action="append",
            dest="serials",
            help="Device serial(s) to seed. Can be provided multiple times.",
        )
        # Optional overrides for specific sensors
        parser.add_argument("--tds-value", type=float, default=250.0,
                            help="TDS reading value (ppm). Default 250 triggers low nutrient alert.")
        parser.add_argument("--ph-value", type=float, default=7.2,
                            help="pH reading value. Default 7.2 triggers high pH alert.")
        parser.add_argument("--water-level-value", type=float, default=10.0,
                            help="Water level reading (percent). Default 10 triggers low water alert.")
        parser.add_argument("--air-temp-value", type=float, default=30.0,
                            help="Air temperature (°C). Default 30 triggers temp alert.")
        parser.add_argument("--update-existing", action="store_true",
                            help="If set, update the value of an existing reading for each sensor instead of skipping.")

    def handle(self, *args, **options):
        serials = options.get("serials") or ["SMRT-AO3-OGN", "SMRT-YYL-G11"]
        tds_value = options.get("tds_value", 250.0)
        ph_value = options.get("ph_value", 7.2)
        wl_value = options.get("water_level_value", 10.0)
        air_temp_value = options.get("air_temp_value", 30.0)
        update_existing = bool(options.get("update_existing", False))

        created_sensors = 0
        created_readings = 0
        missing_devices = []

        updated_readings = 0

        for idx, serial in enumerate(serials):
            try:
                device = Device.objects.get(device_serial=serial)
            except Device.DoesNotExist:
                missing_devices.append(serial)
                continue

            with transaction.atomic():
                # Ensure key sensors exist to support alerts
                key_sensor_units = {
                    Sensor.SensorType.PH: "pH",
                    Sensor.SensorType.TDS: "ppm",
                    Sensor.SensorType.EC: "mS/cm",
                    Sensor.SensorType.WATER_LEVEL: "%",
                    Sensor.SensorType.AIR_TEMPERATURE: "°C",
                    Sensor.SensorType.HUMIDITY: "%",
                    Sensor.SensorType.LIGHT: "lux",
                    Sensor.SensorType.TURBIDITY: "NTU",
                }
                for s_type, unit in key_sensor_units.items():
                    s_obj = Sensor.objects.filter(device=device, sensor_type=s_type).first()
                    if not s_obj:
                        s_obj = Sensor(device=device, sensor_type=s_type, unit=unit)
                        s_obj.save()
                        created_sensors += 1

                # Create one reading for each existing sensor on the device
                sensors = list(device.sensors.all())
                for s in sensors:
                    # Compute a per-device varied value so readings differ across devices
                    value = self._value_for_sensor_type(
                        s.sensor_type,
                        ph_value=ph_value,
                        tds_value=tds_value,
                        wl_value=wl_value,
                        air_temp_value=air_temp_value,
                        offset_index=idx,
                    )

                    existing_qs = SensorData.objects.filter(sensor=s).order_by("-created_at")
                    if existing_qs.exists():
                        if update_existing:
                            latest = existing_qs.first()
                            if latest.value != value:
                                latest.value = value
                                latest.save(update_fields=["value"])  # updated_at handled by base model if present
                                updated_readings += 1
                        # Whether updated or not, do not create a new reading when one already exists
                        continue
                    # Create first reading if none exist
                    SensorData.objects.create(sensor=s, value=value)
                    created_readings += 1

        if missing_devices:
            self.stdout.write(self.style.WARNING(
                f"Devices not found (skipped): {', '.join(missing_devices)}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"Seeded sensors: {created_sensors}, readings created: {created_readings}, readings updated: {updated_readings} for {len(serials) - len(missing_devices)} device(s)."
        ))

    @staticmethod
    def _value_for_sensor_type(sensor_type: str, *, ph_value: float, tds_value: float, wl_value: float, air_temp_value: float, offset_index: int = 0) -> float:
        """Pick a reasonable value by sensor type. Defaults chosen to trigger alerts where applicable."""
        # simple per-device offsets so values differ across devices (idx 0,1,2,...)
        dv = float(offset_index or 0)
        if sensor_type == Sensor.SensorType.PH:
            return float(ph_value) + 0.2 * dv
        if sensor_type == Sensor.SensorType.TDS:
            return float(tds_value) + 50.0 * dv
        if sensor_type == Sensor.SensorType.EC:
            return 1.6 + 0.3 * dv  # mS/cm typical hydroponic target
        if sensor_type == Sensor.SensorType.WATER_LEVEL:
            return float(wl_value) + 5.0 * dv
        if sensor_type == Sensor.SensorType.AIR_TEMPERATURE:
            return float(air_temp_value) - 2.0 * dv
        if sensor_type == Sensor.SensorType.WATER_TEMPERATURE:
            return 22.0 + 1.0 * dv
        if sensor_type == Sensor.SensorType.HUMIDITY:
            return 45.0 + 5.0 * dv
        if sensor_type == Sensor.SensorType.LIGHT:
            return 3000.0 - 500.0 * dv
        if sensor_type == Sensor.SensorType.TURBIDITY:
            return 8.0 + 100.0 * dv
        # Default fallback
        return 0.0
