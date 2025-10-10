"""Tests for the users app."""

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model

from .models import OTPCode, LoginAttempt

User = get_user_model()


class UserModelTests(TestCase):
    """Tests for the custom User model."""

    def test_create_user(self):
        """Test creating a new user."""
        user = User.objects.create_user(email='test@example.com', first_name='Test', last_name='User')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'User')
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.has_usable_password())

    def test_create_superuser(self):
        """Test creating a new superuser."""
        admin_user = User.objects.create_superuser(email='admin@example.com', first_name='Admin')
        self.assertEqual(admin_user.email, 'admin@example.com')
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertEqual(admin_user.role, User.ADMIN)


class OTPTests(TestCase):
    """Tests for OTP code generation and verification."""

    def setUp(self):
        self.email = 'test@example.com'

    def test_otp_generation(self):
        """Test OTP code generation."""
        otp = OTPCode.create_otp(self.email)
        self.assertEqual(len(otp.code), 6)
        self.assertEqual(otp.email, self.email)
        self.assertEqual(otp.purpose, OTPCode.PURPOSE_LOGIN)
        self.assertFalse(otp.is_used)
        self.assertEqual(otp.attempts, 0)

    def test_otp_verification(self):
        """Test OTP code verification."""
        otp = OTPCode.create_otp(self.email)
        self.assertTrue(otp.verify(otp.code))
        self.assertTrue(otp.is_used)

    def test_invalid_otp(self):
        """Test invalid OTP code."""
        otp = OTPCode.create_otp(self.email)
        self.assertFalse(otp.verify('000000'))
        self.assertEqual(otp.attempts, 1)
        self.assertFalse(otp.is_used)


class LoginAttemptTests(TestCase):
    """Tests for login attempt rate limiting."""

    def setUp(self):
        self.email = 'test@example.com'
        self.ip_address = '127.0.0.1'

    def test_rate_limiting(self):
        """Test rate limiting for login attempts."""
        # Record 5 failed attempts
        for _ in range(5):
            LoginAttempt.record_attempt(self.email, self.ip_address, successful=False)

        # Check if rate limited
        self.assertTrue(LoginAttempt.is_rate_limited(self.email, self.ip_address))
