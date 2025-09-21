"""Root URL configuration for smartanom project."""

from __future__ import annotations

from django.contrib import admin
from django.urls import path, include
from apps.monitoring.views import healthz


urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/monitoring/", include("apps.monitoring.urls")),
	path("api/auth/", include("apps.accounts.urls")),
	path("healthz", healthz, name="healthz"),
	path("api/health/", healthz, name="health-legacy"),
	path("api-auth/", include("rest_framework.urls")),  # browsable API login/logout
]

