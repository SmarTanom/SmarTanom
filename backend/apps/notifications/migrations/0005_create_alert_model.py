from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('devices', '0001_initial'),
        ('reservoirs', '0001_initial'),
        ('sensors', '0001_initial'),
        ('notifications', '0004_notificationpreferences_quiet_hours_enabled_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Alert',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('sensor_type', models.CharField(db_index=True, max_length=30)),
                ('metric_name', models.CharField(help_text='Duplicate of sensor_type for UI flexibility', max_length=50)),
                ('measured_value', models.FloatField()),
                ('unit', models.CharField(blank=True, default='', max_length=20)),
                ('threshold_min', models.FloatField(blank=True, null=True)),
                ('threshold_max', models.FloatField(blank=True, null=True)),
                ('classification', models.CharField(choices=[('below_min', 'Below Min'), ('near_min', 'Near Min'), ('above_max', 'Above Max'), ('near_max', 'Near Max'), ('normal', 'Normal'), ('special', 'Special')], db_index=True, default='normal', max_length=20)),
                ('severity', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')], db_index=True, default='info', max_length=10)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('recommendation', models.TextField(blank=True)),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('archived', models.BooleanField(db_index=True, default=False)),
                ('device', models.ForeignKey(help_text='Device where the alert originated', on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='devices.device')),
                ('plant', models.ForeignKey(blank=True, help_text='Plant thresholds used (optional)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='reservoirs.plant')),
                ('reading', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='sensors.sensordata')),
                ('reservoir', models.ForeignKey(blank=True, help_text='Reservoir context at time of alert (optional)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='reservoirs.reservoir')),
                ('sensor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='alerts', to='sensors.sensor')),
                ('user', models.ForeignKey(help_text='Primary user recipient (typically device owner)', on_delete=django.db.models.deletion.CASCADE, related_name='alerts', to='accounts.user')),
            ],
            options={
                'verbose_name': 'Alert',
                'verbose_name_plural': 'Alerts',
                'ordering': ('-created_at',),
            },
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['user', 'created_at'], name='idx_alert_user_created'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['device', 'created_at'], name='idx_alert_device_created'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['sensor_type', 'created_at'], name='idx_alert_sensor_created'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['severity'], name='idx_alert_severity'),
        ),
        migrations.AddIndex(
            model_name='alert',
            index=models.Index(fields=['is_read'], name='idx_alert_is_read'),
        ),
    ]
