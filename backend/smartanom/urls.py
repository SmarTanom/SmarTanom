"""Root URL configuration for smartanom project."""

from __future__ import annotations

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.common.views import healthz


urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/devices/", include("apps.devices.urls")),
	path("api/sensors/", include("apps.sensors.urls")),
	path("api/reservoirs/", include("apps.reservoirs.urls")),
	path("api/auth/", include("apps.accounts.urls")),  # Using original auth URL
	path("api/notifications/", include("apps.notifications.urls")),  # Push notifications
	path("api/health/", include("apps.common.urls")),
	path("healthz", healthz, name="healthz"),
	path("api-auth/", include("rest_framework.urls")),  # browsable API login/logout
]

# Serve media files during development
if settings.DEBUG:
	urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

