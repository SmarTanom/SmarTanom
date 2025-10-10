#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device

print("=== DEVICES WITH IDs ===")
devices = Device.objects.all().order_by('id')
for device in devices:
    user_display = device.user.email if device.user else "UNOWNED"
    print(f"ID: {device.id:2d} | Name: {device.device_name:20s} | User: {user_display:20s} | Status: {device.status}")

print(f"\nTotal devices: {devices.count()}")
