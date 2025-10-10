#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.contrib.auth.models import Group, Permission
from django.contrib.admin.models import LogEntry
from rest_framework.authtoken.models import Token

User = get_user_model()

def check_all_references(user_id):
    """Check all possible foreign key references to the user."""
    try:
        user = User.objects.get(id=user_id)
        print(f"🔍 Checking references for user: {user.email} (ID: {user_id})")

        # Check Django built-in models
        print(f"\n📝 Django Built-in References:")

        # Auth tokens
        tokens = Token.objects.filter(user=user)
        print(f"   - Auth Tokens: {tokens.count()}")
        if tokens.exists():
            tokens.delete()
            print(f"     ✅ Deleted auth tokens")

        # Admin log entries
        log_entries = LogEntry.objects.filter(user=user)
        print(f"   - Admin Log Entries: {log_entries.count()}")
        if log_entries.exists():
            log_entries.delete()
            print(f"     ✅ Deleted admin log entries")

        # User groups
        user_groups = user.groups.all()
        print(f"   - User Groups: {user_groups.count()}")
        if user_groups.exists():
            user.groups.clear()
            print(f"     ✅ Cleared user groups")

        # User permissions
        user_permissions = user.user_permissions.all()
        print(f"   - User Permissions: {user_permissions.count()}")
        if user_permissions.exists():
            user.user_permissions.clear()
            print(f"     ✅ Cleared user permissions")

        # Check sessions (these don't have FK to user but let's check)
        print(f"   - Active Sessions: {Session.objects.count()} total")

        # Now try to delete the user
        print(f"\n🎯 Attempting user deletion...")
        user.delete()
        print(f"   ✅ User deleted successfully!")
        return True

    except User.DoesNotExist:
        print(f"❌ User with ID {user_id} not found")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=== COMPREHENSIVE USER REFERENCE CHECK ===")

    user_id = 5
    success = check_all_references(user_id)

    if success:
        print(f"\n🎉 User ID {user_id} successfully deleted!")
    else:
        print(f"\n💥 User ID {user_id} could not be deleted")

        # If still failing, let's check the database directly
        print(f"\n🔧 TROUBLESHOOTING:")
        print(f"1. Try deleting from Django admin one-by-one instead of bulk delete")
        print(f"2. Check for any custom foreign keys in your models")
        print(f"3. This might be a SQLite constraint timing issue")
        print(f"4. Consider using User.objects.filter(id={user_id}).delete() instead")
