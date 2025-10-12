"""Models for device management."""

from __future__ import annotations
import random
import secrets
import string
from datetime import timedelta

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

from apps.common.models import TimeStampedModel

User = get_user_model()


class Device(TimeStampedModel):
    """A physical or logical device owned by a user that hosts sensors & reservoirs."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        MAINTENANCE = "maintenance", "Maintenance"
        DECOMMISSIONED = "decommissioned", "Decommissioned"

    device_serial = models.CharField(
        max_length=12,
        unique=True,
        help_text="Unique device serial number (SMRT-XXX-XXX format)"
    )
    device_name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True
    )

    # Device binding fields
    is_bound = models.BooleanField(
        default=False,
        help_text="Whether this device has been bound to an email address"
    )
    bound_email = models.EmailField(
        null=True, blank=True,
        help_text="Email address this device is bound to"
    )

    # Plant information fields
    plant_photo = models.ImageField(
        upload_to='device_photos/',
        null=True, blank=True,
        help_text="Photo of the plant growing in this device"
    )
    # Optional human-readable device location provided during initial setup
    location = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Optional location or placement description for the device"
    )

    class Meta:
        indexes = [
            models.Index(fields=["device_serial"], name="idx_device_serial"),
            models.Index(fields=["status"], name="idx_device_status"),
            models.Index(fields=["is_bound"], name="idx_device_is_bound"),
            models.Index(fields=["bound_email"], name="idx_device_bound_email"),
            models.Index(fields=["location"], name="idx_device_location")
        ]
        verbose_name = "Device"
        verbose_name_plural = "Devices"

    @staticmethod
    def generate_device_serial():
        """Generate a unique device serial in format SMRT-XXX-XXX."""
        while True:
            # Generate two sets of 3 random alphanumeric characters
            part1 = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(3))
            part2 = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(3))
            serial = f"SMRT-{part1}-{part2}"

            # Check if serial already exists
            if not Device.objects.filter(device_serial=serial).exists():
                return serial

    def save(self, *args, **kwargs):
        """Override save to generate device serial if not set."""
        if not self.device_serial:
            self.device_serial = self.generate_device_serial()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.device_name} ({self.device_serial})"


class DeviceOTPCode(models.Model):
    """OTP code model for device binding verification."""

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="otp_codes"
    )
    email = models.EmailField()
    code = models.CharField(max_length=6)

    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    # Rate limiting fields
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=3)

    class Meta:
        verbose_name = 'Device OTP Code'
        verbose_name_plural = 'Device OTP Codes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['device', 'email', 'is_verified']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"OTP for {self.device.device_serial} -> {self.email}"

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = self.generate_code()
        if not self.expires_at:
            # Use configurable expiry minutes from settings (default 5)
            expire_mins = getattr(settings, 'OTP_EXPIRE_MINUTES', 5)
            self.expires_at = timezone.now() + timedelta(minutes=expire_mins)
        super().save(*args, **kwargs)

    def generate_code(self):
        """Generate a 6-digit numeric OTP code."""
        return ''.join(secrets.choice(string.digits) for _ in range(6))

    @property
    def is_expired(self):
        """Check if the OTP code has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if the OTP code is valid (not verified, not expired, under attempt limit)."""
        return (
            not self.is_verified and
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
            self.is_verified = True
            self.save(update_fields=['is_verified'])
            return True

        return False

    @classmethod
    def create_otp(cls, device, email):
        """Create a new OTP code for the given device and email."""
        # Invalidate existing unused OTPs for this device/email
        cls.objects.filter(
            device=device,
            email=email,
            is_verified=False
        ).update(is_verified=True)

        # Create new OTP
        return cls.objects.create(
            device=device,
            email=email
        )

    @classmethod
    def verify_otp(cls, device, email, code):
        """Verify OTP code for given device and email."""
        try:
            otp = cls.objects.filter(
                device=device,
                email=email,
                is_verified=False
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


class DeviceCollaboration(TimeStampedModel):
    """Model for device sharing/collaboration access control."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"
        SUSPENDED = "suspended", "Suspended"

    class Permission(models.TextChoices):
        VIEW_ONLY = "view_only", "View Only"
        MANAGE = "manage", "Manage"  # Future expansion

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='collaborations'
    )
    collaborator_email = models.EmailField(
        help_text="Email address of the collaborator"
    )
    permissions = models.CharField(
        max_length=20,
        choices=Permission.choices,
        default=Permission.VIEW_ONLY
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    shared_by_email = models.EmailField(
        help_text="Email address of the user who shared this device"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['device', 'collaborator_email'],
                name='unique_device_collaborator'
            )
        ]
        indexes = [
            models.Index(fields=['device'], name='idx_collaboration_device'),
            models.Index(fields=['collaborator_email'], name='idx_collaboration_collaborator'),
            models.Index(fields=['shared_by_email'], name='idx_collaboration_shared_by'),
            models.Index(fields=['status'], name='idx_collaboration_status'),
        ]
        verbose_name = "Device Collaboration"
        verbose_name_plural = "Device Collaborations"

    def __str__(self) -> str:
        return f"{self.device.device_serial} shared with {self.collaborator_email}"


class DeviceInvitation(TimeStampedModel):
    """Model for device sharing invitations."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    invite_email = models.EmailField(
        help_text="Email address being invited"
    )
    invited_by_email = models.EmailField(
        help_text="Email address of the user sending the invitation"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    message = models.TextField(
        blank=True,
        help_text="Optional message from the inviter"
    )
    permissions = models.CharField(
        max_length=20,
        choices=DeviceCollaboration.Permission.choices,
        default=DeviceCollaboration.Permission.VIEW_ONLY
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        help_text="Unique token for accepting/declining invitation"
    )
    expires_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['device', 'invite_email'],
                name='unique_device_invitation',
                condition=models.Q(status='pending')
            )
        ]
        indexes = [
            models.Index(fields=['device'], name='idx_invitation_device'),
            models.Index(fields=['invite_email'], name='idx_invitation_email'),
            models.Index(fields=['invited_by_email'], name='idx_invitation_invited_by'),
            models.Index(fields=['status'], name='idx_invitation_status'),
            models.Index(fields=['token'], name='idx_invitation_token'),
            models.Index(fields=['expires_at'], name='idx_invitation_expires'),
        ]
        verbose_name = "Device Invitation"
        verbose_name_plural = "Device Invitations"

    def save(self, *args, **kwargs):
        """Override save to generate token and expiration if not set."""
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)  # 7 days to accept
        super().save(*args, **kwargs)

    def is_expired(self) -> bool:
        """Check if invitation has expired."""
        return timezone.now() > self.expires_at

    def accept(self, accepting_user_email: str) -> DeviceCollaboration:
        """Accept the invitation and create collaboration."""
        if self.status != self.Status.PENDING:
            raise ValueError(f"Cannot accept invitation with status: {self.status}")

        if self.is_expired():
            self.status = self.Status.EXPIRED
            self.save()
            raise ValueError("Invitation has expired")

        if accepting_user_email != self.invite_email:
            raise ValueError("Only the invited user can accept this invitation")

        # Create the collaboration
        collaboration = DeviceCollaboration.objects.create(
            device=self.device,
            collaborator_email=self.invite_email,
            permissions=self.permissions,
            shared_by_email=self.invited_by_email
        )

        # Update invitation status
        self.status = self.Status.ACCEPTED
        self.save()

        return collaboration

    def decline(self, declining_user_email: str) -> None:
        """Decline the invitation."""
        if self.status != self.Status.PENDING:
            raise ValueError(f"Cannot decline invitation with status: {self.status}")

        if declining_user_email != self.invite_email:
            raise ValueError("Only the invited user can decline this invitation")

        self.status = self.Status.DECLINED
        self.save()

    def __str__(self) -> str:
        return f"Invitation for {self.device.device_serial} to {self.invite_email}"
