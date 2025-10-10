"""Custom throttling classes for SmarTanom."""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django.conf import settings


class OTPRequestThrottle(AnonRateThrottle):
    """Throttle OTP requests to prevent abuse."""
    scope = 'otp_request'


class OTPVerifyThrottle(AnonRateThrottle):
    """Throttle OTP verification attempts to prevent brute force."""
    scope = 'otp_verify'


class LoginAttemptThrottle(AnonRateThrottle):
    """Throttle login attempts."""
    scope = 'login_attempt'
