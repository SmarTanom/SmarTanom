"""Admin configuration for sensor management."""

from django.contrib import admin
from django.db import transaction
from .models import Sensor, SensorData, Alert


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    """Admin configuration for Sensor model."""
    # Explicit column order per request: id, device, sensor_type, unit, created_at, updated_at, sensor_latest
    list_display = (
        'id', 'device', 'sensor_type', 'unit', 'created_at', 'updated_at', 'sensor_latest'
    )

    list_filter = ('sensor_type', 'device__status')
    search_fields = ('device__device_name', 'sensor_type', 'unit')
    ordering = ('-created_at',)
    raw_id_fields = ('device',)
    list_select_related = ('device',)

    def sensor_latest(self, obj):
        """Show latest reading value if SensorLatest row exists."""
        try:
            latest = getattr(obj, 'latest', None)
            if not latest:
                return '—'
            val = latest.value
            if val is None:
                return '—'
            return f"{val:.2f} (at {latest.updated_at.strftime('%H:%M:%S')})"
        except Exception:
            return '—'
    sensor_latest.short_description = 'Latest'


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    """Admin configuration for SensorData model."""
    # Explicit column order per request: id, device, sensor, value, created_at, updated_at, ingest_id
    list_display = (
        'id', 'device_display', 'sensor', 'value', 'created_at', 'updated_at', 'ingest_id'
    )
    list_filter = ('sensor__sensor_type', 'created_at')
    search_fields = ('sensor__device__device_name', 'sensor__sensor_type')
    ordering = ('-created_at',)
    raw_id_fields = ('sensor',)
    list_select_related = ('sensor', 'sensor__device')
    date_hierarchy = 'created_at'
    list_per_page = 50
    actions = ['bulk_delete_old_data']
    
    def device_display(self, obj):
        """Show device name + serial for quick identification."""
        try:
            dev = obj.sensor.device
            name = dev.device_name or f"Device {dev.device_serial}" if dev.device_serial else str(dev.id)
            serial = dev.device_serial
            return f"{name} ({serial})" if serial else name
        except Exception:
            return 'N/A'
    device_display.short_description = 'Device'
    
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


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    """Admin configuration for Alert model."""
    # Fixed column set to ensure excluded fields never appear.
    # Removed: plant_name, plant_category, min_threshold, max_threshold, buffer,
    # is_acknowledged, acknowledged_at, is_resolved, resolved_at.
    list_display = (
        'id', 'device', 'sensor', 'plant', 'value', 'metric', 'unit', 'severity', 'trigger',
        'title', 'recommendation', 'is_read', 'created_at', 'updated_at'
    )

    # Keep filters lightweight and relevant to admin workflow; remove plant/category/ack/resolution filters
    list_filter = ('metric', 'trigger', 'severity', 'is_read')
    search_fields = ('title', 'recommendation', 'device__device_name')
    ordering = ('-created_at',)
    raw_id_fields = ('device', 'sensor')
    list_select_related = ('device', 'sensor')
    date_hierarchy = 'created_at'
    list_per_page = 50

    def plant(self, obj):
        """Single plant column (prefer explicit plant_name, fallback to category display)."""
        try:
            return obj.plant_name or obj.get_plant_category_display() or '—'
        except Exception:
            return '—'
    plant.short_description = 'Plant'
