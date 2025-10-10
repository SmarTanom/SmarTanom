#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

# Force delete using raw SQL if needed
def force_delete_user(user_id):
    """Force delete a user using transaction and raw SQL if needed."""
    try:
        with transaction.atomic():
            user = User.objects.get(id=user_id)
            email = user.email

            # Use Django's deletion system with atomic transaction
            user.delete()
            print(f"✅ Successfully deleted user: {email}")
            return True

    except Exception as e:
        print(f"❌ Standard delete failed: {e}")

        # If standard delete fails, try using filter().delete()
        try:
            with transaction.atomic():
                deleted_count = User.objects.filter(id=user_id).delete()
                print(f"✅ Force deleted user via queryset: {deleted_count}")
                return True

        except Exception as e2:
            print(f"❌ Force delete also failed: {e2}")
            return False

if __name__ == "__main__":
    print("=== FORCE DELETE USER ===")
    user_id = 5
    success = force_delete_user(user_id)

    if success:
        print(f"\n🎉 User {user_id} deleted!")

        # Show remaining users
        print(f"\n👥 Remaining users:")
        for user in User.objects.all():
            print(f"   - ID: {user.id} | Email: {user.email}")
    else:
        print(f"\n💥 Could not delete user {user_id}")
        print(f"Use the Django admin safe delete action instead.")
