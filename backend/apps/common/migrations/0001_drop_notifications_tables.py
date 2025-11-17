from django.db import migrations


class Migration(migrations.Migration):
    initial = False

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql=(
                "DROP TABLE IF EXISTS notifications_notificationlog;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=(
                "DROP TABLE IF EXISTS notifications_pushsubscription;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql=(
                "DROP TABLE IF EXISTS notifications_notificationpreferences;"
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
