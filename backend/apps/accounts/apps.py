import os
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    verbose_name = 'Authentication'

    def ready(self):
        """Import signals when the app is ready."""
        # Delay import to avoid AppRegistryNotReady when migrations run
        from django.db.models.signals import post_migrate
        from django.contrib.auth import get_user_model

        def _create_superuser(sender, **kwargs):
            User = get_user_model()
            email = os.getenv('SUPERUSER_EMAIL') or os.getenv('ADMIN_EMAIL')
            username = os.getenv('SUPERUSER_USERNAME') or email
            password = os.getenv('SUPERUSER_PASSWORD')
            if not email or not password:
                return
            if not User.objects.filter(email=email).exists():
                User.objects.create_superuser(username=username, email=email, password=password)

        # Connect post_migrate signal to ensure superuser exists after migrations
        post_migrate.connect(_create_superuser)
