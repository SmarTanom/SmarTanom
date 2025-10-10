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

def check_sqlite_constraints():
    """Check SQLite foreign key constraints directly."""

    # Get the database path
    db_path = settings.DATABASES['default']['NAME']
    print(f"🗄️ Database: {db_path}")

    # Connect directly to SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print(f"\n🔍 FOREIGN KEY CONSTRAINTS:")

    # Enable foreign key constraint info
    cursor.execute("PRAGMA foreign_key_list(accounts_user)")
    fk_constraints = cursor.fetchall()

    print(f"Foreign keys pointing TO accounts_user table:")
    for fk in fk_constraints:
        print(f"   - {fk}")

    # Find all tables that reference accounts_user
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()

    print(f"\n📋 TABLES REFERENCING USER:")
    user_references = []

    for table in tables:
        table_name = table[0]
        try:
            cursor.execute(f"PRAGMA foreign_key_list({table_name})")
            fks = cursor.fetchall()
            for fk in fks:
                if 'accounts_user' in str(fk) or 'auth_user' in str(fk):
                    user_references.append((table_name, fk))
                    print(f"   - Table: {table_name} -> {fk}")
        except:
            continue

    # Check specific user ID 5 references
    print(f"\n🎯 USER ID 5 REFERENCES:")
    user_id = 5

    for table_name, fk_info in user_references:
        try:
            # Get the foreign key column name (usually 'user_id')
            fk_column = fk_info[3]  # from column name
            cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {fk_column} = ?", (user_id,))
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"   ❌ {table_name}.{fk_column}: {count} references")

                # Get some sample records
                cursor.execute(f"SELECT * FROM {table_name} WHERE {fk_column} = ? LIMIT 3", (user_id,))
                samples = cursor.fetchall()
                for sample in samples:
                    print(f"      Sample: {sample}")
            else:
                print(f"   ✅ {table_name}.{fk_column}: 0 references")
        except Exception as e:
            print(f"   ⚠️ Error checking {table_name}: {e}")

    # Check if foreign key enforcement is enabled
    cursor.execute("PRAGMA foreign_keys")
    fk_enabled = cursor.fetchone()[0]
    print(f"\n⚙️ Foreign key enforcement: {'ENABLED' if fk_enabled else 'DISABLED'}")

    conn.close()

if __name__ == "__main__":
    print("=== SQLITE CONSTRAINT ANALYSIS ===")
    check_sqlite_constraints()

    # Also show current user status
    try:
        user = User.objects.get(id=5)
        print(f"\n👤 User still exists: {user.email}")
    except User.DoesNotExist:
        print(f"\n✅ User ID 5 has been deleted")
