from django.db import migrations, models
import django.db.models.deletion


def forwards_create_default_plants(apps, schema_editor):
    Plant = apps.get_model('reservoirs', 'Plant')
    # Seed a minimal set to avoid nulls during migration mapping
    defaults = [
        {
            'plant_name': 'Generic',
            'ppm_min': 300.0,
            'ppm_max': 1200.0,
            'ph_min': 5.5,
            'ph_max': 6.5,
            'water_temp_min': 18.0,
            'water_temp_max': 26.0,
            'light_min': 1000.0,
            'light_max': 50000.0,
        }
    ]
    for d in defaults:
        Plant.objects.get_or_create(plant_name=d['plant_name'], defaults=d)


def forwards_map_reservoirs(apps, schema_editor):
    Plant = apps.get_model('reservoirs', 'Plant')
    Reservoir = apps.get_model('reservoirs', 'Reservoir')

    # Build or get Plant records for distinct existing plant_type values
    existing_types = (
        Reservoir.objects.exclude(plant_type__isnull=True)
        .values_list('plant_type', flat=True)
        .distinct()
    )
    plant_map = {}
    for name in existing_types:
        if not name:
            continue
        plant, _ = Plant.objects.get_or_create(
            plant_name=name,
            defaults={
                'ppm_min': 300.0,
                'ppm_max': 1200.0,
                'ph_min': 5.5,
                'ph_max': 6.5,
                'water_temp_min': 18.0,
                'water_temp_max': 26.0,
                'light_min': 1000.0,
                'light_max': 50000.0,
            },
        )
        plant_map[name] = plant.id

    # Assign FK for each reservoir
    generic_id = Plant.objects.get(plant_name='Generic').id
    for r in Reservoir.objects.all():
        mapped = plant_map.get(getattr(r, 'plant_type', None))
        r.plant_id = mapped or generic_id
        r.save(update_fields=['plant'])


class Migration(migrations.Migration):
    dependencies = [
        ('reservoirs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Plant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('plant_name', models.CharField(max_length=100, unique=True)),
                ('ppm_min', models.FloatField()),
                ('ppm_max', models.FloatField()),
                ('ph_min', models.FloatField()),
                ('ph_max', models.FloatField()),
                ('water_temp_min', models.FloatField()),
                ('water_temp_max', models.FloatField()),
                ('light_min', models.FloatField()),
                ('light_max', models.FloatField()),
            ],
            options={
                'verbose_name': 'Plant',
                'verbose_name_plural': 'Plants',
            },
        ),
        migrations.AddIndex(
            model_name='plant',
            index=models.Index(fields=['plant_name'], name='idx_plant_name'),
        ),
        migrations.AddField(
            model_name='reservoir',
            name='plant',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reservoirs', to='reservoirs.plant'),
        ),
        migrations.RunPython(forwards_create_default_plants, migrations.RunPython.noop),
        migrations.RunPython(forwards_map_reservoirs, migrations.RunPython.noop),
    ]
