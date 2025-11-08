from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sensors", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sensordata",
            name="ingest_id",
            field=models.CharField(blank=True, default="", max_length=64, db_index=True),
        ),
        migrations.AddConstraint(
            model_name="sensordata",
            constraint=models.UniqueConstraint(fields=("sensor", "ingest_id"), name="uniq_sensor_ingest_id"),
        ),
        migrations.AddIndex(
            model_name="sensordata",
            index=models.Index(fields=["ingest_id"], name="idx_sens_data_ingest"),
        ),
    ]
