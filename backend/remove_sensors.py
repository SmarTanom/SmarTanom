import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
django.setup()

# Import models
from apps.monitoring.models import Sensor, SensorData

# Check initial counts
print("BEFORE DELETION:")
air_temp_sensors = Sensor.objects.filter(sensor_type='air_temperature').count()
air_temp_readings = SensorData.objects.filter(sensor__sensor_type='air_temperature').count()
co2_sensors = Sensor.objects.filter(sensor_type='co2').count()
co2_readings = SensorData.objects.filter(sensor__sensor_type='co2').count()

print(f"- air_temperature: {air_temp_sensors} sensors, {air_temp_readings} readings")
print(f"- co2: {co2_sensors} sensors, {co2_readings} readings")

# Delete air_temperature sensors and their readings
air_temp_sensors = Sensor.objects.filter(sensor_type='air_temperature')
air_temp_deleted = len(list(air_temp_sensors))
air_temp_sensors.delete()

# Delete co2 sensors and their readings
co2_sensors = Sensor.objects.filter(sensor_type='co2')
co2_deleted = len(list(co2_sensors))
co2_sensors.delete()

# Verify deletion
print("\nAFTER DELETION:")
remaining_air_temp = Sensor.objects.filter(sensor_type='air_temperature').count()
remaining_air_temp_readings = SensorData.objects.filter(sensor__sensor_type='air_temperature').count()
remaining_co2 = Sensor.objects.filter(sensor_type='co2').count()
remaining_co2_readings = SensorData.objects.filter(sensor__sensor_type='co2').count()

print(f"- air_temperature: {remaining_air_temp} sensors, {remaining_air_temp_readings} readings")
print(f"- co2: {remaining_co2} sensors, {remaining_co2_readings} readings")

print(f"\nDELETED: {air_temp_deleted} air_temperature sensors and {co2_deleted} co2 sensors")
print("All associated sensor readings were also deleted")

# Show remaining sensor types
remaining_types = [t[0] for t in Sensor.objects.values_list('sensor_type').distinct()]
print(f"\nREMAINING SENSOR TYPES: {remaining_types}")
