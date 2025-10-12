"""Device app serializers."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers
import re

from .models import Device, DeviceOTPCode, DeviceCollaboration, DeviceInvitation

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
    # Optional metadata that can be provided during first-time setup
    location = serializers.CharField(max_length=200, required=False, allow_blank=True)
    device_name = serializers.CharField(max_length=100, required=False, allow_blank=True)

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
            "location",
            "status",
            "is_bound",
            "bound_email",
            "plant_photo",
            "plant_photo_url",
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


# Device Collaboration Serializers

class DeviceShareRequestSerializer(serializers.Serializer):
    """Serializer for sharing a device with another user."""

    invite_email = serializers.EmailField(
        help_text="Email address to share device with"
    )
    permissions = serializers.ChoiceField(
        choices=['view_only', 'manage'],
        default='view_only',
        help_text="Permission level for the collaborator"
    )
    message = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional message to include in invitation"
    )

    def validate_invite_email(self, value):
        """Validate that user isn't sharing with themselves."""
        request = self.context.get('request')
        if request and request.user.email == value:
            raise serializers.ValidationError("You cannot share a device with yourself.")
        return value


class DeviceCollaborationSerializer(serializers.ModelSerializer):
    """Serializer for DeviceCollaboration model."""

    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_serial = serializers.CharField(source='device.device_serial', read_only=True)
    shared_date = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = DeviceCollaboration
        fields = [
            'id',
            'device',
            'device_name',
            'device_serial',
            'collaborator_email',
            'permissions',
            'status',
            'shared_by_email',
            'shared_date',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'device_name',
            'device_serial',
            'shared_date',
            'created_at',
            'updated_at'
        ]


class DeviceInvitationSerializer(serializers.ModelSerializer):
    """Serializer for DeviceInvitation model."""

    device_name = serializers.CharField(source='device.device_name', read_only=True)
    device_serial = serializers.CharField(source='device.device_serial', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = DeviceInvitation
        fields = [
            'id',
            'device',
            'device_name',
            'device_serial',
            'invite_email',
            'invited_by_email',
            'status',
            'message',
            'permissions',
            'token',
            'expires_at',
            'is_expired',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'device_name',
            'device_serial',
            'token',
            'expires_at',
            'is_expired',
            'created_at',
            'updated_at'
        ]


class InvitationResponseSerializer(serializers.Serializer):
    """Serializer for accepting/declining invitations."""

    action = serializers.ChoiceField(
        choices=['accept', 'decline'],
        help_text="Action to take on the invitation"
    )
    token = serializers.CharField(
        max_length=64,
        help_text="Invitation token"
    )
