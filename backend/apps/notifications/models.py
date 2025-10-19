from django.db import models
from django.conf import settings
from apps.common.models import TimeStampedModel
from apps.devices.models import Device
from apps.reservoirs.models import Plant, Reservoir


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


class Alert(TimeStampedModel):
    """Persistent alert records for threshold breaches (used by Alerts UI)."""

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    class Classification(models.TextChoices):
        BELOW_MIN = "below_min", "Below Min"
        NEAR_MIN = "near_min", "Near Min"
        ABOVE_MAX = "above_max", "Above Max"
        NEAR_MAX = "near_max", "Near Max"
        NORMAL = "normal", "Normal"
        SPECIAL = "special", "Special"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alerts",
        help_text="Primary user recipient (typically device owner)"
    )
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="alerts",
        db_index=True,
        help_text="Device where the alert originated",
    )
    reservoir = models.ForeignKey(
        Reservoir,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
        help_text="Reservoir context at time of alert (optional)",
    )
    plant = models.ForeignKey(
        Plant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
        help_text="Plant thresholds used (optional)",
    )

    sensor = models.ForeignKey(
        "sensors.Sensor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    reading = models.ForeignKey(
        "sensors.SensorData",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )

    sensor_type = models.CharField(max_length=30, db_index=True)
    metric_name = models.CharField(max_length=50, help_text="Duplicate of sensor_type for UI flexibility")
    measured_value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True, default="")

    threshold_min = models.FloatField(null=True, blank=True)
    threshold_max = models.FloatField(null=True, blank=True)
    classification = models.CharField(
        max_length=20,
        choices=Classification.choices,
        default=Classification.NORMAL,
        db_index=True,
    )
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        default=Severity.INFO,
        db_index=True,
    )

    title = models.CharField(max_length=255)
    message = models.TextField()
    recommendation = models.TextField(blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    archived = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"], name="idx_alert_user_created"),
            models.Index(fields=["device", "created_at"], name="idx_alert_device_created"),
            models.Index(fields=["sensor_type", "created_at"], name="idx_alert_sensor_created"),
            models.Index(fields=["severity"], name="idx_alert_severity"),
            models.Index(fields=["is_read"], name="idx_alert_is_read"),
        ]
        ordering = ("-created_at",)
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.title} ({self.device_id})"
