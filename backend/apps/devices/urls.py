"""Device app URLs."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DeviceViewSet, check_device, request_device_otp, verify_device_otp

app_name = 'devices'

router = DefaultRouter()
router.register(r"devices", DeviceViewSet, basename="device")

urlpatterns = [
    path("", include(router.urls)),
    # Device binding endpoints
    path("check/", check_device, name="check_device"),
    path("request-otp/", request_device_otp, name="request_device_otp"),
    path("verify-otp/", verify_device_otp, name="verify_device_otp"),
]
