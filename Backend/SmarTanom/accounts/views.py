from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from .models import User
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from django.contrib.auth.models import User

# Login Serializer
class LoginSerializer(serializers.Serializer):  # Now serializers is recognized
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

# Registration View
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

# Login View
class LoginView(APIView):
    def post(self, request):
        # Deserialize the login data
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get the validated data from the serializer
        email = serializer.validated_data.get('email')
        password = serializer.validated_data.get('password')

        # Authenticate the user using Django's authentication system
        user = authenticate(username=email, password=password)

        if user is not None and user.is_active:
            # Create or fetch the token for the authenticated user
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'success': True,
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            # Return a failure message if authentication fails or user is inactive
            return Response({
                'success': False,
                'error': 'Invalid credentials or inactive account. Please try again.'
            }, status=status.HTTP_400_BAD_REQUEST)

# Profile View (authenticated users only)
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
