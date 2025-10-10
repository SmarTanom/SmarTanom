import os
import django
import random
from datetime import datetime, timedelta

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
django.setup()

# Import models
from apps.monitoring.models import Sensor, SensorData

# Get all TDS sensors
tds_sensors = Sensor.objects.filter(sensor_type='tds')

# Generate data for the past 24 hours, every hour
end_time = datetime.now()
start_time = end_time - timedelta(days=1)

# Function to generate realistic TDS values (typically 50-500 ppm for freshwater)
def generate_tds_value():
    return random.randint(300, 600)

readings_created = 0

for sensor in tds_sensors:
    current_time = start_time

    while current_time <= end_time:
        # Create a reading
        SensorData.objects.create(
            sensor=sensor,
            value=generate_tds_value(),
            created_at=current_time
        )
        readings_created += 1

        # Move to next hour
        current_time += timedelta(hours=1)

print(f"Created {readings_created} TDS sensor readings")
