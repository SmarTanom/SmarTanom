"""
Preview email content without sending
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.template.loader import render_to_string
from django.utils import timezone
from django.conf import settings

# Prepare context for each alert type
alert_types = [
    {
        'name': 'CRITICAL',
        'type': 'critical',
        'title': 'Critical pH Level',
        'message': 'Your pH level is critically low (4.8). Immediate action required!'
    },
    {
        'name': 'WARNING',
        'type': 'warning',
        'title': 'High Temperature Warning',
        'message': 'Water temperature is higher than optimal (28°C). Please monitor closely.'
    },
    {
        'name': 'INFO',
        'type': 'info',
        'title': 'Nutrient Level Update',
        'message': 'Your nutrient solution has been topped up successfully.'
    }
]

print("="*60)
print("EMAIL CONTENT PREVIEW")
print("="*60)

for alert in alert_types:
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://smartanom.com')
    alert_url = f"{frontend_url}/alerts?device=1"

    context = {
        'user_name': 'Javy Rodillon',
        'alert_title': alert['title'],
        'alert_message': alert['message'],
        'alert_type': alert['type'],
        'device_name': 'Device 1',
        'timestamp': timezone.now().strftime('%B %d, %Y at %I:%M %p'),
        'alert_url': alert_url,
        'settings_url': f"{frontend_url}/profile/notifications",
        'website_url': frontend_url,
        'support_url': f"{frontend_url}/support",
        'unsubscribe_url': f"{frontend_url}/profile/notifications",
    }

    print(f"\n{'='*60}")
    print(f"{alert['name']} ALERT - TEXT VERSION")
    print('='*60)

    try:
        text_content = render_to_string('emails/alert_notification.txt', context)
        print(text_content)
    except Exception as e:
        print(f"ERROR rendering text template: {e}")

    print(f"\n{'='*60}")
    print(f"{alert['name']} ALERT - HTML EXISTS?")
    print('='*60)

    try:
        html_content = render_to_string('emails/alert_notification.html', context)
        print(f"✓ HTML template rendered successfully ({len(html_content)} bytes)")
        print(f"✓ Contains 'SmarTanom': {'SmarTanom' in html_content}")
        print(f"✓ Contains alert title: {alert['title'] in html_content}")
        print(f"✓ Contains alert type: {alert['type'] in html_content}")
    except Exception as e:
        print(f"✗ ERROR rendering HTML template: {e}")
        import traceback
        traceback.print_exc()

print(f"\n{'='*60}")
print("Check your email inbox for all 3 alerts!")
print("If not in inbox, check SPAM/JUNK folder")
print('='*60)
