"""Root URL configuration for smartanom project."""

from __future__ import annotations

from django.contrib import admin
from django.http import JsonResponse, HttpRequest
from django.urls import path, include


def health(_: HttpRequest):
	return JsonResponse({"status": "ok"})


urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/monitoring/", include("apps.monitoring.urls")),
	path("api/auth/", include("apps.accounts.urls")),
	path("api/health/", health, name="health"),
	path("api-auth/", include("rest_framework.urls")),  # browsable API login/logout
]

