"""Device app admin configuration."""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from apps.devices.models import Device, DeviceOTPCode


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """Admin configuration for Device model."""

    list_display = (
        'id',
        'device_serial',
        'location',
        'device_name',
        'status',
        'is_bound',
        'bound_email',
        'plant_photo_thumbnail',
        'created_at',
        'updated_at'
    )
    list_filter = ('status', 'is_bound', 'created_at', 'updated_at')
    search_fields = ('device_name', 'device_serial', 'bound_email', 'location')
    ordering = ('-created_at',)
    list_per_page = 25  # Show up to 25 devices per page
    list_editable = ('device_name', 'status', 'location')

    fieldsets = (
        ('Device Information', {
            'fields': ('device_serial', 'device_name', 'location', 'status')
        }),
        ('Binding Information', {
            'fields': ('is_bound', 'bound_email'),
            'classes': ('collapse',)
        }),
        ('Plant Information', {
            'fields': ('plant_photo',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('device_serial', 'is_bound', 'bound_email', 'created_at', 'updated_at')

    def plant_photo_thumbnail(self, obj):
        """Display plant photo as thumbnail in admin list."""
        if obj.plant_photo:
            try:
                return format_html(
                    '<img src="{}" width="50" height="50" style="object-fit: cover; border-radius: 4px; border: 1px solid #ddd;" title="Plant photo" alt="Plant photo" />',
                    obj.plant_photo.url,
                )
            except Exception:
                return "❌ Error loading photo"
        return "📷 No photo"
    plant_photo_thumbnail.short_description = 'Plant Photo'

    def get_device_info(self, obj):
        """Display comprehensive device info."""
        binding_status = "🔗 Bound" if obj.is_bound else "🔓 Unbound"
        status_colors = {
            'active': '🟢',
            'inactive': '🟡',
            'maintenance': '🟠',
            'decommissioned': '🔴'
        }
        status_icon = status_colors.get(obj.status, '⚫')

        return format_html(
            '<div><strong>{}</strong><br/><small>{} {} | {}</small></div>',
            obj.device_name,
            status_icon,
            obj.get_status_display(),
            binding_status
        )
    get_device_info.short_description = 'Device Info'

    # Removed plant_info_summary as plant details fields were dropped

    def get_queryset(self, request):
        """Override to ensure all devices are visible in admin."""
        # Use the base queryset to show ALL devices
        return Device.objects.all()

    # Custom admin actions
    actions = ['activate_devices', 'deactivate_devices', 'set_maintenance_mode']

    def activate_devices(self, request, queryset):
        """Bulk action to activate selected devices."""
        updated = queryset.update(status=Device.Status.ACTIVE)
        self.message_user(request, f'{updated} device(s) were successfully activated.')
    activate_devices.short_description = "Activate selected devices"

    def deactivate_devices(self, request, queryset):
        """Bulk action to deactivate selected devices."""
        updated = queryset.update(status=Device.Status.INACTIVE)
        self.message_user(request, f'{updated} device(s) were successfully deactivated.')
    deactivate_devices.short_description = "Deactivate selected devices"

    def set_maintenance_mode(self, request, queryset):
        """Bulk action to set devices to maintenance mode."""
        updated = queryset.update(status=Device.Status.MAINTENANCE)
        self.message_user(request, f'{updated} device(s) were set to maintenance mode.')
    set_maintenance_mode.short_description = "Set selected devices to maintenance mode"

    def formatted_created_date(self, obj):
        """Display formatted creation date."""
        return obj.created_at.strftime("%Y-%m-%d %H:%M")
    formatted_created_date.short_description = 'Created'
    formatted_created_date.admin_order_field = 'created_at'

    def formatted_updated_date(self, obj):
        """Display formatted update date with recent indicator."""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        if obj.updated_at > now - timedelta(hours=24):
            icon = "🆕"  # New/Recently updated
        elif obj.updated_at > now - timedelta(days=7):
            icon = "📅"  # Updated this week
        else:
            icon = ""

        return format_html(
            '{} {}',
            icon,
            obj.updated_at.strftime("%Y-%m-%d %H:%M")
        )
    formatted_updated_date.short_description = 'Updated'
    formatted_updated_date.admin_order_field = 'updated_at'


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
