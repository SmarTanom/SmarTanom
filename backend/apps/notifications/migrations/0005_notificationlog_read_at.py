from django.db import migrations, models
from django.utils import timezone


def forwards(apps, schema_editor):
    NotificationLog = apps.get_model('notifications', 'NotificationLog')
    # Preserve previous implicit "read" semantics: treat existing logs as already read
    # (They were previously considered read if status == 'sent').
    now = timezone.now()
    batch = []
    for log in NotificationLog.objects.filter(read_at__isnull=True):
        # We set read_at to sent_at to reflect historical delivery time
        log.read_at = log.sent_at or now
        batch.append(log)
        if len(batch) >= 500:
            NotificationLog.objects.bulk_update(batch, ['read_at'])
            batch = []
    if batch:
        NotificationLog.objects.bulk_update(batch, ['read_at'])


def backwards(apps, schema_editor):
    NotificationLog = apps.get_model('notifications', 'NotificationLog')
    # Revert: clear read_at so all logs appear unread (best-effort)
    NotificationLog.objects.update(read_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0004_notificationpreferences_quiet_hours_enabled_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationlog',
            name='read_at',
            field=models.DateTimeField(null=True, blank=True, help_text='Timestamp when user marked this alert as read/seen'),
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(fields=['read_at'], name='idx_notif_read_at'),
        ),
        migrations.RunPython(forwards, backwards),
    ]
