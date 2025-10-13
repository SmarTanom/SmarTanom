"""
Test all alert types (Critical, Warning, Info)
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.accounts.models import User
from apps.notifications.models import NotificationPreferences
from apps.notifications.services import PushNotificationService

# Get user
user = User.objects.get(email='reyfoxconner@gmail.com')
print(f"Testing alerts for: {user.email}")

# Check preferences
prefs = NotificationPreferences.objects.get(user=user)
print(f"\nPreferences:")
print(f"  Critical: {prefs.critical_alerts}")
print(f"  Warnings: {prefs.warnings}")
print(f"  Info: {prefs.info}")
print(f"  Email: {prefs.email_enabled}")

# Test all alert types
alert_types = [
    ('critical', 'Critical pH Level', 'Your pH level is critically low (4.8). Immediate action required!'),
    ('warning', 'High Temperature Warning', 'Water temperature is higher than optimal (28°C). Please monitor closely.'),
    ('info', 'Nutrient Level Update', 'Your nutrient solution has been topped up successfully.')
]

print("\n" + "="*60)
print("SENDING TEST ALERTS")
print("="*60)

for alert_type, title, message in alert_types:
    print(f"\n[{alert_type.upper()}] Sending: {title}")
    try:
        result = PushNotificationService.send_alert_notification(
            user=user,
            alert_title=title,
            alert_message=message,
            alert_type=alert_type,
            device_id=1
        )
        print(f"  ✓ Push: {result.get('sent', 0)} sent, {result.get('failed', 0)} failed")
        if result.get('skipped'):
            print(f"  ⚠ Skipped due to user preferences")
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "="*60)
print("DONE - Check your email inbox!")
print("="*60)
