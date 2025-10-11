"""Device app serializers."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers
import re

from .models import Device, DeviceOTPCode

User = get_user_model()


class DeviceCheckSerializer(serializers.Serializer):
    """Serializer for checking if device exists."""

    serial_number = serializers.CharField(max_length=12)

    def validate_serial_number(self, value):
        """Validate and normalize serial number."""
        if not value:
            raise serializers.ValidationError("Serial number is required.")

        # Remove any spaces or special characters except hyphens
        serial = re.sub(r'[^A-Z0-9-]', '', value.upper().strip())

        # Check format SMRT-XXX-XXX
        pattern = r'^SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}$'
        if not re.match(pattern, serial):
            raise serializers.ValidationError("Serial number must be in format SMRT-XXX-XXX.")

        return serial


class DeviceBindRequestSerializer(serializers.Serializer):
    """Serializer for device binding OTP request."""

    serial_number = serializers.CharField(max_length=12)
    email = serializers.EmailField()

    def validate_serial_number(self, value):
        """Validate and normalize serial number."""
        if not value:
            raise serializers.ValidationError("Serial number is required.")

        # Remove any spaces or special characters except hyphens
        serial = re.sub(r'[^A-Z0-9-]', '', value.upper().strip())

        # Check format SMRT-XXX-XXX
        pattern = r'^SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}$'
        if not re.match(pattern, serial):
            raise serializers.ValidationError("Serial number must be in format SMRT-XXX-XXX.")

        return serial

    def validate_email(self, value):
        """Validate email format and normalize."""
        if not value:
            raise serializers.ValidationError("Email is required.")

        # Basic email validation (Django's EmailField handles most of this)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise serializers.ValidationError("Please enter a valid email address.")

        return value.lower().strip()


class DeviceBindVerifySerializer(serializers.Serializer):
    """Serializer for device binding OTP verification."""

    serial_number = serializers.CharField(max_length=12)
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate_serial_number(self, value):
        """Validate and normalize serial number."""
        if not value:
            raise serializers.ValidationError("Serial number is required.")

        # Remove any spaces or special characters except hyphens
        serial = re.sub(r'[^A-Z0-9-]', '', value.upper().strip())

        # Check format SMRT-XXX-XXX
        pattern = r'^SMRT-[A-Z0-9]{3}-[A-Z0-9]{3}$'
        if not re.match(pattern, serial):
            raise serializers.ValidationError("Serial number must be in format SMRT-XXX-XXX.")

        return serial

    def validate_email(self, value):
        """Validate and normalize email."""
        return value.lower().strip()

    def validate_code(self, value):
        """Validate OTP code format."""
        if not value:
            raise serializers.ValidationError("OTP code is required.")

        # Remove any spaces or special characters
        code = re.sub(r'[^0-9]', '', value)

        if len(code) != 6:
            raise serializers.ValidationError("OTP code must be exactly 6 digits.")

        if not code.isdigit():
            raise serializers.ValidationError("OTP code must contain only numbers.")

        return code


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model."""

    plant_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Device
        fields = [
            "id",
            "device_serial",
            "device_name",
            "status",
            "is_bound",
            "bound_email",
            "plant_photo",
            "plant_photo_url",
            "plant_name",
            "plant_variety",
            "plant_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "device_serial", "is_bound", "bound_email", "plant_photo_url", "created_at", "updated_at"]

    def get_plant_photo_url(self, obj):
        """Get the full URL for the plant photo."""
        if obj.plant_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.plant_photo.url)
            return obj.plant_photo.url
        return None


class DeviceOTPCodeSerializer(serializers.ModelSerializer):
    """Serializer for DeviceOTPCode model (admin view)."""

    device_serial = serializers.CharField(source="device.device_serial", read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = DeviceOTPCode
        fields = [
            'id',
            'device',
            'device_serial',
            'email',
            'code',
            'created_at',
            'expires_at',
            'is_verified',
            'is_expired',
            'is_valid',
            'attempts',
            'max_attempts'
        ]
        read_only_fields = [
            'id',
            'code',
            'created_at',
            'expires_at',
            'is_expired',
            'is_valid'
        ]
