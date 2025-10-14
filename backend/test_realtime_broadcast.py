# Quick Test Script for Real-Time Sensor Updates
# This script tests the WebSocket broadcasting system

import django
import os
import sys

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.sensors.models import Sensor, SensorData
from apps.devices.models import Device
from django.utils import timezone
import time

def test_realtime_broadcast():
    """
    Test real-time sensor data broadcasting.

    This script creates sensor data and checks if the WebSocket broadcast fires.
    Open the frontend Dashboard before running this script to see live updates.
    """
    print("\n" + "="*60)
    print("REAL-TIME SENSOR DATA BROADCAST TEST")
    print("="*60)

    # Get or create test device
    device = Device.objects.filter(is_bound=True).first()
    if not device:
        print("❌ No bound devices found. Please bind a device first.")
        return

    print(f"\n✅ Testing with device: {device.device_name} ({device.device_serial})")
    print(f"   Device ID: {device.id}")
    print(f"   Owner: {device.bound_email}")

    # Get all sensors for this device
    sensors = Sensor.objects.filter(device=device)
    if not sensors.exists():
        print("❌ No sensors found for this device. Please create sensors first.")
        return

    print(f"\n✅ Found {sensors.count()} sensors:")
    for sensor in sensors:
        print(f"   - {sensor.sensor_type} (ID: {sensor.id})")

    # Test data for each sensor type
    test_values = {
        'ph': 6.5,
        'tds': 850,
        'ec': 1.3,
        'air_temperature': 26.5,
        'humidity': 65.0,
        'light': 1200,
        'water_level': 85.0,
        'turbidity': 1.5,
        'water_temperature': 23.5
    }

    print("\n" + "-"*60)
    print("CREATING TEST SENSOR DATA...")
    print("-"*60)
    print("\n⚠️  OPEN YOUR DASHBOARD NOW TO SEE LIVE UPDATES!")
    print("   URL: http://localhost:5173")
    print("\nWaiting 5 seconds before sending data...")
    for i in range(5, 0, -1):
        print(f"   {i}...")
        time.sleep(1)

    print("\n🚀 Sending sensor data...\n")

    # Create sensor data for each sensor
    created_count = 0
    for sensor in sensors:
        if sensor.sensor_type in test_values:
            value = test_values[sensor.sensor_type]

            # Create sensor data (this will trigger the signal)
            sensor_data = SensorData.objects.create(
                sensor=sensor,
                value=value
            )

            created_count += 1
            print(f"✅ Created: {sensor.sensor_type} = {value} {sensor.unit}")
            print(f"   Sensor Data ID: {sensor_data.id}")
            print(f"   Timestamp: {sensor_data.created_at}")
            print(f"   → WebSocket broadcast should fire now!")
            print()

            # Small delay between readings
            time.sleep(0.5)

    print("-"*60)
    print(f"✅ TEST COMPLETE: Created {created_count} sensor readings")
    print("-"*60)

    print("\n📊 VERIFICATION:")
    print("   1. Check your Dashboard - values should update WITHOUT refresh")
    print("   2. Check backend console - should see '[WebSocket] Broadcasted sensor.update...'")
    print("   3. Check browser console - should see '[Dashboard] Real-time sensor data...'")
    print("   4. Values should match exactly what was created above")

    print("\n💡 TIP: Run this script multiple times to see continuous updates")
    print(f"   Next run will create new readings at {timezone.now() + timezone.timedelta(seconds=10)}")

    print("\n" + "="*60)
    print("Test completed successfully!")
    print("="*60 + "\n")

if __name__ == '__main__':
    try:
        test_realtime_broadcast()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
