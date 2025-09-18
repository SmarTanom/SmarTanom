from django.db import migrations


def forwards(apps, schema_editor):
    # No data transformation required; existing 'temperature' remains valid.
    # Old 'other' sensors may exist; leave as-is, they will no longer be created by the seeder.
    pass


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
