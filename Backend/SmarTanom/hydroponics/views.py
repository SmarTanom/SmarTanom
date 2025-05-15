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

    def post(self, request, *args, **kwargs):
        # Get the data from the request
        temp_value = request.data.get('temp_value')
        humidity_value = request.data.get('humidity_value')
        
        # Validate that we have values
        if temp_value is None or humidity_value is None:
            return Response(
                {"error": "Missing temperature or humidity values"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Convert to float and validate ranges
            temp_value = float(temp_value)
            humidity_value = float(humidity_value)
            
            # Validate reasonable ranges
            if not (-20 <= temp_value <= 50):
                return Response(
                    {"error": f"Temperature value {temp_value} outside reasonable range (-20 to 50°C)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if not (0 <= humidity_value <= 100):
                return Response(
                    {"error": f"Humidity value {humidity_value} outside reasonable range (0 to 100%)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the sensor (assuming ID 1 is for DHT22)
            sensor = Sensor.objects.get(
                smar_tanom__hydroponic__user=request.user,
                type="DHT22"
            )
            
            # Create temperature record
            SmarTanomData.objects.create(
                sensor=sensor,
                data_type="temperature",
                value=temp_value,
                created_at=timezone.now()
            )
            
            # Create humidity record
            SmarTanomData.objects.create(
                sensor=sensor,
                data_type="humidity",
                value=humidity_value,
                created_at=timezone.now()
            )
            
            return Response(
                {"success": True, "message": "DHT22 data saved successfully"},
                status=status.HTTP_201_CREATED
            )
        except ValueError:
            return Response(
                {"error": "Temperature and humidity must be numeric values"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Sensor.DoesNotExist:
            return Response(
                {"error": "DHT22 sensor not found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

            # Format values to 1 decimal place for consistency
            temp_value = round(latest_temp.value, 1) if latest_temp else None
            humidity_value = round(latest_humidity.value, 1) if latest_humidity else None

            return Response({
                'success': True,
                'temperature': temp_value,
                'humidity': humidity_value,
                'timestamp': latest_temp.created_at if latest_temp else None
            })

        except Sensor.DoesNotExist:
            return Response({
                'success': False,
                'error': 'DHT22 sensor not found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
