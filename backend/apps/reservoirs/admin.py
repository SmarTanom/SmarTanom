"""Admin configuration for plant catalog (reservoir model removed)."""

from django.contrib import admin
from .models import Plant


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'plant_name', 'ppm_min', 'ppm_max', 'ec_min', 'ec_max', 'ph_min', 'ph_max',
        'water_temp_min', 'water_temp_max', 'light_min', 'light_max',
        'environment_temp_min', 'environment_temp_max', 'humidity_min', 'humidity_max',
        'created_at'
    )
    search_fields = ('plant_name',)
    ordering = ('plant_name',)
