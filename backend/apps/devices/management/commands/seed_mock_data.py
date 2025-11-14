"""Management command to generate mock data for SmarTanom."""

import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.devices.models import Device
from apps.reservoirs.models import Plant
from apps.sensors.models import Sensor, SensorData

User = get_user_model()


class Command(BaseCommand):
    """Generate mock data for development and testing."""

    help = 'Generate mock data for devices, plants (on device), sensors, and sensor readings'

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
        # Reservoir model removed; plant/cycle now live on Device. Keeping placeholder for backward compat.
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
        # Assign plants and cycles directly on devices (replaces reservoirs)
        self.assign_plants_and_cycles(all_devices)
        sensors = self.create_sensors(all_devices)
        self.create_sensor_data(sensors, options['readings_per_sensor'], options['days'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated mock data:\n'
                f'  - {len(users)} users\n'
                f'  - {len(all_devices)} devices ({len(owned_devices)} owned, {len(unowned_devices)} unowned)\n'
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
        """Create devices for users and bind to their emails."""
        devices = []
        device_names = [
            'Greenhouse Alpha', 'Greenhouse Beta', 'Indoor Garden', 'Hydro Tower',
            'Basement Setup', 'Rooftop Garden', 'Lab Setup A', 'Lab Setup B',
            'Main Greenhouse', 'Backup System'
        ]

        for user in users:
            for i in range(devices_per_user):
                device_name = f"{device_names[i % len(device_names)]} {i+1}"
                device = Device.objects.create(
                    device_name=device_name,
                    status=random.choice([Device.Status.ACTIVE, Device.Status.ACTIVE, Device.Status.MAINTENANCE]),
                    is_bound=True,
                    bound_email=user.email,
                )
                self.stdout.write(f'Created device: {device_name} for {user.email}')
                devices.append(device)

        return devices

    def create_unowned_devices(self, count):
        """Create unowned devices (not bound to any email)."""
        devices = []
        unowned_names = [
            'Factory Floor Unit', 'Warehouse Setup', 'Demo Station', 'Test Rig',
            'Prototype Alpha', 'Research Unit', 'Field Test Device', 'Evaluation Kit',
            'Training System', 'Display Model'
        ]

        for i in range(count):
            device_name = f"{unowned_names[i % len(unowned_names)]} {chr(65 + i)}"  # A, B, C, etc.
            device = Device.objects.create(
                device_name=device_name,
                status=random.choice([
                    Device.Status.ACTIVE,
                    Device.Status.MAINTENANCE,
                    Device.Status.INACTIVE
                ]),
                is_bound=False,
                bound_email=None,
            )
            self.stdout.write(f'Created unowned device: {device_name}')
            devices.append(device)

        return devices

    def assign_plants_and_cycles(self, devices):
        """Assign a plant and cycle dates directly to each device (replaces reservoirs)."""
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

        for device in devices:
            plant = plant_records[random.choice(plant_types)]
            start_date = date.today() - timedelta(days=random.randint(30, 180))
            end_date = start_date + timedelta(days=random.randint(60, 120))
            device.plant = plant
            device.start_date = start_date
            device.end_date = end_date
            device.save(update_fields=["plant", "start_date", "end_date", "updated_at"])
            self.stdout.write(f'Set plant {plant.plant_name} and cycle for device: {device.device_name}')

    def create_sensors(self, devices):
        """Create sensors for devices."""
        sensors = []

        # Create supported sensor types (environment sensors removed)
        sensor_configs = [
            (Sensor.SensorType.PH, 'pH'),
            (Sensor.SensorType.TDS, 'ppm'),
            (Sensor.SensorType.WATER_TEMPERATURE, '°C'),
            (Sensor.SensorType.WATER_LEVEL, '%'),
            (Sensor.SensorType.TURBIDITY, 'NTU'),
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
        
        elif sensor_type == Sensor.SensorType.WATER_LEVEL:
            # 20-100% water level
            return round(random.uniform(20, 100), 1)
        
        elif sensor_type == Sensor.SensorType.TURBIDITY:
            # 0-10 NTU for clean water systems (lower is clearer)
            return round(random.uniform(0, 10), 2)
        else:
            # Generic value for other types
            return round(random.uniform(0, 100), 1)
