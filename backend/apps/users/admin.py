"""User app admin configuration."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User, OTPCode, LoginAttempt


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for the custom User model."""

    list_display = ('email', 'username', 'first_name', 'last_name', 'role', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active', 'is_verified')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-date_joined',)

    fieldsets = (
        (None, {'fields': ('email', 'username')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('Permissions'), {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'is_verified')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
        (_('Groups'), {'fields': ('groups',)}),
        (_('User permissions'), {'fields': ('user_permissions',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'first_name', 'last_name', 'role'),
        }),
    )


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    """Admin configuration for OTPCode model."""

    list_display = ('email', 'code', 'purpose', 'is_used', 'attempts', 'created_at', 'expires_at')
    list_filter = ('purpose', 'is_used')
    search_fields = ('email', 'code')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'expires_at')

    fieldsets = (
        (None, {'fields': ('email', 'code', 'purpose')}),
        (_('Status'), {'fields': ('is_used', 'attempts', 'max_attempts')}),
        (_('Timing'), {'fields': ('created_at', 'expires_at')}),
    )


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """Admin configuration for LoginAttempt model."""

    list_display = ('email', 'ip_address', 'successful', 'created_at')
    list_filter = ('successful',)
    search_fields = ('email', 'ip_address')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    fieldsets = (
        (None, {'fields': ('email', 'ip_address', 'successful')}),
        (_('Timing'), {'fields': ('created_at',)}),
    )
