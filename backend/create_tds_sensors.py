import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
django.setup()

# Import models
from apps.monitoring.models import Device, Sensor

# Create TDS sensors for each device
devices = Device.objects.all()[:3]  # First 3 devices
tds_sensors_created = 0

for device in devices:
    # Create a TDS sensor for this device
    Sensor.objects.create(
        device=device,
        sensor_type='tds',
        unit='ppm'
    )
    tds_sensors_created += 1

print(f"Created {tds_sensors_created} TDS sensors")
print(f"Total TDS sensors: {Sensor.objects.filter(sensor_type='tds').count()}")
