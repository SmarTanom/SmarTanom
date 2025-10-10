#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import OTPCode, LoginAttempt

User = get_user_model()

def safe_delete_user(user_id):
    """Safely delete a user and related data."""
    try:
        user = User.objects.get(id=user_id)
        print(f"🎯 Deleting user: {user.email} (ID: {user_id})")

        # Clean up OTP codes for this email
        otp_codes = OTPCode.objects.filter(email=user.email)
        if otp_codes.exists():
            count = otp_codes.count()
            otp_codes.delete()
            print(f"   ✅ Deleted {count} OTP codes")

        # Clean up login attempts for this email
        login_attempts = LoginAttempt.objects.filter(email=user.email)
        if login_attempts.exists():
            count = login_attempts.count()
            login_attempts.delete()
            print(f"   ✅ Deleted {count} login attempts")

        # Delete the user (devices should cascade)
        user.delete()
        print(f"   ✅ User deleted successfully")

        return True

    except User.DoesNotExist:
        print(f"❌ User with ID {user_id} not found")
        return False
    except Exception as e:
        print(f"❌ Error deleting user: {e}")
        return False

if __name__ == "__main__":
    print("=== SAFE USER DELETION ===")

    # Try to delete user ID 5
    user_id = 5
    success = safe_delete_user(user_id)

    if success:
        print(f"\n🎉 User ID {user_id} deleted successfully!")
    else:
        print(f"\n💥 Failed to delete user ID {user_id}")

    # Show remaining users
    print(f"\n👥 Remaining users:")
    for user in User.objects.all():
        devices_count = user.new_devices.count()
        print(f"   - ID: {user.id} | Email: {user.email} | Devices: {devices_count}")
