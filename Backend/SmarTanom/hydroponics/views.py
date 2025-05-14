from datetime import datetime
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

from .models import Hydroponic, SmarTanom, Sensor, SmarTanomData
from .serializers import HydroponicSystemSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_system(request):
    name = request.data.get('name')
    plant_type = request.data.get('plant_type')
    return Response({'message': f'System {name} created for {plant_type}'})


class CreateHydroponicSystemView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = HydroponicSystemSerializer

    def post(self, request, *args, **kwargs):
        hydroponic = Hydroponic.objects.create(
            user=request.user,
            name="Lettuce Farm",
            plant_type="Lettuce Romaine",
            start_date=timezone.now().date()
        )

        smar_tanom = SmarTanom.objects.create(
            hydroponic=hydroponic,
            name="Main SmarTanom",
            status="active"
        )

        Sensor.objects.create(
            smar_tanom=smar_tanom,
            type="DHT22",
            unit="°C/%",
            status="active"
        )

        return Response({
            'success': True,
            'message': 'Hydroponic system created successfully',
            'system_id': hydroponic.id
        }, status=status.HTTP_201_CREATED)


class DHT22DataView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:    
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )

            # Get and validate temperature
            temperature = request.data.get('temperature')
            if temperature is None:
                return Response({
                    'success': False,
                    'error': 'Temperature value is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                temperature = float(temperature)
            except (TypeError, ValueError):
                return Response({
                    'success': False,
                    'error': 'Temperature must be a numeric value'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get and validate humidity
            humidity = request.data.get('humidity')
            if humidity is None:
                return Response({
                    'success': False,
                    'error': 'Humidity value is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                humidity = float(humidity)
            except (TypeError, ValueError):
                return Response({
                    'success': False,
                    'error': 'Humidity must be a numeric value'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create records with validated data
            SmarTanomData.objects.create(
                sensor=sensor,
                value=temperature,
                data_type='temperature',
                created_at=timezone.now()
            )

            SmarTanomData.objects.create(
                sensor=sensor,
                value=humidity,
                data_type='humidity',
                created_at=timezone.now()
            )

            return Response({
                'success': True,
                'message': 'DHT22 data saved successfully'
            }, status=status.HTTP_201_CREATED)

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        try:
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )

            # Get the most recent temperature and humidity readings
            latest_temp = SmarTanomData.objects.filter(
                sensor=sensor,
                data_type='temperature'
            ).order_by('-created_at').first()
            
            latest_humidity = SmarTanomData.objects.filter(
                sensor=sensor,
                data_type='humidity'
            ).order_by('-created_at').first()

            return Response({
                'success': True,
                'temperature': latest_temp.value if latest_temp else None,
                'humidity': latest_humidity.value if latest_humidity else None,
                'timestamp': latest_temp.created_at if latest_temp else None
            })

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:    
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )

            temperature = request.data.get('temperature')
            humidity = request.data.get('humidity')

            # Validate that values are present and can be converted to float
            if temperature is None:
                return Response({
                    'success': False,
                    'error': 'Temperature value is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            if humidity is None:
                return Response({
                    'success': False,
                    'error': 'Humidity value is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                temperature = float(temperature)
                humidity = float(humidity)
            except (TypeError, ValueError):
                return Response({
                    'success': False,
                    'error': 'Temperature and humidity must be numeric values'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create separate records for temperature and humidity
            SmarTanomData.objects.create(
                sensor=sensor,
                value=temperature,
                data_type='temperature',
                created_at=timezone.now()
            )

            SmarTanomData.objects.create(
                sensor=sensor,
                value=humidity,
                data_type='humidity',
                created_at=timezone.now()
            )

            return Response({
                'success': True,
                'message': 'DHT22 data saved successfully'
            })

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:    
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )

            # Create separate records for temperature and humidity
            SmarTanomData.objects.create(
                sensor=sensor,
                value=request.data.get('temperature'),
                data_type='temperature',  # Add this field to distinguish
                created_at=timezone.now()
            )

            SmarTanomData.objects.create(
                sensor=sensor,
                value=request.data.get('humidity'),
                data_type='humidity',  # Add this field to distinguish
                created_at=timezone.now()
            )

            return Response({
                'success': True,
                'message': 'DHT22 data saved successfully'
            })

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)

    def get(self, request):
        try:
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )

            # Get the most recent temperature and humidity readings separately
            latest_temp = SmarTanomData.objects.filter(
                sensor=sensor,
                data_type='temperature'
            ).order_by('-created_at').first()
            
            latest_humidity = SmarTanomData.objects.filter(
                sensor=sensor,
                data_type='humidity'
            ).order_by('-created_at').first()

            return Response({
                'success': True,
                'temperature': latest_temp.value if latest_temp else None,
                'humidity': latest_humidity.value if latest_humidity else None,
                'timestamp': latest_temp.created_at if latest_temp else None
            })

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)