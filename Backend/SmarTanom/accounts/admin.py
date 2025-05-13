from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'name', 'is_admin', 'is_active', 'created_at')  # Added created_at here
    search_fields = ('email',)
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('name', 'contact')}),
        ('Permissions', {'fields': ('is_admin', 'is_staff', 'is_active', 'groups', 'user_permissions')}),
      
    )


admin.site.register(User, CustomUserAdmin)
