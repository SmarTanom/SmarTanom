"""
WebSocket URL routing configuration for Django Channels.
Maps WebSocket URLs to consumers.
"""
from django.urls import re_path
from apps.devices import consumers

websocket_urlpatterns = [
    # Global device updates (broadcast to all clients)
    re_path(r'ws/devices/$', consumers.DeviceConsumer.as_asgi()),
    re_path(r'ws/devices$', consumers.DeviceConsumer.as_asgi()),

    # User-specific notifications
    re_path(r'ws/user/(?P<user_id>\d+)/$', consumers.UserConsumer.as_asgi()),

    # Device onboarding channel (device connects directly)
    re_path(r'ws/device/(?P<serial>[^/]+)/$', consumers.DeviceOnboardingConsumer.as_asgi()),
    re_path(r'ws/device/(?P<serial>[^/]+)$', consumers.DeviceOnboardingConsumer.as_asgi()),
]
