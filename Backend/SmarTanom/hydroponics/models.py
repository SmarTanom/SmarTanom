# core/models.py
from django.db import models
from accounts.models import User

class Hydroponic(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    plant_type = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

class SmarTanom(models.Model):
    id = models.AutoField(primary_key=True)
    hydroponic = models.ForeignKey(Hydroponic, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Sensor(models.Model):
    id = models.AutoField(primary_key=True)
    smar_tanom = models.ForeignKey(SmarTanom, on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    unit = models.CharField(max_length=20)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

class SmarTanomData(models.Model):
    id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE)
    value = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class WaterLogs(models.Model):
    id = models.AutoField(primary_key=True)
    hydroponic = models.ForeignKey(Hydroponic, on_delete=models.CASCADE)
    smar_tanom_data = models.ForeignKey(SmarTanomData, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
