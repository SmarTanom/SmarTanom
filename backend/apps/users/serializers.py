"""Serializers for user authentication and management."""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import OTPCode

User = get_user_model()


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for OTP request."""

    email = serializers.EmailField()


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification."""

    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for user data."""

    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'full_name',
            'is_active',
            'is_staff',
            'is_verified',
            'role',
            'date_joined',
            'last_login',
        ]
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = [
            'username',
            'first_name',
            'last_name',
        ]

    def validate_username(self, value):
        """Validate username format."""
        if value:
            # Check username length
            if len(value) < 3:
                raise serializers.ValidationError("Username must be at least 3 characters long.")

            # Check for valid characters (letters, numbers, underscore, hyphen)
            import re
            if not re.match(r'^[a-zA-Z0-9_-]+$', value):
                raise serializers.ValidationError(
                    "Username can only contain letters, numbers, underscore and hyphen."
                )

        return value
