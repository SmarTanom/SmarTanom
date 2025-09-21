from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OTPCode
import re

User = get_user_model()


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for OTP request."""
    
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=OTPCode.PURPOSE_CHOICES,
        default=OTPCode.PURPOSE_LOGIN
    )
    
    def validate_email(self, value):
        """Validate email format and normalize."""
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        # Basic email validation (Django's EmailField handles most of this)
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, value):
            raise serializers.ValidationError("Please enter a valid email address.")
        
        return value.lower().strip()


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(
        choices=OTPCode.PURPOSE_CHOICES,
        default=OTPCode.PURPOSE_LOGIN
    )
    
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


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (public view)."""
    
    full_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_admin',
            'is_verified',
            'is_active',
            'date_joined',
            'last_login'
        ]
        read_only_fields = [
            'id',
            'email',
            'role',
            'is_admin',
            'is_verified',
            'is_active',
            'date_joined',
            'last_login'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for User profile (editable view)."""
    
    full_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_admin',
            'is_verified',
            'is_active',
            'date_joined',
            'last_login'
        ]
        read_only_fields = [
            'id',
            'email',
            'role',
            'is_admin',
            'is_verified',
            'is_active',
            'date_joined',
            'last_login'
        ]
    
    def validate_first_name(self, value):
        """Validate first name."""
        if value and len(value.strip()) < 1:
            raise serializers.ValidationError("First name cannot be empty.")
        return value.strip() if value else value
    
    def validate_last_name(self, value):
        """Validate last name."""
        if value and len(value.strip()) < 1:
            raise serializers.ValidationError("Last name cannot be empty.")
        return value.strip() if value else value


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer for User model (admin view with more fields)."""
    
    full_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'role',
            'is_admin',
            'is_verified',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login'
        ]
        read_only_fields = [
            'id',
            'date_joined',
            'last_login',
            'is_admin'
        ]
    
    def validate_role(self, value):
        """Validate role changes."""
        if not self.instance:
            return value
        
        # Only admins can change roles
        request = self.context.get('request')
        if request and not request.user.is_admin:
            raise serializers.ValidationError("Only admins can change user roles.")
        
        return value


class OTPCodeSerializer(serializers.ModelSerializer):
    """Serializer for OTP Code model (admin view)."""
    
    is_expired = serializers.ReadOnlyField()
    is_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = OTPCode
        fields = [
            'id',
            'email',
            'code',
            'purpose',
            'created_at',
            'expires_at',
            'is_used',
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


class ChangeRoleSerializer(serializers.Serializer):
    """Serializer for changing user role."""
    
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    
    def validate_email(self, value):
        """Validate email and check if user exists."""
        try:
            user = User.objects.get(email=value.lower().strip())
            return value.lower().strip()
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")


class AuthStatusSerializer(serializers.Serializer):
    """Serializer for authentication status response."""
    
    authenticated = serializers.BooleanField()
    user = UserSerializer(allow_null=True)


class MessageSerializer(serializers.Serializer):
    """Generic message response serializer."""
    
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer):
    """Generic error response serializer."""
    
    error = serializers.CharField()
    details = serializers.DictField(required=False)