from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("devices", "0011_devicecollaboration_added_by_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="device",
            name="wifi_configured",
            field=models.BooleanField(default=False, help_text="Whether device has successfully configured WiFi and phoned home"),
        ),
        migrations.AddIndex(
            model_name="device",
            index=models.Index(fields=["wifi_configured"], name="idx_device_wifi_configured"),
        ),
    ]
