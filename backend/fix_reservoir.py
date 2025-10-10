#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.db import connection

# Update the monitoring_reservoir record to point to an existing device
cursor = connection.cursor()

# Check current devices
cursor.execute("SELECT id, device_name FROM devices_device;")
devices = cursor.fetchall()
print("Available devices:", devices)

if devices:
    # Update the reservoir to point to the first available device
    first_device_id = devices[0][0]
    cursor.execute("UPDATE monitoring_reservoir SET device_id = %s WHERE id = 13;", [first_device_id])
    print(f"Updated reservoir to point to device ID {first_device_id}")

    # Commit the changes
    cursor.connection.commit()

    # Verify the fix
    cursor.execute("SELECT * FROM monitoring_reservoir WHERE id = 13;")
    result = cursor.fetchone()
    print("Updated reservoir record:", result)
else:
    print("No devices found to update to")

cursor.close()
