#!/usr/bin/env python
"""Debug script to check for device duplicates."""

import os
import django
import sys

# Setup Django environment
sys.path.append('/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.devices.models import Device
from apps.accounts.models import User

def check_device_duplicates():
    """Check for device duplicates by various criteria."""
    print("=== Device Duplicate Analysis ===\n")

    # Check total devices
    total_devices = Device.objects.count()
    print(f"Total devices in database: {total_devices}")

    # Check for duplicate device serials (shouldn't happen due to unique constraint)
    from django.db.models import Count
    duplicate_serials = Device.objects.values('device_serial').annotate(
        count=Count('id')
    ).filter(count__gt=1)

    if duplicate_serials:
        print(f"\n❌ Found {len(duplicate_serials)} duplicate device serials:")
        for dup in duplicate_serials:
            devices = Device.objects.filter(device_serial=dup['device_serial'])
            print(f"  Serial: {dup['device_serial']} - {dup['count']} devices:")
            for device in devices:
                print(f"    ID: {device.id}, Name: {device.device_name}, Bound: {device.is_bound}, Email: {device.bound_email}")
    else:
        print("\n✅ No duplicate device serials found")

    # Check devices bound to multiple emails (shouldn't happen)
    bound_devices = Device.objects.filter(is_bound=True)
    print(f"\nBound devices: {bound_devices.count()}")

    # Group by email to see distribution
    from django.db.models import Count
    email_distribution = bound_devices.values('bound_email').annotate(
        device_count=Count('id')
    ).order_by('-device_count')

    print("\n📧 Device distribution by email:")
    for email_data in email_distribution:
        email = email_data['bound_email']
        count = email_data['device_count']
        print(f"  {email}: {count} devices")

        # Show details for this email
        user_devices = bound_devices.filter(bound_email=email)
        for device in user_devices:
            print(f"    - ID: {device.id}, Serial: {device.device_serial}, Name: {device.device_name}")

    # Check for users with same email but different user accounts
    print("\n👥 User accounts analysis:")
    users = User.objects.all()
    for user in users:
        user_devices = Device.objects.filter(bound_email=user.email, is_bound=True)
        if user_devices.exists():
            print(f"  User: {user.email} (ID: {user.id}, Username: {user.username})")
            print(f"    Devices: {user_devices.count()}")
            for device in user_devices:
                print(f"      - {device.device_serial} ({device.device_name})")

if __name__ == '__main__':
    check_device_duplicates()
