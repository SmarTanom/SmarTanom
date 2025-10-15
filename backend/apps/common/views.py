"""Common views and mixins."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from django.db import connections
from django.db.utils import OperationalError


class BaseAuthViewSet(viewsets.ModelViewSet):
    """Base viewset with authentication and common filter configuration."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-created_at']


@api_view(["GET", "HEAD"])
@permission_classes([AllowAny])
@renderer_classes([JSONRenderer])  # Disable browsable API for health checks
def healthz(request):
    """Health check endpoint to verify API and database status.

    Supports both GET (with response body) and HEAD (lightweight, no body)
    requests for uptime monitoring. Returns pure JSON without DRF browsable API.
    """
    if request.method == "HEAD":
        # Lightweight liveness probe with no body
        try:
            connections["default"].cursor()
            return Response(status=200)
        except OperationalError:
            return Response(status=503)

    # GET request with full status details
    db_ok = True
    try:
        connections["default"].cursor()
    except OperationalError:
        db_ok = False
    return Response({"status": "ok" if db_ok else "degraded", "db": db_ok})
