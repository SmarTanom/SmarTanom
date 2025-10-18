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


class DeviceProvisionThrottle(AnonRateThrottle):
    """Throttle device provisioning requests to prevent abuse."""
    scope = 'device_provision'

    def get_cache_key(self, request, view):
        """Create cache key based on device serial AND IP address."""
        # Get the device serial from request data
        serial = None
        if request.data:
            serial = request.data.get('serial', '')

        # Get client IP
        ident = self.get_ident(request)

        # Combine serial and IP for more granular throttling
        if serial:
            return f"{self.scope}_{serial}_{ident}"
        return f"{self.scope}_{ident}"

