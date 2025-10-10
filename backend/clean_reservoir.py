#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.db import connection

cursor = connection.cursor()

# Check what's in the monitoring_reservoir table
cursor.execute("SELECT * FROM monitoring_reservoir;")
reservoirs = cursor.fetchall()
print("monitoring_reservoir records:")
for reservoir in reservoirs:
    print(reservoir)

# Delete the problematic record
cursor.execute("DELETE FROM monitoring_reservoir WHERE id = 13;")
print("Deleted reservoir record with ID 13")

# Commit the changes
cursor.connection.commit()

# Verify deletion
cursor.execute("SELECT * FROM monitoring_reservoir;")
remaining = cursor.fetchall()
print("Remaining records:", remaining)

cursor.close()
