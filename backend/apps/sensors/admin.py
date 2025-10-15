"""Admin configuration for sensor management."""

from django.contrib import admin
from django.db import transaction
from .models import Sensor, SensorData


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    """Admin configuration for Sensor model."""

    list_display = ('sensor_type', 'device', 'unit', 'created_at')
    list_filter = ('sensor_type', 'device__status')
    search_fields = ('device__device_name', 'sensor_type', 'unit')
    ordering = ('-created_at',)
    raw_id_fields = ('device',)
    list_select_related = ('device',)


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    """Admin configuration for SensorData model."""

    list_display = ('sensor', 'value', 'created_at', 'device_name')
    list_filter = ('sensor__sensor_type', 'created_at')
    search_fields = ('sensor__device__device_name', 'sensor__sensor_type')
    ordering = ('-created_at',)
    raw_id_fields = ('sensor',)
    list_select_related = ('sensor', 'sensor__device')
    date_hierarchy = 'created_at'
    list_per_page = 50
    actions = ['bulk_delete_old_data']
    
    def device_name(self, obj):
        """Display device name for better admin UX."""
        return obj.sensor.device.device_name if obj.sensor and obj.sensor.device else 'N/A'
    device_name.short_description = 'Device'
    
    def save_model(self, request, obj, form, change):
        """Optimize sensor data saving in admin."""
        with transaction.atomic():
            super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related(
            'sensor__device'
        )
    
    def bulk_delete_old_data(self, request, queryset):
        """Admin action to bulk delete old sensor data."""
        from django.utils import timezone
        from datetime import timedelta
        
        # Delete data older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        old_data = queryset.filter(created_at__lt=cutoff_date)
        count = old_data.count()
        old_data.delete()
        
        self.message_user(
            request,
            f"Successfully deleted {count} old sensor data records."
        )
    bulk_delete_old_data.short_description = "Delete old sensor data (>30 days)"
