"""
Create or update a default superuser based on environment variables.

Env variables used:
  - SUPERUSER_EMAIL (required to act)
  - SUPERUSER_PASSWORD (required to create; optional to update unless FORCE_SUPERUSER_PASSWORD=true)
  - SUPERUSER_FIRST_NAME, SUPERUSER_LAST_NAME, SUPERUSER_USERNAME (optional)
  - FORCE_SUPERUSER_PASSWORD (optional truthy: 1/true/yes) forces password reset if user exists
  - CREATE_SUPERUSER_ON_DEPLOY (optional truthy gate; if set and falsey, command exits quickly)
"""
import os
from typing import Optional

from django.core.management import BaseCommand
from django.contrib.auth import get_user_model


def _truthy(value: Optional[str]) -> bool:
	return str(value).strip().lower() in {"1", "true", "yes", "y"}


class Command(BaseCommand):
	help = "Create or update a default superuser using SUPERUSER_* environment variables"

	def handle(self, *args, **options):
		self.stdout.write("=" * 60)
		self.stdout.write("Running create_default_superuser command...")
		self.stdout.write("=" * 60)
		
		# Optional global gate
		gate = os.getenv("CREATE_SUPERUSER_ON_DEPLOY")
		if gate is not None and not _truthy(gate):
			self.stdout.write("CREATE_SUPERUSER_ON_DEPLOY is set but falsey; skipping.")
			return

		email = (os.getenv("SUPERUSER_EMAIL") or os.getenv("ADMIN_EMAIL") or "").strip()
		password = os.getenv("SUPERUSER_PASSWORD") or os.getenv("ADMIN_PASSWORD")
		first_name = os.getenv("SUPERUSER_FIRST_NAME", "")
		last_name = os.getenv("SUPERUSER_LAST_NAME", "")
		username = os.getenv("SUPERUSER_USERNAME") or os.getenv("ADMIN_USERNAME")
		force_pw = _truthy(os.getenv("FORCE_SUPERUSER_PASSWORD"))

		self.stdout.write(f"Environment check:")
		self.stdout.write(f"  SUPERUSER_EMAIL: {'SET' if email else 'NOT SET'}")
		self.stdout.write(f"  SUPERUSER_PASSWORD: {'SET' if password else 'NOT SET'}")
		self.stdout.write(f"  FORCE_SUPERUSER_PASSWORD: {force_pw}")

		if not email:
			self.stdout.write(self.style.WARNING("SUPERUSER_EMAIL not set; skipping create_default_superuser."))
			return

		User = get_user_model()

		user = User.objects.filter(email__iexact=email).first()
		if not user:
			if not password:
				self.stdout.write(self.style.ERROR("SUPERUSER_PASSWORD missing; cannot create superuser."))
				return
			user = User.objects.create_superuser(
				email=email,
				first_name=first_name,
				last_name=last_name,
				password=password,
			)
			# Optional username
			if username:
				try:
					user.username = username
					user.save(update_fields=["username"])
				except Exception as exc:
					self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))
			# Mark as verified if field exists
			if hasattr(user, "is_verified"):
				user.is_verified = True
				user.save(update_fields=["is_verified"])
			self.stdout.write(self.style.SUCCESS(f"Created superuser: {email}"))
			return

		# Ensure staff/superuser
		changes = []
		if not user.is_staff:
			user.is_staff = True
			changes.append("is_staff=True")
		if not user.is_superuser:
			user.is_superuser = True
			changes.append("is_superuser=True")
		# Update profile names if provided
		if first_name and user.first_name != first_name:
			user.first_name = first_name
			changes.append("first_name")
		if last_name and user.last_name != last_name:
			user.last_name = last_name
			changes.append("last_name")
		if username and user.username != username:
			try:
				user.username = username
				changes.append("username")
			except Exception as exc:
				self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))

		if changes:
			user.save()

		# Reset password only if requested
		if force_pw and password:
			user.set_password(password)
			user.save(update_fields=["password"])
			changes.append("password reset")

		if changes:
			self.stdout.write(self.style.SUCCESS(f"Updated superuser {email}: {', '.join(changes)}"))
		else:
			self.stdout.write(f"Superuser {email} already present; no changes.")
