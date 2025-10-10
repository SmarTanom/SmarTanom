from django.urls import path

from .views import healthz

app_name = 'common'

urlpatterns = [
    path('health/', healthz, name='health'),
]
