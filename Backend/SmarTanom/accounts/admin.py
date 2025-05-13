from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User
from django.contrib import messages
from django.http import HttpResponseRedirect

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'name', 'is_admin', 'contact')
    list_filter = ('is_admin',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('name', 'contact')}),
        (_('Permissions'), {
            'fields': ('is_admin', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'contact', 'password1', 'password2', 'is_admin'),
        }),
    )
    
    search_fields = ('email', 'name')
    ordering = ('email',)
    filter_horizontal = ('groups', 'user_permissions',)
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    def save_model(self, request, obj, form, change):
        # If current user is not admin, prevent changing admin status
        if not request.user.is_admin and 'is_admin' in form.changed_data:
            messages.error(request, "You don't have permission to change admin status.")
            return HttpResponseRedirect(request.path)
        
        super().save_model(request, obj, form, change)

admin.site.register(User, CustomUserAdmin)