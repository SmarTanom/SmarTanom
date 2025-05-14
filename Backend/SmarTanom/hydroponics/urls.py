from django.urls import path
from .views import CreateHydroponicSystemView,DHT22DataView

urlpatterns = [
    path('create-system/', CreateHydroponicSystemView.as_view(), name='create-system'),
    path('dht22-data/', DHT22DataView.as_view(), name='dht22-data'),
    # Removed redundant path or fix the import if needed
]