"""Device app admin configuration."""

from django.contrib import admin
from apps.devices.models import Device, DeviceOTPCode


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """Admin configuration for Device model."""

    list_display = ('id', 'device_serial', 'device_name', 'get_user_display', 'status', 'is_bound', 'bound_email', 'created_at', 'updated_at')
    list_filter = ('status', 'is_bound', 'user')  # Filter by status, binding status, and user
    search_fields = ('device_name', 'device_serial', 'bound_email', 'user__email', 'user__username')
    ordering = ('-created_at',)
    raw_id_fields = ('user',)
    list_per_page = 25  # Show up to 25 devices per page

    def get_queryset(self, request):
        """Override to ensure all devices are visible in admin."""
        # Use the base queryset to show ALL devices regardless of user
        return Device.objects.all()

    def get_user_display(self, obj):
        """Display user email or 'UNOWNED' for null users."""
        if obj.user:
            return obj.user.email
        return "UNOWNED"
    get_user_display.short_description = 'User'
    get_user_display.admin_order_field = 'user'


@admin.register(DeviceOTPCode)
class DeviceOTPCodeAdmin(admin.ModelAdmin):
    """Admin configuration for Device OTP Code model."""

    list_display = [
        'device_serial_display',
        'email',
        'code',
        'created_at',
        'expires_at',
        'status_display',
        'attempts',
        'max_attempts'
    ]
    list_filter = [
        'is_verified',
        'created_at',
        'expires_at'
    ]
    search_fields = ['device__device_serial', 'email', 'code']
    ordering = ['-created_at']
    readonly_fields = [
        'code',
        'created_at',
        'expires_at',
        'is_expired',
        'is_valid',
        'attempts'
    ]
    raw_id_fields = ['device']

    fieldsets = (
        (None, {
            'fields': ('device', 'email', 'code')
        }),
        ('Status', {
            'fields': ('is_verified', 'attempts', 'max_attempts')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'expires_at', 'is_expired', 'is_valid'),
            'classes': ('collapse',)
        }),
    )

    def device_serial_display(self, obj):
        """Display device serial number."""
        return obj.device.device_serial
    device_serial_display.short_description = 'Device Serial'
    device_serial_display.admin_order_field = 'device__device_serial'

    def status_display(self, obj):
        """Display OTP status with colored indicators."""
        if obj.is_verified:
            return "✅ Verified"
        elif obj.is_expired:
            return "⏰ Expired"
        elif obj.attempts >= obj.max_attempts:
            return "❌ Max attempts"
        else:
            return "⏳ Pending"
    status_display.short_description = 'Status'

    def get_readonly_fields(self, request, obj=None):
        """Make most fields readonly."""
        if obj:  # Editing existing object
            return self.readonly_fields + ['device', 'email']
        return self.readonly_fields
