from django.contrib import admin
from .models import PushSubscription, NotificationLog, NotificationPreferences


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'device_name', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__email', 'device_name', 'endpoint')
    readonly_fields = ('endpoint', 'p256dh', 'auth', 'user_agent', 'created_at', 'updated_at')

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'device_name')
        }),
        ('Subscription Details', {
            'fields': ('endpoint', 'p256dh', 'auth')
        }),
        ('Device Info', {
            'fields': ('user_agent',)
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'notification_type', 'title', 'status', 'sent_at')
    list_filter = ('notification_type', 'status', 'sent_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('user', 'subscription', 'notification_type', 'title', 'message',
                      'status', 'error_message', 'sent_at', 'metadata')

    fieldsets = (
        ('Notification Details', {
            'fields': ('user', 'subscription', 'notification_type', 'title', 'message')
        }),
        ('Status', {
            'fields': ('status', 'error_message', 'sent_at')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return False  # Logs are created automatically


@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'critical_alerts', 'warnings', 'info', 'updated_at')
    list_filter = ('critical_alerts', 'warnings', 'info')
    search_fields = ('user__email',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Alert Severity Preferences', {
            'fields': ('critical_alerts', 'warnings', 'info')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_change_permission(self, request, obj=None):
        return False  # Logs are read-only
