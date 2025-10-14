from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reservoirs", "0003_drop_plant_type_enforce_nonnull"),
    ]

    operations = [
        migrations.AddField(
            model_name="plant",
            name="environment_temp_min",
            field=models.FloatField(default=18.0),
        ),
        migrations.AddField(
            model_name="plant",
            name="environment_temp_max",
            field=models.FloatField(default=28.0),
        ),
        migrations.AddField(
            model_name="plant",
            name="humidity_min",
            field=models.FloatField(default=40.0),
        ),
        migrations.AddField(
            model_name="plant",
            name="humidity_max",
            field=models.FloatField(default=70.0),
        ),
    ]
