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
from .models import OTPCode, LoginAttempt
from .serializers import (
    OTPRequestSerializer, 
    OTPVerifySerializer, 
    UserSerializer,
    UserProfileSerializer
)
import logging
import asyncio
from asgiref.sync import sync_to_async

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


@sync_to_async
def send_otp_email_async(email, code, purpose='login'):
    """Send OTP email asynchronously."""
    try:
        subject_map = {
            'login': 'Your Login Code',
            'register': 'Welcome! Your Verification Code',
            'reset': 'Password Reset Code'
        }
        
        subject = subject_map.get(purpose, 'Your Verification Code')
        
        # Create HTML content
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; text-align: center;">SmarTanom</h2>
                <h3 style="color: #666;">Your verification code</h3>
                <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #007bff; font-size: 36px; letter-spacing: 8px; margin: 0;">{code}</h1>
                </div>
                <p style="color: #666;">This code will expire in 5 minutes.</p>
                <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated message from SmarTanom. Please do not reply.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        plain_message = f"""
        SmarTanom - Your verification code
        
        Your verification code is: {code}
        
        This code will expire in 5 minutes.
        
        If you didn't request this code, please ignore this email.
        """
        
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


def send_otp_email(email, code, purpose='login'):
    """Send OTP email."""
    if settings.DEBUG:
        # In debug mode, log the code for debugging
        logger.info(f"DEBUG MODE - OTP Code for {email}: {code}")
        print(f"DEBUG MODE - OTP Code for {email}: {code}")
    
    try:
        # Run async email sending (always send email, even in debug mode)
        asyncio.run(send_otp_email_async(email, code, purpose))
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email: {str(e)}")
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
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
        # Check if user exists for login, create if registering
        user_exists = User.objects.filter(email=email).exists()
        
        if purpose == 'login' and not user_exists:
            # Auto-create user for first-time login
            user = User.objects.create_user(email=email)
            logger.info(f"Auto-created user for {email}")
        elif purpose == 'register' and user_exists:
            return Response(
                {'error': 'User already exists with this email.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create OTP
        otp = OTPCode.create_otp(email, purpose)
        
        # Send email
        if send_otp_email(email, otp.code, purpose):
            # Record successful OTP request
            LoginAttempt.record_attempt(email, ip_address, successful=True)
            
            response_data = {
                'message': 'OTP sent successfully',
                'email': email,
                'expires_in': 300  # 5 minutes
            }
            
            # Include code in debug mode
            if settings.DEBUG:
                response_data['debug_code'] = otp.code
            
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to send OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    except Exception as e:
        logger.error(f"Error in request_otp: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
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
        # Verify OTP
        if OTPCode.verify_otp(email, code, purpose):
            # Get or create user
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # This shouldn't happen if request_otp worked correctly
                user = User.objects.create_user(email=email)
            
            # Mark user as verified
            if not user.is_verified:
                user.is_verified = True
                user.save(update_fields=['is_verified'])
            
            # Update last login
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            # Create or get auth token
            token, created = Token.objects.get_or_create(user=user)
            
            # Record successful login
            LoginAttempt.record_attempt(email, ip_address, successful=True)
            
            # Prepare response
            user_data = UserSerializer(user).data
            
            return Response({
                'message': 'Authentication successful',
                'token': token.key,
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        else:
            # Record failed attempt
            LoginAttempt.record_attempt(email, ip_address, successful=False)
            
            return Response(
                {'error': 'Invalid or expired OTP code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
def profile(request):
    """Get current user profile."""
    try:
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in profile: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user profile."""
    try:
        serializer = UserProfileSerializer(
            request.user, 
            data=request.data, 
            partial=request.method == 'PATCH'
        )
        
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


# Cleanup task views
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