from django.db import migrations


class Migration(migrations.Migration):
    """
    No-op placeholder migration to resolve a numbering conflict.
    The actual Alert model is created in migration 0005.
    """

    dependencies = [
        ('notifications', '0002_notificationpreferences'),
    ]

    operations = []
