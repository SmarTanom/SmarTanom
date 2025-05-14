from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

class UserAdmin(BaseUserAdmin):
    filter_horizontal = ()
    
    list_display = ('email', 'name', 'is_admin', 'is_active', 'email_verified')
    list_filter = ('is_admin', 'is_active', 'email_verified')
    list_editable = ('is_active', 'email_verified')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('name', 'contact')}),
        ('Permissions', {'fields': ('is_active', 'email_verified', 'is_admin', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_admin', 'is_active', 'email_verified'),
        }),
    )
    
    search_fields = ('email', 'name')
    ordering = ('email',)
    readonly_fields = ('created_at', 'updated_at')

admin.site.register(User, UserAdmin)