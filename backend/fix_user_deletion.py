#!/usr/bin/env python
import os
import django
import sqlite3

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

def fix_user_deletion():
    """Fix user deletion by cleaning up old monitoring_device table."""

    # Connect to SQLite directly
    db_path = settings.DATABASES['default']['NAME']
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("🔧 FIXING USER DELETION ISSUE")

    # Check if monitoring_device table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='monitoring_device'")
    old_table = cursor.fetchone()

    if old_table:
        print(f"❌ Found old table: monitoring_device")

        # Check what's in it
        cursor.execute("SELECT * FROM monitoring_device WHERE user_id = 5")
        records = cursor.fetchall()

        print(f"📋 Records blocking deletion:")
        for record in records:
            print(f"   - {record}")

        # Option 1: Delete the records referencing user 5
        print(f"\n🗑️ Deleting records that reference user 5...")
        cursor.execute("DELETE FROM monitoring_device WHERE user_id = 5")
        deleted_count = cursor.rowcount
        print(f"   ✅ Deleted {deleted_count} records")

        # Check if table is now empty
        cursor.execute("SELECT COUNT(*) FROM monitoring_device")
        remaining = cursor.fetchone()[0]

        if remaining == 0:
            print(f"\n🧹 Table is empty, dropping it...")
            cursor.execute("DROP TABLE monitoring_device")
            print(f"   ✅ Dropped monitoring_device table")
        else:
            print(f"   ⚠️ {remaining} records remain in monitoring_device")

        # Commit changes
        conn.commit()
        print(f"\n💾 Changes committed")

    else:
        print(f"✅ No old monitoring_device table found")

    conn.close()

    # Now try to delete the user
    print(f"\n🎯 Attempting user deletion...")
    try:
        user = User.objects.get(id=5)
        user_email = user.email
        user.delete()
        print(f"✅ Successfully deleted user: {user_email}")
        return True
    except Exception as e:
        print(f"❌ Still failed: {e}")
        return False

if __name__ == "__main__":
    success = fix_user_deletion()

    if success:
        print(f"\n🎉 Problem fixed! User deletion successful.")

        # Show remaining users
        print(f"\n👥 Remaining users:")
        for user in User.objects.all():
            print(f"   - ID: {user.id} | Email: {user.email}")
    else:
        print(f"\n💥 Issue persists. May need manual database cleanup.")
