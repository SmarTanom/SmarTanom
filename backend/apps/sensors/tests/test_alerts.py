from django.test import TestCase
from django.utils import timezone
from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData, Alert
from apps.reservoirs.models import Plant, Reservoir


class AlertCreationTests(TestCase):
    def setUp(self):
        self.device = Device.objects.create(device_serial="ABC123", device_name="Dev1")
        self.plant = Plant.objects.create(
            plant_name="Lettuce",
            ppm_min=600, ppm_max=900,
            ec_min=0.8, ec_max=1.4,
            ph_min=5.8, ph_max=6.2,
            water_temp_min=18, water_temp_max=22,
            light_min=200, light_max=600,
            environment_temp_min=18, environment_temp_max=26,
            humidity_min=50, humidity_max=70,
        )
        self.reservoir = Reservoir.objects.create(
            device=self.device,
            reservoir_name="R1",
            plant=self.plant,
            start_date=timezone.now().date(),
            end_date=timezone.now().date(),
        )
        self.sensor = Sensor.objects.create(device=self.device, sensor_type=Sensor.SensorType.PH, unit="pH")

    def test_ph_below_min_creates_critical_alert(self):
        data = SensorData.objects.create(sensor=self.sensor, value=5.2)
        # manually call alert service to keep unit test isolated
        from apps.sensors.alert_service import SensorAlertService
        SensorAlertService.check_and_notify(data)
        alert = Alert.objects.order_by('-created_at').first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.metric, 'ph')
        self.assertEqual(alert.trigger, 'below_min')
        self.assertEqual(alert.severity, 'critical')
        self.assertIn('pH', alert.title)
