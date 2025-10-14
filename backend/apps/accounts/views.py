from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes, authentication_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from .models import OTPCode, LoginAttempt
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserSerializer,
    UserProfileSerializer
)
import logging
import os
import requests
import dns.resolver
import asyncio
from asgiref.sync import sync_to_async  # (May remain for future async tasks, not used now)
from apps.devices.models import DeviceInvitation, DeviceCollaboration, Device

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


def send_otp_email(email, code, purpose='login', device_name=None):
    """Send OTP email (synchronous & reliable).

    Previously this used asyncio + sync_to_async which could mask failures;
    now it sends directly and returns a real success boolean.
    """
    if settings.DEBUG:
        # Log debug OTP to file/console; avoid printing to stdout
        logger.info(f"DEBUG MODE - OTP Code for {email}: {code} (Purpose: {purpose})")

    subject_map = {
        'login': 'Your Login Code',
        'register': 'Welcome! Your Verification Code',
        'reset': 'Password Reset Code',
        'revoke': '🔒 Device Access Revocation Confirmation'
    }
    subject = subject_map.get(purpose, 'Your Verification Code')

    expire_minutes = getattr(settings, 'OTP_EXPIRE_MINUTES', 5)

    # Use custom templates for device revocation
    if purpose == 'revoke':
        from django.template.loader import render_to_string
        from django.utils import timezone
        import socket

        context = {
            'code': code,
            'device_name': device_name,
            'expiry_minutes': expire_minutes,
            'site_name': 'SmarTanom',
            'request_ip': 'system',
            'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
            'year': timezone.now().year,
        }

        html_message = render_to_string('emails/device_revoke_otp_email.html', context)
        plain_message = render_to_string('emails/device_revoke_otp_email.txt', context)
    else:
        # Default template for other purposes
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; text-align: center;">SmarTanom</h2>
                <h3 style="color: #666;">Your verification code</h3>
                <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
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
            "SmarTanom - Your verification code\n\n"
            f"Your verification code is: {code}\n\n"
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
        logger.info(f"OTP email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email to {email}: {str(e)}")
        return False


def _user_has_active_access(email: str) -> bool:
    """Return True if the user has any owned devices or active collaborations."""
    try:
        owns = Device.objects.filter(bound_email=email).exists()
        if owns:
            return True
        collab = DeviceCollaboration.objects.filter(
            collaborator_email=email,
            status=DeviceCollaboration.Status.ACTIVE,
        ).exists()
        return collab
    except Exception:
        # Fail-safe: don't block due to DB error
        return True


def _has_google_mx_records(domain: str) -> bool:
    """Quick MX check to see if the domain uses Google mail servers.

    This is a heuristic (many Google accounts are @gmail.com or use Google Workspace).
    We don't strictly require Gmail MX for allow-list; we only use this as a soft validation
    when GOOGLE_ENFORCE_MX=true. Defaults to false.
    """
    try:
        answers = dns.resolver.resolve(domain, 'MX')
        google_hosts = (
            'aspmx.l.google.com',
            'alt1.aspmx.l.google.com',
            'alt2.aspmx.l.google.com',
            'alt3.aspmx.l.google.com',
            'alt4.aspmx.l.google.com',
        )
        for rdata in answers:
            mx = str(rdata.exchange).rstrip('.')
            if any(mx.endswith(gh) for gh in google_hosts):
                return True
    except Exception:
        return False
    return False


def verify_google_account(email: str) -> bool:
    """Verify that an email belongs to a valid Google account.

    Because we do not show a Google sign-in popup, we cannot complete an OAuth flow client-side.
    Instead, we implement a conservative server-side verification strategy:
      - If the domain is gmail.com, accept as Google-managed.
      - If GOOGLE_ENFORCE_MX=true, require the domain MX to match Google Workspace.
      - If a server-provided Google ID token is configured (rare), validate via tokeninfo.

    Environment flags:
      - GOOGLE_ENFORCE_MX (default: false)
      - GOOGLE_REQUIRE_DOMAIN (comma-separated allow-list of domains; optional)
    """
    email = email.lower().strip()
    try:
        local, domain = email.split('@', 1)
    except ValueError:
        return False

    # Optional: restrict to specific domains
    allowed_domains = os.getenv('GOOGLE_REQUIRE_DOMAIN', '')
    if allowed_domains:
        allow = [d.strip().lower() for d in allowed_domains.split(',') if d.strip()]
        if domain not in allow:
            logger.warning(f"Email domain {domain} not in allowed list")
            return False

    if domain == 'gmail.com':
        return True

    # Optional: require MX records that point to Google
    enforce_mx = (os.getenv('GOOGLE_ENFORCE_MX') or 'false').lower() == 'true'
    if enforce_mx and not _has_google_mx_records(domain):
        logger.warning(f"Domain {domain} does not appear to use Google MX; rejecting due to GOOGLE_ENFORCE_MX=true")
        return False

    # If admin provides an ID token to validate (rare), attempt tokeninfo validation
    # Note: Normally token comes from client after Google Sign-In. Since we don't show a popup,
    # we skip unless a token is provided via env for test purposes.
    fake_id_token = os.getenv('GOOGLE_TEST_ID_TOKEN')
    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if fake_id_token and client_id:
        try:
            resp = requests.get('https://oauth2.googleapis.com/tokeninfo', params={'id_token': fake_id_token}, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('aud') == client_id and data.get('email') == email and data.get('email_verified') == 'true':
                    return True
        except Exception as e:
            logger.warning(f"tokeninfo check failed: {e}")

    # Fallback: accept if passes domain policy. For Google Workspace, users' domains may be custom; we can't perfectly verify without OAuth flow.
    return True


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def request_otp(request):
    """Request OTP code for authentication."""
    serializer = OTPRequestSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    email = serializer.validated_data['email']
    purpose = serializer.validated_data.get('purpose', 'login')
    ip_address = get_client_ip(request)

    # Check rate limiting
    if LoginAttempt.is_rate_limited(email, ip_address):
        return Response(
            {'error': 'Too many attempts. Please try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    try:
        # Determine whether the email already exists or has an active invitation
        email_exists = User.objects.filter(email=email).exists()
        invited_exists = DeviceInvitation.objects.filter(
            invite_email=email,
            status=DeviceInvitation.Status.PENDING,
            expires_at__gt=timezone.now()
        ).exists()
        original_purpose = purpose
        flow_hint = None

        # Verify email is a Google account based on configured policy
        if not verify_google_account(email):
            LoginAttempt.record_attempt(email, ip_address, successful=False)
            # Generic message to avoid differentiating policy failure specifics
            return Response({
                'message': 'If the account exists, a code was sent.',
                'email': email,
                'expires_in': getattr(settings, 'OTP_EXPIRE_MINUTES', 5) * 60
            }, status=status.HTTP_200_OK)

        # Handle different OTP purposes
        if original_purpose == OTPCode.PURPOSE_REVOKE:
            # For device revocation, user must be authenticated and exist
            if not email_exists:
                LoginAttempt.record_attempt(email, ip_address, successful=False)
                return Response({'error': 'Account not found.'}, status=status.HTTP_400_BAD_REQUEST)
            purpose = OTPCode.PURPOSE_REVOKE
        elif original_purpose == OTPCode.PURPOSE_LOGIN:
            if email_exists:
                # Allow login for existing users if they have active access OR a pending invitation
                try:
                    user_obj = User.objects.get(email=email)
                except User.DoesNotExist:
                    user_obj = None
                if user_obj and not user_obj.is_staff and not _user_has_active_access(email) and not invited_exists:
                    # In development, relax this restriction to ease testing from mobile
                    if not settings.DEBUG:
                        LoginAttempt.record_attempt(email, ip_address, successful=False)
                        return Response({'error': 'No active device access for this account.'}, status=status.HTTP_403_FORBIDDEN)
                    else:
                        logger.warning(f"DEBUG override: allowing OTP for {email} without active access/invitation")
                purpose = OTPCode.PURPOSE_LOGIN
            elif invited_exists:
                # Allow login attempt to proceed as signup flow for invited emails
                purpose = OTPCode.PURPOSE_REGISTER
                flow_hint = 'should_signup'
            else:
                LoginAttempt.record_attempt(email, ip_address, successful=False)
                return Response({'error': 'Email not recognized or not invited.'}, status=status.HTTP_400_BAD_REQUEST)
        elif original_purpose == OTPCode.PURPOSE_REGISTER:
            if email_exists:
                # Existing users should login instead
                LoginAttempt.record_attempt(email, ip_address, successful=False)
                return Response({'error': 'Email already registered. Please log in.'}, status=status.HTTP_400_BAD_REQUEST)
            if not invited_exists:
                LoginAttempt.record_attempt(email, ip_address, successful=False)
                return Response({'error': 'Email is not invited.'}, status=status.HTTP_400_BAD_REQUEST)
            purpose = OTPCode.PURPOSE_REGISTER

        # Otherwise create OTP (covers normal login for existing account, or register/create flow, or register attempt for existing which we coerce to login)
        otp = OTPCode.create_otp(email, purpose)

        # Send email with device info for revoke purpose
        device_name = None
        if purpose == OTPCode.PURPOSE_REVOKE:
            # For revoke purpose, we don't need specific device name in OTP request
            # It will be used in the actual revoke operation
            device_name = request.data.get('device_name', 'Unknown Device')

        if send_otp_email(email, otp.code, purpose, device_name):
            LoginAttempt.record_attempt(email, ip_address, successful=True)
        # Always return generic message regardless of underlying send failure to avoid probing
        response_data = {
            'message': 'Verification code sent.',
            'email': email,
            'expires_in': getattr(settings, 'OTP_EXPIRE_MINUTES', 5) * 60,
            'flow_hint': flow_hint,
        }
        if settings.DEBUG:
            response_data['debug_code'] = otp.code
        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in request_otp: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_otp(request):
    """Verify OTP code and authenticate user."""
    serializer = OTPVerifySerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    email = serializer.validated_data['email']
    code = serializer.validated_data['code']
    purpose = serializer.validated_data.get('purpose', 'login')
    ip_address = get_client_ip(request)

    # Check rate limiting
    if LoginAttempt.is_rate_limited(email, ip_address):
        return Response(
            {'error': 'Too many attempts. Please try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    try:
        # Verify OTP validity (generic failure message to avoid enumeration)
        if not OTPCode.verify_otp(email, code, purpose):
            LoginAttempt.record_attempt(email, ip_address, successful=False)
            return Response({'error': 'Invalid code or authentication failed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve existing user or create only if purpose is register and user does not exist.
        user = None
        user_exists = User.objects.filter(email=email).exists()
        creation_flow = False
        if user_exists:
            user = User.objects.get(email=email)
            # If purpose is register but user already exists, treat as login success but include flow_hint so frontend can route to login completion (skipping signup steps like username if already set).
            flow_hint = 'should_login' if purpose == OTPCode.PURPOSE_REGISTER else None
        else:
            if purpose == OTPCode.PURPOSE_REGISTER:
                # Only allow creating accounts for invited emails (pending & unexpired)
                invited_exists = DeviceInvitation.objects.filter(
                    invite_email=email,
                    status=DeviceInvitation.Status.PENDING,
                    expires_at__gt=timezone.now()
                ).exists()
                if not invited_exists:
                    LoginAttempt.record_attempt(email, ip_address, successful=False)
                    return Response({'error': 'Registration is limited to invited emails.'}, status=status.HTTP_400_BAD_REQUEST)
                user = User.objects.create_user(email=email)
                creation_flow = True
                flow_hint = None
            else:
                # Attempted login for non-existent account
                LoginAttempt.record_attempt(email, ip_address, successful=False)
                return Response({'error': 'Invalid code or authentication failed.'}, status=status.HTTP_400_BAD_REQUEST)

        # If this is a login flow for an existing user, enforce active access gating
        if user and purpose == OTPCode.PURPOSE_LOGIN and not user.is_staff:
            if not _user_has_active_access(email):
                # Permit login if the user has a pending, unexpired invitation to allow accepting it
                invited_exists = DeviceInvitation.objects.filter(
                    invite_email=email,
                    status=DeviceInvitation.Status.PENDING,
                    expires_at__gt=timezone.now()
                ).exists()
                if not invited_exists:
                    LoginAttempt.record_attempt(email, ip_address, successful=False)
                    return Response({'error': 'Login is restricted: no active device access for this account.'}, status=status.HTTP_403_FORBIDDEN)

        # Mark verified if needed
        if not user.is_verified:
            user.is_verified = True
            user.save(update_fields=['is_verified'])

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        token, _ = Token.objects.get_or_create(user=user)
        LoginAttempt.record_attempt(email, ip_address, successful=True)
        user_data = UserSerializer(user).data
        resp = {
            'message': 'Authentication successful',
            'token': token.key,
            'user': user_data,
        }
        # Include flow_hint if relevant (existing account attempted register)
        if user_exists and purpose == OTPCode.PURPOSE_REGISTER:
            resp['flow_hint'] = 'should_login'
        elif (not user_exists) and creation_flow and purpose == OTPCode.PURPOSE_REGISTER:
            resp['flow_hint'] = 'signup_created'
        return Response(resp, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finalize_account(request):
    """Finalize account by setting username (and optional names)."""
    user = request.user
    data = request.data or {}
    username = (data.get('username') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()

    if not username:
        return Response({'error': 'Username is required'}, status=status.HTTP_400_BAD_REQUEST)

    import re
    if not re.match(r'^[A-Za-z0-9_-]{3,30}$', username):
        return Response({'error': 'Username must be 3-30 chars: letters, numbers, underscore, hyphen'}, status=status.HTTP_400_BAD_REQUEST)

    # Ensure uniqueness case-insensitive
    if User.objects.filter(username__iexact=username).exclude(id=user.id).exists():
        return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)

    user.username = username
    if first_name:
        user.first_name = first_name
    if last_name:
        user.last_name = last_name
    user.save()

    return Response({'message': 'Account finalized', 'user': UserSerializer(user).data}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by deleting their token."""
    try:
        # Delete the user's token
        Token.objects.filter(user=request.user).delete()

        return Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in logout: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([])  # Disable throttling for profile endpoint
def profile(request):
    """Get current user profile."""
    try:
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in profile: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_profile(request):
    """Update current user profile."""
    try:
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=request.method == 'PATCH'
        , context={'request': request})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(
            {'error': 'Invalid data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Error in update_profile: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """List all users (admin only)."""
    if not request.user.is_admin:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error in user_list: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def promote_user(request):
    """Promote user to admin (admin only)."""
    if not request.user.is_admin:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.get(email=email)
        user.role = User.ADMIN
        user.is_staff = True
        user.save()

        return Response(
            {'message': f'User {email} promoted to admin'},
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in promote_user: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_status(request):
    """Check authentication status."""
    if request.user.is_authenticated:
        serializer = UserSerializer(request.user)
        return Response({
            'authenticated': True,
            'user': serializer.data
        })
    else:
        return Response({
            'authenticated': False,
            'user': None
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def check_username_availability(request):
    """Check if a username is available."""
    username = request.query_params.get('username', '').strip()

    if not username:
        return Response(
            {'error': 'Username parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check minimum length
    if len(username) < 3:
        return Response({
            'available': False,
            'message': 'Username must be at least 3 characters'
        })

    # Check maximum length
    if len(username) > 30:
        return Response({
            'available': False,
            'message': 'Username must be less than 30 characters'
        })

    # Check if username contains only valid characters (alphanumeric, underscore, hyphen)
    import re
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return Response({
            'available': False,
            'message': 'Username can only contain letters, numbers, underscores, and hyphens'
        })

    # Check if username is taken
    exists = User.objects.filter(username__iexact=username).exists()

    if exists:
        return Response({
            'available': False,
            'message': 'Username is already taken'
        })
    else:
        return Response({
            'available': True,
            'message': 'Username is available'
        })


# Cleanup task views
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user(request, user_id):
    """Delete a user safely (admin only)."""
    if not request.user.is_admin:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        user_to_delete = User.objects.get(id=user_id)

        # Prevent deleting other admins or self
        if user_to_delete.is_admin:
            return Response(
                {'error': 'Cannot delete admin users'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_to_delete == request.user:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clean up related data first (similar to safe_delete_users in admin.py)
        from rest_framework.authtoken.models import Token
        from django.contrib.admin.models import LogEntry
        from apps.devices.models import DeviceInvitation, DeviceCollaboration, Device

        Token.objects.filter(user=user_to_delete).delete()
        LogEntry.objects.filter(user=user_to_delete).delete()
        OTPCode.objects.filter(email=user_to_delete.email).delete()
        LoginAttempt.objects.filter(email=user_to_delete.email).delete()

        # Clean up device-related data
        DeviceInvitation.objects.filter(invite_email=user_to_delete.email).delete()
        DeviceCollaboration.objects.filter(collaborator_email=user_to_delete.email).delete()

        # Delete owned devices (this will cascade to related data)
        owned_devices = Device.objects.filter(bound_email=user_to_delete.email)
        owned_devices.delete()

        user_to_delete.groups.clear()
        user_to_delete.user_permissions.clear()

        # Store email for response before deletion
        deleted_email = user_to_delete.email

        # Delete the user
        user_to_delete.delete()

        return Response(
            {'message': f'User {deleted_email} has been successfully deleted'},
            status=status.HTTP_200_OK
        )

    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in delete_user: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cleanup_expired_otps(request):
    """Cleanup expired OTP codes (admin only)."""
    if not request.user.is_admin:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        count = OTPCode.cleanup_expired()
        return Response(
            {'message': f'Cleaned up {count} expired OTP codes'},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in cleanup_expired_otps: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
