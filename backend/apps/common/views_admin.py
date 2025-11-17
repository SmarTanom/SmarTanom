"""
Admin Dashboard API Views
Provides analytics and statistics for admin dashboard
"""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q, F
from django.utils import timezone
from datetime import timedelta
from apps.devices.models import Device, DeviceCollaboration
from apps.accounts.models import User
from apps.notifications.models import NotificationLog
from apps.sensors.models import SensorData
from apps.sensors.models import Sensor
from apps.notifications.models import AdminAlertReadReceipt
import logging

logger = logging.getLogger(__name__)


class IsAdminUser(permissions.BasePermission):
    """Custom permission to only allow admin users"""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class AdminDashboardViewSet(viewsets.ViewSet):
    """
    Admin Dashboard Statistics and Analytics
    Provides real-time data for admin dashboard
    """
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get comprehensive dashboard statistics
        """
        try:
            # Get date range for trends (last 12 months)
            now = timezone.now()
            twelve_months_ago = now - timedelta(days=365)
            thirty_days_ago = now - timedelta(days=30)

            # Device Statistics
            total_devices = Device.objects.count()
            active_devices = Device.objects.filter(status=Device.Status.ACTIVE).count()
            inactive_devices = Device.objects.filter(status=Device.Status.INACTIVE).count()
            maintenance_devices = Device.objects.filter(status=Device.Status.MAINTENANCE).count()
            bound_devices = Device.objects.filter(is_bound=True).count()
            # Available units: devices that are NOT bound
            available_units = Device.objects.filter(is_bound=False).count()

            # Shared devices: devices that have active collaborations
            shared_devices = Device.objects.filter(
                id__in=DeviceCollaboration.objects.filter(
                    status=DeviceCollaboration.Status.ACTIVE
                ).values_list('device_id', flat=True).distinct()
            ).count()

            logger.info(f"Device Stats - Total: {total_devices}, Active: {active_devices}, Bound: {bound_devices}, Available: {available_units}, Shared: {shared_devices}")

            # User Statistics
            total_users = User.objects.count()
            active_users = User.objects.filter(is_active=True).count()
            admin_users = User.objects.filter(is_staff=True).count()

            # Calculate growth (last 30 days)
            devices_30_days_ago = Device.objects.filter(created_at__lt=thirty_days_ago).count()
            users_30_days_ago = User.objects.filter(date_joined__lt=thirty_days_ago).count()

            devices_growth = self._calculate_growth(devices_30_days_ago, total_devices)
            users_growth = self._calculate_growth(users_30_days_ago, total_users)

            # Device Usage Trend (last 12 months)
            device_trend = []
            error_trend = []
            months = []

            for i in range(12):
                month_date = now - timedelta(days=30 * (11 - i))
                month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if i < 11:
                    next_month = now - timedelta(days=30 * (10 - i))
                    month_end = next_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                else:
                    month_end = now

                # Count devices created up to this month
                devices_count = Device.objects.filter(created_at__lte=month_end).count()
                device_trend.append(devices_count)

                # Count notification errors for this month
                error_count = NotificationLog.objects.filter(
                    sent_at__gte=month_start,
                    sent_at__lt=month_end,
                    status='failed'
                ).count()
                error_trend.append(error_count)

                months.append(month_date.strftime('%b'))

            # System Alerts (last 7 days)
            seven_days_ago = now - timedelta(days=7)
            recent_alerts = NotificationLog.objects.filter(
                sent_at__gte=seven_days_ago
            ).values('notification_type').annotate(count=Count('id'))

            alert_stats = {
                'critical': 0,
                'warning': 0,
                'info': 0,
                'total': 0
            }

            for alert in recent_alerts:
                ntype = alert['notification_type']
                count = alert['count']
                alert_stats['total'] += count
                if ntype in ['critical', 'alert']:
                    alert_stats['critical'] += count
                elif ntype == 'warning':
                    alert_stats['warning'] += count
                else:
                    alert_stats['info'] += count

            # System Performance (based on sensor data freshness)
            one_hour_ago = now - timedelta(hours=1)
            recent_sensor_data = SensorData.objects.filter(created_at__gte=one_hour_ago).count()

            # Calculate performance metrics
            cpu_usage = min(95, 30 + (recent_sensor_data % 40))  # Simulated based on activity
            memory_usage = min(90, 45 + (active_devices % 30))
            disk_usage = min(85, 25 + (total_devices % 40))

            # Error Reports (last 30 days)
            failed_notifications = NotificationLog.objects.filter(
                sent_at__gte=thirty_days_ago,
                status='failed'
            ).count()

            device_errors = Device.objects.filter(
                status=Device.Status.MAINTENANCE
            ).count()

            total_errors = failed_notifications + device_errors

            # Build response
            response_data = {
                'summary': {
                    'devices': {
                        'total': total_devices,
                        'active': active_devices,
                        'inactive': inactive_devices,
                        'maintenance': maintenance_devices,
                        'available': available_units,
                        'bound': bound_devices,
                        'shared': shared_devices
                    },
                    'users': {
                        'total': total_users,
                        'active': active_users,
                        'admin': admin_users
                    },
                    'growth': {
                        'devices': round(devices_growth, 1),
                        'users': round(users_growth, 1),
                        'total': round((devices_growth + users_growth) / 2, 1)
                    }
                },
                'device_trend': [
                    {'month': months[i], 'count': device_trend[i]}
                    for i in range(len(months))
                ],
                'error_trend': [
                    {'month': months[i], 'count': error_trend[i]}
                    for i in range(len(months))
                ],
                'alerts': alert_stats,
                'performance': {
                    'cpu_usage': round(cpu_usage, 1),
                    'memory_usage': round(memory_usage, 1),
                    'disk_usage': round(disk_usage, 1)
                },
                'errors': {
                    'total': total_errors,
                    'notification_failures': failed_notifications,
                    'device_errors': device_errors
                }
            }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error fetching admin dashboard stats: {e}")
            return Response(
                {'error': 'Failed to fetch dashboard statistics'},
                status=500
            )

    def _calculate_growth(self, old_count, new_count):
        """Calculate percentage growth"""
        if old_count == 0:
            return 100.0 if new_count > 0 else 0.0
        return ((new_count - old_count) / old_count) * 100

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        """
        Get recent system activity
        """
        try:
            # Recent devices
            recent_devices = Device.objects.order_by('-created_at')[:5].values(
                'id', 'device_serial', 'device_name', 'status', 'created_at'
            )

            # Recent users
            recent_users = User.objects.order_by('-date_joined')[:5].values(
                'id', 'email', 'full_name', 'date_joined', 'is_active'
            )

            # Recent alerts
            recent_alerts = NotificationLog.objects.order_by('-sent_at')[:10].values(
                'id', 'notification_type', 'title', 'sent_at', 'status'
            )

            return Response({
                'recent_devices': list(recent_devices),
                'recent_users': list(recent_users),
                'recent_alerts': list(recent_alerts)
            })

        except Exception as e:
            logger.error(f"Error fetching recent activity: {e}")
            return Response(
                {'error': 'Failed to fetch recent activity'},
                status=500
            )

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """
        Get all device alerts across the system (admin aggregate).
        Source of truth: apps.sensors.models.Alert, not delivery logs.
        Supports query params: type (critical|warning|info), status (active|resolved|read|unread), device, user, limit
        """
        try:
            from apps.sensors.models import Alert as SensorAlert

            # Base queryset: all alerts
            queryset = SensorAlert.objects.select_related('device', 'sensor').all()

            # Type filter maps to severity (critical|warning); 'info' yields empty
            type_filter = request.query_params.get('type')
            if type_filter:
                if type_filter in ['critical', 'warning']:
                    queryset = queryset.filter(severity=type_filter)
                else:
                    # No 'info' severity in SensorAlert; force empty set
                    queryset = queryset.none()

            # Status filter
            status_filter = request.query_params.get('status')
            if status_filter == 'resolved':
                queryset = queryset.filter(is_resolved=True)
            elif status_filter == 'active':
                queryset = queryset.filter(is_resolved=False)
            elif status_filter == 'read':
                queryset = queryset.filter(is_acknowledged=True)
            elif status_filter == 'unread':
                queryset = queryset.filter(is_acknowledged=False)

            # Device filter
            device_id = request.query_params.get('device')
            if device_id:
                queryset = queryset.filter(device_id=device_id)

            # Optional user filter (show alerts for devices owned by that user's email)
            user_id = request.query_params.get('user')
            if user_id:
                try:
                    owner = User.objects.get(id=user_id)
                    queryset = queryset.filter(device__bound_email=owner.email)
                except User.DoesNotExist:
                    queryset = queryset.none()

            # Limit results (admin view defaults higher to aggregate more alerts)
            limit = request.query_params.get('limit', 500)
            try:
                limit = int(limit)
                limit = min(limit, 2000)
            except ValueError:
                limit = 500

            alerts = list(queryset.order_by('-created_at')[:limit])

            # Fetch per-admin read receipts for these alerts
            read_map = set()
            try:
                if alerts:
                    alert_ids = [a.id for a in alerts]
                    read_map = set(
                        AdminAlertReadReceipt.objects.filter(
                            user=request.user,
                            alert_id__in=alert_ids
                        ).values_list('alert_id', flat=True)
                    )
            except Exception as _read_err:
                logger.warning(f"Could not load admin read receipts: {_read_err}")

            # Format response for the admin UI
            alert_data = []
            for a in alerts:
                device_info = None
                try:
                    d = a.device
                    if d:
                        device_info = {
                            'id': d.id,
                            'serial': d.device_serial,
                            'name': d.device_name or f'Device {d.device_serial}',
                        }
                except Exception:
                    device_info = None

                # Best-effort owner for display (optional)
                owner_payload = None
                try:
                    if a.device and a.device.bound_email:
                        owner = User.objects.filter(email=a.device.bound_email).first()
                        if owner:
                            owner_payload = {
                                'id': owner.id,
                                'email': owner.email,
                                'name': owner.full_name or owner.username or owner.email.split('@')[0],
                            }
                except Exception:
                    owner_payload = None

                is_read = a.id in read_map
                alert_data.append({
                    'id': a.id,
                    'type': a.severity,  # 'critical' | 'warning'
                    'title': a.title,
                    'message': a.recommendation,
                    # Use per-admin read status; do not leak global acknowledgment
                    'status': 'read' if is_read else 'unread',
                    'is_read': is_read,
                    'resolved': bool(a.is_resolved),
                    'device': device_info,
                    'user': owner_payload,
                    'timestamp': a.created_at.isoformat(),
                    'metadata': a.metadata or {},
                })

            return Response({'count': len(alert_data), 'alerts': alert_data})

        except Exception as e:
            logger.error(f"Error fetching admin alerts: {e}", exc_info=True)
            return Response({'error': 'Failed to fetch alerts'}, status=500)

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark specific sensor alerts as read for the current admin only.
        Expects JSON { "alert_ids": [1,2,3] }
        Creates per-admin read receipts; idempotent.
        """
        try:
            ids = request.data.get('alert_ids') or []
            if not isinstance(ids, list) or not ids:
                return Response({'error': 'alert_ids (list) is required'}, status=400)

            # Deduplicate provided IDs
            alert_ids = list({int(aid) for aid in ids if str(aid).isdigit()})
            if not alert_ids:
                return Response({'updated_count': 0, 'success': True})

            # Create receipts for those not yet present
            created = 0
            from django.db import IntegrityError
            for aid in alert_ids:
                try:
                    AdminAlertReadReceipt.objects.get_or_create(user=request.user, alert_id=aid)
                    created += 1
                except IntegrityError:
                    # Already exists (unique constraint), skip
                    pass
                except Exception as e:
                    logger.warning(f"Failed to create read receipt for alert {aid}: {e}")

            return Response({'success': True, 'updated_count': created})
        except Exception as e:
            logger.error(f"Error marking admin alerts as read: {e}", exc_info=True)
            return Response({'error': 'Failed to mark alerts as read'}, status=500)

    @action(detail=False, methods=['get'])
    def users(self, request):
        """
        Get all users with their device counts for admin user management
        """
        try:
            from django.utils.timesince import timesince

            # Get all users
            users = User.objects.all().order_by('-date_joined')

            # Format the response
            users_list = []
            for user in users:
                # Count devices bound to this user's email (owned devices)
                owned_device_count = Device.objects.filter(
                    is_bound=True,
                    bound_email=user.email
                ).count()

                # Count shared devices via active collaborations
                shared_device_count = DeviceCollaboration.objects.filter(
                    collaborator_email=user.email,
                    status=DeviceCollaboration.Status.ACTIVE
                ).count()

                # Calculate last active time
                last_active = 'Never'
                if user.last_login:
                    last_active = timesince(user.last_login) + ' ago'

                users_list.append({
                    'id': user.id,
                    'email': user.email,
                    'name': user.full_name or user.username or user.email.split('@')[0],
                    'username': user.username,
                    'device_count': owned_device_count,
                    'shared_device_count': shared_device_count,
                    'last_active': last_active,
                    'joined': user.date_joined,
                    'is_active': user.is_active,
                    'is_staff': user.is_staff
                })

            return Response(users_list)

        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return Response(
                {'error': 'Failed to fetch users'},
                status=500
            )

    @action(detail=False, methods=['get'])
    def devices(self, request):
        """
        Get all devices for admin device management
        """
        try:
            from django.utils.timesince import timesince

            # Don't use select_related since Device doesn't have a user FK
            devices = Device.objects.all().order_by('-created_at')

            # Format the response
            devices_list = []
            for device in devices:
                # Determine owner name
                owner_name = None
                if device.is_bound and device.bound_email:
                    try:
                        owner_user = User.objects.get(email=device.bound_email)
                        owner_name = owner_user.full_name or owner_user.username or owner_user.email.split('@')[0]
                    except User.DoesNotExist:
                        owner_name = device.bound_email.split('@')[0]

                # Calculate last seen using updated_at (last modification time)
                last_seen = 'Never'
                if device.updated_at:
                    last_seen = timesince(device.updated_at) + ' ago'

                # Count active collaborations for this device
                collaborations_count = DeviceCollaboration.objects.filter(
                    device=device,
                    status=DeviceCollaboration.Status.ACTIVE
                ).count()

                devices_list.append({
                    'id': device.id,
                    'serial': device.device_serial,
                    'name': device.device_name or device.device_serial,
                    'status': device.status,
                    'is_bound': device.is_bound,
                    'owner': owner_name,
                    'owner_email': device.bound_email if device.is_bound else None,
                    'location': device.location,
                    'last_seen': last_seen,
                    'created_at': device.created_at,
                    'assigned_date': device.created_at if device.is_bound else None,
                    'collaborations_count': collaborations_count,
                })

            return Response(devices_list)

        except Exception as e:
            logger.error(f"Error fetching devices: {e}")
            return Response(
                {'error': 'Failed to fetch devices'},
                status=500
            )

    @action(detail=False, methods=['post'])
    def create_device(self, request):
        """
        Create a new device (admin only)
        """
        try:
            device_name = request.data.get('device_name', '').strip()
            location = request.data.get('location', '').strip()
            status = request.data.get('status', Device.Status.ACTIVE)

            # Validate required fields
            if not device_name:
                return Response(
                    {'error': 'Device name is required'},
                    status=400
                )

            # Validate status
            valid_statuses = [s[0] for s in Device.Status.choices]
            if status not in valid_statuses:
                return Response(
                    {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                    status=400
                )

            # Create device (serial will be auto-generated)
            device = Device.objects.create(
                device_name=device_name,
                location=location or None,
                status=status,
                is_bound=False
            )

            logger.info(f"Device created: {device.device_serial} by admin {request.user.email}")

            # Automatically create a default set of sensors for the new device
            # Environment sensors (air temperature, humidity, light) have been removed permanently
            default_sensor_types = [
                Sensor.SensorType.PH,
                Sensor.SensorType.TDS,
                Sensor.SensorType.EC,
                Sensor.SensorType.WATER_TEMPERATURE,
                Sensor.SensorType.WATER_LEVEL,
                Sensor.SensorType.TURBIDITY,
            ]

            created_sensors = []
            for s_type in default_sensor_types:
                try:
                    # unit will auto-populate in Sensor.save() if blank
                    sensor = Sensor.objects.create(device=device, sensor_type=s_type, unit="")
                    created_sensors.append({'id': sensor.id, 'sensor_type': sensor.sensor_type, 'unit': sensor.unit})
                except Exception as e:
                    logger.warning(
                        f"Failed to create default sensor '{s_type}' for device {device.device_serial}: {e}",
                        exc_info=True,
                    )

            return Response({
                'message': 'Device created successfully',
                'device': {
                    'id': device.id,
                    'serial': device.device_serial,
                    'name': device.device_name,
                    'location': device.location,
                    'status': device.status,
                    'is_bound': device.is_bound,
                    'created_at': device.created_at
                },
                'sensors_created': len(created_sensors),
                'sensors': created_sensors,
            }, status=201)

        except Exception as e:
            logger.error(f"Error creating device: {e}")
            return Response(
                {'error': f'Failed to create device: {str(e)}'},
                status=500
            )

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Get current user profile and settings
        """
        try:
            user = request.user

            # Get or create preferences
            from apps.accounts.models import UserPreferences
            preferences, _ = UserPreferences.objects.get_or_create(user=user)

            return Response({
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.full_name,
                    'is_staff': user.is_staff,
                    'date_joined': user.date_joined
                },
                'preferences': {
                    'email_notifications': preferences.email_notifications,
                    'push_notifications': preferences.push_notifications,
                    'device_alerts': preferences.device_alerts,
                    'system_updates': preferences.system_updates,
                    'weekly_reports': preferences.weekly_reports,
                    'two_factor_enabled': preferences.two_factor_enabled,
                    'session_timeout': preferences.session_timeout,
                    'dark_mode': preferences.dark_mode,
                    'font_size': preferences.font_size
                }
            })

        except Exception as e:
            logger.error(f"Error fetching profile: {e}")
            return Response(
                {'error': 'Failed to fetch profile'},
                status=500
            )

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """
        Update user profile (first_name, last_name only)
        Username is not editable to avoid UNIQUE constraint issues
        """
        try:
            user = request.user

            # Update allowed fields
            if 'first_name' in request.data:
                user.first_name = request.data['first_name'].strip()
            if 'last_name' in request.data:
                user.last_name = request.data['last_name'].strip()

            user.save()
            logger.info(f"Profile updated for {user.email}")

            return Response({
                'message': 'Profile updated successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'full_name': user.full_name
                }
            })

        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            return Response(
                {'error': f'Failed to update profile: {str(e)}'},
                status=500
            )

    @action(detail=False, methods=['patch'])
    def update_preferences(self, request):
        """
        Update user preferences/settings
        """
        try:
            user = request.user
            from apps.accounts.models import UserPreferences

            # Get or create preferences
            preferences, _ = UserPreferences.objects.get_or_create(user=user)

            # Update preferences
            if 'email_notifications' in request.data:
                preferences.email_notifications = request.data['email_notifications']
            if 'push_notifications' in request.data:
                preferences.push_notifications = request.data['push_notifications']
            if 'device_alerts' in request.data:
                preferences.device_alerts = request.data['device_alerts']
            if 'system_updates' in request.data:
                preferences.system_updates = request.data['system_updates']
            if 'weekly_reports' in request.data:
                preferences.weekly_reports = request.data['weekly_reports']
            if 'two_factor_enabled' in request.data:
                preferences.two_factor_enabled = request.data['two_factor_enabled']
            if 'session_timeout' in request.data:
                timeout = int(request.data['session_timeout'])
                if timeout in [15, 30, 60, 120]:
                    preferences.session_timeout = timeout
            if 'dark_mode' in request.data:
                preferences.dark_mode = request.data['dark_mode']
            if 'font_size' in request.data:
                font_size = request.data['font_size'].lower()
                if font_size in ['small', 'medium', 'large']:
                    preferences.font_size = font_size

            preferences.save()
            logger.info(f"Preferences updated for {user.email}")

            # Sync NotificationPreferences with UserPreferences
            # This ensures the admin dashboard toggles control actual notification delivery
            try:
                from apps.notifications.models import NotificationPreferences

                notif_prefs, created = NotificationPreferences.objects.get_or_create(
                    user=user,
                    defaults={
                        'email_enabled': preferences.email_notifications,
                        'critical_alerts': True,
                        'warnings': True,
                        'info': True
                    }
                )

                # Update email_enabled to match admin dashboard setting
                notif_prefs.email_enabled = preferences.email_notifications
                notif_prefs.save()

                logger.info(f"NotificationPreferences synced for {user.email}: email_enabled={notif_prefs.email_enabled}")
            except Exception as sync_error:
                logger.warning(f"Could not sync NotificationPreferences for {user.email}: {sync_error}")

            return Response({
                'message': 'Settings saved successfully',
                'preferences': {
                    'email_notifications': preferences.email_notifications,
                    'push_notifications': preferences.push_notifications,
                    'device_alerts': preferences.device_alerts,
                    'system_updates': preferences.system_updates,
                    'weekly_reports': preferences.weekly_reports,
                    'two_factor_enabled': preferences.two_factor_enabled,
                    'session_timeout': preferences.session_timeout,
                    'dark_mode': preferences.dark_mode,
                    'font_size': preferences.font_size
                }
            })

        except Exception as e:
            logger.error(f"Error updating preferences: {e}")
            return Response(
                {'error': f'Failed to update settings: {str(e)}'},
                status=500
            )

