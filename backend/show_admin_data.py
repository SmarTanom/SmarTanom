import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
django.setup()

from apps.devices.models import Device
from apps.reservoirs.models import Reservoir
from apps.sensors.models import Sensor, SensorData

print("=== ADMIN DASHBOARD DATA ===")
print()

print("DEVICES:")
for d in Device.objects.all():
    print(f"  • {d.device_name} (User: {d.user.email}) - Status: {d.status}")

print()
print("RESERVOIRS:")
for r in Reservoir.objects.all():
    print(f"  • {r.reservoir_name} - {r.plant_type} ({r.device.device_name})")

print()
print("SENSORS:")
for s in Sensor.objects.all()[:8]:  # Show first 8
    print(f"  • {s.sensor_type} ({s.unit}) - {s.device.device_name}")

print()
print("SENSOR DATA (sample):")
for sd in SensorData.objects.all()[:5]:  # Show first 5 readings
    print(f"  • {sd.sensor.sensor_type}: {sd.value} {sd.sensor.unit} at {sd.created_at.strftime('%Y-%m-%d %H:%M')}")

print()
print(f"TOTALS:")
print(f"  • Users: {len(set(d.user for d in Device.objects.all()))}")
print(f"  • Devices: {Device.objects.count()}")
print(f"  • Reservoirs: {Reservoir.objects.count()}")
print(f"  • Sensors: {Sensor.objects.count()}")
print(f"  • Sensor Readings: {SensorData.objects.count()}")
