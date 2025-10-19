from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PushSubscriptionViewSet, NotificationLogViewSet, NotificationPreferencesViewSet

router = DefaultRouter()
router.register(r'subscriptions', PushSubscriptionViewSet, basename='push-subscription')
router.register(r'logs', NotificationLogViewSet, basename='notification-log')
router.register(r'preferences', NotificationPreferencesViewSet, basename='notification-preferences')

urlpatterns = [
    path('', include(router.urls)),
]
