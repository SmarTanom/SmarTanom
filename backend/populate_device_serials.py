#!/usr/bin/env python
"""Populate device serials for existing devices."""

import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device

def populate_device_serials():
    """Generate serials for devices that don't have them."""
    devices_without_serials = Device.objects.filter(device_serial__isnull=True)

    print(f"Found {devices_without_serials.count()} devices without serials")

    for device in devices_without_serials:
        old_serial = device.device_serial
        device.save()  # This will trigger the save method to generate a serial
        print(f"Device '{device.device_name}' (ID: {device.id}): {old_serial} -> {device.device_serial}")

    # Show all devices with their serials
    print("\nAll devices:")
    for device in Device.objects.all():
        print(f"- {device.device_name} (ID: {device.id}): {device.device_serial}")

if __name__ == "__main__":
    populate_device_serials()
