from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reservoirs", "0004_add_env_fields_to_plant"),
    ]

    operations = [
        migrations.AddField(
            model_name="plant",
            name="ec_min",
            field=models.FloatField(default=0.0),
        ),
        migrations.AddField(
            model_name="plant",
            name="ec_max",
            field=models.FloatField(default=0.0),
        ),
    ]
