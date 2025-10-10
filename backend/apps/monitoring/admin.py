"""Admin registrations for monitoring models."""
from django.contrib import admin

# NOTE: Models are now registered in their respective specialized apps:
# - Device: registered in apps.devices.admin
# - Reservoir: registered in apps.reservoirs.admin
# - Sensor & SensorData: registered in apps.sensors.admin
#
# This prevents duplicate admin interface entries and maintains clean organization.
