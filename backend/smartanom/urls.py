"""Root URL configuration for smartanom project."""

from __future__ import annotations

from django.contrib import admin
from django.urls import path, include
from apps.common.views import healthz


urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/devices/", include("apps.devices.urls")),
	path("api/sensors/", include("apps.sensors.urls")),
	path("api/reservoirs/", include("apps.reservoirs.urls")),
	path("api/auth/", include("apps.accounts.urls")),  # Using original auth URL
	path("api/health/", include("apps.common.urls")),
	path("healthz", healthz, name="healthz"),
	path("api-auth/", include("rest_framework.urls")),  # browsable API login/logout
]

