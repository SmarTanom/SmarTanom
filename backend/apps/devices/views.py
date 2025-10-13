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
from apps.accounts.models import User
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
import logging

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

    # Enforce owner-only for device-level writes via standard endpoints
    def perform_update(self, serializer):
        device = self.get_object()
        user = self.request.user
        if not user.is_staff and device.bound_email != user.email:
            raise PermissionDenied("Permission denied. Only the device owner can modify device details.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
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
