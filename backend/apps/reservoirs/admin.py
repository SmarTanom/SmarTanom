"""Admin configuration for plant catalog (reservoir model removed)."""

from django.contrib import admin
from .models import Plant


from django import forms


class PlantAdminForm(forms.ModelForm):
    class Meta:
        model = Plant
        fields = '__all__'
        exclude = (
            'light_min', 'light_max',
            'environment_temp_min', 'environment_temp_max',
            'humidity_min', 'humidity_max',
        )

    def clean(self):
        cleaned = super().clean()
        # Ensure excluded required fields have safe defaults to pass model validation
        if getattr(self.instance, 'light_min', None) is None:
            self.instance.light_min = 0.0
        if getattr(self.instance, 'light_max', None) is None:
            self.instance.light_max = 0.0
        if getattr(self.instance, 'environment_temp_min', None) is None:
            self.instance.environment_temp_min = 18.0
        if getattr(self.instance, 'environment_temp_max', None) is None:
            self.instance.environment_temp_max = 28.0
        if getattr(self.instance, 'humidity_min', None) is None:
            self.instance.humidity_min = 40.0
        if getattr(self.instance, 'humidity_max', None) is None:
            self.instance.humidity_max = 70.0
        return cleaned


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
    form = PlantAdminForm

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
