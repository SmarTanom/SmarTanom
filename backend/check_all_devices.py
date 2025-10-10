#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device

print("=== ALL DEVICES IN DATABASE ===")
devices = Device.objects.all().order_by('id')
print(f"Total devices: {devices.count()}")
print()
for device in devices:
    user_display = str(device.user) if device.user else "UNOWNED"
    print(f"ID: {device.id:3d} | Name: {device.device_name:25s} | User: {user_display:30s} | Status: {device.status}")

print(f"\n=== ID RANGE ===")
if devices.exists():
    print(f"Lowest ID: {devices.first().id}")
    print(f"Highest ID: {devices.last().id}")

print(f"\n=== CHECK FOR ID 11 ===")
try:
    device_11 = Device.objects.get(id=11)
    user_display = str(device_11.user) if device_11.user else "UNOWNED"
    print(f"✅ Found ID 11: {device_11.device_name} | User: {user_display} | Status: {device_11.status}")
except Device.DoesNotExist:
    print("❌ No device with ID 11 exists")
