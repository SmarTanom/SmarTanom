from django.contrib import admin
from django.urls import path, include
from accounts.views import update_profile

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/accounts/update-profile/', update_profile),
]