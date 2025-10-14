"""
ASGI config for smartanom project.

Supports both HTTP (Django) and WebSocket (Channels) protocols.
Used by Daphne server for real-time WebSocket connections.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")

# Initialize Django ASGI application early to ensure models are loaded
django_asgi_app = get_asgi_application()

# Import routing after Django setup to avoid AppRegistryNotReady errors
from smartanom.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # HTTP requests handled by Django
    "http": django_asgi_app,

    # WebSocket requests handled by Channels
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})

