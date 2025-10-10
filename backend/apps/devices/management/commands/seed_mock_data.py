"""Management command to generate mock data for SmarTanom."""

import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.devices.models import Device
from apps.reservoirs.models import Reservoir
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

    def handle(self, *args, **options):
        """Execute the command."""
        if options['clear']:
            self.clear_existing_data()

        users = self.create_users(options['users'])
        devices = self.create_devices(users, options['devices_per_user'])
        reservoirs = self.create_reservoirs(devices, options['reservoirs_per_device'])
        sensors = self.create_sensors(devices)
        self.create_sensor_data(sensors, options['readings_per_sensor'], options['days'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully generated mock data:\n'
                f'  - {len(users)} users\n'
                f'  - {len(devices)} devices\n'
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

    def create_reservoirs(self, devices, reservoirs_per_device):
        """Create reservoirs for devices."""
        reservoirs = []
        plant_types = [
            'Lettuce', 'Tomatoes', 'Herbs', 'Peppers', 'Spinach',
            'Kale', 'Basil', 'Cilantro', 'Strawberries', 'Cucumbers'
        ]
        reservoir_names = [
            'Main Tank', 'Nutrient Reservoir', 'Seedling Tank', 'Flowering Chamber',
            'Vegetative Tank', 'Clone Chamber', 'Recovery Tank'
        ]

        for device in devices:
            for i in range(reservoirs_per_device):
                reservoir_name = reservoir_names[i % len(reservoir_names)]
                plant_type = random.choice(plant_types)

                # Generate realistic date ranges
                start_date = date.today() - timedelta(days=random.randint(30, 180))
                end_date = start_date + timedelta(days=random.randint(60, 120))

                reservoir, created = Reservoir.objects.get_or_create(
                    device=device,
                    reservoir_name=reservoir_name,
                    defaults={
                        'plant_type': plant_type,
                        'start_date': start_date,
                        'end_date': end_date
                    }
                )
                if created:
                    self.stdout.write(f'Created reservoir: {reservoir_name} ({plant_type}) for {device.device_name}')
                reservoirs.append(reservoir)

        return reservoirs

    def create_sensors(self, devices):
        """Create sensors for devices."""
        sensors = []

        # Create a variety of sensors for each device
        sensor_configs = [
            (Sensor.SensorType.WATER_TEMPERATURE, '°C'),
            (Sensor.SensorType.PH, 'pH'),
            (Sensor.SensorType.TDS, 'ppm'),
            (Sensor.SensorType.HUMIDITY, '%'),
            (Sensor.SensorType.LIGHT, 'lux'),
            (Sensor.SensorType.WATER_LEVEL, '%'),
        ]

        for device in devices:
            # Each device gets 3-5 random sensor types
            selected_sensors = random.sample(sensor_configs, random.randint(3, 5))

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
        elif sensor_type == Sensor.SensorType.TURBIDITY:
            # 0-10 NTU for clean water systems
            return round(random.uniform(0, 10), 2)
        else:
            # Generic value for other types
            return round(random.uniform(0, 100), 1)
