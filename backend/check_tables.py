#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.db import connection

# Check what tables exist
cursor = connection.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]
print("All tables:", tables)

# Check monitoring_reservoir table structure
if 'monitoring_reservoir' in tables:
    cursor.execute("SELECT * FROM monitoring_reservoir;")
    reservoirs = cursor.fetchall()
    print("\nmonitoring_reservoir records:")
    for reservoir in reservoirs:
        print(reservoir)

# Check what device IDs exist
cursor.execute("SELECT id FROM devices_device;")
device_ids = [row[0] for row in cursor.fetchall()]
print("\nExisting device IDs:", device_ids)

cursor.close()
