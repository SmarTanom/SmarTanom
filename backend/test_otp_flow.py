"""
Test OTP binding flow and collaborator management
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# Test credentials (create a staff user first)
ADMIN_EMAIL = "admin@smartanom.test"

def get_auth_token(email):
    """Get auth token for user"""
    # Request OTP
    response = requests.post(f"{BASE_URL}/api/auth/request-otp/", json={"email": email})
    print(f"OTP Request: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"OTP: {data.get('debug_code', 'Check email')}")
        otp = input("Enter OTP code: ")

        # Verify OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify-otp/", json={"email": email, "otp": otp})
        if verify_response.status_code == 200:
            return verify_response.json().get('token')
    return None

def test_binding_flow():
    """Test complete OTP binding flow"""
    print("\n" + "="*60)
    print("TESTING OTP BINDING FLOW")
    print("="*60)

    # Get admin token
    print("\n1. Getting admin auth token...")
    token = get_auth_token(ADMIN_EMAIL)
    if not token:
        print("❌ Failed to get auth token")
        return
    print(f"✅ Got auth token: {token[:20]}...")

    headers = {"Authorization": f"Token {token}"}

    # Get devices
    print("\n2. Fetching devices...")
    response = requests.get(f"{BASE_URL}/api/devices/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch devices: {response.status_code}")
        return

    devices = response.json().get('results', [])
    if not devices:
        print("❌ No devices found. Create a device first.")
        return

    device = devices[0]
    device_id = device['id']
    print(f"✅ Found device: {device['device_serial']} (ID: {device_id})")

    # Test duplicate binding protection
    if device.get('is_bound'):
        print(f"\n⚠️  Device already bound to: {device.get('bound_email')}")
        print("Testing duplicate binding protection...")

        # Try to bind to same email
        response = requests.post(
            f"{BASE_URL}/api/devices/{device_id}/bind-otp/",
            json={"email": device.get('bound_email')},
            headers=headers
        )
        if response.status_code == 400:
            print(f"✅ Duplicate binding prevented: {response.json().get('detail')}")

        # Try to bind to different email
        response = requests.post(
            f"{BASE_URL}/api/devices/{device_id}/bind-otp/",
            json={"email": "other@example.com"},
            headers=headers
        )
        if response.status_code == 400:
            print(f"✅ Already bound prevention: {response.json().get('detail')}")

        print("\n3. Unbinding device first...")
        response = requests.post(f"{BASE_URL}/api/devices/{device_id}/admin-unbind/", headers=headers)
        if response.status_code == 200:
            print("✅ Device unbound")
        else:
            print(f"❌ Failed to unbind: {response.json()}")
            return

    # Send OTP
    test_email = "testuser@example.com"
    print(f"\n4. Sending OTP to {test_email}...")
    response = requests.post(
        f"{BASE_URL}/api/devices/{device_id}/bind-otp/",
        json={"email": test_email},
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Failed to send OTP: {response.status_code} - {response.json()}")
        return

    data = response.json()
    print(f"✅ OTP sent: {data.get('detail')}")
    print(f"   Debug OTP: {data.get('debug_otp', 'Not available (production mode)')}")

    # Confirm binding
    otp_code = data.get('debug_otp') or input("Enter OTP code: ")
    print(f"\n5. Confirming binding with OTP...")
    response = requests.post(
        f"{BASE_URL}/api/devices/{device_id}/confirm-bind/",
        json={"email": test_email, "otp": otp_code},
        headers=headers
    )

    if response.status_code != 200:
        print(f"❌ Failed to confirm binding: {response.status_code} - {response.json()}")
        return

    data = response.json()
    print(f"✅ Binding confirmed: {data.get('detail')}")
    print(f"   User created: {data.get('user_created')}")

    # Test collaborator management
    print("\n" + "="*60)
    print("TESTING COLLABORATOR MANAGEMENT")
    print("="*60)

    # Add collaborator
    collab_email = "collab@example.com"
    print(f"\n6. Adding collaborator {collab_email}...")
    response = requests.post(
        f"{BASE_URL}/api/devices/{device_id}/add-collaborator/",
        json={"email": collab_email},
        headers=headers
    )

    if response.status_code != 201:
        print(f"❌ Failed to add collaborator: {response.status_code} - {response.json()}")
        return

    data = response.json()
    print(f"✅ Collaborator added: {data.get('detail')}")
    user_id = data.get('user_id')
    print(f"   User ID: {user_id}")

    # List collaborators
    print(f"\n7. Listing collaborators...")
    response = requests.get(f"{BASE_URL}/api/devices/{device_id}/collaborators/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to list collaborators: {response.status_code}")
        return

    data = response.json()
    collabs = data.get('results', [])
    print(f"✅ Found {len(collabs)} collaborator(s)")
    for collab in collabs:
        print(f"   - {collab['collaborator_email']} (User ID: {collab.get('user_id')})")

    # Revoke access
    if user_id:
        print(f"\n8. Revoking access for user {user_id}...")
        response = requests.post(
            f"{BASE_URL}/api/devices/{device_id}/revoke/{user_id}/",
            headers=headers
        )

        if response.status_code != 200:
            print(f"❌ Failed to revoke access: {response.status_code} - {response.json()}")
            return

        data = response.json()
        print(f"✅ Access revoked: {data.get('detail')}")
        print(f"   User deactivated: {data.get('user_deactivated')}")
        print(f"   Remaining collaborations: {data.get('remaining_collaborations')}")

    print("\n" + "="*60)
    print("✅ ALL TESTS PASSED")
    print("="*60)

if __name__ == "__main__":
    try:
        test_binding_flow()
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
