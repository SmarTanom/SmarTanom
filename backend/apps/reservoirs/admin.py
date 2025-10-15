"""Admin configuration for reservoir management."""

from django.contrib import admin
from .models import Reservoir, Plant


@admin.register(Reservoir)
class ReservoirAdmin(admin.ModelAdmin):
    """Admin configuration for Reservoir model."""

    list_display = ('reservoir_name', 'device', 'plant', 'start_date', 'end_date')
    list_filter = ('plant',)
    search_fields = ('reservoir_name', 'plant__plant_name', 'device__device_name')
    ordering = ('-created_at',)
    date_hierarchy = 'start_date'
    raw_id_fields = ('device',)


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = (
        'plant_name', 'ppm_min', 'ppm_max', 'ec_min', 'ec_max', 'ph_min', 'ph_max',
        'water_temp_min', 'water_temp_max', 'light_min', 'light_max',
        'environment_temp_min', 'environment_temp_max', 'humidity_min', 'humidity_max',
        'created_at'
    )
    search_fields = ('plant_name',)
    ordering = ('plant_name',)
