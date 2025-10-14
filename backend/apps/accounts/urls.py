from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints (OTP-based)
    path('request-otp/', views.request_otp, name='request_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    # Aliases for frontend placeholders
    path('request-code/', views.request_otp, name='request_code'),
    path('verify-code/', views.verify_otp, name='verify_code'),
    path('logout/', views.logout, name='logout'),
    path('status/', views.auth_status, name='auth_status'),
    path('finalize-account/', views.finalize_account, name='finalize_account'),
    path('check-username/', views.check_username_availability, name='check_username'),

    # JWT Authentication endpoints
    path('jwt/token/', TokenObtainPairView.as_view(), name='jwt_obtain_pair'),
    path('jwt/refresh/', TokenRefreshView.as_view(), name='jwt_refresh'),
    path('jwt/verify/', TokenVerifyView.as_view(), name='jwt_verify'),

    # User profile endpoints
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_profile, name='update_profile'),

    # Admin endpoints
    path('users/', views.user_list, name='user_list'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'),
    path('users/promote/', views.promote_user, name='promote_user'),

    # Maintenance endpoints
    path('cleanup/otps/', views.cleanup_expired_otps, name='cleanup_expired_otps'),
]
