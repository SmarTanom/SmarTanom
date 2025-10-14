from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import random
import string
from datetime import timedelta
from django.conf import settings


class CustomUserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, first_name=None, last_name=None, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)
        user = self.model(
            email=email,
            first_name=first_name or '',
            last_name=last_name or '',
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()  # No password needed for OTP-based auth

        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name=None, last_name=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        # Superusers should have a password for admin access
        if not password:
            password = 'smartanomadmin4r1'  # Default admin password

        return self.create_user(email, first_name, last_name, password=password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with email-based authentication and roles."""

    # Role choices
    ADMIN = 'admin'
    USER = 'user'

    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (USER, 'User'),
    ]

    email = models.EmailField(unique=True)
    # Added username for frontend display / handle (optional until set). Unique & case-insensitive uniqueness enforced via cleaning lower-cased value.
    username = models.CharField(max_length=30, unique=True, null=True, blank=True, help_text="Public handle; unique. Letters, numbers, underscore, hyphen.")
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=USER)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    # Profile photo (optional)
    user_photo = models.ImageField(upload_to='user_photos/', null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        db_table = 'auth_user'
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_admin(self):
        return self.role == self.ADMIN

    def save(self, *args, **kwargs):
        # Auto-assign staff privileges to admin users
        if self.role == self.ADMIN:
            self.is_staff = True
        # Normalize username to preserve case for display but ensure uniqueness not broken by accidental spaces
        if self.username:
            self.username = self.username.strip()
        super().save(*args, **kwargs)


class UserPreferences(models.Model):
    """User preferences and settings."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='preferences'
    )

    # Notification settings
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    device_alerts = models.BooleanField(default=True)
    system_updates = models.BooleanField(default=False)
    weekly_reports = models.BooleanField(default=True)

    # Security settings
    two_factor_enabled = models.BooleanField(default=False)
    session_timeout = models.IntegerField(default=30, help_text="Session timeout in minutes")

    # Appearance settings
    dark_mode = models.BooleanField(default=False)
    font_size = models.CharField(
        max_length=10,
        choices=[('small', 'Small'), ('medium', 'Medium'), ('large', 'Large')],
        default='medium'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Preferences'
        verbose_name_plural = 'User Preferences'

    def __str__(self):
        return f"Preferences for {self.user.email}"


class OTPCode(models.Model):
    """OTP code model for email-based authentication."""

    PURPOSE_LOGIN = 'login'
    PURPOSE_REGISTER = 'register'
    PURPOSE_RESET = 'reset'
    PURPOSE_REVOKE = 'revoke'

    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, 'Login'),
        (PURPOSE_REGISTER, 'Registration'),
        (PURPOSE_RESET, 'Password Reset'),
        (PURPOSE_REVOKE, 'Device Access Revocation'),
    ]

    email = models.EmailField()
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default=PURPOSE_LOGIN)

    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    # Rate limiting fields
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)

    class Meta:
        verbose_name = 'OTP Code'
        verbose_name_plural = 'OTP Codes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'purpose', 'is_used']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose})"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            # Use configurable expiry minutes from settings (default 5)
            expire_mins = getattr(settings, 'OTP_EXPIRE_MINUTES', 5)
            self.expires_at = timezone.now() + timedelta(minutes=expire_mins)
        super().save(*args, **kwargs)

    @staticmethod
    def generate_code():
        """Generate a 6-digit OTP code."""
        return ''.join(random.choices(string.digits, k=6))

    @property
    def is_expired(self):
        """Check if the OTP code has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if the OTP code is valid (not used, not expired, under attempt limit)."""
        return (
            not self.is_used and
            not self.is_expired and
            self.attempts < self.max_attempts
        )

    def verify(self, code):
        """Verify the OTP code."""
        self.attempts += 1
        self.save(update_fields=['attempts'])

        if not self.is_valid:
            return False

        if self.code == code:
            self.is_used = True
            self.save(update_fields=['is_used'])
            return True

        return False

    @classmethod
    def create_otp(cls, email, purpose=PURPOSE_LOGIN):
        """Create a new OTP code for the given email and purpose."""
        # Invalidate existing unused OTPs for this email/purpose (case-insensitive email match)
        cls.objects.filter(
            email__iexact=email,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)

        # Create new OTP
        return cls.objects.create(
            email=email,
            purpose=purpose
        )

    @classmethod
    def verify_otp(cls, email, code, purpose=PURPOSE_LOGIN):
        """Verify OTP code for given email and purpose."""
        try:
            otp = cls.objects.filter(
                email__iexact=email,
                purpose=purpose,
                is_used=False
            ).order_by('-created_at').first()

            if not otp:
                return False

            return otp.verify(code)
        except cls.DoesNotExist:
            return False

    @classmethod
    def cleanup_expired(cls):
        """Remove expired OTP codes."""
        expired_count = cls.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]
        return expired_count


class LoginAttempt(models.Model):
    """Track login attempts for rate limiting."""

    email = models.EmailField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    successful = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Login Attempt'
        verbose_name_plural = 'Login Attempts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
        ]

    def __str__(self):
        status = "Success" if self.successful else "Failed"
        return f"{status} login attempt for {self.email}"

    @classmethod
    def record_attempt(cls, email, ip_address=None, successful=False):
        """Record a login attempt."""
        return cls.objects.create(
            email=email,
            ip_address=ip_address,
            successful=successful
        )

    @classmethod
    def is_rate_limited(cls, email, ip_address=None, window_minutes=None, max_attempts=None):
        """Check if email or IP is rate limited."""
        from django.conf import settings
        window_minutes = window_minutes if window_minutes is not None else getattr(settings, 'OTP_RATE_LIMIT_MINUTES', 15)
        max_attempts = max_attempts if max_attempts is not None else getattr(settings, 'OTP_RATE_LIMIT_ATTEMPTS', 5)
        cutoff_time = timezone.now() - timedelta(minutes=window_minutes)

        # Check email-based rate limiting
        email_attempts = cls.objects.filter(
            email=email,
            created_at__gte=cutoff_time,
            successful=False
        ).count()

        if email_attempts >= max_attempts:
            return True

        # Check IP-based rate limiting if IP is provided
        if ip_address:
            ip_attempts = cls.objects.filter(
                ip_address=ip_address,
                created_at__gte=cutoff_time,
                successful=False
            ).count()

            if ip_attempts >= max_attempts * 2:  # Higher limit for IP
                return True

        return False

    @classmethod
    def cleanup_old_attempts(cls, days=30):
        """Clean up old login attempts."""
        cutoff_date = timezone.now() - timedelta(days=days)
        deleted_count = cls.objects.filter(
            created_at__lt=cutoff_date
        ).delete()[0]
        return deleted_count
