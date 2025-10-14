from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('reservoirs', '0002_create_plant_and_fk'),
    ]

    operations = [
        migrations.AlterField(
            model_name='reservoir',
            name='plant',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reservoirs', to='reservoirs.plant'),
        ),
        migrations.RemoveField(
            model_name='reservoir',
            name='plant_type',
        ),
    ]
