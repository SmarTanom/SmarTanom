import os
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, call_command, CommandError
from django.db import connections


SAFETY_ENV_VARS = (
    # Any of these set to a truthy value ("1", "true", "yes") will allow reset
    "CONFIRM_RESET",
    "DJANGO_ALLOW_RESET",
    "RENDER_ALLOW_RESET",
)


def _is_truthy(value: Optional[str]) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


class Command(BaseCommand):
    help = (
        "Destructively flushes ALL database data and creates a superuser. "
        "Requires one of CONFIRM_RESET/DJANGO_ALLOW_RESET/RENDER_ALLOW_RESET to be truthy."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            nargs="?",
            help="Superuser email (falls back to ADMIN_EMAIL env if omitted)",
        )
        parser.add_argument(
            "--password",
            dest="password",
            type=str,
            help="Superuser password (falls back to ADMIN_PASSWORD env or default in manager)",
        )
        parser.add_argument(
            "--first-name",
            dest="first_name",
            type=str,
            default="",
            help="Optional first name",
        )
        parser.add_argument(
            "--last-name",
            dest="last_name",
            type=str,
            default="",
            help="Optional last name",
        )

    def handle(self, *args, **options):
        # Safety gate
        if not any(_is_truthy(os.getenv(k)) for k in SAFETY_ENV_VARS):
            env_list = ", ".join(SAFETY_ENV_VARS)
            raise CommandError(
                f"Refusing to reset: set one of [{env_list}] to true/1/yes in the environment to proceed."
            )

        # Warn loudly when not in DEBUG (likely production)
        if not settings.DEBUG:
            self.stdout.write(self.style.WARNING("Running in DEBUG=False (production-like) environment."))

        # Determine superuser credentials
        email = (options.get("email") or os.getenv("ADMIN_EMAIL") or "").strip()
        password = options.get("password") or os.getenv("ADMIN_PASSWORD")
        first_name = options.get("first_name")
        last_name = options.get("last_name")

        if not email:
            raise CommandError("Superuser email must be provided as arg or ADMIN_EMAIL env.")

        # Basic DB info for operator visibility
        default_db = settings.DATABASES.get("default", {})
        engine = default_db.get("ENGINE", "")
        name = default_db.get("NAME", "")
        self.stdout.write(self.style.NOTICE(f"Target DB engine: {engine} name: {name}"))

        # Ensure DB connectivity first
        try:
            with connections["default"].cursor() as cur:
                cur.execute("SELECT 1")
                _ = cur.fetchone()
        except Exception as exc:
            raise CommandError(f"Database connection failed: {exc}")

        # Apply migrations just in case schema isn't fully current
        self.stdout.write("Applying migrations…")
        call_command("migrate", interactive=False, verbosity=1)

        # Flush all data
        self.stdout.write(self.style.WARNING("Flushing ALL data from database (this cannot be undone)…"))
        # On Postgres, allow_cascade avoids FK issues
        allow_cascade = "postgresql" in engine
        call_command(
            "flush",
            interactive=False,
            reset_sequences=True,
            allow_cascade=allow_cascade,
            verbosity=1,
        )

        # Recreate superuser
        User = get_user_model()
        self.stdout.write(f"Creating superuser {email}…")
        try:
            user = User.objects.create_superuser(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password,
            )
            # Mark verified to ease first login flows
            if hasattr(user, "is_verified"):
                user.is_verified = True
                user.save(update_fields=["is_verified"])
        except Exception as exc:
            raise CommandError(f"Failed to create superuser: {exc}")

        self.stdout.write(self.style.SUCCESS("Database reset complete and superuser created."))
        self.stdout.write(
            f"Superuser -> email: {email} | password: {'<provided>' if password else '<default in manager>'}"
        )
