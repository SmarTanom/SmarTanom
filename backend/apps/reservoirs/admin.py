"""Admin configuration for plant catalog (reservoir model removed)."""

from django.contrib import admin
from .models import Plant


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'plant_name', 'ppm_min', 'ppm_max', 'ec_min', 'ec_max', 'ph_min', 'ph_max',
        'water_temp_min', 'water_temp_max', 'created_at'
    )
    search_fields = ('plant_name',)
    ordering = ('plant_name',)
    # Hide environment sensor ranges that are no longer used in the system
    exclude = (
        'light_min', 'light_max',
        'environment_temp_min', 'environment_temp_max',
        'humidity_min', 'humidity_max',
    )

    def save_model(self, request, obj, form, change):
        """Ensure required-but-hidden fields have safe defaults when creating.

        light_min/light_max are required on the model, but the inputs are hidden in admin.
        Apply neutral defaults so new Plant records can be created without those fields.
        Environment temp and humidity already have model defaults.
        """
        if not change:
            if obj.light_min is None:
                obj.light_min = 0.0
            if obj.light_max is None:
                obj.light_max = 0.0
        super().save_model(request, obj, form, change)
