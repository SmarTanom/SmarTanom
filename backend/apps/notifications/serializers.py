from rest_framework import serializers
from .models import PushSubscription, NotificationLog, NotificationPreferences


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for push subscription data from frontend."""

    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'device_name', 'user_agent', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_active']

    def create(self, validated_data):
        # Set user from request context
        validated_data['user'] = self.context['request'].user

        # Check if subscription already exists (update instead of create)
        existing = PushSubscription.objects.filter(
            endpoint=validated_data['endpoint']
        ).first()

        if existing:
            # Update existing subscription
            for key, value in validated_data.items():
                setattr(existing, key, value)
            existing.is_active = True  # Reactivate if needed
            existing.save()
            return existing

        # Create new subscription
        return super().create(validated_data)


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification logs."""

    class Meta:
        model = NotificationLog
        fields = [
            'id', 'notification_type', 'title', 'message',
            'status', 'sent_at', 'metadata'
        ]
        read_only_fields = fields


class SendNotificationSerializer(serializers.Serializer):
    """Serializer for sending a test notification."""

    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    notification_type = serializers.ChoiceField(
        choices=['alert', 'warning', 'critical', 'info', 'success'],
        default='info'
    )
    url = serializers.URLField(required=False, allow_blank=True)


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences."""

    class Meta:
        model = NotificationPreferences
        fields = ['id', 'critical_alerts', 'warnings', 'info', 'email_enabled', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Set user from request context
        validated_data['user'] = self.context['request'].user

        # Get or create preferences
        preferences, created = NotificationPreferences.objects.get_or_create(
            user=validated_data['user'],
            defaults=validated_data
        )

        if not created:
            # Update existing preferences
            for key, value in validated_data.items():
                setattr(preferences, key, value)
            preferences.save()

        return preferences
