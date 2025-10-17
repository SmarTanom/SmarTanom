"""Device app URLs."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DeviceViewSet,
    check_device,
    request_device_otp,
    verify_device_otp,
    get_pending_invitations,
    respond_to_invitation,
    get_shared_devices,
    get_sent_invitations,
    subscribe_notifications,
    cancel_sent_invitation,
    get_user_devices,
    initial_dashboard_data
)

app_name = 'devices'

router = DefaultRouter()
router.register(r"", DeviceViewSet, basename="device")

# IMPORTANT: Place explicit non-model routes BEFORE including the router URLs
# to avoid the default '' route capturing segments like 'check/' as a device PK.
urlpatterns = [
    # Device binding endpoints (anonymous)
    path("check/", check_device, name="check_device"),
    path("request-otp/", request_device_otp, name="request_device_otp"),
    path("verify-otp/", verify_device_otp, name="verify_device_otp"),
    # Device sharing endpoints
    path("invitations/pending/", get_pending_invitations, name="get_pending_invitations"),
    path("invitations/respond/", respond_to_invitation, name="respond_to_invitation"),
    path("invitations/sent/", get_sent_invitations, name="get_sent_invitations"),
    path("invitations/sent/<int:invitation_id>/cancel/", cancel_sent_invitation, name="cancel_sent_invitation"),
    path("shared/", get_shared_devices, name="get_shared_devices"),
    # PWA notifications
    path("notifications/subscribe/", subscribe_notifications, name="subscribe_notifications"),
    # Admin user devices endpoint
    path("users/<int:user_id>/devices/", get_user_devices, name="get_user_devices"),
    # Combined initial dashboard data endpoint
    path("dashboard/initial/", initial_dashboard_data, name="initial_dashboard_data"),
    # Finally include CRUD router
    path("", include(router.urls)),
]
