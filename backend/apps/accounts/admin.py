from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import OTPCode, LoginAttempt

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for custom User model."""
    
    list_display = [
        'email', 
        'full_name', 
        'role', 
        'is_verified', 
        'is_active', 
        'is_staff', 
        'date_joined',
        'last_login_display'
    ]
    list_filter = [
        'role', 
        'is_verified', 
        'is_active', 
        'is_staff', 
        'is_superuser', 
        'date_joined'
    ]
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    fieldsets = (
        (None, {
            'fields': ('email', 'role')
        }),
        ('Personal info', {
            'fields': ('first_name', 'last_name')
        }),
        ('Permissions', {
            'fields': (
                'is_active', 
                'is_staff', 
                'is_superuser', 
                'is_verified',
                'groups', 
                'user_permissions'
            ),
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role'),
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = 'Full Name'
    
    def last_login_display(self, obj):
        if obj.last_login:
            return obj.last_login.strftime('%Y-%m-%d %H:%M')
        return 'Never'
    last_login_display.short_description = 'Last Login'
    last_login_display.admin_order_field = 'last_login'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()
    
    def save_model(self, request, obj, form, change):
        """Custom save logic."""
        if not change:  # Creating new user
            obj.set_unusable_password()
        super().save_model(request, obj, form, change)


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    """Admin configuration for OTP Code model."""
    
    list_display = [
        'email',
        'code',
        'purpose',
        'created_at',
        'expires_at',
        'status_display',
        'attempts',
        'max_attempts'
    ]
    list_filter = [
        'purpose',
        'is_used',
        'created_at',
        'expires_at'
    ]
    search_fields = ['email', 'code']
    ordering = ['-created_at']
    readonly_fields = [
        'code',
        'created_at',
        'expires_at',
        'is_expired',
        'is_valid',
        'attempts'
    ]
    
    fieldsets = (
        (None, {
            'fields': ('email', 'purpose', 'code')
        }),
        ('Status', {
            'fields': ('is_used', 'attempts', 'max_attempts')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'expires_at', 'is_expired', 'is_valid'),
            'classes': ('collapse',)
        }),
    )
    
    def status_display(self, obj):
        """Display OTP status with color coding."""
        if obj.is_used:
            return format_html(
                '<span style="color: green; font-weight: bold;">Used</span>'
            )
        elif obj.is_expired:
            return format_html(
                '<span style="color: red; font-weight: bold;">Expired</span>'
            )
        elif obj.attempts >= obj.max_attempts:
            return format_html(
                '<span style="color: orange; font-weight: bold;">Max Attempts</span>'
            )
        else:
            return format_html(
                '<span style="color: blue; font-weight: bold;">Valid</span>'
            )
    status_display.short_description = 'Status'
    
    def has_add_permission(self, request):
        """Disable manual OTP creation in admin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Allow viewing but limited editing."""
        return True
    
    def get_readonly_fields(self, request, obj=None):
        """Make most fields readonly."""
        if obj:  # Editing existing object
            return self.readonly_fields + ['email', 'purpose']
        return self.readonly_fields


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    """Admin configuration for Login Attempt model."""
    
    list_display = [
        'email',
        'ip_address',
        'created_at',
        'successful_display'
    ]
    list_filter = [
        'successful',
        'created_at'
    ]
    search_fields = ['email', 'ip_address']
    ordering = ['-created_at']
    readonly_fields = ['email', 'ip_address', 'created_at', 'successful']
    
    def successful_display(self, obj):
        """Display success status with color coding."""
        if obj.successful:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Success</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">✗ Failed</span>'
            )
    successful_display.short_description = 'Result'
    successful_display.admin_order_field = 'successful'
    
    def has_add_permission(self, request):
        """Disable manual creation."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Read-only access."""
        return True
    
    def has_delete_permission(self, request, obj=None):
        """Allow bulk deletion for cleanup."""
        return True


# Customize admin site headers
admin.site.site_header = "SmarTanom Administration"
admin.site.site_title = "SmarTanom Admin"
admin.site.index_title = "Welcome to SmarTanom Administration"


# Add custom admin actions
@admin.action(description='Cleanup expired OTP codes')
def cleanup_expired_otps(modeladmin, request, queryset):
    """Admin action to cleanup expired OTP codes."""
    count = OTPCode.cleanup_expired()
    modeladmin.message_user(
        request,
        f'Successfully cleaned up {count} expired OTP codes.'
    )


@admin.action(description='Cleanup old login attempts (30+ days)')
def cleanup_old_login_attempts(modeladmin, request, queryset):
    """Admin action to cleanup old login attempts."""
    count = LoginAttempt.cleanup_old_attempts()
    modeladmin.message_user(
        request,
        f'Successfully cleaned up {count} old login attempts.'
    )


# Add actions to respective admins
OTPCodeAdmin.actions = [cleanup_expired_otps]
LoginAttemptAdmin.actions = [cleanup_old_login_attempts]