"""Device app admin configuration."""

from django.contrib import admin
from .models import Device


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    """Admin configuration for Device model."""

    list_display = ('device_name', 'user', 'status', 'created_at', 'updated_at')
    list_filter = ('status',)
    search_fields = ('device_name', 'user__email', 'user__username')
    ordering = ('-created_at',)
    raw_id_fields = ('user',)
