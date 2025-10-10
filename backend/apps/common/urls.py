from django.urls import path

from .views import healthz

app_name = 'common'

urlpatterns = [
    path('', healthz, name='health'),  # Empty path since we already have api/health/ in main urls.py
]
