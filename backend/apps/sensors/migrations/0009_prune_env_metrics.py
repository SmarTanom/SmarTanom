from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sensors", "0008_alter_alert_created_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sensor",
            name="sensor_type",
            field=models.CharField(
                max_length=30,
                choices=[
                    ("ph", "pH Sensor"),
                    ("tds", "TDS Sensor (ppm)"),
                    ("ec", "Electrical Conductivity (mS/cm)"),
                    ("water_temperature", "Water Temperature Sensor (°C)"),
                    ("water_level", "Water Level Sensor"),
                    ("turbidity", "Turbidity Sensor (NTU)"),
                ],
                db_index=True,
            ),
        ),
        migrations.AlterField(
            model_name="alert",
            name="metric",
            field=models.CharField(
                max_length=32,
                choices=[
                    ("ph", "pH"),
                    ("tds", "TDS (ppm)"),
                    ("ec", "Electrical Conductivity (mS/cm)"),
                    ("water_temperature", "Water Temperature (°C)"),
                ],
                db_index=True,
            ),
        ),
    ]
