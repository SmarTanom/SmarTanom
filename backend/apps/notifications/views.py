from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import PushSubscription, NotificationLog, NotificationPreferences
from .serializers import (
    PushSubscriptionSerializer,
    NotificationLogSerializer,
    SendNotificationSerializer,
    NotificationPreferencesSerializer
)
from .services import PushNotificationService
import logging

logger = logging.getLogger(__name__)


class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """API endpoints for managing push notification subscriptions."""

    permission_classes = [IsAuthenticated]
    serializer_class = PushSubscriptionSerializer

    def get_queryset(self):
        """Users can only see their own subscriptions."""
        return PushSubscription.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Subscribe to push notifications."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()

        logger.info(f"[OK] User {request.user.email} subscribed to push notifications (ID: {subscription.id})")

        return Response(
            {
                'success': True,
                'message': 'Successfully subscribed to push notifications',
                'subscription': serializer.data
            },
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        """Unsubscribe from push notifications."""
        instance = self.get_object()
        logger.info(f"Unsubscribing user {request.user.email} from push notifications (ID: {instance.id})")
        instance.is_active = False
        instance.save()

        return Response(
            {
                'success': True,
                'message': 'Successfully unsubscribed from push notifications'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='subscribe')
    def subscribe(self, request):
        """Subscribe to push notifications (custom action)."""
        return self.create(request)

    @action(detail=False, methods=['post'], url_path='unsubscribe')
    def unsubscribe(self, request):
        """Unsubscribe using endpoint URL."""
        endpoint = request.data.get('endpoint')
        if not endpoint:
            return Response(
                {'error': 'Endpoint is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subscription = PushSubscription.objects.get(
                user=request.user,
                endpoint=endpoint
            )
            subscription.is_active = False
            subscription.save()

            logger.info(f"Unsubscribed {request.user.email} by endpoint")
            return Response({'success': True, 'message': 'Unsubscribed successfully'})

        except PushSubscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def vapid_public_key(self, request):
        """Get VAPID public key for subscription."""
        public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')

        if not public_key:
            logger.error('VAPID_PUBLIC_KEY not configured in settings')
            return Response(
                {'error': 'VAPID public key not configured'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        logger.info(f"[OK] VAPID public key requested by {request.user.email}")
        return Response({'public_key': public_key})

    @action(detail=False, methods=['post'])
    def test_notification(self, request):
        """Send a test notification to the current user."""
        serializer = SendNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = PushNotificationService.send_notification(
            user=request.user,
            title=serializer.validated_data['title'],
            message=serializer.validated_data['message'],
            notification_type=serializer.validated_data['notification_type'],
            url=serializer.validated_data.get('url', '/alerts')
        )

        if result['sent'] > 0:
            return Response({
                'success': True,
                'message': f"Notification sent to {result['sent']} device(s)",
                'stats': result
            })
        else:
            return Response({
                'success': False,
                'message': 'Failed to send notification. Check if you have active subscriptions.',
                'stats': result
            }, status=status.HTTP_400_BAD_REQUEST)


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for viewing notification logs."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationLogSerializer

    def get_queryset(self):
        """Users can only see their own notification logs."""
        return NotificationLog.objects.filter(user=self.request.user)


class NotificationPreferencesViewSet(viewsets.ModelViewSet):
    """API endpoints for managing notification preferences."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationPreferencesSerializer
    http_method_names = ['get', 'post', 'put', 'patch']

    def get_queryset(self):
        """Users can only see their own preferences."""
        return NotificationPreferences.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create user preferences."""
        preferences, created = NotificationPreferences.objects.get_or_create(
            user=self.request.user,
            defaults={
                'critical_alerts': True,
                'warnings': True,
                'info': True
            }
        )
        return preferences

    def list(self, request, *args, **kwargs):
        """Get user preferences."""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create or update preferences."""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(f"[OK] User {request.user.email} updated notification preferences")

        return Response({
            'success': True,
            'message': 'Notification preferences updated',
            'preferences': serializer.data
        })

    def update(self, request, *args, **kwargs):
        """Update preferences."""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(f"[OK] User {request.user.email} updated notification preferences")

        return Response({
            'success': True,
            'message': 'Notification preferences updated',
            'preferences': serializer.data
        })
