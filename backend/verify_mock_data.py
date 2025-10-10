#!/usr/bin/env python
"""
Script to verify mock data creation
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.accounts.models import User
from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData
from apps.reservoirs.models import Reservoir

def verify_mock_data():
    print("=== MOCK DATA SUMMARY ===")
    test_users = User.objects.filter(email__startswith='test')
    print(f"Users: {test_users.count()}")
    print(f"Devices: {Device.objects.count()}")
    print(f"Reservoirs: {Reservoir.objects.count()}")
    print(f"Sensors: {Sensor.objects.count()}")
    print(f"Sensor Data Points: {SensorData.objects.count()}")

    print("\n=== SAMPLE USER DATA ===")
    user = test_users.first()
    if user:
        print(f"User: {user.email}")
        devices = Device.objects.filter(user=user)

        for device in devices[:2]:  # Show first 2 devices
            print(f"  📱 Device: {device.device_name} ({device.status})")

            # Show reservoirs for this device
            reservoirs = Reservoir.objects.filter(device=device)
            for reservoir in reservoirs:
                print(f"    🏺 Reservoir: {reservoir.reservoir_name} - {reservoir.plant_type}")

            # Show sensors for this device
            sensors = Sensor.objects.filter(device=device)[:3]  # Show first 3 sensors
            for sensor in sensors:
                readings_count = SensorData.objects.filter(sensor=sensor).count()
                latest = SensorData.objects.filter(sensor=sensor).order_by('-created_at').first()
                print(f"    🔬 Sensor: {sensor.sensor_type} - {readings_count} readings")
                if latest:
                    print(f"      Latest: {latest.value} {sensor.unit} at {latest.created_at.strftime('%Y-%m-%d %H:%M')}")

    # Show API endpoints with data
    print("\n=== API ENDPOINTS WITH DATA ===")
    print("🌐 http://localhost:8000/api/accounts/users/ - User management")
    print("🌐 http://localhost:8000/api/devices/ - Device list")
    print("🌐 http://localhost:8000/api/sensors/ - Sensor list")
    print("🌐 http://localhost:8000/api/reservoirs/ - Reservoir list")
    print("🌐 http://localhost:8000/healthz - Health check")
    print("\n✅ Mock data verification complete!")

if __name__ == '__main__':
    verify_mock_data()
