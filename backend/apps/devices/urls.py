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
    subscribe_notifications
)

app_name = 'devices'

router = DefaultRouter()
router.register(r"devices", DeviceViewSet, basename="device")

urlpatterns = [
    path("", include(router.urls)),
    # Device binding endpoints
    path("check/", check_device, name="check_device"),
    path("request-otp/", request_device_otp, name="request_device_otp"),
    path("verify-otp/", verify_device_otp, name="verify_device_otp"),
    # Device sharing endpoints
    path("invitations/pending/", get_pending_invitations, name="get_pending_invitations"),
    path("invitations/respond/", respond_to_invitation, name="respond_to_invitation"),
    path("invitations/sent/", get_sent_invitations, name="get_sent_invitations"),
    path("shared/", get_shared_devices, name="get_shared_devices"),
    # PWA notifications
    path("notifications/subscribe/", subscribe_notifications, name="subscribe_notifications"),
]
