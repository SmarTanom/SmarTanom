"""Common serializer mixins."""

from __future__ import annotations

from rest_framework import serializers


class TimeStampedSerializerMixin:
    """Mixin to include created_at and updated_at in read_only_fields."""

    def get_read_only_fields(self):
        """Add timestamp fields to read_only_fields."""
        fields = super().get_read_only_fields() if hasattr(super(), 'get_read_only_fields') else []
        return list(fields) + ['created_at', 'updated_at']
