"""Management command to generate mock data for SmarTanom."""

import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.devices.models import Device
from apps.reservoirs.models import Reservoir, Plant
from apps.sensors.models import Sensor, SensorData

User = get_user_model()


class Command(BaseCommand):
    """Generate mock data for development and testing."""

    help = 'Generate mock data for devices, reservoirs, sensors, and sensor readings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=2,
            help='Number of users to create (default: 2)'
        )
        parser.add_argument(
            '--devices-per-user',
            type=int,
            default=2,
            help='Number of devices per user (default: 2)'
        )
        parser.add_argument(
            '--reservoirs-per-device',
            type=int,
            default=1,
            help='Number of reservoirs per device (default: 1)'
        )
        parser.add_argument(
            '--readings-per-sensor',
            type=int,
            default=24,
            help='Number of readings per sensor (default: 24)'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Number of days of historical data (default: 3)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before generating new data'
        )
        parser.add_argument(
            '--unowned-devices',
            type=int,
            default=0,
            help='Number of unowned devices to create (default: 0)'
        )

    def handle(self, *args, **options):
        """Execute the command."""
        if options['clear']:
            self.clear_existing_data()

        users = self.create_users(options['users'])
        owned_devices = self.create_devices(users, options['devices_per_user'])
        unowned_devices = self.create_unowned_devices(options['unowned_devices'])
        all_devices = owned_devices + unowned_devices
        reservoirs = self.create_reservoirs(all_devices, options['reservoirs_per_device'])
        sensors = self.create_sensors(all_devices)
        self.create_sensor_data(sensors, options['readings_per_sensor'], options['days'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated mock data:\n'
                f'  - {len(users)} users\n'
                f'  - {len(all_devices)} devices ({len(owned_devices)} owned, {len(unowned_devices)} unowned)\n'
                f'  - {len(reservoirs)} reservoirs\n'
                f'  - {len(sensors)} sensors\n'
                f'  - ~{len(sensors) * options["readings_per_sensor"]} sensor readings'
            )
        )

    def clear_existing_data(self):
        """Clear existing mock data."""
        self.stdout.write('Clearing existing data...')

        # Clear in dependency order
        SensorData.objects.all().delete()
        Sensor.objects.all().delete()
        Reservoir.objects.all().delete()
        Device.objects.all().delete()

        # Only delete test users (not superusers)
        test_users = User.objects.filter(
            email__startswith='test',
            is_superuser=False,
            is_staff=False
        )
        deleted_count = test_users.count()
        test_users.delete()

        self.stdout.write(f'Cleared {deleted_count} test users and all related data')

    def create_users(self, count):
        """Create test users."""
        users = []

        for i in range(1, count + 1):
            email = f'test{i}@smartanom.com'
            user, created = User.objects.get_or_create(
                email=email,
                defaults={'is_active': True}
            )
            if created:
                self.stdout.write(f'Created user: {email}')
            users.append(user)

        return users

    def create_devices(self, users, devices_per_user):
        """Create devices for users."""
        devices = []
        device_names = [
            'Greenhouse Alpha', 'Greenhouse Beta', 'Indoor Garden', 'Hydro Tower',
            'Basement Setup', 'Rooftop Garden', 'Lab Setup A', 'Lab Setup B',
            'Main Greenhouse', 'Backup System'
        ]

        for user in users:
            for i in range(devices_per_user):
                device_name = f"{device_names[i % len(device_names)]} {i+1}"
                device, created = Device.objects.get_or_create(
                    user=user,
                    device_name=device_name,
                    defaults={
                        'status': random.choice([Device.Status.ACTIVE, Device.Status.ACTIVE, Device.Status.MAINTENANCE])
                    }
                )
                if created:
                    self.stdout.write(f'Created device: {device_name} for {user.email}')
                devices.append(device)

        return devices

    def create_unowned_devices(self, count):
        """Create unowned devices (without users)."""
        devices = []
        unowned_names = [
            'Factory Floor Unit', 'Warehouse Setup', 'Demo Station', 'Test Rig',
            'Prototype Alpha', 'Research Unit', 'Field Test Device', 'Evaluation Kit',
            'Training System', 'Display Model'
        ]

        for i in range(count):
            device_name = f"{unowned_names[i % len(unowned_names)]} {chr(65 + i)}"  # A, B, C, etc.
            device, created = Device.objects.get_or_create(
                user=None,  # No owner
                device_name=device_name,
                defaults={
                    'status': random.choice([
                        Device.Status.ACTIVE,
                        Device.Status.MAINTENANCE,
                        Device.Status.INACTIVE
                    ])
                }
            )
            if created:
                self.stdout.write(f'Created unowned device: {device_name}')
            devices.append(device)

        return devices

    def create_reservoirs(self, devices, reservoirs_per_device):
        """Create reservoirs for devices."""
        reservoirs = []
        plant_types = [
            'Lettuce', 'Tomatoes', 'Herbs', 'Peppers', 'Spinach',
            'Kale', 'Basil', 'Cilantro', 'Strawberries', 'Cucumbers'
        ]
        # Ensure Plant records exist for the above names with sane defaults
        plant_records = {}
        for name in plant_types:
            plant, _ = Plant.objects.get_or_create(
                plant_name=name,
                defaults=dict(
                    ppm_min=300, ppm_max=1200,
                    ph_min=5.5, ph_max=6.5,
                    water_temp_min=18, water_temp_max=26,
                    light_min=1000, light_max=50000,
                )
            )
            plant_records[name] = plant
        reservoir_names = [
            'Main Tank', 'Nutrient Reservoir', 'Seedling Tank', 'Flowering Chamber',
            'Vegetative Tank', 'Clone Chamber', 'Recovery Tank'
        ]

        for device in devices:
            for i in range(reservoirs_per_device):
                reservoir_name = reservoir_names[i % len(reservoir_names)]
                plant_type = random.choice(plant_types)
                plant = plant_records[plant_type]

                # Generate realistic date ranges
                start_date = date.today() - timedelta(days=random.randint(30, 180))
                end_date = start_date + timedelta(days=random.randint(60, 120))

                reservoir, created = Reservoir.objects.get_or_create(
                    device=device,
                    reservoir_name=reservoir_name,
                    defaults={
                        'plant': plant,
                        'start_date': start_date,
                        'end_date': end_date
                    }
                )
                if created:
                    self.stdout.write(f'Created reservoir: {reservoir_name} ({plant.plant_name}) for {device.device_name}')
                reservoirs.append(reservoir)

        return reservoirs

    def create_sensors(self, devices):
        """Create sensors for devices."""
        sensors = []

        # Create all 8 sensor types matching actual hardware
        sensor_configs = [
            # Water quality sensors
            (Sensor.SensorType.PH, 'pH'),
            (Sensor.SensorType.TDS, 'ppm'),
            (Sensor.SensorType.WATER_TEMPERATURE, '°C'),
            (Sensor.SensorType.WATER_LEVEL, '%'),
            (Sensor.SensorType.TURBIDITY, 'NTU'),
            # DHT22 (dual sensor)
            (Sensor.SensorType.AIR_TEMPERATURE, '°C'),
            (Sensor.SensorType.HUMIDITY, '%'),
            # BH1750
            (Sensor.SensorType.LIGHT, 'lux'),
        ]

        for device in devices:
            # Each device gets all 7 sensor types (matching actual hardware)
            selected_sensors = sensor_configs

            for sensor_type, unit in selected_sensors:
                sensor, created = Sensor.objects.get_or_create(
                    device=device,
                    sensor_type=sensor_type,
                    defaults={'unit': unit}
                )
                if created:
                    self.stdout.write(f'Created sensor: {sensor_type} for {device.device_name}')
                sensors.append(sensor)

        return sensors

    def create_sensor_data(self, sensors, readings_per_sensor, days):
        """Create sensor readings for sensors."""
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)

        total_readings = 0

        for sensor in sensors:
            # Generate readings at regular intervals
            time_interval = (end_time - start_time) / readings_per_sensor

            for i in range(readings_per_sensor):
                timestamp = start_time + (time_interval * i)
                value = self.generate_realistic_value(sensor.sensor_type)

                SensorData.objects.create(
                    sensor=sensor,
                    value=value,
                    created_at=timestamp
                )
                total_readings += 1

        self.stdout.write(f'Created {total_readings} sensor readings')

    def generate_realistic_value(self, sensor_type):
        """Generate realistic sensor values based on sensor type."""
        if sensor_type == Sensor.SensorType.WATER_TEMPERATURE:
            # 18-26°C for hydroponic systems
            return round(random.uniform(18.0, 26.0), 1)
        elif sensor_type == Sensor.SensorType.PH:
            # pH 5.5-6.5 for hydroponics
            return round(random.uniform(5.5, 6.5), 2)
        elif sensor_type == Sensor.SensorType.TDS:
            # 300-1200 ppm for hydroponic nutrients
            return round(random.uniform(300, 1200))
        elif sensor_type == Sensor.SensorType.HUMIDITY:
            # 40-80% relative humidity
            return round(random.uniform(40, 80), 1)
        elif sensor_type == Sensor.SensorType.LIGHT:
            # 0-50000 lux (varies with day/night cycle)
            base_light = random.uniform(0, 50000)
            return round(base_light)
        elif sensor_type == Sensor.SensorType.WATER_LEVEL:
            # 20-100% water level
            return round(random.uniform(20, 100), 1)
        elif sensor_type == Sensor.SensorType.AIR_TEMPERATURE:
            # Air temperature from DHT22 (20-35°C ambient)
            return round(random.uniform(20.0, 35.0), 1)
        elif sensor_type == Sensor.SensorType.TURBIDITY:
            # 0-10 NTU for clean water systems (lower is clearer)
            return round(random.uniform(0, 10), 2)
        else:
            # Generic value for other types
            return round(random.uniform(0, 100), 1)
