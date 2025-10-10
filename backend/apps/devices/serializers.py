"""Device app serializers."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Device

User = get_user_model()


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model."""

    user_id = serializers.PrimaryKeyRelatedField(
        source="user", queryset=User.objects.all(), write_only=True
    )
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Device
        fields = [
            "id",
            "user",
            "user_id",
            "device_name",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
