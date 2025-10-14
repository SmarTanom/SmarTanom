#!/usr/bin/env python
"""
Debug script to verify email sending in send_notification method
"""

import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import UserPreferences
from apps.notifications.models import NotificationPreferences
from apps.notifications.services import PushNotificationService

User = get_user_model()

def test_single_notification():
    """Test a single notification to verify email sending"""

    # Get admin user
    admin = User.objects.get(email='smartanom01@gmail.com')

    print("=" * 60)
    print("Testing Single Notification with Email")
    print("=" * 60)

    # Check preferences
    user_prefs = UserPreferences.objects.get(user=admin)
    notif_prefs = NotificationPreferences.objects.filter(user=admin).first()

    print(f"\n📊 Preferences:")
    print(f"   UserPreferences.email_notifications: {user_prefs.email_notifications}")
    print(f"   UserPreferences.push_notifications: {user_prefs.push_notifications}")
    if notif_prefs:
        print(f"   NotificationPreferences.email_enabled: {notif_prefs.email_enabled}")
    else:
        print(f"   NotificationPreferences: NOT FOUND")

    print(f"\n📤 Sending test notification...")

    try:
        result = PushNotificationService.send_notification(
            user=admin,
            title='🧪 Test Notification',
            message='This is a test to verify email sending works in send_notification method.',
            notification_type='info',
            icon='🧪',
            url='/test'
        )

        print(f"\n✅ Result: {result}")
        print(f"\n📧 Check logs/django.log for:")
        print(f"   - 'Email notification sent to {admin.email}: 🧪 Test Notification'")
        print(f"\n📬 Check inbox: {admin.email}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_single_notification()
