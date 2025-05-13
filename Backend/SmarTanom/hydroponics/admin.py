from django.contrib import admin
from .models import Hydroponic, SmarTanom, Sensor, SmarTanomData, WaterLog

@admin.register(Hydroponic)
class HydroponicAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'plant_type', 'start_date')
    search_fields = ('name', 'plant_type')

@admin.register(SmarTanom)
class SmarTanomAdmin(admin.ModelAdmin):
    list_display = ('name', 'hydroponic', 'status')
    list_filter = ('status',)

@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ('type', 'smar_tanom', 'unit', 'status')
    list_filter = ('type', 'status')

@admin.register(SmarTanomData)
class SmarTanomDataAdmin(admin.ModelAdmin):
    list_display = ('sensor', 'value', 'created_at')
    list_filter = ('sensor__type',)

@admin.register(WaterLog)
class WaterLogsAdmin(admin.ModelAdmin):
    list_display = ('hydroponic', 'created_at')
    list_filter = ('hydroponic',)