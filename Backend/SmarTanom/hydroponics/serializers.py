from rest_framework import serializers
from .models import Hydroponic

class HydroponicSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hydroponic
        fields = ['name', 'plant_type']