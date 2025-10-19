from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('devices', '0001_initial'),
        ('reservoirs', '0001_initial'),
        ('sensors', '0006_add_performance_indexes'),
    ]

    operations = [
        migrations.CreateModel(
            name='Alert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('metric', models.CharField(choices=[('ph', 'pH'), ('tds', 'TDS (ppm)'), ('ec', 'Electrical Conductivity (mS/cm)'), ('light', 'Light (lux)'), ('environment_temp', 'Environment Temperature (°C)'), ('water_temperature', 'Water Temperature (°C)'), ('humidity', 'Humidity (%)')], db_index=True, max_length=32)),
                ('trigger', models.CharField(choices=[('below_min', 'Below minimum'), ('near_min', 'Near minimum'), ('near_max', 'Near maximum'), ('above_max', 'Above maximum')], db_index=True, max_length=32)),
                ('severity', models.CharField(choices=[('warning', 'Warning'), ('critical', 'Critical')], db_index=True, max_length=16)),
                ('value', models.FloatField(help_text='Measured sensor value that triggered this alert')),
                ('unit', models.CharField(blank=True, default='', max_length=32)),
                ('min_threshold', models.FloatField(blank=True, null=True)),
                ('max_threshold', models.FloatField(blank=True, null=True)),
                ('buffer', models.FloatField(blank=True, help_text='Near-threshold buffer used for near_* triggers', null=True)),
                ('plant_name', models.CharField(blank=True, default='', max_length=100)),
                ('plant_category', models.CharField(choices=[('Lettuce', 'Lettuce'), ('Basil', 'Basil'), ('Pechay', 'Pechay'), ('Generic', 'Generic')], db_index=True, default='Generic', max_length=32)),
                ('title', models.CharField(max_length=255)),
                ('recommendation', models.TextField()),
                ('is_acknowledged', models.BooleanField(default=False)),
                ('acknowledged_at', models.DateTimeField(blank=True, null=True)),
                ('is_resolved', models.BooleanField(default=False)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('device', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='devices.device')),
                ('reservoir', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='reservoirs.reservoir')),
                ('sensor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='sensors.sensor')),
            ],
            options={
                'verbose_name': 'Alert',
                'verbose_name_plural': 'Alerts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['device', 'created_at'], name='idx_alert_device_created'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['sensor'], name='idx_alert_sensor'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['metric', 'trigger'], name='idx_alert_metric_trigger'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['severity'], name='idx_alert_severity'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['is_resolved', 'created_at'], name='idx_alert_resolved_created'),
        ),
    ]
