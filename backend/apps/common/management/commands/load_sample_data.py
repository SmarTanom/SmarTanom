"""Management command to load sample fixture data."""

from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from pathlib import Path


class Command(BaseCommand):
    """Load sample fixture data for development."""

    help = 'Load sample fixture data for development and testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--with-data',
            action='store_true',
            help='Load complete dataset including sensor readings (larger file)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading fixtures'
        )

    def handle(self, *args, **options):
        """Execute the command."""
        
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            
            # Import here to avoid circular imports
            from apps.sensors.models import SensorData, Sensor
            from apps.reservoirs.models import Reservoir
            from apps.devices.models import Device
            from apps.accounts.models import User
            
            # Clear in dependency order
            SensorData.objects.all().delete()
            Sensor.objects.all().delete()
            Reservoir.objects.all().delete()
            Device.objects.all().delete()
            # Only delete test users
            User.objects.filter(email__startswith='test').delete()
            
            self.stdout.write(self.style.SUCCESS('Cleared existing data'))

        # Choose which fixture to load
        if options['with_data']:
            fixture_file = 'fixtures/sample_data.json'
            self.stdout.write('Loading complete sample data (including sensor readings)...')
        else:
            fixture_file = 'fixtures/structure_only.json'
            self.stdout.write('Loading structure data only (users, devices, sensors)...')

        # Check if fixture file exists
        fixture_path = Path(fixture_file)
        if not fixture_path.exists():
            self.stdout.write(
                self.style.ERROR(
                    f'Fixture file not found: {fixture_file}\n'
                    f'Run the following to create fixtures:\n'
                    f'python manage.py dumpdata accounts.User devices.Device '
                    f'reservoirs.Reservoir sensors.Sensor --indent 2 --output {fixture_file}'
                )
            )
            return

        try:
            with transaction.atomic():
                call_command('loaddata', fixture_file, verbosity=1)
                
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully loaded fixture data from {fixture_file}'
                )
            )
            
            # Show summary
            from apps.accounts.models import User
            from apps.devices.models import Device
            from apps.sensors.models import Sensor, SensorData
            from apps.reservoirs.models import Reservoir
            
            test_users = User.objects.filter(email__startswith='test').count()
            devices = Device.objects.count()
            sensors = Sensor.objects.count()
            reservoirs = Reservoir.objects.count()
            sensor_data = SensorData.objects.count()
            
            self.stdout.write(
                f'\n📊 Loaded Data Summary:\n'
                f'  - Users: {test_users}\n'
                f'  - Devices: {devices}\n'
                f'  - Reservoirs: {reservoirs}\n'
                f'  - Sensors: {sensors}\n'
                f'  - Sensor Readings: {sensor_data}'
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error loading fixture data: {str(e)}')
            )