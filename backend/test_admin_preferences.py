#!/usr/bin/env python
"""
Test script for Admin Settings functionality
Tests all notification preferences and appearance settings
"""

import os
import sys
import django
import json
from colorama import init, Fore, Style

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import UserPreferences
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

init(autoreset=True)  # Initialize colorama

User = get_user_model()

def print_header(text):
    """Print formatted header"""
    print(f"\n{Fore.CYAN}{'=' * 80}")
    print(f"{Fore.CYAN}{text.center(80)}")
    print(f"{Fore.CYAN}{'=' * 80}\n")

def print_success(text):
    """Print success message"""
    print(f"{Fore.GREEN}✓ {text}")

def print_error(text):
    """Print error message"""
    print(f"{Fore.RED}✗ {text}")

def print_info(text):
    """Print info message"""
    print(f"{Fore.YELLOW}ℹ {text}")

def print_data(label, data):
    """Print formatted data"""
    print(f"{Fore.MAGENTA}{label}:")
    print(f"{Fore.WHITE}{json.dumps(data, indent=2)}")

class AdminPreferencesTest:
    """Test suite for admin preferences"""

    def __init__(self):
        self.client = APIClient()
        self.admin_user = None
        self.token = None

    def setup(self):
        """Setup test user and authentication"""
        print_header("SETUP: Creating Test Admin User")

        # Get or create admin user
        email = "admin@test.com"
        self.admin_user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': 'testadmin',
                'first_name': 'Test',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True
            }
        )

        if not created:
            self.admin_user.is_staff = True
            self.admin_user.is_superuser = True
            self.admin_user.save()
            print_info(f"Using existing admin user: {email}")
        else:
            print_success(f"Created new admin user: {email}")

        # Get or create preferences
        prefs, created = UserPreferences.objects.get_or_create(
            user=self.admin_user,
            defaults={
                'email_notifications': True,
                'device_alerts': True,
                'system_updates': False,
                'weekly_reports': True,
                'two_factor_enabled': False,
                'session_timeout': 30,
                'dark_mode': False,
                'font_size': 'medium'
            }
        )

        if created:
            print_success("Created new preferences")
        else:
            print_info("Using existing preferences")

        # Get or create token
        self.token, created = Token.objects.get_or_create(user=self.admin_user)
        print_success(f"Auth token: {self.token.key[:10]}...")

        # Set authentication
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_get_profile(self):
        """Test GET /api/admin/dashboard/profile/"""
        print_header("TEST 1: Get Admin Profile")

        try:
            response = self.client.get('/api/admin/dashboard/profile/')

            if response.status_code == 200:
                print_success(f"Status: {response.status_code} OK")
                data = response.json()

                print_data("User Data", data.get('user', {}))
                print_data("Preferences", data.get('preferences', {}))

                # Verify preferences exist
                prefs = data.get('preferences', {})
                required_fields = [
                    'email_notifications', 'device_alerts', 'system_updates',
                    'weekly_reports', 'two_factor_enabled', 'session_timeout',
                    'dark_mode', 'font_size'
                ]

                for field in required_fields:
                    if field in prefs:
                        print_success(f"Field '{field}' present: {prefs[field]}")
                    else:
                        print_error(f"Field '{field}' MISSING")

                return True
            else:
                print_error(f"Status: {response.status_code}")
                print_error(f"Response: {response.content.decode()}")
                return False

        except Exception as e:
            print_error(f"Exception: {str(e)}")
            return False

    def test_update_notifications(self):
        """Test updating notification preferences"""
        print_header("TEST 2: Update Notification Preferences")

        tests = [
            ('email_notifications', False, "Email Notifications OFF"),
            ('email_notifications', True, "Email Notifications ON"),
            ('device_alerts', False, "Device Alerts OFF"),
            ('device_alerts', True, "Device Alerts ON"),
            ('system_updates', True, "System Updates ON"),
            ('system_updates', False, "System Updates OFF"),
            ('weekly_reports', False, "Weekly Reports OFF"),
            ('weekly_reports', True, "Weekly Reports ON"),
        ]

        all_passed = True

        for key, value, description in tests:
            print(f"\n{Fore.CYAN}Testing: {description}")
            try:
                response = self.client.patch(
                    '/api/admin/dashboard/update_preferences/',
                    {key: value},
                    format='json'
                )

                if response.status_code == 200:
                    data = response.json()
                    saved_value = data.get('preferences', {}).get(key)

                    if saved_value == value:
                        print_success(f"✓ {key} = {value} (SAVED)")
                    else:
                        print_error(f"✗ {key} expected {value}, got {saved_value}")
                        all_passed = False

                    # Verify in database
                    prefs = UserPreferences.objects.get(user=self.admin_user)
                    db_value = getattr(prefs, key)

                    if db_value == value:
                        print_success(f"✓ Verified in database: {db_value}")
                    else:
                        print_error(f"✗ Database mismatch: expected {value}, got {db_value}")
                        all_passed = False

                else:
                    print_error(f"Status: {response.status_code}")
                    print_error(f"Response: {response.content.decode()}")
                    all_passed = False

            except Exception as e:
                print_error(f"Exception: {str(e)}")
                all_passed = False

        return all_passed

    def test_update_appearance(self):
        """Test updating appearance preferences"""
        print_header("TEST 3: Update Appearance Settings")

        tests = [
            ('dark_mode', True, "Dark Mode ON"),
            ('dark_mode', False, "Dark Mode OFF"),
            ('font_size', 'small', "Font Size: Small"),
            ('font_size', 'large', "Font Size: Large"),
            ('font_size', 'medium', "Font Size: Medium"),
        ]

        all_passed = True

        for key, value, description in tests:
            print(f"\n{Fore.CYAN}Testing: {description}")
            try:
                response = self.client.patch(
                    '/api/admin/dashboard/update_preferences/',
                    {key: value},
                    format='json'
                )

                if response.status_code == 200:
                    data = response.json()
                    saved_value = data.get('preferences', {}).get(key)

                    if saved_value == value:
                        print_success(f"✓ {key} = {value} (SAVED)")
                    else:
                        print_error(f"✗ {key} expected {value}, got {saved_value}")
                        all_passed = False

                    # Verify in database
                    prefs = UserPreferences.objects.get(user=self.admin_user)
                    db_value = getattr(prefs, key)

                    if db_value == value:
                        print_success(f"✓ Verified in database: {db_value}")
                    else:
                        print_error(f"✗ Database mismatch: expected {value}, got {db_value}")
                        all_passed = False

                else:
                    print_error(f"Status: {response.status_code}")
                    print_error(f"Response: {response.content.decode()}")
                    all_passed = False

            except Exception as e:
                print_error(f"Exception: {str(e)}")
                all_passed = False

        return all_passed

    def test_update_security(self):
        """Test updating security preferences"""
        print_header("TEST 4: Update Security Settings")

        tests = [
            ('two_factor_enabled', True, "Two-Factor: ON"),
            ('two_factor_enabled', False, "Two-Factor: OFF"),
            ('session_timeout', 15, "Session: 15 min"),
            ('session_timeout', 60, "Session: 60 min"),
            ('session_timeout', 30, "Session: 30 min"),
        ]

        all_passed = True

        for key, value, description in tests:
            print(f"\n{Fore.CYAN}Testing: {description}")
            try:
                response = self.client.patch(
                    '/api/admin/dashboard/update_preferences/',
                    {key: value},
                    format='json'
                )

                if response.status_code == 200:
                    data = response.json()
                    saved_value = data.get('preferences', {}).get(key)

                    if saved_value == value:
                        print_success(f"✓ {key} = {value} (SAVED)")
                    else:
                        print_error(f"✗ {key} expected {value}, got {saved_value}")
                        all_passed = False

                    # Verify in database
                    prefs = UserPreferences.objects.get(user=self.admin_user)
                    db_value = getattr(prefs, key)

                    if db_value == value:
                        print_success(f"✓ Verified in database: {db_value}")
                    else:
                        print_error(f"✗ Database mismatch: expected {value}, got {db_value}")
                        all_passed = False

                else:
                    print_error(f"Status: {response.status_code}")
                    print_error(f"Response: {response.content.decode()}")
                    all_passed = False

            except Exception as e:
                print_error(f"Exception: {str(e)}")
                all_passed = False

        return all_passed

    def test_final_state(self):
        """Test final state of all preferences"""
        print_header("TEST 5: Verify Final State")

        try:
            prefs = UserPreferences.objects.get(user=self.admin_user)

            print_info("Current Preferences in Database:")
            print(f"{Fore.MAGENTA}Email Notifications: {Fore.WHITE}{prefs.email_notifications}")
            print(f"{Fore.MAGENTA}Device Alerts: {Fore.WHITE}{prefs.device_alerts}")
            print(f"{Fore.MAGENTA}System Updates: {Fore.WHITE}{prefs.system_updates}")
            print(f"{Fore.MAGENTA}Weekly Reports: {Fore.WHITE}{prefs.weekly_reports}")
            print(f"{Fore.MAGENTA}Two-Factor Enabled: {Fore.WHITE}{prefs.two_factor_enabled}")
            print(f"{Fore.MAGENTA}Session Timeout: {Fore.WHITE}{prefs.session_timeout} min")
            print(f"{Fore.MAGENTA}Dark Mode: {Fore.WHITE}{prefs.dark_mode}")
            print(f"{Fore.MAGENTA}Font Size: {Fore.WHITE}{prefs.font_size}")

            # Also test via API
            response = self.client.get('/api/admin/dashboard/profile/')

            if response.status_code == 200:
                api_prefs = response.json().get('preferences', {})
                print(f"\n{Fore.YELLOW}Comparing API vs Database:")

                fields = [
                    'email_notifications', 'device_alerts', 'system_updates',
                    'weekly_reports', 'two_factor_enabled', 'session_timeout',
                    'dark_mode', 'font_size'
                ]

                all_match = True
                for field in fields:
                    db_val = getattr(prefs, field)
                    api_val = api_prefs.get(field)

                    if db_val == api_val:
                        print_success(f"{field}: {db_val} == {api_val}")
                    else:
                        print_error(f"{field}: DB={db_val} != API={api_val}")
                        all_match = False

                return all_match
            else:
                print_error("Failed to fetch via API")
                return False

        except Exception as e:
            print_error(f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests"""
        print_header("ADMIN SETTINGS PREFERENCES TEST SUITE")
        print_info(f"Testing Admin Settings functionality")
        print_info(f"Backend: Django + DRF")
        print_info(f"Endpoints: /api/admin/dashboard/profile/ and update_preferences/")

        self.setup()

        results = {
            'Get Profile': self.test_get_profile(),
            'Update Notifications': self.test_update_notifications(),
            'Update Appearance': self.test_update_appearance(),
            'Update Security': self.test_update_security(),
            'Final State': self.test_final_state(),
        }

        # Summary
        print_header("TEST SUMMARY")

        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for test_name, result in results.items():
            if result:
                print_success(f"{test_name}: PASSED")
            else:
                print_error(f"{test_name}: FAILED")

        print(f"\n{Fore.CYAN}Total: {passed}/{total} tests passed")

        if passed == total:
            print(f"\n{Fore.GREEN}{'=' * 80}")
            print(f"{Fore.GREEN}ALL TESTS PASSED! ✓")
            print(f"{Fore.GREEN}{'=' * 80}\n")
            return True
        else:
            print(f"\n{Fore.RED}{'=' * 80}")
            print(f"{Fore.RED}SOME TESTS FAILED! ✗")
            print(f"{Fore.RED}{'=' * 80}\n")
            return False


if __name__ == '__main__':
    tester = AdminPreferencesTest()
    success = tester.run_all_tests()

    sys.exit(0 if success else 1)
