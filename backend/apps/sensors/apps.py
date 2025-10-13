from django.apps import AppConfig


class SensorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sensors'
    verbose_name = 'Sensor Management'

    def ready(self):
        """Import signal handlers when the app is ready."""
        import apps.sensors.signals  # noqa: F401
