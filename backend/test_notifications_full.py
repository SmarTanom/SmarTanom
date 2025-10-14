#!/usr/bin/env python
"""
Comprehensive Notification Testing Script
Tests email and push notifications for all admin preference settings
"""

import os
import sys
import django
from colorama import init, Fore, Style

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from apps.accounts.models import UserPreferences
from apps.notifications.models import NotificationPreferences
from apps.notifications.services import NotificationService
from apps.devices.models import Device

init(autoreset=True)
User = get_user_model()

def print_header(text):
    print(f"\n{Fore.CYAN}{'=' * 80}")
    print(f"{Fore.CYAN}{text.center(80)}")
    print(f"{Fore.CYAN}{'=' * 80}\n")

def print_success(text):
    print(f"{Fore.GREEN}✓ {text}")

def print_error(text):
    print(f"{Fore.RED}✗ {text}")

def print_info(text):
    print(f"{Fore.YELLOW}ℹ {text}")

def print_warning(text):
    print(f"{Fore.MAGENTA}⚠ {text}")

class NotificationTester:
    """Comprehensive notification testing"""

    def __init__(self):
        self.admin_user = None
        self.test_device = None

    def setup(self):
        """Setup test user and device"""
        print_header("SETUP: Creating Test Environment")

        # Get or create admin user
        email = input(f"{Fore.CYAN}Enter admin email to test (or press Enter for 'admin@test.com'): ").strip()
        if not email:
            email = "admin@test.com"

        try:
            self.admin_user = User.objects.get(email=email)
            print_success(f"Using existing user: {email}")
        except User.DoesNotExist:
            print_error(f"User {email} not found. Creating...")
            self.admin_user = User.objects.create(
                email=email,
                username=email.split('@')[0],
                first_name='Test',
                last_name='Admin',
                is_staff=True,
                is_superuser=True
            )
            print_success(f"Created user: {email}")

        # Get or create UserPreferences (admin dashboard settings)
        user_prefs, created = UserPreferences.objects.get_or_create(
            user=self.admin_user,
            defaults={
                'email_notifications': True,
                'device_alerts': True,
                'system_updates': True,
                'weekly_reports': True
            }
        )
        if created:
            print_success("Created admin UserPreferences")
        else:
            print_info("Using existing admin UserPreferences")

        print_info(f"  Email Notifications: {user_prefs.email_notifications}")
        print_info(f"  Device Alerts: {user_prefs.device_alerts}")
        print_info(f"  System Updates: {user_prefs.system_updates}")
        print_info(f"  Weekly Reports: {user_prefs.weekly_reports}")

        # Get or create NotificationPreferences (actual notification delivery)
        notif_prefs, created = NotificationPreferences.objects.get_or_create(
            user=self.admin_user,
            defaults={
                'critical_alerts': True,
                'warnings': True,
                'info': True,
                'email_enabled': True
            }
        )
        if created:
            print_success("Created NotificationPreferences")
        else:
            print_info("Using existing NotificationPreferences")

        print_info(f"  Email Enabled: {notif_prefs.email_enabled}")
        print_info(f"  Critical Alerts: {notif_prefs.critical_alerts}")
        print_info(f"  Warnings: {notif_prefs.warnings}")
        print_info(f"  Info: {notif_prefs.info}")

        # Get or create a test device
        self.test_device = Device.objects.filter(
            bound_email=self.admin_user.email
        ).first()

        if not self.test_device:
            # Try to find an unbound device
            self.test_device = Device.objects.filter(is_bound=False).first()
            if self.test_device:
                # Bind it to the test user
                self.test_device.bound_email = self.admin_user.email
                self.test_device.is_bound = True
                self.test_device.save()
                print_success(f"Bound device {self.test_device.serial_number} to {email}")
            else:
                # Create a test device
                self.test_device = Device.objects.create(
                    serial_number=f"TEST-{self.admin_user.id}",
                    device_name=f"Test Device for {self.admin_user.email}",
                    location="Test Lab",
                    status=Device.Status.ACTIVE,
                    bound_email=self.admin_user.email,
                    is_bound=True
                )
                print_success(f"Created test device: {self.test_device.device_name}")
        else:
            print_info(f"Using existing device: {self.test_device.device_name}")

    def check_email_configuration(self):
        """Check Django email configuration"""
        print_header("EMAIL CONFIGURATION CHECK")

        print_info(f"Email Backend: {settings.EMAIL_BACKEND}")

        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            print_warning("Email backend is set to CONSOLE mode")
            print_warning("Emails will be printed to console, not actually sent")
        elif settings.EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend':
            print_success("Email backend is set to SMTP mode")
            print_info(f"  SMTP Host: {getattr(settings, 'EMAIL_HOST', 'Not set')}")
            print_info(f"  SMTP Port: {getattr(settings, 'EMAIL_PORT', 'Not set')}")
            print_info(f"  Use TLS: {getattr(settings, 'EMAIL_USE_TLS', 'Not set')}")
            print_info(f"  From Email: {getattr(settings, 'DEFAULT_FROM_EMAIL', 'Not set')}")
        else:
            print_info(f"Custom backend: {settings.EMAIL_BACKEND}")

        # Test basic email sending
        print(f"\n{Fore.CYAN}Testing basic email functionality...")
        try:
            send_mail(
                subject='[SmarTanom Test] Email Configuration Test',
                message='This is a test email to verify email configuration.',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@smartanom.com'),
                recipient_list=[self.admin_user.email],
                fail_silently=False,
            )
            print_success("Test email sent successfully!")
        except Exception as e:
            print_error(f"Failed to send test email: {e}")
            return False

        return True

    def test_device_alert_notification(self):
        """Test Device Alert notification (email + push)"""
        print_header("TEST 1: Device Alert Notification")

        user_prefs = UserPreferences.objects.get(user=self.admin_user)

        if not user_prefs.device_alerts:
            print_warning("Device Alerts are DISABLED in admin preferences")
            print_info("Skipping this test. Enable device_alerts in admin settings first.")
            return False

        print_info("Device Alerts are ENABLED in admin preferences")
        print(f"{Fore.CYAN}Sending test device alert...")

        try:
            result = NotificationService.send_device_alert(
                user=self.admin_user,
                device_id=self.test_device.id if self.test_device else None,
                alert_type='critical',
                alert_title='Critical Water Level Alert',
                alert_message=f'Water level in {self.test_device.device_name if self.test_device else "device"} has dropped below critical threshold (15%).',
                url='/dashboard'
            )

            if result.get('success'):
                print_success("Device alert notification sent!")
                print_info(f"  Push notifications sent: {result.get('push_sent', 0)}")
                print_info(f"  Email sent: {result.get('email_sent', False)}")

                if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                    print_warning("Check your terminal/console for the email content")
                else:
                    print_success(f"Check email inbox: {self.admin_user.email}")

                return True
            else:
                print_error("Failed to send device alert notification")
                print_error(f"Error: {result.get('error', 'Unknown error')}")
                return False

        except Exception as e:
            print_error(f"Exception while sending device alert: {e}")
            import traceback
            traceback.print_exc()
            return False

    def test_system_update_notification(self):
        """Test System Update notification"""
        print_header("TEST 2: System Update Notification")

        user_prefs = UserPreferences.objects.get(user=self.admin_user)

        if not user_prefs.system_updates:
            print_warning("System Updates are DISABLED in admin preferences")
            print_info("Skipping this test. Enable system_updates in admin settings first.")
            return False

        print_info("System Updates are ENABLED in admin preferences")
        print(f"{Fore.CYAN}Sending test system update notification...")

        try:
            result = NotificationService.send_device_alert(
                user=self.admin_user,
                device_id=None,  # System-wide notification
                alert_type='info',
                alert_title='System Update Available',
                alert_message='A new version of SmarTanom is available with performance improvements and bug fixes. Update now to get the latest features.',
                url='/settings'
            )

            if result.get('success'):
                print_success("System update notification sent!")
                print_info(f"  Push notifications sent: {result.get('push_sent', 0)}")
                print_info(f"  Email sent: {result.get('email_sent', False)}")

                if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                    print_warning("Check your terminal/console for the email content")
                else:
                    print_success(f"Check email inbox: {self.admin_user.email}")

                return True
            else:
                print_error("Failed to send system update notification")
                return False

        except Exception as e:
            print_error(f"Exception while sending system update: {e}")
            return False

    def test_email_notification_preference(self):
        """Test Email Notification preference"""
        print_header("TEST 3: Email Notification Preference Test")

        user_prefs = UserPreferences.objects.get(user=self.admin_user)

        if not user_prefs.email_notifications:
            print_warning("Email Notifications are DISABLED in admin preferences")
            print_info("Enabling temporarily for this test...")
            user_prefs.email_notifications = True
            user_prefs.save()

        print_info("Email Notifications are ENABLED")

        # Also check NotificationPreferences
        notif_prefs = NotificationPreferences.objects.get(user=self.admin_user)
        if not notif_prefs.email_enabled:
            print_warning("Email delivery is DISABLED in NotificationPreferences")
            print_info("Enabling temporarily for this test...")
            notif_prefs.email_enabled = True
            notif_prefs.save()

        print(f"{Fore.CYAN}Sending general email notification test...")

        try:
            result = NotificationService.send_device_alert(
                user=self.admin_user,
                device_id=self.test_device.id if self.test_device else None,
                alert_type='warning',
                alert_title='Email Notification Test',
                alert_message='This is a test notification to verify that email notifications are working correctly. If you receive this email, your email notification settings are configured properly.',
                url='/notifications'
            )

            if result.get('success'):
                print_success("Email notification test completed!")
                print_info(f"  Email sent: {result.get('email_sent', False)}")

                if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                    print_warning("Check your terminal/console for the email content")
                else:
                    print_success(f"Check email inbox: {self.admin_user.email}")

                return True
            else:
                print_error("Failed to send email notification")
                return False

        except Exception as e:
            print_error(f"Exception during email notification test: {e}")
            return False

    def test_weekly_report_simulation(self):
        """Simulate weekly report generation"""
        print_header("TEST 4: Weekly Report Simulation")

        user_prefs = UserPreferences.objects.get(user=self.admin_user)

        if not user_prefs.weekly_reports:
            print_warning("Weekly Reports are DISABLED in admin preferences")
            print_info("Skipping this test. Enable weekly_reports in admin settings first.")
            return False

        print_info("Weekly Reports are ENABLED in admin preferences")
        print(f"{Fore.CYAN}Simulating weekly report email...")

        try:
            # Use send_device_alert for now as a simulation
            # In production, you'd have a separate weekly report function
            result = NotificationService.send_device_alert(
                user=self.admin_user,
                device_id=None,
                alert_type='info',
                alert_title='Weekly System Activity Report',
                alert_message=f'''Your weekly SmarTanom report is ready!

Summary:
• Total Devices: {Device.objects.filter(bound_email=self.admin_user.email).count()}
• Active Devices: {Device.objects.filter(bound_email=self.admin_user.email, status=Device.Status.ACTIVE).count()}
• Alerts This Week: 12
• Average Water Level: 67%
• System Uptime: 99.8%

Visit your dashboard to see detailed analytics.''',
                url='/dashboard'
            )

            if result.get('success'):
                print_success("Weekly report notification sent!")
                print_info(f"  Email sent: {result.get('email_sent', False)}")

                if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                    print_warning("Check your terminal/console for the email content")
                else:
                    print_success(f"Check email inbox: {self.admin_user.email}")

                return True
            else:
                print_error("Failed to send weekly report")
                return False

        except Exception as e:
            print_error(f"Exception during weekly report test: {e}")
            return False

    def test_push_notification(self):
        """Test push notification functionality"""
        print_header("TEST 5: Push Notification Test")

        from apps.notifications.models import PushSubscription

        subscriptions = PushSubscription.objects.filter(user=self.admin_user, is_active=True)

        if not subscriptions.exists():
            print_warning("No active push subscriptions found for this user")
            print_info("To enable push notifications:")
            print_info("  1. Open the web app in your browser")
            print_info("  2. Allow notification permissions when prompted")
            print_info("  3. Click 'Enable Notifications' in settings")
            return False

        print_success(f"Found {subscriptions.count()} active push subscription(s)")

        print(f"{Fore.CYAN}Sending test push notification...")

        try:
            result = NotificationService.send_device_alert(
                user=self.admin_user,
                device_id=self.test_device.id if self.test_device else None,
                alert_type='info',
                alert_title='Push Notification Test',
                alert_message='This is a test push notification. If you see this, push notifications are working!',
                url='/notifications'
            )

            if result.get('success'):
                print_success("Push notification sent!")
                print_info(f"  Subscriptions notified: {result.get('push_sent', 0)}")
                print_success("Check your browser/device for the notification")
                return True
            else:
                print_error("Failed to send push notification")
                return False

        except Exception as e:
            print_error(f"Exception during push notification test: {e}")
            return False

    def display_current_settings(self):
        """Display current notification settings"""
        print_header("CURRENT NOTIFICATION SETTINGS")

        user_prefs = UserPreferences.objects.get(user=self.admin_user)
        notif_prefs = NotificationPreferences.objects.get(user=self.admin_user)

        print(f"{Fore.CYAN}Admin Dashboard Preferences (UserPreferences):")
        print(f"  Email Notifications: {Fore.GREEN if user_prefs.email_notifications else Fore.RED}{user_prefs.email_notifications}")
        print(f"  Device Alerts: {Fore.GREEN if user_prefs.device_alerts else Fore.RED}{user_prefs.device_alerts}")
        print(f"  System Updates: {Fore.GREEN if user_prefs.system_updates else Fore.RED}{user_prefs.system_updates}")
        print(f"  Weekly Reports: {Fore.GREEN if user_prefs.weekly_reports else Fore.RED}{user_prefs.weekly_reports}")

        print(f"\n{Fore.CYAN}Notification Delivery Settings (NotificationPreferences):")
        print(f"  Email Enabled: {Fore.GREEN if notif_prefs.email_enabled else Fore.RED}{notif_prefs.email_enabled}")
        print(f"  Critical Alerts: {Fore.GREEN if notif_prefs.critical_alerts else Fore.RED}{notif_prefs.critical_alerts}")
        print(f"  Warnings: {Fore.GREEN if notif_prefs.warnings else Fore.RED}{notif_prefs.warnings}")
        print(f"  Info: {Fore.GREEN if notif_prefs.info else Fore.RED}{notif_prefs.info}")

    def run_all_tests(self):
        """Run all notification tests"""
        print_header("SMARTANOM NOTIFICATION TESTING SUITE")
        print_info("This script will test all notification features")
        print_info("Make sure your admin settings are configured correctly")

        self.setup()

        if not self.check_email_configuration():
            print_error("\n❌ Email configuration check failed!")
            print_info("Fix email settings before continuing")
            return False

        self.display_current_settings()

        results = {
            'Device Alert': self.test_device_alert_notification(),
            'System Update': self.test_system_update_notification(),
            'Email Notification': self.test_email_notification_preference(),
            'Weekly Report': self.test_weekly_report_simulation(),
            'Push Notification': self.test_push_notification(),
        }

        # Summary
        print_header("TEST SUMMARY")

        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for test_name, result in results.items():
            if result:
                print_success(f"{test_name}: PASSED")
            else:
                print_warning(f"{test_name}: SKIPPED or FAILED (check settings)")

        print(f"\n{Fore.CYAN}Total: {passed}/{total} tests passed")

        if passed == total:
            print(f"\n{Fore.GREEN}{'=' * 80}")
            print(f"{Fore.GREEN}ALL TESTS PASSED! ✓")
            print(f"{Fore.GREEN}{'=' * 80}\n")
            return True
        elif passed > 0:
            print(f"\n{Fore.YELLOW}{'=' * 80}")
            print(f"{Fore.YELLOW}PARTIAL SUCCESS - Some features may be disabled")
            print(f"{Fore.YELLOW}{'=' * 80}\n")
            return True
        else:
            print(f"\n{Fore.RED}{'=' * 80}")
            print(f"{Fore.RED}ALL TESTS FAILED OR SKIPPED! ✗")
            print(f"{Fore.RED}{'=' * 80}\n")
            return False


if __name__ == '__main__':
    tester = NotificationTester()
    success = tester.run_all_tests()

    sys.exit(0 if success else 1)
