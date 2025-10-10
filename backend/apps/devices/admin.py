"""Device app admin configuration."""

from django.contrib import admin
from apps.devices.models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """Admin configuration for Device model."""

    list_display = ('id', 'device_serial', 'device_name', 'get_user_display', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'user')  # Filter by status and user (includes None)
    search_fields = ('device_name', 'device_serial', 'user__email', 'user__username')
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
