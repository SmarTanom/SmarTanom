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

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """
        Get user's alerts/notifications with filtering and pagination
        Only shows alerts for devices that the user owns or has access to
        Supports query params: type, status, device, limit, page
        """
        try:
            # Get user's owned devices first
            from apps.devices.models import Device, DeviceCollaboration
            user_devices = Device.objects.filter(
                bound_email=request.user.email
            ).values_list('id', flat=True)

            # Also get devices where user is a collaborator
            collaborator_devices = DeviceCollaboration.objects.filter(
                collaborator_email=request.user.email,
                status=DeviceCollaboration.Status.ACTIVE
            ).values_list('device_id', flat=True)

            # Combine owned and collaborator devices
            accessible_device_ids = list(user_devices) + list(collaborator_devices)

            if not accessible_device_ids:
                # User has no devices, return empty alerts
                return Response({
                    'count': 0,
                    'alerts': []
                })

            # Base queryset - logs for accessible devices (owner or collaborator)
            # Do not restrict by NotificationLog.user to allow collaborators to see device alerts
            queryset = NotificationLog.objects.filter(
                metadata__device_id__in=accessible_device_ids
            )

            # Filter by notification type (critical, warning, info)
            notification_type = request.GET.get('type')
            if notification_type:
                queryset = queryset.filter(notification_type=notification_type)

            # Filter by status (sent, failed)
            status_filter = request.GET.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            # Filter by specific device (from metadata)
            device_id = request.GET.get('device')
            if device_id:
                # Ensure user has access to this device
                if int(device_id) in accessible_device_ids:
                    queryset = queryset.filter(metadata__device_id=device_id)
                else:
                    # User doesn't have access to this device
                    return Response({
                        'count': 0,
                        'alerts': []
                    })

            # Limit results
            limit = request.GET.get('limit', 50)
            try:
                limit = int(limit)
                limit = min(limit, 200)  # Max 200 records for user endpoint
            except ValueError:
                limit = 50

            # Order by most recent first and prefetch a working set
            alerts = list(queryset.order_by('-sent_at')[:limit])

            # Filter out logs that refer to alerts/readings that no longer exist
            # This prevents showing stale entries on the Alerts page after admins delete them.
            try:
                from apps.sensors.models import Alert as SensorAlert
                # Collect referenced reading_ids from metadata.alert_id
                referenced_reading_ids = [
                    meta.get('alert_id')
                    for meta in (getattr(a, 'metadata', None) or {} for a in alerts)
                    if isinstance(meta, dict) and meta.get('alert_id') is not None
                ]
                if referenced_reading_ids:
                    # Query existing alerts by their stored reading_id in metadata
                    existing_reading_ids = set(
                        SensorAlert.objects.filter(metadata__reading_id__in=referenced_reading_ids)
                        .values_list('metadata__reading_id', flat=True)
                    )
                    # Keep only logs with no reference or with an existing backing Alert row
                    alerts = [
                        a for a in alerts
                        if (
                            not isinstance(getattr(a, 'metadata', None), dict)
                            or a.metadata.get('alert_id') is None
                            or a.metadata.get('alert_id') in existing_reading_ids
                        )
                    ]
            except Exception as _filter_err:
                logger.warning(f"Skipping stale-alert filtering due to error: {_filter_err}")

            # Format response to match frontend expectations
            alert_data = []
            for alert in alerts:
                # Extract device info from metadata
                device_info = None
                if alert.metadata and 'device_id' in alert.metadata:
                    device_id = alert.metadata.get('device_id')
                    try:
                        from apps.devices.models import Device
                        device = Device.objects.get(id=device_id)
                        device_info = {
                            'id': device.id,
                            'serial': device.device_serial,
                            'name': device.device_name or f'Device {device.device_serial}'
                        }
                    except Device.DoesNotExist:
                        device_info = {
                            'id': device_id,
                            'serial': f'DEV{device_id:03d}',
                            'name': f'Device {device_id}'
                        }

                # Map notification type to severity for frontend compatibility
                severity_mapping = {
                    'critical': 'critical',
                    'alert': 'critical',
                    'warning': 'warning',
                    'info': 'info',
                    'success': 'info'
                }
                severity = severity_mapping.get(alert.notification_type, 'info')

                # Decouple read state from delivery status: a log is read only if read_at set
                alert_data.append({
                    'id': alert.id,
                    'reading_id': alert.id,  # Use alert ID as reading_id for compatibility
                    'device_id': device_id,
                    'title': alert.title,
                    'body': alert.message,
                    'severity': severity,
                    'type': alert.notification_type,
                    'is_read': bool(getattr(alert, 'read_at', None)),
                    'timestamp': alert.sent_at.isoformat(),
                    'created_at': alert.sent_at.isoformat(),
                    'device': device_info,
                    'metadata': alert.metadata
                })

            logger.info(f"User {request.user.email} requested alerts: {len(alert_data)} alerts for {len(accessible_device_ids)} accessible devices")

            return Response({
                'count': len(alert_data),
                'alerts': alert_data
            })

        except Exception as e:
            logger.error(f"Error fetching user alerts: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to fetch alerts'},
                status=500
            )

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark specific alerts as read without altering delivery status.
        Expects payload: { "alert_ids": [1,2,3] }
        """
        from django.utils import timezone
        try:
            alert_ids = request.data.get('alert_ids', [])
            if not alert_ids:
                return Response({'error': 'alert_ids is required'}, status=400)

            # Accept either NotificationLog ids OR sensor reading ids (metadata.alert_id)
            # Only set read_at where not already set (idempotent)
            # Scope by devices the requester can access (owner or collaborator)
            from django.db.models import Q
            from apps.devices.models import Device, DeviceCollaboration
            owned = Device.objects.filter(bound_email=request.user.email).values_list('id', flat=True)
            collab = DeviceCollaboration.objects.filter(
                collaborator_email=request.user.email,
                status=DeviceCollaboration.Status.ACTIVE
            ).values_list('device_id', flat=True)
            accessible_device_ids = list(owned) + list(collab)

            qs = NotificationLog.objects.filter(
                read_at__isnull=True,
                metadata__device_id__in=accessible_device_ids
            ).filter(Q(id__in=alert_ids) | Q(metadata__alert_id__in=alert_ids))
            updated_count = qs.update(read_at=timezone.now())

            logger.info(f"User {request.user.email} marked {updated_count} alerts as read (ids={alert_ids})")
            return Response({
                'success': True,
                'message': f'Marked {updated_count} alerts as read',
                'updated_count': updated_count
            })
        except Exception as e:
            logger.error(f"Error marking alerts as read: {e}", exc_info=True)
            return Response({'error': 'Failed to mark alerts as read'}, status=500)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all alerts as read for the user by setting read_at if null."""
        from django.utils import timezone
        try:
            # Mark all alerts for devices the user can access (owner or collaborator)
            from apps.devices.models import Device, DeviceCollaboration
            owned = Device.objects.filter(bound_email=request.user.email).values_list('id', flat=True)
            collab = DeviceCollaboration.objects.filter(
                collaborator_email=request.user.email,
                status=DeviceCollaboration.Status.ACTIVE
            ).values_list('device_id', flat=True)
            accessible_device_ids = list(owned) + list(collab)

            qs = NotificationLog.objects.filter(
                read_at__isnull=True,
                metadata__device_id__in=accessible_device_ids
            )
            updated_count = qs.update(read_at=timezone.now())
            logger.info(f"User {request.user.email} marked ALL alerts as read ({updated_count} updated)")
            return Response({
                'success': True,
                'message': f'Marked {updated_count} alerts as read',
                'updated_count': updated_count
            })
        except Exception as e:
            logger.error(f"Error marking all alerts as read: {e}", exc_info=True)
            return Response({'error': 'Failed to mark all alerts as read'}, status=500)


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
