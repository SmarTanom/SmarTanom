"""Management command to purge old SensorData rows.

Usage:
  python manage.py purge_old_sensordata --days 30

Deletes SensorData older than the specified number of days. Use with caution.
"""

from __future__ import annotations

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.sensors.models import SensorData


class Command(BaseCommand):
    help = "Purge old SensorData rows beyond retention window"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90, help="Retention in days (default: 90)")
        parser.add_argument("--dry-run", action="store_true", help="Only count rows to be deleted")

    def handle(self, *args, **options):
        days = options["days"]
        dry = options["dry_run"]
        cutoff = timezone.now() - timedelta(days=days)
        qs = SensorData.objects.filter(created_at__lt=cutoff)
        count = qs.count()
        if dry:
            self.stdout.write(self.style.WARNING(f"[DRY RUN] Would delete {count} SensorData rows older than {days} days"))
            return
        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} SensorData rows older than {days} days"))
