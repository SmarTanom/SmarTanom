"""Admin configuration for reservoir management."""

from django.contrib import admin
from .models import Reservoir


@admin.register(Reservoir)
class ReservoirAdmin(admin.ModelAdmin):
    """Admin configuration for Reservoir model."""

    list_display = ('reservoir_name', 'device', 'plant_type', 'start_date', 'end_date')
    list_filter = ('plant_type',)
    search_fields = ('reservoir_name', 'plant_type', 'device__device_name')
    ordering = ('-created_at',)
    date_hierarchy = 'start_date'
    raw_id_fields = ('device',)
