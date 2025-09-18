from django.db import migrations


def forwards(apps, schema_editor):
    Sensor = apps.get_model("monitoring", "Sensor")

    # Map 'other' sensors by unit
    other = Sensor.objects.filter(sensor_type="other")
    other.filter(unit__iexact="ppm").update(sensor_type="co2")
    other.filter(unit__in=["%", "percent", "percentage"]).update(sensor_type="water_level")
    other.filter(unit__iexact="NTU").update(sensor_type="turbidity")

    # Map generic 'temperature' to 'water_temperature' to disambiguate
    Sensor.objects.filter(sensor_type="temperature").update(sensor_type="water_temperature")


def backwards(apps, schema_editor):
    Sensor = apps.get_model("monitoring", "Sensor")
    # Revert mappings to 'other' where we can infer via unit
    Sensor.objects.filter(sensor_type="co2", unit__iexact="ppm").update(sensor_type="other")
    Sensor.objects.filter(sensor_type="water_level", unit__in=["%", "percent", "percentage"]).update(sensor_type="other")
    Sensor.objects.filter(sensor_type="turbidity", unit__iexact="NTU").update(sensor_type="other")
    # Revert water_temperature back to temperature
    Sensor.objects.filter(sensor_type="water_temperature").update(sensor_type="temperature")


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0002_extend_sensor_types"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
