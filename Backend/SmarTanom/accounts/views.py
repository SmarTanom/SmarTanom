from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from .utils import account_activation_token
from .email_templates import get_activation_email

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate activation token
        token = account_activation_token.make_token(user)
        
        # Send activation email
        subject, message = get_activation_email(user, request, token)
        try:
            send_mail(
                subject,
                message,
                None,  # Uses DEFAULT_FROM_EMAIL from settings
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"Failed to send email: {e}")
            return Response(
                {"error": "Failed to send activation email. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'success': True,
            'message': 'Registration successful! Please check your email to activate your account.',
            'user_id': user.id,
            'email': user.email
        }, status=status.HTTP_201_CREATED)

class ActivateAccountView(APIView):
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            # Update both fields
            user.is_active = True
            user.email_verified = True
            user.save(update_fields=['is_active', 'email_verified'])
            
            # Automatically log the user in after activation
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'message': 'Account activated successfully!',
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Activation link is invalid or has expired.'
            }, status=status.HTTP_400_BAD_REQUEST)
    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.email_verified = True
            user.save()
            
            # Automatically log the user in after activation
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'message': 'Account activated successfully!',
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            return Response({
                'success': False,
                'message': 'Activation link is invalid or has expired.'
            }, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.validated_data['user']
            
            if not user.is_active:
                return Response({
                    'success': False,
                    'error': 'Account is not active. Please verify your email first.'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            if not user.email_verified:
                return Response({
                    'success': False,
                    'error': 'Email not verified. Please check your email for verification link.'
                }, status=status.HTTP_401_UNAUTHORIZED)
                
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'token': token.key,
                'user': UserSerializer(user).data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
            
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.validated_data['user']
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'token': token.key,
                'user': UserSerializer(user).data
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)