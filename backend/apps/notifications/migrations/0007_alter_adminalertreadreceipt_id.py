from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0006_adminalertreadreceipt'),
    ]

    operations = [
        migrations.AlterField(
            model_name='adminalertreadreceipt',
            name='id',
            field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
        ),
    ]
