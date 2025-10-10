#!/usr/bin/env python
"""
Quick script to set admin password for SmarTanom
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model

def set_admin_password():
    User = get_user_model()

    # Get the admin user
    admin_user = User.objects.filter(is_superuser=True).first()

    if not admin_user:
        print("❌ No superuser found!")
        print("Create one with: python manage.py createsuperuser")
        return

    # Set the password
    password = "smartanomadmin4r1"
    admin_user.set_password(password)
    admin_user.save()

    print(f"✅ Password updated for admin user: {admin_user.email}")
    print(f"🔑 New password: {password}")
    print("🌐 Login at: http://127.0.0.1:8000/admin/")

if __name__ == "__main__":
    set_admin_password()
