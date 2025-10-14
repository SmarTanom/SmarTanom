from django.apps import AppConfig


class DevicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.devices'
    verbose_name = 'Device Management'

    def ready(self):
        """Import signal handlers when app is ready."""
        import apps.devices.signals  # noqa

