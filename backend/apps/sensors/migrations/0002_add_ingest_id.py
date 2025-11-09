from django.db import migrations, models
import django.db.models


class Migration(migrations.Migration):

    dependencies = [
        ("sensors", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="sensordata",
            name="ingest_id",
            field=models.CharField(blank=True, null=True, default=None, max_length=64, db_index=True),
        ),
        migrations.AddIndex(
            model_name="sensordata",
            index=models.Index(fields=["ingest_id"], name="idx_sens_data_ingest"),
        ),
        # Enforce uniqueness only when ingest_id is provided (not null/blank)
        migrations.AddConstraint(
            model_name="sensordata",
            constraint=models.UniqueConstraint(
                fields=("sensor", "ingest_id"),
                name="uniq_sensor_ingest_id",
                condition=(
                    ~django.db.models.Q(ingest_id__isnull=True) & ~django.db.models.Q(ingest_id="")
                ),
            ),
        ),
    ]
