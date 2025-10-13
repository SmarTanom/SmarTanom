from django.db import models
from django.conf import settings


class PushSubscription(models.Model):
    """Store user push notification subscriptions."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
        help_text="User who owns this subscription"
    )

    # Push subscription details from browser
    endpoint = models.URLField(
        max_length=500,
        unique=True,
        help_text="Push service endpoint URL"
    )

    # Encryption keys (JSON strings)
    p256dh = models.CharField(
        max_length=255,
        help_text="Client public key for encryption"
    )

    auth = models.CharField(
        max_length=255,
        help_text="Client authentication secret"
    )

    # Device information (optional, for reference)
    user_agent = models.TextField(
        blank=True,
        help_text="Browser/device user agent string"
    )

    device_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Optional device identifier"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this subscription is active"
    )

    class Meta:
        indexes = [
            models.Index(fields=["user"], name="idx_push_user"),
            models.Index(fields=["is_active"], name="idx_push_active"),
            models.Index(fields=["created_at"], name="idx_push_created"),
        ]
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.device_name or 'Device'} ({self.id})"


class NotificationLog(models.Model):
    """Log of sent notifications for debugging and analytics."""

    NOTIFICATION_TYPES = [
        ('alert', 'Device Alert'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('info', 'Information'),
        ('success', 'Success'),
    ]

    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('expired', 'Expired Subscription'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_logs'
    )

    subscription = models.ForeignKey(
        PushSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        default='info'
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='sent'
    )

    error_message = models.TextField(
        blank=True,
        help_text="Error details if sending failed"
    )

    sent_at = models.DateTimeField(auto_now_add=True)

    # Optional metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional data (device_id, alert_id, etc.)"
    )

    class Meta:
        indexes = [
            models.Index(fields=["user", "-sent_at"], name="idx_notif_user_sent"),
            models.Index(fields=["status"], name="idx_notif_status"),
            models.Index(fields=["notification_type"], name="idx_notif_type"),
        ]
        verbose_name = "Notification Log"
        verbose_name_plural = "Notification Logs"
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.notification_type.upper()}: {self.title} to {self.user.email}"


class NotificationPreferences(models.Model):
    """Store user notification preferences for filtering."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        help_text="User who owns these preferences"
    )

    # Alert severity preferences
    critical_alerts = models.BooleanField(
        default=True,
        help_text="Receive critical alerts (urgent issues)"
    )

    warnings = models.BooleanField(
        default=True,
        help_text="Receive warning notifications"
    )

    info = models.BooleanField(
        default=True,
        help_text="Receive informational updates"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"], name="idx_notif_pref_user"),
        ]
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"

    def __str__(self):
        return f"Preferences for {self.user.email}"

    def allows_notification_type(self, notification_type):
        """Check if user wants to receive this type of notification."""
        type_mapping = {
            'critical': self.critical_alerts,
            'alert': self.critical_alerts,
            'warning': self.warnings,
            'info': self.info,
            'success': self.info,  # Success treated as info
        }
        return type_mapping.get(notification_type, True)
