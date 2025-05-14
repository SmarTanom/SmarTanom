from django.db import models
from accounts.models import User

class Hydroponic(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    plant_type = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Hydroponic System"
        verbose_name_plural = "Hydroponic Systems"

    def __str__(self):
        return self.name

class SmarTanom(models.Model):
    id = models.AutoField(primary_key=True)
    hydroponic = models.ForeignKey(Hydroponic, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "SmarTanom"
        verbose_name_plural = "SmarTanom"

    def __str__(self):
        return self.name

class Sensor(models.Model):
    id = models.AutoField(primary_key=True)
    smar_tanom = models.ForeignKey(SmarTanom, on_delete=models.CASCADE)
    type = models.CharField(max_length=50)
    unit = models.CharField(max_length=20)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sensor"
        verbose_name_plural = "Sensors"

    def __str__(self):
        return f"{self.type} Sensor ({self.id})"

class SmarTanomData(models.Model):
    DATA_TYPE_CHOICES = [
        ('temperature', 'Temperature'),
        ('humidity', 'Humidity'),
        ('other', 'Other'),
    ]
    
    id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE)
    value = models.FloatField()
    data_type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, default='other')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "SmarTanom Data"
        verbose_name_plural = "SmarTanom Data"

    def __str__(self):
        return f"Data {self.id} - {self.sensor.type} ({self.data_type})"
    id = models.AutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE)
    value = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "SmarTanom Data"
        verbose_name_plural = "SmarTanom Data"

    def __str__(self):
        return f"Data {self.id} - {self.sensor.type}"

class WaterLog(models.Model):
    id = models.AutoField(primary_key=True)
    hydroponic = models.ForeignKey(Hydroponic, on_delete=models.CASCADE)
    smar_tanom_data = models.ForeignKey(SmarTanomData, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Water Log"
        verbose_name_plural = "Water Logs"

    def __str__(self):
        return f"Water Log {self.id}"