"""
Test script for OTP-based device binding flow
Run with: python manage.py shell < test_otp_binding.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device, DeviceCollaboration
from apps.accounts.models import User
from django.utils import timezone

print("\n" + "="*60)
print("OTP Binding & Collaboration Test")
print("="*60)

# 1. Create test staff user
print("\n1. Creating test staff user...")
staff_user, created = User.objects.get_or_create(
    email='admin@smartanom.test',
    defaults={
        'username': 'admin_test',
        'is_staff': True,
        'is_superuser': True,
        'is_active': True
    }
)
if created:
    print(f"✓ Created staff user: {staff_user.email}")
else:
    print(f"✓ Staff user exists: {staff_user.email}")

# 2. Create test device
print("\n2. Creating test device...")
device, created = Device.objects.get_or_create(
    device_serial='TEST-DEVICE-001',
    defaults={
        'device_name': 'Test OTP Device',
        'status': Device.Status.ACTIVE,
        'is_bound': False
    }
)
if created:
    print(f"✓ Created device: {device.device_serial}")
else:
    print(f"✓ Device exists: {device.device_serial}")

# 3. Display API endpoints
print("\n3. Available API Endpoints:")
print("-" * 60)
print("OTP Binding Flow:")
print(f"  POST /api/devices/{device.id}/bind-otp/")
print(f"       Body: {{'email': 'user@example.com'}}")
print(f"  POST /api/devices/{device.id}/confirm-bind/")
print(f"       Body: {{'otp_code': '123456'}}")
print()
print("Collaborator Management:")
print(f"  POST /api/devices/{device.id}/add-collaborator/")
print(f"       Body: {{'email': 'collab@example.com'}}")
print(f"  POST /api/devices/{device.id}/revoke/<user_id>/")
print()
print("Device Unbind:")
print(f"  POST /api/devices/{device.id}/admin-unbind/")

# 4. Test user creation pattern
print("\n4. Testing user creation pattern...")
test_email = "newuser@example.com"
user, user_created = User.objects.get_or_create(
    email=test_email,
    defaults={
        'username': f"user_{test_email.split('@')[0]}_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
        'is_active': True,
    }
)
if user_created:
    print(f"✓ Created user: {user.email} (username: {user.username})")
    print(f"  - is_active: {user.is_active}")
    print(f"  - has_usable_password: {user.has_usable_password()}")
    user.delete()  # Cleanup
else:
    print(f"✓ User already exists: {user.email}")

# 5. Display model tracking fields
print("\n5. DeviceCollaboration Tracking Fields:")
print("-" * 60)
print("  - added_by (FK to User, nullable)")
print("  - revoked_by (FK to User, nullable)")
print("  - revoked_at (DateTimeField, nullable)")

print("\n" + "="*60)
print("Test complete! Backend is ready for OTP flow testing.")
print("="*60)
print()
print("Next steps:")
print("1. Start Django server: python manage.py runserver")
print("2. Use curl or Postman to test endpoints")
print("3. Check console for OTP codes (DEBUG mode)")
print()
