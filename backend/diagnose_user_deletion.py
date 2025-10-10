#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData
from apps.reservoirs.models import Reservoir

User = get_user_model()

print("=== USER DELETION DIAGNOSTIC ===")

# Get user with ID 5
try:
    user = User.objects.get(id=5)
    print(f"✅ Found user ID 5: {user.email}")

    # Check related objects
    devices = Device.objects.filter(user=user)
    print(f"📱 User has {devices.count()} devices:")

    total_sensors = 0
    total_readings = 0
    total_reservoirs = 0

    for device in devices:
        sensors = Sensor.objects.filter(device=device)
        readings = SensorData.objects.filter(sensor__device=device)
        reservoirs = Reservoir.objects.filter(device=device)

        print(f"   - Device: {device.device_name} (ID: {device.id})")
        print(f"     Sensors: {sensors.count()}")
        print(f"     Readings: {readings.count()}")
        print(f"     Reservoirs: {reservoirs.count()}")

        total_sensors += sensors.count()
        total_readings += readings.count()
        total_reservoirs += reservoirs.count()

    print(f"\n📊 TOTALS TO BE DELETED:")
    print(f"   - 1 user")
    print(f"   - {devices.count()} devices")
    print(f"   - {total_sensors} sensors")
    print(f"   - {total_readings} sensor readings")
    print(f"   - {total_reservoirs} reservoirs")

    # Check cascade settings
    print(f"\n🔗 CASCADE SETTINGS:")
    print(f"   - Device.user: {Device._meta.get_field('user').remote_field.on_delete}")
    print(f"   - Sensor.device: {Sensor._meta.get_field('device').remote_field.on_delete}")
    print(f"   - SensorData.sensor: {SensorData._meta.get_field('sensor').remote_field.on_delete}")
    print(f"   - Reservoir.device: {Reservoir._meta.get_field('device').remote_field.on_delete}")

except User.DoesNotExist:
    print("❌ User ID 5 not found")

print(f"\n💡 SOLUTIONS:")
print(f"1. Delete related data first (sensors, readings, reservoirs, devices)")
print(f"2. Set devices to unowned (user=None) before deleting user")
print(f"3. Use Django admin bulk actions carefully")
print(f"4. Consider soft delete instead of hard delete")
