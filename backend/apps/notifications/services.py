"""
Push Notification Service for SmarTanom
Uses pywebpush to send Web Push notifications with VAPID authentication
"""

import json
import logging
from typing import List, Dict, Optional
from django.conf import settings
from pywebpush import webpush, WebPushException
from .models import PushSubscription, NotificationLog, NotificationPreferences

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for sending push notifications to subscribed users."""

    @staticmethod
    def send_notification(
        user,
        title: str,
        message: str,
        notification_type: str = 'info',
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        url: Optional[str] = None,
        data: Optional[Dict] = None
    ) -> Dict[str, int]:
        """
        Send push notification to all active subscriptions for a user.

        Args:
            user: User instance
            title: Notification title
            message: Notification body text
            notification_type: Type of notification (alert, warning, critical, info, success)
            icon: URL to notification icon
            badge: URL to notification badge
            url: URL to open when notification is clicked
            data: Additional data to pass to notification

        Returns:
            Dictionary with success and failure counts
        """
        # Check user preferences - skip if user disabled this notification type or in quiet hours
        try:
            # Check NotificationPreferences (actual delivery settings)
            preferences = NotificationPreferences.objects.get(user=user)
            if not preferences.should_send_notification(notification_type):
                if preferences.is_quiet_hours():
                    logger.info(f"User {user.email} is in quiet hours, skipping {notification_type} notification")
                else:
                    logger.info(f"User {user.email} has disabled {notification_type} notifications")
                return {'sent': 0, 'failed': 0, 'skipped': True}
        except NotificationPreferences.DoesNotExist:
            # No preferences set, allow all notifications by default
            pass

        # Check UserPreferences (admin dashboard settings) for push_notifications toggle
        skip_push = False
        try:
            from apps.accounts.models import UserPreferences
            user_prefs = UserPreferences.objects.filter(user=user).first()
            if user_prefs and not user_prefs.push_notifications:
                skip_push = True
                logger.info(f"User {user.email} has push_notifications disabled in admin settings - will skip push but continue with email if enabled")
        except Exception as e:
            logger.warning(f"Could not check UserPreferences for {user.email}: {e}")
            # Continue anyway - don't block on this check

        # Get all active subscriptions for this user
        subscriptions = PushSubscription.objects.filter(
            user=user,
            is_active=True
        )

        # Get VAPID keys from settings
        vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
        vapid_public_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
        vapid_claims = getattr(settings, 'VAPID_CLAIMS', {
            "sub": f"mailto:{getattr(settings, 'VAPID_ADMIN_EMAIL', 'admin@smartanom.com')}"
        })

        vapid_ready = bool(vapid_private_key and vapid_public_key)
        if not vapid_ready:
            logger.error("VAPID keys not configured in settings - push will be skipped but email may still be sent")

        # Default icon and badge
        if not icon:
            icon = '/icon-192x192.png'  # PWA icon
        if not badge:
            badge = '/favicon.ico'

        # Prepare notification payload
        payload = {
            'title': title,
            'body': message,
            'icon': icon,
            'badge': badge,
            'tag': f"{notification_type}-{user.id}",  # Replaces same-tag notifications
            'requireInteraction': notification_type in ['critical', 'alert'],
            'data': {
                'url': url or '/alerts',
                'type': notification_type,
                'timestamp': None,  # Will be set by service worker
                **(data or {})
            }
        }

        success_count = 0
        failure_count = 0

        # Send push notifications unless explicitly skipped or not possible
        if not skip_push and subscriptions.exists() and vapid_ready:
            for subscription in subscriptions:
                try:
                    # Prepare subscription info for pywebpush
                    subscription_info = {
                        "endpoint": subscription.endpoint,
                        "keys": {
                            "p256dh": subscription.p256dh,
                            "auth": subscription.auth
                        }
                    }

                    # Send push notification
                    response = webpush(
                        subscription_info=subscription_info,
                        data=json.dumps(payload),
                        vapid_private_key=vapid_private_key,
                        vapid_claims=vapid_claims
                    )

                    if response.status_code in [200, 201]:
                        success_count += 1
                        # Log success
                        NotificationLog.objects.create(
                            user=user,
                            subscription=subscription,
                            notification_type=notification_type,
                            title=title,
                            message=message,
                            status='sent',
                            metadata={'payload': payload}
                        )
                        logger.info(f"[OK] Notification sent to {user.email} (subscription {subscription.id})")
                    else:
                        failure_count += 1
                        NotificationLog.objects.create(
                            user=user,
                            subscription=subscription,
                            notification_type=notification_type,
                            title=title,
                            message=message,
                            status='failed',
                            error_message=f"HTTP {response.status_code}"
                        )
                        logger.warning(f"[WARNING] Notification failed with status {response.status_code}")

                except WebPushException as e:
                    failure_count += 1
                    error_message = str(e)

                    # Check if subscription expired (410 Gone)
                    if hasattr(e, 'response') and e.response and e.response.status_code == 410:
                        subscription.is_active = False
                        subscription.save()
                        logger.info(f"[EXPIRED] Subscription {subscription.id} marked as inactive (410 Gone)")
                        status = 'expired'
                    else:
                        status = 'failed'

                    NotificationLog.objects.create(
                        user=user,
                        subscription=subscription,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        status=status,
                        error_message=error_message
                    )
                    logger.error(f"[ERROR] WebPush error for {user.email}: {error_message}")

                except Exception as e:
                    failure_count += 1
                    NotificationLog.objects.create(
                        user=user,
                        subscription=subscription,
                        notification_type=notification_type,
                        title=title,
                        message=message,
                        status='failed',
                        error_message=str(e)
                    )
                    logger.error(f"[ERROR] Unexpected error sending notification: {e}")
        else:
            # Log why push wasn't attempted
            if skip_push:
                logger.info(f"Skipping push for {user.email} due to user preference")
            elif not subscriptions.exists():
                logger.info(f"No active push subscriptions for user {user.email}")
            elif not vapid_ready:
                logger.info("VAPID keys not ready; push skipped")

        # Send email notification if enabled
        try:
            from apps.accounts.models import UserPreferences
            from django.core.mail import EmailMultiAlternatives
            from django.template.loader import render_to_string
            from django.utils import timezone

            notif_prefs = NotificationPreferences.objects.filter(user=user).first()
            user_prefs = UserPreferences.objects.filter(user=user).first()

            # Email is sent if:
            # 1. NotificationPreferences.email_enabled is True (or doesn't exist - default allow)
            # 2. UserPreferences.email_notifications is True (admin dashboard setting)
            email_enabled = True
            if notif_prefs and not notif_prefs.email_enabled:
                email_enabled = False
            if user_prefs and not user_prefs.email_notifications:
                email_enabled = False

            if email_enabled and user.email:
                # Prepare context for email templates
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                notification_url = url if url else '/notifications'
                if not notification_url.startswith('http'):
                    notification_url = f"{frontend_url}{notification_url}"

                context = {
                    'user_name': user.full_name or user.email.split('@')[0],
                    'alert_title': title,
                    'alert_message': message,
                    'alert_type': notification_type,
                    'device_name': None,
                    'timestamp': timezone.now().strftime('%B %d, %Y at %I:%M %p'),
                    'alert_url': notification_url,
                    'settings_url': f"{frontend_url}/admin/settings",
                    'website_url': frontend_url,
                    'support_url': f"{frontend_url}/support",
                    'unsubscribe_url': f"{frontend_url}/admin/settings",
                }

                # Render email templates
                subject = f"[SmarTanom] {title}"
                text_content = render_to_string('emails/alert_notification.txt', context)
                html_content = render_to_string('emails/alert_notification.html', context)

                # Create email with both text and HTML versions
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@smartanom.com'),
                    to=[user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                logger.info(f"Email notification sent to {user.email}: {title}")
        except Exception as e:
            logger.error(f"Failed to send email notification to {user.email}: {e}")

        logger.info(f"[SUMMARY] Notification sent to {user.email}: {success_count} succeeded, {failure_count} failed")
        return {'sent': success_count, 'failed': failure_count}

    @staticmethod
    def send_to_multiple_users(
        user_ids: List[int],
        title: str,
        message: str,
        **kwargs
    ) -> Dict[str, int]:
        """Send notification to multiple users."""
        from django.contrib.auth import get_user_model
        User = get_user_model()

        total_sent = 0
        total_failed = 0

        users = User.objects.filter(id__in=user_ids)
        for user in users:
            result = PushNotificationService.send_notification(
                user=user,
                title=title,
                message=message,
                **kwargs
            )
            total_sent += result['sent']
            total_failed += result['failed']

        return {'sent': total_sent, 'failed': total_failed}

    @staticmethod
    def send_to_all_admins(
        title: str,
        message: str,
        **kwargs
    ) -> Dict[str, int]:
        """
        Send notification to all staff/admin users who have device_alerts enabled.
        This ensures admins receive alerts from ALL devices, not just their own.
        """
        from django.contrib.auth import get_user_model
        from apps.accounts.models import UserPreferences

        User = get_user_model()

        total_sent = 0
        total_failed = 0

        # Get all staff users with device_alerts enabled
        admin_users = User.objects.filter(
            is_staff=True,
            is_active=True
        ).select_related('preferences')

        for user in admin_users:
            try:
                # Check if user has device_alerts enabled in UserPreferences
                preferences = UserPreferences.objects.filter(user=user).first()
                if preferences and not preferences.device_alerts:
                    logger.info(f"Admin {user.email} has device_alerts disabled - skipping")
                    continue

                # Check if user has push_notifications enabled
                if preferences and not preferences.push_notifications:
                    logger.info(f"Admin {user.email} has push_notifications disabled - skipping push")
                    # Still send email if email_notifications enabled, but skip push
                    kwargs_copy = kwargs.copy()
                    kwargs_copy['skip_push'] = True

                result = PushNotificationService.send_notification(
                    user=user,
                    title=title,
                    message=message,
                    **kwargs
                )
                total_sent += result.get('sent', 0)
                total_failed += result.get('failed', 0)
            except Exception as e:
                logger.error(f"Error sending notification to admin {user.email}: {e}")
                total_failed += 1

        return {'sent': total_sent, 'failed': total_failed}

    @staticmethod
    def send_alert_notification(user, alert_title: str, alert_message: str, alert_type: str = 'warning', device_id: Optional[int] = None):
        """
        Convenience method for sending device alert notifications.

        Args:
            user: User instance
            alert_title: Alert title (e.g., "Low pH Detected")
            alert_message: Alert message
            alert_type: Type (warning, critical, info)
            device_id: Optional device ID to link to
        """
        # Map alert types to notification types
        type_mapping = {
            'critical': 'critical',
            'warning': 'warning',
            'info': 'info',
            'success': 'success'
        }

        notification_type = type_mapping.get(alert_type, 'alert')

        # Build URL to alert page
        url = f"/alerts?device={device_id}" if device_id else "/alerts"

        # Send push notification
        push_result = PushNotificationService.send_notification(
            user=user,
            title=f"🌱 {alert_title}",
            message=alert_message,
            notification_type=notification_type,
            url=url,
            data={
                'device_id': device_id,
                'alert_type': alert_type
            }
        )

        # Send email if enabled in preferences
        try:
            # Check both NotificationPreferences and UserPreferences
            from apps.accounts.models import UserPreferences

            notif_prefs = NotificationPreferences.objects.filter(user=user).first()
            user_prefs = UserPreferences.objects.filter(user=user).first()

            # Email is sent if:
            # 1. NotificationPreferences.email_enabled is True (or doesn't exist - default allow)
            # 2. UserPreferences.email_notifications is True (admin dashboard setting)
            email_enabled = True
            if notif_prefs and not notif_prefs.email_enabled:
                email_enabled = False
            if user_prefs and not user_prefs.email_notifications:
                email_enabled = False

            if email_enabled and user.email:
                from django.core.mail import EmailMultiAlternatives
                from django.template.loader import render_to_string
                from django.utils import timezone

                # Get device name if device_id provided
                device_name = None
                if device_id:
                    try:
                        from apps.devices.models import Device
                        device = Device.objects.get(id=device_id)
                        device_name = device.device_name or f"Device {device_id}"
                    except:
                        device_name = f"Device {device_id}"

                # Prepare context for email templates
                frontend_url = getattr(settings, 'FRONTEND_URL', 'https://smartanom.com')
                alert_url = f"{frontend_url}/alerts{'?device=' + str(device_id) if device_id else ''}"

                context = {
                    'user_name': user.full_name or user.email.split('@')[0],
                    'alert_title': alert_title,
                    'alert_message': alert_message,
                    'alert_type': alert_type,
                    'device_name': device_name,
                    'timestamp': timezone.now().strftime('%B %d, %Y at %I:%M %p'),
                    'alert_url': alert_url,
                    'settings_url': f"{frontend_url}/profile/notifications",
                    'website_url': frontend_url,
                    'support_url': f"{frontend_url}/support",
                    'unsubscribe_url': f"{frontend_url}/profile/notifications",
                }

                # Render email templates
                subject = f"[SmarTanom Alert] {alert_title}"
                text_content = render_to_string('emails/alert_notification.txt', context)
                html_content = render_to_string('emails/alert_notification.html', context)

                # Create email with both text and HTML versions
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@smartanom.com'),
                    to=[user.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                logger.info(f"Alert email sent to {user.email}: {alert_title}")
        except NotificationPreferences.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Failed to send alert email to {user.email}: {e}")

        return push_result
