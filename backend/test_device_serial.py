#!/usr/bin/env python
"""Test device serial generation."""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device
from apps.accounts.models import User

def test_serial_generation():
    """Test that device serial generation works correctly."""

    print("Testing device serial generation...")

    # Test static method
    print("\n1. Testing static method Device.generate_device_serial():")
    for i in range(5):
        serial = Device.generate_device_serial()
        print(f"   Generated serial {i+1}: {serial}")
        assert len(serial) == 12, f"Serial length should be 12, got {len(serial)}"
        assert serial.startswith("SMRT-"), f"Serial should start with 'SMRT-', got {serial}"
        assert serial.count('-') == 2, f"Serial should have 2 dashes, got {serial.count('-')}"

    # Test device creation with serial auto-generation
    print("\n2. Testing device creation with auto-generated serial:")

    # Get first user or create one
    user = User.objects.first()
    if not user:
        user = User.objects.create_user(
            email="test@example.com",
            username="testuser"
        )
        print("   Created test user")

    # Create a new device
    device = Device.objects.create(
        user=user,
        device_name="Test Device Auto Serial",
        status=Device.Status.ACTIVE
    )

    print(f"   Created device: {device.device_name}")
    print(f"   Auto-generated serial: {device.device_serial}")

    # Verify serial format
    assert device.device_serial is not None, "Device serial should not be None"
    assert len(device.device_serial) == 12, f"Serial length should be 12, got {len(device.device_serial)}"
    assert device.device_serial.startswith("SMRT-"), f"Serial should start with 'SMRT-'"

    # Test device creation with manual serial
    print("\n3. Testing device creation with manual serial:")
    manual_serial = "SMRT-TST-001"
    device2 = Device.objects.create(
        user=user,
        device_name="Test Device Manual Serial",
        device_serial=manual_serial,
        status=Device.Status.ACTIVE
    )

    print(f"   Created device: {device2.device_name}")
    print(f"   Manual serial: {device2.device_serial}")

    assert device2.device_serial == manual_serial, f"Manual serial should be preserved"

    # Test uniqueness
    print("\n4. Testing serial uniqueness:")
    all_serials = Device.objects.values_list('device_serial', flat=True)
    unique_serials = set(all_serials)
    print(f"   Total devices: {len(all_serials)}")
    print(f"   Unique serials: {len(unique_serials)}")
    assert len(all_serials) == len(unique_serials), "All serials should be unique"

    # Clean up test devices
    device.delete()
    device2.delete()
    print("   Cleaned up test devices")

    print("\n✅ All tests passed! Device serial generation is working correctly.")

    # Show current devices
    print("\n📋 Current devices:")
    for device in Device.objects.all():
        owner = device.user.username if device.user else "Unowned"
        print(f"   - {device.device_name} ({device.device_serial}) - Owner: {owner}")

if __name__ == "__main__":
    test_serial_generation()
