"""
API views for seeding sensor data.
Can be called via HTTP request after deployment.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Dict, List

from django.db import transaction
from django.db.models.signals import post_save
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response

from apps.devices.models import Device
from apps.sensors.models import Sensor, SensorData
from apps.sensors.signals import check_sensor_alerts, broadcast_sensor_realtime


@api_view(['POST'])
@permission_classes([AllowAny])  # Change to IsAdminUser for production
def seed_jan2026_data(request):
    """
    Seed sensor data from Jan 1-29, 2026 for device SMRT-G6M-E0Q.
    
    POST /api/sensors/seed-jan2026/
    Optional body: {"device_serial": "SMRT-G6M-E0Q", "readings_per_day": 8}
    """
    device_serial = request.data.get('device_serial', 'SMRT-G6M-E0Q')
    readings_per_day = request.data.get('readings_per_day', 8)
    
    # Check if already seeded
    try:
        device = Device.objects.get(device_serial=device_serial)
    except Device.DoesNotExist:
        return Response(
            {'error': f'Device with serial {device_serial} not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if data already exists for January 2026
    jan_start = timezone.make_aware(datetime(2026, 1, 1, 0, 0, 0))
    jan_end = timezone.make_aware(datetime(2026, 1, 29, 23, 59, 59))
    
    existing_count = SensorData.objects.filter(
        sensor__device=device,
        created_at__gte=jan_start,
        created_at__lte=jan_end
    ).count()
    
    if existing_count > 0:
        return Response({
            'message': 'Data already exists for January 2026',
            'device_serial': device_serial,
            'existing_readings': existing_count,
            'note': 'Skipped seeding to avoid duplicates'
        })
    
    # Temporarily disconnect signals to avoid alert spam
    post_save.disconnect(check_sensor_alerts, sender=SensorData)
    post_save.disconnect(broadcast_sensor_realtime, sender=SensorData)
    
    try:
        # Define sensor configurations
        sensor_configs = {
            "ph": {
                "unit": "pH",
                "normal_range": (5.8, 6.5),
                "critical_low": (4.5, 5.4),
                "critical_high": (7.0, 8.0),
            },
            "tds": {
                "unit": "ppm",
                "normal_range": (800, 1200),
                "critical_low": (300, 600),
                "critical_high": (1500, 2000),
            },
            "ec": {
                "unit": "mS/cm",
                "normal_range": (1.2, 2.0),
                "critical_low": (0.5, 0.9),
                "critical_high": (2.5, 3.5),
            },
            "water_temperature": {
                "unit": "°C",
                "normal_range": (18, 24),
                "critical_low": (10, 15),
                "critical_high": (28, 35),
            },
            "water_level": {
                "unit": "%",
                "normal_range": (50, 90),
                "critical_low": (10, 30),
                "critical_high": (95, 100),
            },
            "turbidity": {
                "unit": "NTU",
                "normal_range": (5, 20),
                "critical_low": (0, 3),
                "critical_high": (50, 100),
            },
        }
        
        # Create or get sensors
        sensors_map: Dict[str, Sensor] = {}
        created_sensors = []
        
        for sensor_type, config in sensor_configs.items():
            sensor, created = Sensor.objects.get_or_create(
                device=device,
                sensor_type=sensor_type,
                defaults={"unit": config["unit"]}
            )
            sensors_map[sensor_type] = sensor
            if created:
                created_sensors.append(sensor_type)
        
        # Generate data for Jan 1-29, 2026
        start_date = datetime(2026, 1, 1, 0, 0, 0)
        all_readings: List[SensorData] = []
        total_days = 29
        
        # For each sensor type
        for sensor_type, sensor in sensors_map.items():
            config = sensor_configs[sensor_type]
            
            # Generate readings for each day
            for day_offset in range(total_days):
                current_date = start_date + timedelta(days=day_offset)
                
                # Decide if this day should have alerts (25% chance)
                has_alert = random.random() < 0.25
                
                # Generate readings for this day
                for reading_num in range(readings_per_day):
                    # Spread readings throughout the day
                    hour_offset = (24 / readings_per_day) * reading_num
                    timestamp = current_date + timedelta(hours=hour_offset)
                    
                    # Make timezone aware
                    timestamp = timezone.make_aware(
                        timestamp, timezone.get_current_timezone()
                    )
                    
                    # Determine value based on alert status
                    if has_alert and reading_num >= readings_per_day - 2:
                        # Last 2 readings of alert day - use critical values
                        if random.random() < 0.5:
                            value = round(
                                random.uniform(
                                    config["critical_low"][0],
                                    config["critical_low"][1]
                                ),
                                2
                            )
                        else:
                            value = round(
                                random.uniform(
                                    config["critical_high"][0],
                                    config["critical_high"][1]
                                ),
                                2
                            )
                    else:
                        # Normal range
                        value = round(
                            random.uniform(
                                config["normal_range"][0],
                                config["normal_range"][1]
                            ),
                            2
                        )
                    
                    # Store reading data with timestamp
                    all_readings.append({
                        'sensor': sensor,
                        'value': value,
                        'timestamp': timestamp
                    })
        
        # Bulk insert all readings with proper timestamps
        with transaction.atomic():
            # Create SensorData objects
            sensor_data_objects = []
            for reading_data in all_readings:
                obj = SensorData(
                    sensor=reading_data['sensor'],
                    value=reading_data['value']
                )
                sensor_data_objects.append(obj)
            
            # Bulk create (this will use current timestamp)
            created_objects = SensorData.objects.bulk_create(sensor_data_objects, batch_size=500)
            
            # Now update timestamps using raw SQL for efficiency
            from django.db import connection
            with connection.cursor() as cursor:
                for idx, obj in enumerate(created_objects):
                    timestamp = all_readings[idx]['timestamp']
                    cursor.execute(
                        "UPDATE sensors_sensordata SET created_at = %s, updated_at = %s WHERE id = %s",
                        [timestamp, timestamp, obj.id]
                    )
        
        return Response({
            'success': True,
            'message': 'Successfully seeded January 2026 sensor data',
            'device_serial': device_serial,
            'device_id': device.id,
            'date_range': 'Jan 1-29, 2026',
            'total_readings': len(created_objects),
            'readings_per_sensor': {
                sensor_type: len([r for r in all_readings if r['sensor'].sensor_type == sensor_type])
                for sensor_type in sensor_configs.keys()
            },
            'created_sensors': created_sensors if created_sensors else None
        })
    
    finally:
        # Reconnect signals
        post_save.connect(check_sensor_alerts, sender=SensorData)
        post_save.connect(broadcast_sensor_realtime, sender=SensorData)
