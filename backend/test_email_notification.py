"""
Test Email Notification Script
Run this to test if email notifications are working correctly.

Usage:
    cd backend
    .\.venv\Scripts\activate
    python test_email_notification.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.accounts.models import User
from apps.notifications.models import NotificationPreferences
from apps.notifications.services import PushNotificationService


def test_email_notification():
    """Test email notification for a user."""

    print("=" * 60)
    print("SmarTanom Email Notification Test")
    print("=" * 60)

    # Get user email from input
    email = input("\nEnter user email to test (or press Enter for reyfoxconner@gmail.com): ").strip()
    if not email:
        email = 'reyfoxconner@gmail.com'

    # Get user
    try:
        user = User.objects.get(email=email)
        print(f"✓ User found: {user.full_name or user.email}")
    except User.DoesNotExist:
        print(f"✗ User not found: {email}")
        return

    # Check notification preferences
    try:
        prefs = NotificationPreferences.objects.get(user=user)
        print(f"✓ Notification preferences found")
        print(f"  - Email enabled: {prefs.email_enabled}")
        print(f"  - Critical alerts: {prefs.critical_alerts}")
        print(f"  - Warnings: {prefs.warnings}")
        print(f"  - Info: {prefs.info}")

        if not prefs.email_enabled:
            print("\n⚠️  WARNING: Email notifications are DISABLED for this user!")
            enable = input("Enable email notifications? (y/n): ").strip().lower()
            if enable == 'y':
                prefs.email_enabled = True
                prefs.save()
                print("✓ Email notifications enabled")
            else:
                print("Test cancelled - email notifications are disabled")
                return

    except NotificationPreferences.DoesNotExist:
        print("✗ Notification preferences not found, creating defaults...")
        prefs = NotificationPreferences.objects.create(
            user=user,
            email_enabled=True,
            critical_alerts=True,
            warnings=True,
            info=True
        )
        print("✓ Created notification preferences with email enabled")

    # Check email backend configuration
    from django.conf import settings
    print(f"\n📧 Email Backend: {settings.EMAIL_BACKEND}")
    if 'console' in settings.EMAIL_BACKEND.lower():
        print("   (Console backend - emails will print to terminal)")
    else:
        print(f"   SMTP Host: {settings.EMAIL_HOST}")
        print(f"   SMTP Port: {settings.EMAIL_PORT}")
        print(f"   From Email: {settings.DEFAULT_FROM_EMAIL}")

    # Send test alert
    print("\n" + "=" * 60)
    print("Sending test alert notification...")
    print("=" * 60)

    alert_types = [
        ('critical', 'Critical pH Level', 'Your pH level is critically low (4.8). Immediate action required!'),
        ('warning', 'High Temperature Warning', 'Water temperature is higher than optimal (28°C). Please monitor closely.'),
        ('info', 'Nutrient Level Update', 'Your nutrient solution has been topped up successfully.')
    ]

    print("\nSelect alert type:")
    for i, (atype, title, msg) in enumerate(alert_types, 1):
        print(f"  {i}. {atype.upper()}: {title}")

    choice = input("\nEnter choice (1-3) or press Enter for option 1: ").strip()
    if not choice:
        choice = '1'

    try:
        alert_type, alert_title, alert_message = alert_types[int(choice) - 1]
    except (ValueError, IndexError):
        alert_type, alert_title, alert_message = alert_types[0]

    print(f"\nSending {alert_type.upper()} alert...")
    print(f"Title: {alert_title}")
    print(f"Message: {alert_message}")

    try:
        result = PushNotificationService.send_alert_notification(
            user=user,
            alert_title=alert_title,
            alert_message=alert_message,
            alert_type=alert_type,
            device_id=1
        )

        print("\n" + "=" * 60)
        print("✓ Alert sent successfully!")
        print("=" * 60)
        print(f"Push notifications sent: {result.get('sent', 0)}")
        print(f"Push notifications failed: {result.get('failed', 0)}")

        if 'console' in settings.EMAIL_BACKEND.lower():
            print("\n📧 Check your terminal/console for the email content above!")
        else:
            print(f"\n📧 Check email inbox for: {user.email}")
            print("   (Check spam folder if not received)")

    except Exception as e:
        print("\n" + "=" * 60)
        print("✗ Error sending alert!")
        print("=" * 60)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    try:
        test_email_notification()
    except KeyboardInterrupt:
        print("\n\nTest cancelled by user")
    except Exception as e:
        print(f"\n\n✗ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
