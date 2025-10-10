#!/usr/bin/env python
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.db import connection
from apps.devices.models import Device

print("=== DATABASE CONFIGURATION ===")
db_config = settings.DATABASES['default']
print(f"Engine: {db_config['ENGINE']}")
print(f"Name: {db_config['NAME']}")
print(f"Host: {db_config.get('HOST', 'N/A')}")
print(f"Port: {db_config.get('PORT', 'N/A')}")
print(f"User: {db_config.get('USER', 'N/A')}")

print(f"\n=== ACTUAL DATABASE CONNECTION ===")
with connection.cursor() as cursor:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='devices_device';")
    tables = cursor.fetchall()
    if tables:
        print("✅ devices_device table exists")

        # Get actual data from the table directly
        cursor.execute("SELECT id, device_name, user_id FROM devices_device ORDER BY id;")
        rows = cursor.fetchall()
        print(f"Raw database rows: {len(rows)}")
        for row in rows:
            print(f"  Raw: ID={row[0]}, name='{row[1]}', user_id={row[2]}")
    else:
        print("❌ devices_device table NOT found!")

print(f"\n=== ENVIRONMENT VARIABLES ===")
env_vars = ['DATABASE_URL', 'DB_ENGINE', 'DB_NAME', 'DB_HOST', 'DB_PORT', 'DB_USER']
for var in env_vars:
    value = os.getenv(var, 'Not set')
    print(f"{var}: {value}")

print(f"\n=== CURRENT WORKING DIRECTORY ===")
print(f"CWD: {os.getcwd()}")
print(f"DB file exists: {os.path.exists('db.sqlite3')}")
if os.path.exists('db.sqlite3'):
    import os
    stat = os.stat('db.sqlite3')
    print(f"DB file size: {stat.st_size} bytes")
    print(f"DB file modified: {stat.st_mtime}")

print(f"\n=== DJANGO MODEL COUNT ===")
print(f"Django ORM count: {Device.objects.count()}")
