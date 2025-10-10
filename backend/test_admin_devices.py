#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.devices.models import Device
from apps.devices.admin import DeviceAdmin

User = get_user_model()

print("=== ADMIN LOGIN TEST ===")

# Check superuser
superuser = User.objects.filter(is_superuser=True).first()
if superuser:
    print(f"✅ Superuser exists: {superuser.email}")
    print(f"   - is_staff: {superuser.is_staff}")
    print(f"   - is_active: {superuser.is_active}")
    print(f"   - is_superuser: {superuser.is_superuser}")
else:
    print("❌ No superuser found!")

print("\n=== DEVICE ADMIN TEST ===")

# Check all devices in admin queryset
device_admin = DeviceAdmin(Device, None)
queryset = device_admin.get_queryset(None)

print(f"Admin queryset contains {queryset.count()} devices:")
for device in queryset.order_by('id'):
    user_display = device.user.email if device.user else "None (unowned)"
    print(f"  - ID: {device.id} | Name: {device.device_name} | User: {user_display}")

print("\n=== DIRECT DEVICE CHECK ===")
all_devices = Device.objects.all().order_by('id')
print(f"Database contains {all_devices.count()} devices:")
for device in all_devices:
    user_display = device.user.email if device.user else "None (unowned)"
    print(f"  - ID: {device.id} | Name: {device.device_name} | User: {user_display}")

print("\n=== UNOWNED DEVICE CHECK ===")
unowned = Device.objects.filter(user__isnull=True)
print(f"Unowned devices: {unowned.count()}")
for device in unowned:
    print(f"  - ID: {device.id} | Name: {device.device_name}")

print("\n=== ADMIN URL ===")
print("🌐 Admin login: http://127.0.0.1:8000/admin/")
print("📧 Email: smartanom01@gmail.com")
print("🔑 Password: smartanomadmin4r1")
print("📱 Devices admin: http://127.0.0.1:8000/admin/devices/device/")
