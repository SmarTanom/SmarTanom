#!/usr/bin/env python
"""
Simple Notification Testing Script
Tests email notifications for all admin preference types
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.conf import settings
from apps.accounts.models import UserPreferences
from apps.notifications.models import NotificationPreferences
from apps.notifications.services import PushNotificationService
from apps.devices.models import Device

User = get_user_model()

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_notifications():
    """Test all notification types"""

    print_section("🔧 NOTIFICATION SYSTEM TEST")

    # Check email configuration
    print("📧 Email Backend:", settings.EMAIL_BACKEND)
    if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        print("⚠️  Using CONSOLE email backend - emails will print to terminal")
    else:
        print("✅ Using SMTP email backend")
        print(f"   Host: {settings.EMAIL_HOST}")
        print(f"   Port: {settings.EMAIL_PORT}")

    # Get or create test admin user
    print_section("👤 Setting up test user")

    email = input("Enter admin email (or press Enter for 'admin@smartanom.local'): ").strip()
    if not email:
        email = "admin@smartanom.local"

    try:
        admin = User.objects.get(email=email)
        print(f"✅ Found user: {email}")
    except User.DoesNotExist:
        print(f"❌ User {email} not found. Creating...")
        admin = User.objects.create_user(
            email=email,
            username=email.split('@')[0],
            first_name='Test',
            last_name='Admin',
            is_staff=True
        )
        print(f"✅ Created user: {email}")

    # Ensure UserPreferences exist (admin dashboard settings)
    user_prefs, created = UserPreferences.objects.get_or_create(
        user=admin,
        defaults={
            'email_notifications': True,
            'push_notifications': True,
            'device_alerts': True,
            'system_updates': True,
            'weekly_reports': True
        }
    )

    if created:
        print("✅ Created UserPreferences")

    print(f"\n📊 Admin Dashboard Preferences:")
    print(f"   Email Notifications: {user_prefs.email_notifications}")
    print(f"   Push Notifications: {user_prefs.push_notifications}")
    print(f"   Device Alerts: {user_prefs.device_alerts}")
    print(f"   System Updates: {user_prefs.system_updates}")
    print(f"   Weekly Reports: {user_prefs.weekly_reports}")    # Ensure NotificationPreferences exist (actual delivery settings)
    notif_prefs, created = NotificationPreferences.objects.get_or_create(
        user=admin,
        defaults={
            'email_enabled': True,
            'critical_alerts': True,
            'warnings': True,
            'info': True
        }
    )

    if created:
        print("✅ Created NotificationPreferences")

    print(f"\n📧 Email Delivery Preferences:")
    print(f"   Email Enabled: {notif_prefs.email_enabled}")
    print(f"   Critical Alerts: {notif_prefs.critical_alerts}")
    print(f"   Warnings: {notif_prefs.warnings}")
    print(f"   Info: {notif_prefs.info}")

    # Get or create test device
    device = None
    if Device.objects.filter(bound_email=admin.email).exists():
        device = Device.objects.filter(bound_email=admin.email).first()
        print(f"\n✅ Using existing device: {device.device_name}")
    else:
        print("\n⚠️  No devices found for this user")

    # Test 1: Device Alert
    print_section("TEST 1: Device Alert Notification")
    if user_prefs.device_alerts:
        print("✅ Device Alerts enabled in admin dashboard")
        print("📤 Sending device alert...")

        PushNotificationService.send_alert_notification(
            user=admin,
            alert_title='Low pH Level Detected',
            alert_message='The pH level in your reservoir has dropped below safe threshold (5.2). Immediate attention required.',
            alert_type='warning',
            device_id=device.id if device else None
        )

        print("✅ Device alert sent! Check your email (or console if using console backend)")
    else:
        print("⚠️  Device Alerts disabled in admin dashboard - skipping")

    # Test 2: System Update
    print_section("TEST 2: System Update Notification")
    if user_prefs.system_updates:
        print("✅ System Updates enabled in admin dashboard")
        print("📤 Sending system update...")

        PushNotificationService.send_notification(
            user=admin,
            title='System Maintenance Scheduled',
            message='SmarTanom will undergo scheduled maintenance on Dec 25, 2024 from 2:00 AM to 4:00 AM. All services will be temporarily unavailable.',
            notification_type='info',
            icon='🔧',
            url='/system/status'
        )

        print("✅ System update sent! Check your email (or console)")
    else:
        print("⚠️  System Updates disabled in admin dashboard - skipping")

    # Test 3: General Email Notification
    print_section("TEST 3: General Email Notification")
    if user_prefs.email_notifications:
        print("✅ Email Notifications enabled in admin dashboard")
        print("📤 Sending general notification...")

        PushNotificationService.send_notification(
            user=admin,
            title='Welcome to SmarTanom Enhanced Notifications',
            message='Your notification preferences have been updated. You will now receive timely alerts about your devices, system updates, and weekly reports.',
            notification_type='success',
            icon='🎉',
            url='/admin/settings'
        )

        print("✅ General notification sent! Check your email (or console)")
    else:
        print("⚠️  Email Notifications disabled in admin dashboard - skipping")

    # Test 4: Weekly Report
    print_section("TEST 4: Weekly Report Notification")
    if user_prefs.weekly_reports:
        print("✅ Weekly Reports enabled in admin dashboard")
        print("📤 Sending weekly report...")

        weekly_message = """
📊 Your Weekly SmarTanom Summary

🌱 Total Devices: 3 active
📈 Total Readings: 168 recorded
⚠️ Alerts Generated: 2 warnings

Top Performing Device: Hydro-Tank-A (98% uptime)
Needs Attention: Reservoir-B (pH trending low)

Full report available in your dashboard.
        """.strip()

        PushNotificationService.send_notification(
            user=admin,
            title='📊 Your Weekly SmarTanom Report',
            message=weekly_message,
            notification_type='info',
            icon='📈',
            url='/reports/weekly'
        )

        print("✅ Weekly report sent! Check your email (or console)")
    else:
        print("⚠️  Weekly Reports disabled in admin dashboard - skipping")

    # Test 5: Admin Notification for ALL Devices
    print_section("TEST 5: Admin Notification for ALL Devices")
    print("✨ This test demonstrates that admins receive alerts from ALL devices")
    print("   (not just devices they own)")

    # Count total devices in system
    total_devices = Device.objects.count()
    print(f"\n📱 Total devices in system: {total_devices}")
    print(f"📧 Admin user: {admin.email} (is_staff: {admin.is_staff})")

    if user_prefs.device_alerts:
        print("\n📤 Sending system-wide device alert to all admins...")

        PushNotificationService.send_to_all_admins(
            title='🚨 System-Wide Device Alert',
            message=f'Critical alert detected across multiple devices. Total devices monitored: {total_devices}. Immediate investigation required.',
            notification_type='critical',
            icon='🚨',
            url='/admin/devices'
        )

        print("✅ System-wide alert sent to all admin users!")
        print("   - Admins with device_alerts=True will receive this")
        print("   - Admins with push_notifications=True will get push notifications")
        print("   - Admins with email_notifications=True will get emails")
    else:
        print("⚠️  Device Alerts disabled for this admin - skipping")

    # Summary
    print_section("📊 TEST SUMMARY")
    print("✅ All enabled notification types have been tested")
    print("\n🔍 What to check:")
    print("   1. If using console backend - check terminal output above")
    print("   2. If using SMTP - check the admin's email inbox")
    print("   3. Verify email formatting (HTML + plain text versions)")
    print("   4. Check that alert links work correctly")
    print("   5. Verify admin receives alerts from ALL devices (Test 5)")

    print("\n💡 Note:")
    print("   - UserPreferences control admin dashboard toggles")
    print("   - NotificationPreferences control actual email delivery")
    print("   - Both must be enabled for emails to send")
    print("   - push_notifications toggle controls browser push notifications")
    print("   - Admins with device_alerts=True receive ALL device alerts")

    print("\n✅ Test complete!\n")

if __name__ == '__main__':
    try:
        test_notifications()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user\n")
    except Exception as e:
        print(f"\n\n❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
