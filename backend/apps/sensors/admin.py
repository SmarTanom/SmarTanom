"""Admin configuration for sensor management."""

from django.contrib import admin
from .models import Sensor, SensorData


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    """Admin configuration for Sensor model."""

    list_display = ('sensor_type', 'device', 'unit', 'created_at')
    list_filter = ('sensor_type',)
    search_fields = ('device__device_name', 'sensor_type', 'unit')
    ordering = ('-created_at',)


@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    """Admin configuration for SensorData model."""

    list_display = ('sensor', 'value', 'created_at')
    list_filter = ('sensor__sensor_type',)
    search_fields = ('sensor__device__device_name', 'sensor__sensor_type')
    ordering = ('-created_at',)
    raw_id_fields = ('sensor',)
