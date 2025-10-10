import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
django.setup()

# Import models
from apps.monitoring.models import Sensor, SensorData

# Check sensor types
sensor_types = [t[0] for t in Sensor.objects.values_list('sensor_type').distinct()]
print("SENSOR TYPES:", sensor_types)

# Count sensors and data by type
print("\nSENSOR COUNT BY TYPE:")
for sensor_type in sensor_types:
    sensors = Sensor.objects.filter(sensor_type=sensor_type).count()
    readings = SensorData.objects.filter(sensor__sensor_type=sensor_type).count()
    print(f"- {sensor_type}: {sensors} sensors, {readings} readings")

# Check specifically for EC data (should be 0)
ec_sensors = Sensor.objects.filter(sensor_type='ec').count()
ec_readings = SensorData.objects.filter(sensor__sensor_type='ec').count()
print(f"\nEC SENSORS: {ec_sensors} (should be 0)")
print(f"EC READINGS: {ec_readings} (should be 0)")

# Verify TDS data
tds_sensors = Sensor.objects.filter(sensor_type='tds').count()
tds_readings = SensorData.objects.filter(sensor__sensor_type='tds').count()
print(f"\nTDS SENSORS: {tds_sensors}")
print(f"TDS READINGS: {tds_readings}")

# Total data points in database
total_readings = SensorData.objects.count()
print(f"\nTOTAL READINGS: {total_readings}")
