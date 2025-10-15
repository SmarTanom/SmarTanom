from __future__ import annotations

import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, call_command
from django.db import connection


class Command(BaseCommand):
    help = "Load initial data from fixtures/full_data.json if the database is empty."

    def handle(self, *args, **options):
        # Determine backend project root (backend/)
        backend_root = Path(__file__).resolve().parents[5]
        fixture_path = backend_root / "fixtures" / "full_data.json"

        # If fixture doesn't exist, do nothing but succeed
        if not fixture_path.exists():
            self.stdout.write(self.style.WARNING(f"Fixture not found: {fixture_path}. Skipping load."))
            return

        # Quick emptiness heuristic: if there is any auth user, assume data already present
        User = get_user_model()
        try:
            if User.objects.exists():
                self.stdout.write(self.style.NOTICE("Database already has users; skipping loaddata."))
                return
        except Exception:
            # If the auth_user table doesn't exist yet (first migrate), skip the check
            pass

        # Fallback heuristic: check any table has rows (excluding migration tables)
        try:
            with connection.cursor() as cursor:
                table_names = connection.introspection.table_names()
                non_migration_tables = [
                    t for t in table_names if not t.endswith("_migration") and t != "django_migrations"
                ]
                for table in non_migration_tables:
                    try:
                        cursor.execute(f"SELECT 1 FROM {table} LIMIT 1")
                        if cursor.fetchone():
                            self.stdout.write(self.style.NOTICE("Database has existing rows; skipping loaddata."))
                            return
                    except Exception:
                        # Table might not be queryable yet; ignore
                        continue
        except Exception:
            # If we cannot introspect, continue to try loading
            pass

        # Validate JSON quickly to avoid cryptic loaddata errors
        try:
            _ = json.loads(fixture_path.read_text(encoding="utf-8"))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"Fixture is not valid JSON: {exc}. Skipping load."))
            return

        self.stdout.write(self.style.WARNING("Database appears empty; loading initial data from fixture..."))

        try:
            call_command("loaddata", str(fixture_path))
        except Exception as exc:
            # Do not fail the deployment; just warn
            self.stdout.write(self.style.WARNING(f"loaddata failed: {exc}"))
            return

        self.stdout.write(self.style.SUCCESS("Initial data loaded successfully."))


