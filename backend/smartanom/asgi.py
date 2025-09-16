"""ASGI config for smartanom project.

Exposes the ASGI callable ``application`` for async servers (uvicorn/daphne).
"""

from __future__ import annotations

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")

application = get_asgi_application()

