#!/usr/bin/env python
"""Fix database constraints by cleaning up orphaned records."""

import sqlite3
import os

def fix_database():
    """Fix database constraint issues."""
    db_path = 'db.sqlite3'
    if not os.path.exists(db_path):
        print("Database file not found!")
        return False

    # Create backup
    backup_path = f'{db_path}.backup'
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"Created backup: {backup_path}")

    # Connect and disable foreign key constraints temporarily
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Disable foreign key constraints
    cursor.execute("PRAGMA foreign_keys = OFF;")

    try:
        # Check what tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables found: {tables}")

        # Check if monitoring_reservoir exists and has bad references
        if 'monitoring_reservoir' in tables:
            cursor.execute("SELECT id, device_id FROM monitoring_reservoir;")
            reservoirs = cursor.fetchall()
            print(f"Monitoring reservoir records: {reservoirs}")

            # Check existing device IDs
            cursor.execute("SELECT id FROM devices_device;")
            device_ids = [row[0] for row in cursor.fetchall()]
            print(f"Valid device IDs: {device_ids}")

            # Delete orphaned reservoir records
            for res_id, device_id in reservoirs:
                if device_id not in device_ids:
                    cursor.execute("DELETE FROM monitoring_reservoir WHERE id = ?;", (res_id,))
                    print(f"Deleted orphaned reservoir record {res_id} (referenced device {device_id})")

        # Check for other monitoring tables with device references
        for table in ['monitoring_sensor', 'monitoring_sensordata']:
            if table in tables:
                # Check if table has device_id column
                cursor.execute(f"PRAGMA table_info({table});")
                columns = [col[1] for col in cursor.fetchall()]

                if 'device_id' in columns:
                    cursor.execute(f"SELECT COUNT(*) FROM {table};")
                    count = cursor.fetchone()[0]
                    print(f"Table {table} has {count} records")

                    # Delete all records from monitoring tables to clean up
                    cursor.execute(f"DELETE FROM {table};")
                    print(f"Cleaned up {table}")

        # Commit changes
        conn.commit()
        print("Database cleanup completed successfully!")

        # Re-enable foreign key constraints
        cursor.execute("PRAGMA foreign_keys = ON;")

        # Test foreign key constraints
        cursor.execute("PRAGMA foreign_key_check;")
        violations = cursor.fetchall()
        if violations:
            print(f"Foreign key violations found: {violations}")
            return False
        else:
            print("No foreign key violations found.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

    return True

if __name__ == "__main__":
    success = fix_database()
    if success:
        print("Database fixed successfully!")
    else:
        print("Failed to fix database!")
