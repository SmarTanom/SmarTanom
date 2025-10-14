"""Device app views."""

from __future__ import annotations

from django.conf import settings
import os
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.db.models import Q
from django.utils import timezone
from rest_framework import filters, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.decorators import authentication_classes
from apps.accounts.models import User
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import logging

# WebSocket support
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from apps.common.views import BaseAuthViewSet
from .models import Device, DeviceOTPCode, DeviceCollaboration, DeviceInvitation
from .serializers import (
    DeviceSerializer,
    DeviceCheckSerializer,
    DeviceBindRequestSerializer,
    DeviceBindVerifySerializer,
    DeviceShareRequestSerializer,
    DeviceCollaborationSerializer,
    DeviceInvitationSerializer,
    InvitationResponseSerializer
)

logger = logging.getLogger(__name__)


def broadcast_device_update(action, device, **extra_data):
    """
    Broadcast device update via WebSocket to all connected clients.

    Args:
        action (str): Type of action (bind, unbind, collaborator_added, collaborator_revoked)
        device (Device): The device instance
        **extra_data: Additional data to include in the broadcast
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "devices",
                {
                    "type": "device_update",
                    "action": action,
                    "data": {
                        "device_id": device.id,
                        "device_serial": device.device_serial,
                        "device_name": device.device_name,
                        "bound_email": device.bound_email,
                        "is_bound": device.is_bound,
                        "timestamp": timezone.now().isoformat(),
                        **extra_data
                    }
                }
            )
            logger.debug(f"WebSocket broadcast sent: {action} for device {device.device_serial}")
    except Exception as e:
        # Don't fail the request if WebSocket broadcast fails
        logger.error(f"WebSocket broadcast failed: {str(e)}")


def send_bind_otp_email(device, email, code):
    """Send OTP email for admin-initiated device binding."""
    expire_minutes = 10  # 10 minutes for bind OTP
    subject = "OTP to confirm device binding (from Admin)"

    device_name = device.device_name or f"Device {device.device_serial}"

    html_message = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
            <h2 style="color: #333; text-align: center;">SmarTanom</h2>
            <h3 style="color: #666;">Device Binding Confirmation</h3>
            <p style="color: #666;">An administrator wants to bind device <strong>{device_name}</strong> (serial: <strong>{device.device_serial}</strong>) to this account.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="color: #666; margin: 0 0 10px 0;">Your OTP is:</p>
                <h1 style="color: #2eb72e; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
            </div>
            <p style="color: #666;">This code expires in {expire_minutes} minutes.</p>
            <p style="color: #e74c3c; font-weight: bold;">If you did not expect this, please contact support immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from SmarTanom. Please do not reply.
            </p>
        </div>
    </body>
    </html>
    """

    plain_message = (
        "OTP to confirm device binding (from Admin)\n\n"
        f"An administrator wants to bind device {device_name} (serial: {device.device_serial}) to this account.\n\n"
        f"OTP: {code}\n\n"
        f"This code expires in {expire_minutes} minutes.\n\n"
        "If you did not expect this, contact support."
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Bind OTP email sent for device {device.device_serial} to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send bind OTP email: {str(e)}")
        return False


def send_ownership_removal_otp_email(device, admin_email, code):
    """Send OTP email for admin-initiated ownership removal."""
    expire_minutes = 10  # 10 minutes for ownership removal OTP
    subject = "OTP to confirm device ownership removal (Admin Action)"

    device_name = device.device_name or f"Device {device.device_serial}"

    html_message = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
            <h2 style="color: #333; text-align: center;">SmarTanom</h2>
            <h3 style="color: #666;">Device Ownership Removal Confirmation</h3>
            <p style="color: #666;">An administrator ({admin_email}) is requesting to remove ownership of device <strong>{device_name}</strong> (serial: <strong>{device.device_serial}</strong>) from your account.</p>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Important Notice:</p>
                <p style="color: #856404; margin: 5px 0 0 0;">This action will permanently remove your ownership of this device. You will lose access to all associated data, sensors, and reservoirs. This action cannot be undone.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="color: #666; margin: 0 0 10px 0;">Your OTP is:</p>
                <h1 style="color: #dc3545; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
            </div>
            <p style="color: #666;">This code expires in {expire_minutes} minutes.</p>
            <p style="color: #e74c3c; font-weight: bold;">If you did not authorize this action, please contact support immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from SmarTanom. Please do not reply.
            </p>
        </div>
    </body>
    </html>
    """

    plain_message = (
        "OTP to confirm device ownership removal (Admin Action)\n\n"
        f"An administrator ({admin_email}) is requesting to remove ownership of device {device_name} (serial: {device.device_serial}) from your account.\n\n"
        "⚠️ IMPORTANT NOTICE:\n"
        "This action will permanently remove your ownership of this device. You will lose access to all associated data, sensors, and reservoirs. This action cannot be undone.\n\n"
        f"OTP: {code}\n\n"
        f"This code expires in {expire_minutes} minutes.\n\n"
        "If you did not authorize this action, contact support immediately."
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[device.bound_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Ownership removal OTP email sent for device {device.device_serial} to {device.bound_email} (admin: {admin_email})")
        return True
    except Exception as e:
        logger.error(f"Failed to send ownership removal OTP email: {str(e)}")
        return False


def send_collaborator_otp_email(device, collaborator_email, code):
    """Send OTP email for collaborator addition verification."""
    expire_minutes = 10  # 10 minutes for collaborator OTP
    subject = "OTP to confirm collaborator addition (Admin Action)"

    device_name = device.device_name or f"Device {device.device_serial}"

    html_message = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
            <h2 style="color: #333; text-align: center;">SmarTanom</h2>
            <h3 style="color: #666;">Collaborator Addition Verification</h3>
            <p style="color: #666;">An administrator is requesting to add you as a collaborator to device <strong>{device_name}</strong> (serial: <strong>{device.device_serial}</strong>).</p>
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-weight: bold;">Important Notice:</p>
                <p style="color: #856404; margin: 5px 0 0 0;">This will grant you view-only access to the device's sensor data and monitoring information. You will be able to see real-time data but cannot modify device settings or remove the device.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <p style="color: #666; margin: 0 0 10px 0;">Your OTP is:</p>
                <h1 style="color: #28a745; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
            </div>
            <p style="color: #666;">This code expires in {expire_minutes} minutes.</p>
            <p style="color: #e74c3c; font-weight: bold;">If you did not expect this request, please contact support immediately.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from SmarTanom. Please do not reply.
            </p>
        </div>
    </body>
    </html>
    """

    plain_message = (
        "OTP to confirm collaborator addition (Admin Action)\n\n"
        f"An administrator is requesting to add you as a collaborator to device {device_name} (serial: {device.device_serial}).\n\n"
        "IMPORTANT NOTICE:\n"
        "This will grant you view-only access to the device's sensor data and monitoring information. You will be able to see real-time data but cannot modify device settings or remove the device.\n\n"
        f"OTP: {code}\n\n"
        f"This code expires in {expire_minutes} minutes.\n\n"
        "If you did not expect this request, contact support immediately."
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[collaborator_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Collaborator OTP email sent for device {device.device_serial} to {collaborator_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send collaborator OTP email: {str(e)}")
        return False


def send_collaborator_invite_email(device, collaborator_email):
    """Send welcome email to new collaborator."""
    subject = f"SmarTanom - Device Collaboration Invitation"

    html_message = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
            <h2 style="color: #333; text-align: center;">SmarTanom</h2>
            <h3 style="color: #666;">Collaboration Invitation</h3>
            <p style="color: #666;">You've been added as a collaborator to device <strong>{device.device_serial}</strong>.</p>
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #333;"><strong>Device Details:</strong></p>
                <p style="margin: 5px 0 0 0; color: #666;">Serial: {device.device_serial}</p>
                <p style="margin: 5px 0 0 0; color: #666;">Name: {device.device_name or 'N/A'}</p>
            </div>
            <p style="color: #666;">You can now view data from this device in the SmarTanom app. Use OTP authentication to log in:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{settings.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Log In to SmarTanom</a>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions, please contact support.</p>
        </div>
    </body>
    </html>
    """

    plain_message = f"""
    SmarTanom - Collaboration Invitation

    You've been added as a collaborator to device {device.device_serial}.

    Device Details:
    - Serial: {device.device_serial}
    - Name: {device.device_name or 'N/A'}

    You can now view data from this device in the SmarTanom app.
    Log in at: {settings.FRONTEND_URL}/login

    If you have any questions, please contact support.
    """

    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [collaborator_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Collaborator invite email sent to {collaborator_email} for device {device.device_serial}")
        return True
    except Exception as e:
        logger.error(f"Failed to send collaborator invite email: {str(e)}")
        return False


def send_device_otp_email(device_serial, email, code):
    """Send OTP email for device binding."""
    expire_minutes = getattr(settings, 'OTP_EXPIRE_MINUTES', 5)
    subject = f"SmarTanom - Device Binding Verification"

    html_message = f"""
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px;">
            <h2 style="color: #333; text-align: center;">SmarTanom</h2>
            <h3 style="color: #666;">Device Binding Verification</h3>
            <p style="color: #666;">Use the verification code below to bind device <strong>{device_serial}</strong> to your email address.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
            </div>
            <p style="color: #666;">This code will expire in {expire_minutes} minute(s).</p>
            <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                This is an automated message from SmarTanom. Please do not reply.
            </p>
        </div>
    </body>
    </html>
    """

    plain_message = (
        "SmarTanom - Device Binding Verification\n\n"
        f"Your verification code for device {device_serial} is: {code}\n\n"
        f"This code will expire in {expire_minutes} minute(s).\n\n"
        "If you didn't request this code, please ignore this email."
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Device OTP email sent successfully for {device_serial} to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send device OTP email for {device_serial} to {email}: {str(e)}")
        return False


def send_device_invitation_email(invitation):
    """Send an email invitation for device sharing to the invited user."""
    try:
        frontend_base = getattr(settings, 'FRONTEND_URL', None) or os.getenv('FRONTEND_URL') or os.getenv('FRONTEND_BASE_URL') or 'http://localhost:5173'
        accept_url = f"{frontend_base}/invitations/accept?token={invitation.token}"
        decline_url = f"{frontend_base}/invitations/decline?token={invitation.token}"

        context = {
            'device_name': invitation.device.device_name,
            'device_serial': invitation.device.device_serial,
            'invited_by': invitation.invited_by_email,
            'permissions': invitation.permissions,
            'accept_url': accept_url,
            'decline_url': decline_url,
            'token': invitation.token,
        }

        subject = f"SmarTanom - Invitation to view {invitation.device.device_name}"
        html_message = render_to_string('emails/device_invitation_email.html', context)
        plain_message = render_to_string('emails/device_invitation_email.txt', context)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.invite_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Invitation email sent to %s for device %s", invitation.invite_email, invitation.device.device_serial)
        return True
    except Exception as e:
        logger.exception("Failed to send device invitation email: %s", e)
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Explicitly disable auth for anonymous device existence check
def check_device(request):
    """Check if device exists and can be bound.

    Added verbose diagnostic logging to help trace unexpected 401/permission issues.
    Logs include:
      - Incoming method, path, client IP
      - Relevant headers (authorization presence only, not token value), content-type
      - Raw body (truncated) and parsed payload
      - Serializer validation result
      - Outcome branch (exists / not exists / invalid)
    """
    req_meta = request.META
    client_ip = req_meta.get('REMOTE_ADDR')
    auth_header = req_meta.get('HTTP_AUTHORIZATION', '')
    content_type = req_meta.get('CONTENT_TYPE')
    raw_body = ''
    try:
        raw_body = request.body.decode('utf-8')[:500]
    except Exception:
        raw_body = '<unavailable>'
    logger.debug(
        "[check_device] incoming POST ip=%s auth_present=%s content_type=%s raw_body=%s",
        client_ip,
        bool(auth_header),
        content_type,
        raw_body,
    )

    serializer = DeviceCheckSerializer(data=request.data)

    if not serializer.is_valid():
        logger.debug('[check_device] serializer invalid errors=%s', serializer.errors)
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    serial_number = serializer.validated_data['serial_number']

    try:
        device = Device.objects.get(device_serial=serial_number)
        logger.debug('[check_device] FOUND serial=%s name=%s bound=%s', serial_number, device.device_name, device.is_bound)
        return Response({
            'exists': True,
            'serial_number': serial_number,
            'device_name': device.device_name,
            'is_bound': device.is_bound
        }, status=status.HTTP_200_OK)
    except Device.DoesNotExist:
        logger.debug('[check_device] NOT_FOUND serial=%s', serial_number)
        return Response({
            'exists': False,
            'serial_number': serial_number
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_device_otp(request):
    """Request OTP for device binding."""
    serializer = DeviceBindRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    serial_number = serializer.validated_data['serial_number']
    email = serializer.validated_data['email']

    try:
        # Check if device exists
        device = Device.objects.get(device_serial=serial_number)

        # Check if device is already bound
        if device.is_bound:
            return Response(
                {'error': 'Device is already bound to an email address.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create OTP
        otp = DeviceOTPCode.create_otp(device, email)

        # Send email
        email_sent = send_device_otp_email(device.device_serial, email, otp.code)

        # Always return success message to avoid device enumeration
        response_data = {
            'message': 'If the device exists and is available for binding, a verification code was sent.',
            'serial_number': serial_number,
            'email': email,
            'expires_in': getattr(settings, 'OTP_EXPIRE_MINUTES', 5) * 60,
        }

        # In debug mode, include the code for testing
        if settings.DEBUG and email_sent:
            response_data['debug_code'] = otp.code

        return Response(response_data, status=status.HTTP_200_OK)

    except Device.DoesNotExist:
        # Return generic message to avoid device enumeration
        return Response({
            'message': 'If the device exists and is available for binding, a verification code was sent.',
            'serial_number': serial_number,
            'email': email,
            'expires_in': getattr(settings, 'OTP_EXPIRE_MINUTES', 5) * 60,
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in request_device_otp: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_device_otp(request):
    """Verify OTP and bind device to email."""
    serializer = DeviceBindVerifySerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    serial_number = serializer.validated_data['serial_number']
    email = serializer.validated_data['email']
    code = serializer.validated_data['code']

    try:
        # Check if device exists
        device = Device.objects.get(device_serial=serial_number)

        # Check if device is already bound
        if device.is_bound:
            return Response(
                {'error': 'Device is already bound to an email address.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify OTP
        if DeviceOTPCode.verify_otp(device, email, code):
            # Bind device to email
            # Update optional fields provided during setup
            device.is_bound = True
            device.bound_email = email
            device.device_name = serializer.validated_data.get('device_name', device.device_name)
            device.location = serializer.validated_data.get('location', device.location)
            device.save(update_fields=['is_bound', 'bound_email', 'device_name', 'location'])

            # Find or create user account with this email
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f"temp_{email.split('@')[0]}_{timezone.now().strftime('%Y%m%d_%H%M%S')}",  # Temporary username
                    'is_active': True,
                }
            )

            # Create or get authentication token for the user
            token, _ = Token.objects.get_or_create(user=user)

            logger.info(f"Device {device.device_serial} successfully bound to {email}")
            if created:
                logger.info(f"Created new user account for {email}")

            return Response({
                'success': True,
                'message': 'Device bound successfully.',
                'device': {
                    'serial_number': device.device_serial,
                    'device_name': device.device_name,
                    'bound_email': device.bound_email,
                    'bound_at': timezone.now().isoformat()
                },
                'auth': {
                    'token': token.key,
                    'user_created': created,
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Invalid or expired verification code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Device.DoesNotExist:
        return Response(
            {'error': 'Invalid or expired verification code.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Error in verify_device_otp: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class DeviceViewSet(BaseAuthViewSet):
    """ViewSet for Device model with user-based filtering."""

    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["device_name", "status", "bound_email", "location"]
    ordering_fields = ["device_name", "status", "created_at", "location"]
    ordering = ["-created_at"]

    def get_queryset(self):  # Users see only their bound devices and shared devices unless staff
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            # Staff users see all devices (bound and unbound)
            return qs

        # Regular users see devices bound to their email OR shared with them
        # Get device IDs where user is a collaborator
        shared_device_ids = DeviceCollaboration.objects.filter(
            collaborator_email=user.email,
            status=DeviceCollaboration.Status.ACTIVE
        ).values_list('device_id', flat=True)

        return qs.filter(
            Q(bound_email=user.email, is_bound=True) |  # Owned devices
            Q(id__in=shared_device_ids)  # Shared devices
        )

    @action(detail=True, methods=['post'], url_path='admin-bind', permission_classes=[IsAuthenticated])
    def admin_bind_device(self, request, pk=None):
        """Admin endpoint to bind a device to a user with QR code validation."""
        # Only staff can use this endpoint
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        email = request.data.get('email')
        qr_code = request.data.get('qr_code')

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not qr_code:
            return Response(
                {'error': 'QR code validation is required for device binding'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Normalize email
        email = email.lower().strip()

        # Validate QR code matches device serial
        if qr_code.strip() != device.device_serial:
            return Response(
                {'error': 'Invalid QR code — binding failed. QR code does not match device.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if device is already bound
        if device.is_bound and device.bound_email != email:
            return Response(
                {'error': f'Device is already bound to {device.bound_email}. Unbind first if needed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find or create user with this email
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': f"user_{email.split('@')[0]}_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
                'is_active': True,
            }
        )

        # Bind device
        device.is_bound = True
        device.bound_email = email
        device_name = request.data.get('device_name')
        if device_name:
            device.device_name = device_name
        device.save()

        logger.info(f"Admin {request.user.email} bound device {device.device_serial} to {email} (QR validated)")

        return Response({
            'success': True,
            'message': f'Device successfully bound to {email}',
            'device': {
                'id': device.id,
                'serial': device.device_serial,
                'device_name': device.device_name,
                'bound_email': device.bound_email,
            },
            'user_created': created
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='admin-unbind', permission_classes=[IsAuthenticated])
    def admin_unbind_device(self, request, pk=None):
        """Admin endpoint to unbind a device from a user."""
        # Only staff can use this endpoint
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()

        if not device.is_bound:
            return Response(
                {'detail': 'Device is not currently bound to any user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_email = device.bound_email
        device.is_bound = False
        device.bound_email = None
        device.save()

        logger.info(f"Admin {request.user.email} unbound device {device.device_serial} from {old_email}")

        # Broadcast WebSocket update
        broadcast_device_update("unbind", device, old_email=old_email, unbound_by_admin=request.user.email)

        return Response({
            'detail': f'Device successfully unbound from {old_email}'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='bind-otp', permission_classes=[IsAuthenticated])
    def bind_otp(self, request, pk=None):
        """Admin triggers OTP email for device binding."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        email = request.data.get('email')

        if not email:
            return Response(
                {'detail': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.lower().strip()

        # Duplicate binding protection
        if device.is_bound and device.bound_email != email:
            return Response(
                {'detail': 'This device is already bound to another user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if device.is_bound and device.bound_email == email:
            return Response(
                {'detail': 'User is already bound to this device.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Invalidate any previous unused OTPs for this device+email
            DeviceOTPCode.objects.filter(
                device=device,
                email=email,
                is_verified=False
            ).delete()

            # Create new OTP
            otp = DeviceOTPCode.objects.create(
                device=device,
                email=email
            )

            # Send email
            send_bind_otp_email(device, email, otp.code)

            logger.info(f"Admin {request.user.email} initiated bind OTP for device {device.device_serial} to {email}")

            return Response({
                'detail': 'OTP sent',
                'debug_otp': otp.code if settings.DEBUG else None  # Only in debug mode
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending bind OTP: {str(e)}")
            return Response(
                {'detail': 'Failed to send OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='confirm-bind', permission_classes=[IsAuthenticated])
    def confirm_bind(self, request, pk=None):
        """Confirm OTP and bind device to user."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        email = request.data.get('email')
        otp_code = request.data.get('otp')

        if not email or not otp_code:
            return Response(
                {'detail': 'Email and OTP are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.lower().strip()
        otp_code = otp_code.strip()

        # Duplicate binding protection
        if device.is_bound and device.bound_email != email:
            return Response(
                {'detail': 'This device is already bound to another user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if device.is_bound and device.bound_email == email:
            return Response(
                {'detail': 'User is already bound to this device.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Find valid OTP
            otp = DeviceOTPCode.objects.filter(
                device=device,
                email=email,
                code=otp_code,
                is_verified=False
            ).order_by('-created_at').first()

            if not otp:
                return Response(
                    {'detail': 'Invalid or expired OTP'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not otp.is_valid:
                return Response(
                    {'detail': 'Invalid or expired OTP'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Mark OTP as verified
            otp.is_verified = True
            otp.save()

            # Get or create user (OTP-only, no password)
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f"user_{email.split('@')[0]}_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
                    'is_active': True,
                }
            )

            # If user exists but inactive, reactivate
            if not created and not user.is_active:
                user.is_active = True
                user.save()

            # Bind device
            device.is_bound = True
            device.bound_email = email
            device.save()

            logger.info(f"Admin {request.user.email} bound device {device.device_serial} to {email} via OTP")

            # Broadcast WebSocket update
            broadcast_device_update("bind", device, user_created=created, bound_by_admin=request.user.email)

            return Response({
                'detail': f'Device successfully bound to {email}',
                'user_created': created
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error confirming bind: {str(e)}")
            return Response(
                {'detail': 'Failed to bind device. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='upload-photo')
    def upload_plant_photo(self, request, pk=None):
        """Upload plant photo for a device."""
        device = self.get_object()

        # Owner-only (or staff) can modify device photo
        if not request.user.is_staff and device.bound_email != request.user.email:
            return Response(
                {'error': 'Permission denied. Only the device owner can upload photos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        photo = request.FILES.get('plant_photo')
        if not photo:
            return Response(
                {'error': 'No photo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type (basic check)
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if photo.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update device with new photo and plant info
        device.plant_photo = photo
        device.save()

        # Return updated device data
        serializer = self.get_serializer(device, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    # Device Collaboration Endpoints

    @action(detail=True, methods=['post'], url_path='share')
    def share_device(self, request, pk=None):
        """Share a device with another user by email."""
        device = self.get_object()

        # Check if user owns this device (unless staff)
        if not request.user.is_staff and device.bound_email != request.user.email:
            return Response(
                {'error': 'Permission denied. You can only share devices you own.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DeviceShareRequestSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Extract a human-friendly message while still returning full errors
            errors = serializer.errors
            detail_msg = None
            try:
                for key, val in errors.items():
                    if isinstance(val, (list, tuple)) and val:
                        detail_msg = f"{key}: {val[0]}" if isinstance(val[0], str) else None
                        if detail_msg:
                            break
                    elif isinstance(val, str):
                        detail_msg = f"{key}: {val}"
                        break
            except Exception:
                detail_msg = None

            return Response(
                {
                    'detail': detail_msg or 'Invalid request. Please check the provided email and permissions.',
                    'errors': errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        invite_email = serializer.validated_data['invite_email']
        # Force all invitations to be view_only regardless of client input
        permissions = DeviceCollaboration.Permission.VIEW_ONLY
        message = serializer.validated_data.get('message', '')

        # Check if device is already shared with this user
        existing_collab = DeviceCollaboration.objects.filter(
            device=device,
            collaborator_email=invite_email,
            status=DeviceCollaboration.Status.ACTIVE
        ).first()

        if existing_collab:
            return Response(
                {'error': 'Device is already shared with this user.'},
                status=status.HTTP_409_CONFLICT
            )

        # Check for existing pending invitation
        existing_invitation = DeviceInvitation.objects.filter(
            device=device,
            invite_email=invite_email,
            status=DeviceInvitation.Status.PENDING
        ).first()

        if existing_invitation:
            return Response(
                {'error': 'A pending invitation already exists for this user.'},
                status=status.HTTP_409_CONFLICT
            )

        # Create invitation
        invitation = DeviceInvitation.objects.create(
            device=device,
            invite_email=invite_email,
            invited_by_email=request.user.email,
            message=message,
            permissions=permissions
        )
        # Send email notification
        email_sent = send_device_invitation_email(invitation)

        logger.info(f"Device {device.device_serial} shared with {invite_email} by {request.user.email}")

        return Response({
            'success': True,
            'message': f'Invitation sent to {invite_email}',
            'invitation_id': invitation.id,
            'token': invitation.token,  # For development/testing
            'email_sent': email_sent
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='collaborators')
    def get_collaborators(self, request, pk=None):
        """Get all collaborators for a device."""
        device = self.get_object()

        # Check if user owns this device or is a collaborator (unless staff)
        if not request.user.is_staff:
            if device.bound_email != request.user.email:
                # Check if user is a collaborator
                is_collaborator = DeviceCollaboration.objects.filter(
                    device=device,
                    collaborator_email=request.user.email,
                    status=DeviceCollaboration.Status.ACTIVE
                ).exists()

                if not is_collaborator:
                    return Response(
                        {'error': 'Permission denied.'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        collaborations = DeviceCollaboration.objects.filter(
            device=device,
            status=DeviceCollaboration.Status.ACTIVE
        ).order_by('created_at')

        serializer = DeviceCollaborationSerializer(collaborations, many=True)
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })

    @action(detail=True, methods=['post'], url_path='collaborators/(?P<collaborator_id>[^/.]+)/revoke')
    def revoke_access(self, request, pk=None, collaborator_id=None):
        """Revoke device access for a collaborator with OTP verification."""
        device = self.get_object()

        # Check if user owns this device (unless staff)
        if not request.user.is_staff and device.bound_email != request.user.email:
            return Response(
                {'error': 'Permission denied. Only device owners can revoke access.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            collaboration = DeviceCollaboration.objects.get(
                id=collaborator_id,
                device=device,
                status=DeviceCollaboration.Status.ACTIVE
            )
        except DeviceCollaboration.DoesNotExist:
            return Response(
                {'error': 'Collaboration not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get and sanitize OTP code from request data
        raw_otp = request.data.get('otp_code')
        otp_code = ''.join(ch for ch in str(raw_otp).strip() if ch.isdigit()) if raw_otp is not None else ''
        if not otp_code:
            return Response(
                {'error': 'OTP code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(otp_code) != 6:
            return Response(
                {'error': 'Invalid or expired OTP code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify OTP using the revoke purpose to match issuance
        from apps.accounts.models import OTPCode
        email_norm = (request.user.email or '').lower()
        if not OTPCode.verify_otp(email_norm, otp_code, OTPCode.PURPOSE_REVOKE):
            return Response(
                {'error': 'Invalid or expired OTP code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collaboration.status = DeviceCollaboration.Status.REVOKED
        collaboration.save()

        logger.info(f"Access revoked for {collaboration.collaborator_email} on device {device.device_serial}")

        return Response({
            'success': True,
            'message': f'Access revoked for {collaboration.collaborator_email}'
        })

    @action(detail=True, methods=['post'], url_path='revoke/(?P<user_id>[^/.]+)')
    def admin_revoke_access(self, request, pk=None, user_id=None):
        """Admin endpoint to revoke device access for a collaborator (conditional deactivation + logout)."""
        device = self.get_object()

        # Only staff can use this endpoint
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get user by ID
        from apps.accounts.models import User
        try:
            collaborator_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        collaborator_email = collaborator_user.email

        # Find active collaboration
        try:
            collaboration = DeviceCollaboration.objects.get(
                device=device,
                collaborator_email=collaborator_email,
                status=DeviceCollaboration.Status.ACTIVE
            )
        except DeviceCollaboration.DoesNotExist:
            return Response(
                {'detail': 'Active collaboration not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Revoke this collaboration
        collaboration.status = DeviceCollaboration.Status.REVOKED
        collaboration.revoked_by = request.user
        collaboration.revoked_at = timezone.now()
        collaboration.save()

        # Check if user has other active collaborations
        other_active_collabs = DeviceCollaboration.objects.filter(
            collaborator_email=collaborator_email,
            status=DeviceCollaboration.Status.ACTIVE
        ).exclude(id=collaboration.id).count()

        user_deactivated = False
        if other_active_collabs == 0:
            # No other active collaborations - deactivate user and logout
            collaborator_user.is_active = False
            collaborator_user.save()
            user_deactivated = True

            # Invalidate all auth tokens for this user (force logout)
            from rest_framework.authtoken.models import Token
            Token.objects.filter(user=collaborator_user).delete()

            logger.info(f"User {collaborator_email} marked inactive and logged out (no other active collaborations)")
        else:
            logger.info(f"User {collaborator_email} still has {other_active_collabs} active collaboration(s), not deactivated")

        logger.info(f"Admin {request.user.email} revoked access for {collaborator_email} on device {device.device_serial}")

        # Broadcast WebSocket update
        broadcast_device_update(
            "collaborator_revoked",
            device,
            collaborator_email=collaborator_email,
            collaborator_id=user_id,
            user_deactivated=user_deactivated,
            remaining_collaborations=other_active_collabs,
            revoked_by_admin=request.user.email
        )

        return Response({
            'detail': f"Access revoked for {collaborator_email}",
            'user_deactivated': user_deactivated,
            'remaining_collaborations': other_active_collabs
        })

    @action(detail=True, methods=['post'], url_path='send-collaborator-otp', permission_classes=[IsAuthenticated])
    def send_collaborator_otp(self, request, pk=None):
        """Admin endpoint to send OTP for collaborator addition."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        collaborator_email = request.data.get('email')

        if not collaborator_email:
            return Response(
                {'detail': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collaborator_email = collaborator_email.lower().strip()

        try:
            # Check if device is bound
            if not device.is_bound:
                return Response(
                    {'detail': 'Device must be bound to a user before adding collaborators.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if user is the device owner
            if device.bound_email == collaborator_email:
                return Response(
                    {'detail': 'User is already the device owner.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already a collaborator
            existing_collab = DeviceCollaboration.objects.filter(
                device=device,
                collaborator_email=collaborator_email,
                status=DeviceCollaboration.Status.ACTIVE
            ).first()

            if existing_collab:
                return Response(
                    {'detail': 'User already a collaborator'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Invalidate any previous unused OTPs for this collaborator addition
            DeviceOTPCode.objects.filter(
                device=device,
                email=collaborator_email,
                is_verified=False
            ).delete()

            # Create new OTP
            otp = DeviceOTPCode.objects.create(
                device=device,
                email=collaborator_email
            )

            # Send OTP email
            email_sent = send_collaborator_otp_email(device, collaborator_email, otp.code)

            logger.info(f"Admin {request.user.email} sent collaborator OTP for device {device.device_serial} to {collaborator_email}")

            return Response({
                'detail': 'OTP sent to collaborator email',
                'debug_otp': otp.code if settings.DEBUG else None  # Only in debug mode
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending collaborator OTP: {str(e)}")
            return Response(
                {'detail': 'Failed to send OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='confirm-add-collaborator', permission_classes=[IsAuthenticated])
    def confirm_add_collaborator(self, request, pk=None):
        """Admin endpoint to confirm collaborator addition with OTP."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        collaborator_email = request.data.get('email')
        otp_code = request.data.get('otp')

        if not collaborator_email or not otp_code:
            return Response(
                {'detail': 'Email and OTP are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        collaborator_email = collaborator_email.lower().strip()
        otp_code = otp_code.strip()

        try:
            # Find valid OTP
            otp = DeviceOTPCode.objects.filter(
                device=device,
                email=collaborator_email,
                code=otp_code,
                is_verified=False
            ).order_by('-created_at').first()

            if not otp:
                return Response(
                    {'detail': 'Invalid or expired OTP'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not otp.is_valid:
                return Response(
                    {'detail': 'Invalid or expired OTP'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Mark OTP as verified
            otp.is_verified = True
            otp.save()

            # Get or create user (OTP-only, no password)
            from apps.accounts.models import User
            import uuid

            # Generate a unique username
            base_username = f"user_{collaborator_email.split('@')[0]}"
            username = f"{base_username}_{uuid.uuid4().hex[:8]}"

            user, user_created = User.objects.get_or_create(
                email=collaborator_email,
                defaults={
                    'username': username,
                    'is_active': True,
                }
            )

            # If user exists but was inactive, reactivate
            if not user_created and not user.is_active:
                user.is_active = True
                user.save()

            # Check if collaboration already exists
            existing_collaboration = DeviceCollaboration.objects.filter(
                device=device,
                collaborator_email=collaborator_email
            ).first()

            if existing_collaboration:
                # If collaboration exists and is active, return error
                if existing_collaboration.status == DeviceCollaboration.Status.ACTIVE:
                    return Response(
                        {'detail': 'User is already a collaborator on this device.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # If collaboration exists but is revoked, reactivate it
                existing_collaboration.permissions = DeviceCollaboration.Permission.VIEW_ONLY
                existing_collaboration.status = DeviceCollaboration.Status.ACTIVE
                existing_collaboration.shared_by_email = device.bound_email or request.user.email
                existing_collaboration.added_by = request.user
                existing_collaboration.revoked_by = None
                existing_collaboration.revoked_at = None
                existing_collaboration.save()

                collaboration = existing_collaboration
                logger.info(f"Admin {request.user.email} reactivated collaboration for {collaborator_email} on device {device.device_serial}")
            else:
                # Create new collaboration
                collaboration = DeviceCollaboration.objects.create(
                    device=device,
                    collaborator_email=collaborator_email,
                    permissions=DeviceCollaboration.Permission.VIEW_ONLY,
                    status=DeviceCollaboration.Status.ACTIVE,
                    shared_by_email=device.bound_email or request.user.email,
                    added_by=request.user
                )

            # Send welcome email if user was created (not for reactivation)
            if user_created:
                send_collaborator_invite_email(device, collaborator_email)

            logger.info(f"Admin {request.user.email} added {collaborator_email} as collaborator to device {device.device_serial} via OTP (user_created={user_created}, reactivated={bool(existing_collaboration)})")

            # Broadcast WebSocket update
            broadcast_device_update(
                "collaborator_added",
                device,
                collaborator_email=collaborator_email,
                collaborator_id=user.id,
                user_created=user_created,
                added_by_admin=request.user.email
            )

            return Response({
                'detail': f'Collaborator added successfully',
                'user_id': user.id,
                'user_created': user_created
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error confirming collaborator addition: {str(e)}")
            return Response(
                {'detail': 'Failed to add collaborator. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='add-collaborator', permission_classes=[IsAuthenticated])
    def add_collaborator(self, request, pk=None):
        """Legacy endpoint - redirects to OTP flow."""
        return Response(
            {'detail': 'This endpoint is deprecated. Use send-collaborator-otp and confirm-add-collaborator instead.'},
            status=status.HTTP_410_GONE
        )

    @action(detail=True, methods=['post'], url_path='admin-remove-ownership', permission_classes=[IsAuthenticated])
    def admin_remove_ownership(self, request, pk=None):
        """Admin endpoint to initiate ownership removal with OTP verification."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()

        if not device.is_bound:
            return Response(
                {'detail': 'Device is not currently bound to any user.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Invalidate any previous unused OTPs for this device ownership removal
            from apps.accounts.models import OTPCode
            OTPCode.objects.filter(
                email=device.bound_email,
                purpose=OTPCode.PURPOSE_REMOVE_OWNERSHIP,
                is_verified=False
            ).delete()

            # Create new OTP for ownership removal
            otp = OTPCode.objects.create(
                email=device.bound_email,
                purpose=OTPCode.PURPOSE_REMOVE_OWNERSHIP
            )

            # Send OTP email
            email_sent = send_ownership_removal_otp_email(device, request.user.email, otp.code)

            logger.info(f"Admin {request.user.email} initiated ownership removal OTP for device {device.device_serial} owned by {device.bound_email}")

            return Response({
                'detail': 'OTP sent to current owner for ownership removal confirmation.',
                'debug_otp': otp.code if settings.DEBUG else None  # Only in debug mode
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending ownership removal OTP: {str(e)}")
            return Response(
                {'detail': 'Failed to send OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='confirm-remove-ownership', permission_classes=[IsAuthenticated])
    def confirm_remove_ownership(self, request, pk=None):
        """Confirm ownership removal with OTP verification."""
        if not request.user.is_staff:
            return Response(
                {'detail': 'Permission denied. Admin access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        device = self.get_object()
        otp_code = request.data.get('otp')

        if not otp_code:
            return Response(
                {'detail': 'OTP code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp_code = otp_code.strip()

        try:
            # Verify OTP
            from apps.accounts.models import OTPCode
            if not OTPCode.verify_otp(device.bound_email, otp_code, OTPCode.PURPOSE_REMOVE_OWNERSHIP):
                return Response(
                    {'detail': 'Invalid or expired OTP'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Proceed with ownership removal
            old_owner_email = device.bound_email

            # Revoke all collaborations for this device
            DeviceCollaboration.objects.filter(
                device=device,
                status=DeviceCollaboration.Status.ACTIVE
            ).update(status=DeviceCollaboration.Status.REVOKED)

            # Unbind the device
            device.is_bound = False
            device.bound_email = None
            device.save()

            logger.info(f"Admin {request.user.email} removed ownership of device {device.device_serial} from {old_owner_email}")

            # Broadcast WebSocket update
            broadcast_device_update("ownership_removed", device, old_owner_email=old_owner_email, removed_by_admin=request.user.email)

            return Response({
                'detail': f'Ownership successfully removed from {old_owner_email}. Device is now unbound.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error confirming ownership removal: {str(e)}")
            return Response(
                {'detail': 'Failed to remove ownership. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # Enforce owner-only for device-level writes via standard endpoints
    def perform_update(self, serializer):
        device = self.get_object()
        user = self.request.user
        if not user.is_staff and device.bound_email != user.email:
            raise PermissionDenied("Permission denied. Only the device owner can modify device details.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.is_bound:
            raise PermissionDenied("Permission denied. Cannot delete a device that is already bound to an email address.")
        if not user.is_staff and instance.bound_email != user.email:
            raise PermissionDenied("Permission denied. Only the device owner can delete a device.")
        instance.delete()

    def create(self, request, *args, **kwargs):
        # Devices are created via binding flow; block generic creation for non-staff
        if not request.user.is_staff:
            raise PermissionDenied("Device creation is not allowed via this endpoint.")
        return super().create(request, *args, **kwargs)


# Device Invitation Management Views

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_invitations(request):
    """Get pending invitations for the current user."""
    user_email = request.user.email

    pending_invitations = DeviceInvitation.objects.filter(
        invite_email=user_email,
        status=DeviceInvitation.Status.PENDING
    ).select_related('device').order_by('-created_at')

    # Filter out expired invitations and mark them as expired
    active_invitations = []
    for invitation in pending_invitations:
        if invitation.is_expired():
            invitation.status = DeviceInvitation.Status.EXPIRED
            invitation.save()
        else:
            active_invitations.append(invitation)

    serializer = DeviceInvitationSerializer(active_invitations, many=True)
    return Response({
        'results': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_invitation(request):
    """Accept or decline a device invitation."""
    serializer = InvitationResponseSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    action = serializer.validated_data['action']
    token = serializer.validated_data['token']

    try:
        invitation = DeviceInvitation.objects.get(
            token=token,
            invite_email=request.user.email,
            status=DeviceInvitation.Status.PENDING
        )
    except DeviceInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found or already processed.'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        if action == 'accept':
            collaboration = invitation.accept(request.user.email)
            logger.info(f"User {request.user.email} accepted invitation for device {invitation.device.device_serial}")
            return Response({
                'success': True,
                'message': 'Invitation accepted successfully.',
                'collaboration_id': collaboration.id
            })

        elif action == 'decline':
            invitation.decline(request.user.email)
            logger.info(f"User {request.user.email} declined invitation for device {invitation.device.device_serial}")
            return Response({
                'success': True,
                'message': 'Invitation declined.'
            })

    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_shared_devices(request):
    """Get devices shared with the current user."""
    user_email = request.user.email

    collaborations = DeviceCollaboration.objects.filter(
        collaborator_email=user_email,
        status=DeviceCollaboration.Status.ACTIVE
    ).select_related('device').order_by('-created_at')

    serializer = DeviceCollaborationSerializer(collaborations, many=True)
    return Response({
        'results': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sent_invitations(request):
    """Get invitations sent by the current user (owner/sharer)."""
    sender_email = request.user.email

    qs = DeviceInvitation.objects.filter(
        invited_by_email=sender_email,
    ).select_related('device').order_by('-created_at')

    # Optional filtering by device id
    device_id = request.query_params.get('device_id')
    if device_id:
        qs = qs.filter(device_id=device_id)

    serializer = DeviceInvitationSerializer(qs, many=True)
    return Response({
        'results': serializer.data,
        'count': len(serializer.data)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_notifications(request):
    """
    Subscribe to push notifications.

    This is a simple endpoint for PWA push notification subscriptions.
    In a production app, you would store the subscription data and use it
    to send push notifications via a service like Firebase or Web Push Protocol.
    """
    try:
        subscription_data = request.data

        # Validate required fields
        required_fields = ['endpoint', 'keys']
        if not all(field in subscription_data for field in required_fields):
            return Response(
                {'error': 'Missing required subscription data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # In a real implementation, you would:
        # 1. Store the subscription data in the database linked to the user
        # 2. Use a service like py-vapid to send push notifications
        # 3. Handle subscription updates and cleanup

        logger.info(f"Push notification subscription for user {request.user.email}")
        logger.debug(f"Subscription data: {subscription_data}")

        # For now, just acknowledge the subscription
        return Response({
            'message': 'Push notification subscription successful',
            'user': request.user.email,
            'subscribed_at': timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Push notification subscription failed: {str(e)}")
        return Response(
            {'error': 'Failed to process subscription'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def cancel_sent_invitation(request, invitation_id: int):
    """Allow the device owner (inviter) to cancel a pending invitation they sent.

    Transitions the invitation status from PENDING to DECLINED.
    """
    try:
        invitation = DeviceInvitation.objects.get(id=invitation_id)
    except DeviceInvitation.DoesNotExist:
        return Response(
            {'error': 'Invitation not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only the inviter can cancel their own pending invitations (or staff)
    if not request.user.is_staff and invitation.invited_by_email != request.user.email:
        return Response(
            {'error': 'Permission denied. You can only cancel invitations you sent.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if invitation.status != DeviceInvitation.Status.PENDING:
        return Response(
            {'error': f'Cannot cancel invitation with status: {invitation.status}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Mark as declined to free up the ability to invite again
    invitation.status = DeviceInvitation.Status.DECLINED
    invitation.save(update_fields=['status'])

    logger.info(
        "Invitation %s canceled by %s for device %s",
        invitation.id,
        request.user.email,
        invitation.device.device_serial,
    )

    return Response({
        'success': True,
        'message': 'Invitation canceled.',
        'invitation_id': invitation.id,
        'status': invitation.status,
    }, status=status.HTTP_200_OK)
