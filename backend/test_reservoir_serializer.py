"""
Test script to verify ReservoirSerializer returns full plant object with ranges.
Run this from the backend directory: python test_reservoir_serializer.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartanom.settings')
django.setup()

from apps.reservoirs.models import Reservoir, Plant
from apps.reservoirs.serializers import ReservoirSerializer
from apps.devices.models import Device
import json

def test_reservoir_serializer():
    """Test that ReservoirSerializer returns full plant object."""

    print("=" * 80)
    print("TESTING RESERVOIR SERIALIZER - PLANT DATA EMBEDDING")
    print("=" * 80)
    print()

    # Get a sample reservoir (or create test data)
    reservoir = Reservoir.objects.select_related('plant', 'device').first()

    if not reservoir:
        print("❌ No reservoirs found in database.")
        print("   Please create a device and reservoir first.")
        return False

    print(f"✓ Found test reservoir: {reservoir.reservoir_name}")
    print(f"  Device: {reservoir.device.device_name} ({reservoir.device.device_serial})")
    print(f"  Plant (direct): {reservoir.plant.plant_name}")
    print()

    # Serialize the reservoir
    serializer = ReservoirSerializer(reservoir)
    data = serializer.data

    print("SERIALIZED DATA:")
    print("-" * 80)
    print(json.dumps(dict(data), indent=2))
    print("-" * 80)
    print()

    # Check if plant field contains full object
    plant_data = data.get('plant')

    print("VALIDATION:")
    print("-" * 80)

    if not plant_data:
        print("❌ FAIL: 'plant' field is missing or null")
        return False

    if isinstance(plant_data, str):
        print(f"❌ FAIL: 'plant' field is a string: '{plant_data}'")
        print("   Expected: full object with range data")
        return False

    if not isinstance(plant_data, dict):
        print(f"❌ FAIL: 'plant' field is not an object: {type(plant_data)}")
        return False

    print(f"✓ PASS: 'plant' field is an object")

    # Check required fields
    required_fields = [
        'id', 'plant_name', 'ppm_min', 'ppm_max', 'ec_min', 'ec_max',
        'ph_min', 'ph_max', 'water_temp_min', 'water_temp_max',
        'light_min', 'light_max', 'environment_temp_min', 'environment_temp_max',
        'humidity_min', 'humidity_max'
    ]

    missing_fields = []
    for field in required_fields:
        if field not in plant_data:
            missing_fields.append(field)
        else:
            value = plant_data[field]
            print(f"✓ PASS: '{field}' = {value}")

    print()

    if missing_fields:
        print(f"❌ FAIL: Missing fields: {', '.join(missing_fields)}")
        return False

    # Check backward compatibility (plant_type still exists)
    plant_type = data.get('plant_type')
    if not plant_type:
        print("⚠ WARNING: 'plant_type' field is missing")
        print("   This may break backward compatibility with older clients")
    else:
        print(f"✓ PASS: 'plant_type' = '{plant_type}' (backward compatibility)")

    print()
    print("=" * 80)
    print("✅ ALL TESTS PASSED!")
    print("=" * 80)
    print()
    print("SUMMARY:")
    print(f"  - Reservoir API will now return full plant object with all ranges")
    print(f"  - Frontend can access plant.ph_min, plant.ppm_max, etc. directly")
    print(f"  - No more silent failures from plant catalog lookups")
    print(f"  - Dashboard nutrient & pH status will display correctly")
    print()

    return True


if __name__ == '__main__':
    try:
        success = test_reservoir_serializer()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
