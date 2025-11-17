"""Root URL configuration for smartanom project."""

from __future__ import annotations

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from apps.common.views import healthz
from apps.common.views_admin import AdminDashboardViewSet

# Router for admin dashboard API
admin_router = DefaultRouter()
admin_router.register(r'dashboard', AdminDashboardViewSet, basename='admin-dashboard')

urlpatterns = [
	path("admin/", admin.site.urls),
	path("api/devices/", include("apps.devices.urls")),
	path("api/sensors/", include("apps.sensors.urls")),
	path("api/reservoirs/", include("apps.reservoirs.urls")),
	path("api/auth/", include("apps.accounts.urls")),  # Using original auth URL
	# Removed notifications endpoints (PushSubscription, NotificationLog, Preferences)
	path("api/admin/", include(admin_router.urls)),  # Admin dashboard API
	path("api/health/", include("apps.common.urls")),
	path("healthz", healthz, name="healthz"),
	path("api-auth/", include("rest_framework.urls")),  # browsable API login/logout
]

# Serve media files during development
if settings.DEBUG:
	urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
	# Minimal media serving in production (interim). For scalable/prod use, move to object storage (e.g., S3/Blob) or CDN.
	from django.views.static import serve as static_serve  # noqa: WPS433 (runtime import by env)
	urlpatterns += [
		path("media/<path:path>", static_serve, {"document_root": settings.MEDIA_ROOT}),
	]

