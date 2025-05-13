# core/admin.py
from django.contrib import admin
from .models import Hydroponic, SmarTanom, Sensor, SmarTanomData, WaterLog

admin.site.register(Hydroponic)
admin.site.register(SmarTanom)
admin.site.register(Sensor)
admin.site.register(SmarTanomData)
admin.site.register(WaterLog)
