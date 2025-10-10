"""Device app views."""

from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from apps.accounts.models import User
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import logging

from apps.common.views import BaseAuthViewSet
from .models import Device, DeviceOTPCode
from .serializers import (
    DeviceSerializer,
    DeviceCheckSerializer,
    DeviceBindRequestSerializer,
    DeviceBindVerifySerializer
)

logger = logging.getLogger(__name__)


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


@api_view(['POST'])
@permission_classes([AllowAny])
def check_device(request):
    """Check if device exists and can be bound."""
    serializer = DeviceCheckSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    serial_number = serializer.validated_data['serial_number']

    try:
        device = Device.objects.get(device_serial=serial_number)
        return Response({
            'exists': True,
            'serial_number': serial_number,
            'device_name': device.device_name,
            'is_bound': device.is_bound
        }, status=status.HTTP_200_OK)
    except Device.DoesNotExist:
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
            device.is_bound = True
            device.bound_email = email
            device.save(update_fields=['is_bound', 'bound_email'])

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

    queryset = Device.objects.select_related("user").all()
    serializer_class = DeviceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["device_name", "status", "user__username", "user__email"]
    ordering_fields = ["device_name", "status", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):  # Users see only their devices unless staff
        qs = super().get_queryset()
        user = self.request.user
        if user.is_staff:
            # Staff users see all devices (owned and unowned)
            return qs
        # Regular users see only their own devices (not unowned ones)
        return qs.filter(user=user)
