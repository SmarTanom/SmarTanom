"""Admin registrations for monitoring models."""
from django.contrib import admin
from .models import Device, Reservoir, Sensor, SensorData

@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "device_name", "user", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("device_name", "user__username", "user__email")
    autocomplete_fields = ("user",)

@admin.register(Reservoir)
class ReservoirAdmin(admin.ModelAdmin):
    list_display = ("id", "reservoir_name", "device", "plant_type", "start_date", "end_date")
    list_filter = ("plant_type", "start_date")
    search_fields = ("reservoir_name", "device__device_name", "plant_type")
    autocomplete_fields = ("device",)

@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ("id", "sensor_type", "device", "unit", "created_at")
    list_filter = ("sensor_type",)
    search_fields = ("sensor_type", "device__device_name")
    autocomplete_fields = ("device",)

@admin.register(SensorData)
class SensorDataAdmin(admin.ModelAdmin):
    list_display = ("id", "sensor", "value", "created_at")
    list_filter = ("sensor__sensor_type", "created_at")
    search_fields = ("sensor__sensor_type", "sensor__device__device_name")
    autocomplete_fields = ("sensor",)
