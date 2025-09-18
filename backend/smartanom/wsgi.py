"""WSGI config for smartanom project.

It exposes the WSGI callable as a module-level variable named ``application``.
This is used by Django's runserver and traditional WSGI servers (gunicorn, uWSGI).
"""

from __future__ import annotations

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")

application = get_wsgi_application()

