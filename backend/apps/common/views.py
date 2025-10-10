"""Common views and mixins."""

from __future__ import annotations

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connections
from django.db.utils import OperationalError


class BaseAuthViewSet(viewsets.ModelViewSet):
    """Base viewset with authentication and common filter configuration."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-created_at']


@api_view(["GET"])
@permission_classes([AllowAny])
def healthz(request):
    """Health check endpoint to verify API and database status."""
    db_ok = True
    try:
        connections["default"].cursor()
    except OperationalError:
        db_ok = False
    return Response({"status": "ok" if db_ok else "degraded", "db": db_ok})
