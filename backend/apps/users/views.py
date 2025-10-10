"""Views for user authentication and management."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
import logging
import os

from .models import OTPCode, LoginAttempt
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserSerializer,
    UserProfileSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def send_otp_email(email, code, purpose='login'):
    """Send OTP email (synchronous & reliable).

    Previously this used asyncio + sync_to_async which could mask failures;
    now it sends directly and returns a real success boolean.
    """
    if settings.DEBUG:
        logger.info(f"DEBUG MODE - OTP Code for {email}: {code}")
        print(f"DEBUG MODE - OTP Code for {email}: {code}")

    subject_map = {
        OTPCode.PURPOSE_LOGIN: 'Your login code',
        OTPCode.PURPOSE_REGISTER: 'Welcome - Confirm your account',
        OTPCode.PURPOSE_RESET: 'Password reset code',
    }

    subject = subject_map.get(purpose, 'Your verification code')

    # Render HTML email
    context = {
        'email': email,
        'code': code,
        'purpose': purpose,
        'site_name': settings.SITE_NAME,
        'expire_minutes': settings.OTP_EXPIRE_MINUTES,
    }
    html_message = render_to_string('emails/otp_email.html', context)
    text_message = strip_tags(html_message)

    try:
        send_result = send_mail(
            subject=subject,
            message=text_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html_message,
            fail_silently=False,
        )
        return send_result > 0
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {e}")
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    """Request OTP code for authentication.

    Request body:
        email: User email
    """
    serializer = OTPRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get('email')
    ip_address = get_client_ip(request)

    # Check rate limiting
    if LoginAttempt.is_rate_limited(email, ip_address):
        LoginAttempt.record_attempt(email, ip_address, successful=False)
        return Response({
            'error': 'Too many attempts. Please try again later.',
            'rate_limited': True
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Determine if this is a login or registration
    user_exists = User.objects.filter(email=email).exists()
    purpose = OTPCode.PURPOSE_LOGIN if user_exists else OTPCode.PURPOSE_REGISTER

    # Generate new OTP
    otp = OTPCode.create_otp(email, purpose)

    # Send email
    success = send_otp_email(email, otp.code, purpose)

    response_data = {
        'message': f'OTP code has been sent to {email}',
        'purpose': purpose,
        'success': success,
    }

    # Add debug information if in debug mode
    if settings.DEBUG:
        response_data['debug_email'] = email
        response_data['debug_code'] = otp.code
        response_data['debug_purpose'] = purpose

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Verify OTP code and authenticate user.

    Request body:
        email: User email
        code: OTP code
    """
    serializer = OTPVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data.get('email')
    code = serializer.validated_data.get('code')
    ip_address = get_client_ip(request)

    # Check if user exists
    user_exists = User.objects.filter(email=email).exists()
    purpose = OTPCode.PURPOSE_LOGIN if user_exists else OTPCode.PURPOSE_REGISTER

    # Verify OTP
    if not OTPCode.verify_otp(email, code, purpose):
        LoginAttempt.record_attempt(email, ip_address, successful=False)
        return Response({
            'error': 'Invalid or expired OTP code',
            'success': False
        }, status=status.HTTP_400_BAD_REQUEST)

    # Record successful attempt
    LoginAttempt.record_attempt(email, ip_address, successful=True)

    # Get or create user
    if user_exists:
        user = User.objects.get(email=email)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        is_new_user = False
    else:
        user = User.objects.create_user(email=email)
        is_new_user = True

    # Generate or get auth token
    token, _ = Token.objects.get_or_create(user=user)

    # Return user data
    user_data = UserSerializer(user).data

    return Response({
        'token': token.key,
        'user': user_data,
        'is_new_user': is_new_user,
        'account_setup_complete': bool(user.username),
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Invalidate auth token."""
    try:
        request.user.auth_token.delete()
    except (AttributeError, Token.DoesNotExist):
        pass

    return Response({
        'message': 'Successfully logged out',
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_status(request):
    """Check authentication status and return user info."""
    user = request.user
    user_data = UserSerializer(user).data

    return Response({
        'authenticated': True,
        'user': user_data,
        'account_setup_complete': bool(user.username)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_account(request):
    """Complete user account setup with username."""
    user = request.user
    serializer = UserProfileSerializer(user, data=request.data, partial=True)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data.get('username')
    if not username:
        return Response({
            'error': 'Username is required',
            'success': False
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if username already exists (for another user)
    if User.objects.filter(username=username).exclude(id=user.id).exists():
        return Response({
            'error': 'Username already taken',
            'success': False,
            'field': 'username',
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update user profile
    serializer.save()

    # Mark as verified if not already
    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=['is_verified'])

    return Response({
        'message': 'Account setup complete',
        'user': UserSerializer(user).data,
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_availability(request):
    """Check if a username is available."""
    username = request.query_params.get('username', '').strip()

    if not username:
        return Response({
            'error': 'Username parameter is required',
            'success': False
        }, status=status.HTTP_400_BAD_REQUEST)

    is_available = not User.objects.filter(username=username).exists()

    return Response({
        'username': username,
        'available': is_available,
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get user profile."""
    user = request.user
    return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update user profile."""
    user = request.user
    serializer = UserProfileSerializer(user, data=request.data, partial=True)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # If updating username, check if it's taken by another user
    username = serializer.validated_data.get('username')
    if username and User.objects.filter(username=username).exclude(id=user.id).exists():
        return Response({
            'error': 'Username already taken',
            'success': False,
            'field': 'username',
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response({
        'message': 'Profile updated successfully',
        'user': UserSerializer(user).data,
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """List all users (staff only)."""
    if not request.user.is_staff:
        return Response({
            'error': 'Permission denied',
            'success': False
        }, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.all()
    serializer = UserSerializer(users, many=True)

    return Response({
        'users': serializer.data,
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_user(request):
    """Promote user to admin (staff only)."""
    if not request.user.is_staff:
        return Response({
            'error': 'Permission denied',
            'success': False
        }, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    if not user_id:
        return Response({
            'error': 'User ID is required',
            'success': False
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({
            'error': 'User not found',
            'success': False
        }, status=status.HTTP_404_NOT_FOUND)

    user.role = User.ADMIN
    user.is_staff = True
    user.save(update_fields=['role', 'is_staff'])

    return Response({
        'message': f'User {user.email} promoted to admin',
        'user': UserSerializer(user).data,
        'success': True
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_expired_otps(request):
    """Clean up expired OTP codes (staff only)."""
    if not request.user.is_staff:
        return Response({
            'error': 'Permission denied',
            'success': False
        }, status=status.HTTP_403_FORBIDDEN)

    deleted_count = OTPCode.cleanup_expired()

    return Response({
        'message': f'Cleaned up {deleted_count} expired OTP codes',
        'count': deleted_count,
        'success': True
    }, status=status.HTTP_200_OK)
