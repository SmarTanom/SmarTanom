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

print("=== ADMIN DIAGNOSTICS ===")

# Check superuser
superuser = User.objects.filter(is_superuser=True).first()
if superuser:
    print(f"✅ Logged in as: {superuser.email} (staff: {superuser.is_staff})")
else:
    print("❌ No superuser found!")

# Test admin queryset
print("\n=== ADMIN QUERYSET TEST ===")
device_admin = DeviceAdmin(Device, None)

# Simulate a request (admin querysets sometimes depend on request)
class MockRequest:
    def __init__(self, user):
        self.user = user

mock_request = MockRequest(superuser)
admin_queryset = device_admin.get_queryset(mock_request)

print(f"Admin queryset count: {admin_queryset.count()}")
print("Devices in admin queryset:")
for i, device in enumerate(admin_queryset.order_by('id'), 1):
    user_display = device.user.email if device.user else "UNOWNED"
    print(f"  {i}. ID: {device.id} | {device.device_name} | {user_display} | {device.status}")

# Check direct database
print(f"\n=== DIRECT DATABASE CHECK ===")
direct_count = Device.objects.count()
print(f"Direct database count: {direct_count}")

# Check if there are any issues with the model
print(f"\n=== MODEL VALIDATION ===")
try:
    Device._meta.get_field('user')
    print("✅ User field exists and is accessible")
except:
    print("❌ User field issue detected")

print(f"\n=== PAGINATION INFO ===")
print(f"Admin list_per_page: {device_admin.list_per_page}")
print(f"Total devices: {direct_count}")
if direct_count <= device_admin.list_per_page:
    print("✅ All devices should fit on one page")
else:
    print(f"⚠️  Devices split across {(direct_count // device_admin.list_per_page) + 1} pages")
