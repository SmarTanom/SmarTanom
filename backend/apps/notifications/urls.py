from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PushSubscriptionViewSet, NotificationLogViewSet

router = DefaultRouter()
router.register(r'subscriptions', PushSubscriptionViewSet, basename='push-subscription')
router.register(r'logs', NotificationLogViewSet, basename='notification-log')

urlpatterns = [
    path('', include(router.urls)),
]
