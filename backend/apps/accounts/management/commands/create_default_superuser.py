""""""

Create or update a default superuser based on environment variables.Create or update a default superuser based on environment variables.



Env variables used:Env variables used:

  - SUPERUSER_EMAIL (required to act)  - SUPERUSER_EMAIL (required to act)

  - SUPERUSER_PASSWORD (required to create; optional to update unless FORCE_SUPERUSER_PASSWORD=true)  - SUPERUSER_PASSWORD (required to create; optional to update unless FORCE_SUPERUSER_PASSWORD=true)

  - SUPERUSER_FIRST_NAME, SUPERUSER_LAST_NAME, SUPERUSER_USERNAME (optional)  - SUPERUSER_FIRST_NAME, SUPERUSER_LAST_NAME, SUPERUSER_USERNAME (optional)

  - FORCE_SUPERUSER_PASSWORD (optional truthy: 1/true/yes) forces password reset if user exists  - FORCE_SUPERUSER_PASSWORD (optional truthy: 1/true/yes) forces password reset if user exists

  - CREATE_SUPERUSER_ON_DEPLOY (optional truthy gate; if set and falsey, command exits quickly)  - CREATE_SUPERUSER_ON_DEPLOY (optional truthy gate; if set and falsey, command exits quickly)

""""""

import osimport os

from typing import Optionalfrom typing import Optional



from django.core.management import BaseCommandfrom django.core.management import BaseCommand

from django.contrib.auth import get_user_modelfrom django.contrib.auth import get_user_model





def _truthy(value: Optional[str]) -> bool:def _truthy(value: Optional[str]) -> bool:

    return str(value).strip().lower() in {"1", "true", "yes", "y"}	return str(value).strip().lower() in {"1", "true", "yes", "y"}





class Command(BaseCommand):class Command(BaseCommand):

    help = "Create or update a default superuser using SUPERUSER_* environment variables"	help = "Create or update a default superuser using SUPERUSER_* environment variables"



    def handle(self, *args, **options):    def handle(self, *args, **options):

        self.stdout.write("=" * 60)        self.stdout.write("=" * 60)

        self.stdout.write("Running create_default_superuser command...")        self.stdout.write("Running create_default_superuser command...")

        self.stdout.write("=" * 60)        self.stdout.write("=" * 60)

                

        # Optional global gate        # Optional global gate

        gate = os.getenv("CREATE_SUPERUSER_ON_DEPLOY")        gate = os.getenv("CREATE_SUPERUSER_ON_DEPLOY")

        if gate is not None and not _truthy(gate):        if gate is not None and not _truthy(gate):

            self.stdout.write("CREATE_SUPERUSER_ON_DEPLOY is set but falsey; skipping.")            self.stdout.write("CREATE_SUPERUSER_ON_DEPLOY is set but falsey; skipping.")

            return            return



        email = (os.getenv("SUPERUSER_EMAIL") or os.getenv("ADMIN_EMAIL") or "").strip()        email = (os.getenv("SUPERUSER_EMAIL") or os.getenv("ADMIN_EMAIL") or "").strip()

        password = os.getenv("SUPERUSER_PASSWORD") or os.getenv("ADMIN_PASSWORD")        password = os.getenv("SUPERUSER_PASSWORD") or os.getenv("ADMIN_PASSWORD")

        first_name = os.getenv("SUPERUSER_FIRST_NAME", "")        first_name = os.getenv("SUPERUSER_FIRST_NAME", "")

        last_name = os.getenv("SUPERUSER_LAST_NAME", "")        last_name = os.getenv("SUPERUSER_LAST_NAME", "")

        username = os.getenv("SUPERUSER_USERNAME") or os.getenv("ADMIN_USERNAME")        username = os.getenv("SUPERUSER_USERNAME") or os.getenv("ADMIN_USERNAME")

        force_pw = _truthy(os.getenv("FORCE_SUPERUSER_PASSWORD"))        force_pw = _truthy(os.getenv("FORCE_SUPERUSER_PASSWORD"))



        self.stdout.write(f"Environment check:")        self.stdout.write(f"Environment check:")

        self.stdout.write(f"  SUPERUSER_EMAIL: {'SET' if email else 'NOT SET'}")        self.stdout.write(f"  SUPERUSER_EMAIL: {'SET' if email else 'NOT SET'}")

        self.stdout.write(f"  SUPERUSER_PASSWORD: {'SET' if password else 'NOT SET'}")        self.stdout.write(f"  SUPERUSER_PASSWORD: {'SET' if password else 'NOT SET'}")

        self.stdout.write(f"  FORCE_SUPERUSER_PASSWORD: {force_pw}")        self.stdout.write(f"  FORCE_SUPERUSER_PASSWORD: {force_pw}")



        if not email:        if not email:

            self.stdout.write(self.style.WARNING("SUPERUSER_EMAIL not set; skipping create_default_superuser."))            self.stdout.write(self.style.WARNING("SUPERUSER_EMAIL not set; skipping create_default_superuser."))

            return            return		User = get_user_model()



        User = get_user_model()		user = User.objects.filter(email__iexact=email).first()

		if not user:

        user = User.objects.filter(email__iexact=email).first()			if not password:

        if not user:				self.stdout.write(self.style.ERROR("SUPERUSER_PASSWORD missing; cannot create superuser."))

            if not password:				return

                self.stdout.write(self.style.ERROR("SUPERUSER_PASSWORD missing; cannot create superuser."))			user = User.objects.create_superuser(

                return				email=email,

            user = User.objects.create_superuser(				first_name=first_name,

                email=email,				last_name=last_name,

                first_name=first_name,				password=password,

                last_name=last_name,			)

                password=password,			# Optional username

            )			if username:

            # Optional username				try:

            if username:					user.username = username

                try:					user.save(update_fields=["username"])

                    user.username = username				except Exception as exc:

                    user.save(update_fields=["username"])					self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))

                except Exception as exc:			# Mark as verified if field exists

                    self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))			if hasattr(user, "is_verified"):

            # Mark as verified if field exists				user.is_verified = True

            if hasattr(user, "is_verified"):				user.save(update_fields=["is_verified"])

                user.is_verified = True			self.stdout.write(self.style.SUCCESS(f"Created superuser: {email}"))

                user.save(update_fields=["is_verified"])			return

            self.stdout.write(self.style.SUCCESS(f"Created superuser: {email}"))

            return		# Ensure staff/superuser

		changes = []

        # Ensure staff/superuser		if not user.is_staff:

        changes = []			user.is_staff = True

        if not user.is_staff:			changes.append("is_staff=True")

            user.is_staff = True		if not user.is_superuser:

            changes.append("is_staff=True")			user.is_superuser = True

        if not user.is_superuser:			changes.append("is_superuser=True")

            user.is_superuser = True		# Update profile names if provided

            changes.append("is_superuser=True")		if first_name and user.first_name != first_name:

        # Update profile names if provided			user.first_name = first_name

        if first_name and user.first_name != first_name:			changes.append("first_name")

            user.first_name = first_name		if last_name and user.last_name != last_name:

            changes.append("first_name")			user.last_name = last_name

        if last_name and user.last_name != last_name:			changes.append("last_name")

            user.last_name = last_name		if username and user.username != username:

            changes.append("last_name")			try:

        if username and user.username != username:				user.username = username

            try:				changes.append("username")

                user.username = username			except Exception as exc:

                changes.append("username")				self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))

            except Exception as exc:

                self.stdout.write(self.style.WARNING(f"Could not set username: {exc}"))		if changes:

			user.save()

        if changes:

            user.save()		# Reset password only if requested

		if force_pw and password:

        # Reset password only if requested			user.set_password(password)

        if force_pw and password:			user.save(update_fields=["password"])

            user.set_password(password)			changes.append("password reset")

            user.save(update_fields=["password"])

            changes.append("password reset")		if changes:

			self.stdout.write(self.style.SUCCESS(f"Updated superuser {email}: {', '.join(changes)}"))

        if changes:		else:

            self.stdout.write(self.style.SUCCESS(f"Updated superuser {email}: {', '.join(changes)}"))			self.stdout.write(f"Superuser {email} already present; no changes.")

        else:
            self.stdout.write(f"Superuser {email} already present; no changes.")
