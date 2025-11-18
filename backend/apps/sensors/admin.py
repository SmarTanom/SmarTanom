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
    # Custom column order per request:
    # id, device, sensor, plant, metric, unit, severity, trigger,
    # title, recommendation, is_read, is_acknowledged, is_resolved,
    # created_at, updated_at (adjacent)
    def get_list_display(self, request):
        # Concrete model fields
        fields = [f.name for f in self.model._meta.get_fields() if not (f.many_to_many or f.one_to_many)]
        # Desired explicit order (includes a computed 'plant' column)
        desired = [
            'id', 'device', 'sensor', 'plant', 'value', 'metric', 'unit', 'severity', 'trigger',
            'title', 'recommendation', 'is_read', 'is_acknowledged', 'is_resolved',
            # created_at and updated_at will be appended at the very end to keep them adjacent
        ]
        # 1) Place explicit keys except timestamps
        ordered = []
        for key in desired:
            if key in fields or key == 'plant':
                ordered.append(key)
                if key in fields:
                    fields.remove(key)
        # 2) Remove timestamps from remaining (to append at end adjacently)
        for k in ('created_at', 'updated_at'):
            if k in fields:
                fields.remove(k)
        # 3) Append remaining unspecified fields before timestamps
        ordered.extend(fields)
        # 4) Append timestamps adjacent at the very end
        ordered.extend(['created_at', 'updated_at'])
        return tuple(ordered)

    list_filter = ('metric', 'trigger', 'severity', 'is_read', 'is_acknowledged', 'is_resolved', 'plant_category')
    search_fields = ('title', 'recommendation', 'device__device_name', 'plant_name')
    ordering = ('-created_at',)
    raw_id_fields = ('device', 'sensor')
    list_select_related = ('device', 'sensor')
    date_hierarchy = 'created_at'
    list_per_page = 50

    def plant(self, obj):
        """Display plant name (or category) as 'Plant' column."""
        try:
            return obj.plant_name or obj.get_plant_category_display() or '—'
        except Exception:
            return '—'
    plant.short_description = 'Plant'

    def short_recommendation(self, obj):
        """Truncated recommendation for list view readability."""
        rec = obj.recommendation or ''
        rec = ' '.join(rec.split())  # collapse whitespace/newlines
        return (rec[:120] + '…') if len(rec) > 120 else rec
    short_recommendation.short_description = 'Recommendation'
