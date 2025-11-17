from django.db import models
from django.conf import settings
from django.utils import timezone


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

    # When the user has viewed/acknowledged this alert in the UI
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when user marked this alert as read/seen"
    )

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
            models.Index(fields=["read_at"], name="idx_notif_read_at"),
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

    # Email notification preference
    email_enabled = models.BooleanField(
        default=False,
        help_text="Receive alerts via email"
    )

    # Quiet Hours settings
    quiet_hours_enabled = models.BooleanField(
        default=False,
        help_text="Enable quiet hours to silence non-critical notifications"
    )

    quiet_hours_start = models.TimeField(
        default='22:00',
        help_text="Start time for quiet hours (24-hour format)"
    )

    quiet_hours_end = models.TimeField(
        default='07:00',
        help_text="End time for quiet hours (24-hour format)"
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

    def is_quiet_hours(self):
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_enabled:
            return False

        from django.utils import timezone
        from datetime import datetime, time

        now = timezone.now().time()
        start = self.quiet_hours_start
        end = self.quiet_hours_end

        # Handle quiet hours that span midnight (e.g., 22:00 to 07:00)
        if start > end:
            return now >= start or now <= end
        else:
            return start <= now <= end

    def should_send_notification(self, notification_type):
        """Check if notification should be sent based on preferences and quiet hours."""
        # Always allow critical notifications during quiet hours
        if notification_type in ['critical', 'alert']:
            return self.allows_notification_type(notification_type)

        # Check if we're in quiet hours for non-critical notifications
        if self.is_quiet_hours():
            return False

        return self.allows_notification_type(notification_type)


class AdminAlertReadReceipt(models.Model):
    """Per-admin read receipts for sensor alerts.

    Decouples admin UI read state from global delivery/read state so that
    marking an alert as read in the admin does not affect end-user unread counts.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_alert_reads',
        help_text='Admin user who read this alert in the admin UI'
    )

    alert = models.ForeignKey(
        'apps.sensors.Alert',
        on_delete=models.CASCADE,
        related_name='admin_read_receipts',
        help_text='Sensor alert that was read by the admin'
    )

    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = (('user', 'alert'),)
        indexes = [
            models.Index(fields=['user'], name='idx_adminread_user'),
            models.Index(fields=['alert'], name='idx_adminread_alert'),
            models.Index(fields=['read_at'], name='idx_adminread_read_at'),
        ]
        verbose_name = 'Admin Alert Read Receipt'
        verbose_name_plural = 'Admin Alert Read Receipts'

    def __str__(self):
        return f"AdminRead(user={self.user_id}, alert={self.alert_id})"
