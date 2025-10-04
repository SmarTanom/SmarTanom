from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('request-otp/', views.request_otp, name='request_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    # Aliases for frontend placeholders
    path('request-code/', views.request_otp, name='request_code'),
    path('verify-code/', views.verify_otp, name='verify_code'),
    path('logout/', views.logout, name='logout'),
    path('status/', views.auth_status, name='auth_status'),
    path('check-username/', views.check_username, name='check_username'),
    path('complete-setup/', views.complete_setup, name='complete_setup'),
    
    # User profile endpoints
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    
    # Admin endpoints
    path('users/', views.user_list, name='user_list'),
    path('users/promote/', views.promote_user, name='promote_user'),
    
    # Maintenance endpoints
    path('cleanup/otps/', views.cleanup_expired_otps, name='cleanup_expired_otps'),
]