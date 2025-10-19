#!/usr/bin/env python3
"""
Quick WebSocket test script for Django Channels backend.

Tests the DeviceOnboardingConsumer endpoint to diagnose ESP32 connection issues.

Usage:
    python test_websocket.py
"""

import asyncio
import websockets
import json
import sys

DEVICE_SERIAL = "SMRT-DQX-0HO"
WS_URL = f"wss://smartanom.onrender.com/ws/device/{DEVICE_SERIAL}/"

async def test_connection():
    print(f"🔌 Connecting to: {WS_URL}")
    print(f"📟 Device Serial: {DEVICE_SERIAL}\n")

    try:
        async with websockets.connect(WS_URL, timeout=10) as websocket:
            print("✅ WebSocket connection established!")
            print(f"   Protocol: {websocket.protocol}")
            print(f"   State: {websocket.state}\n")

            # Send handshake (same as ESP32)
            handshake = {
                "device_serial": DEVICE_SERIAL,
                "wifi_configured": True,
                "status": "connected"
            }

            print(f"📤 Sending handshake:")
            print(f"   {json.dumps(handshake, indent=2)}\n")

            await websocket.send(json.dumps(handshake))
            print("✅ Handshake sent successfully\n")

            # Wait for response
            print("⏳ Waiting for server response (10s timeout)...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"✅ Received response:")
                print(f"   {response}\n")

                # Try to parse as JSON
                try:
                    response_data = json.loads(response)
                    print(f"📊 Parsed response:")
                    for key, value in response_data.items():
                        print(f"   {key}: {value}")
                except json.JSONDecodeError:
                    print(f"⚠️  Response is not JSON")

            except asyncio.TimeoutError:
                print("⚠️  No response received within 10 seconds")
                print("   This might be normal - server may not respond to handshake")

            # Send test sensor data
            print("\n" + "="*60)
            print("📤 Sending test sensor data...\n")

            sensor_data = {
                "device_serial": DEVICE_SERIAL,
                "data": [
                    {"type": "ph", "value": 6.8},
                    {"type": "tds", "value": 420},
                    {"type": "ec", "value": 0.85},
                    {"type": "turbidity", "value": 10.2},
                    {"type": "water_temp", "value": 24.1},
                    {"type": "water_level", "value": 78}
                ]
            }

            await websocket.send(json.dumps(sensor_data))
            print("✅ Sensor data sent successfully\n")

            # Wait for acknowledgment
            try:
                ack = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"✅ Acknowledgment received:")
                print(f"   {ack}\n")
            except asyncio.TimeoutError:
                print("⚠️  No acknowledgment received\n")

            # Keep connection alive for a bit
            print("⏳ Keeping connection alive for 5 seconds...")
            await asyncio.sleep(5)

            print("✅ Connection still alive!")
            print("\n🎉 Test PASSED - WebSocket is working correctly!")

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection rejected by server:")
        print(f"   Status code: {e.status_code}")
        print(f"   Headers: {e.headers}")

    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")

    except ConnectionRefusedError:
        print(f"❌ Connection refused - server not responding")

    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  ESP32 WebSocket Backend Diagnostic Test")
    print("="*60 + "\n")

    try:
        asyncio.run(test_connection())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)

    print("\n" + "="*60)
    print("  Test Complete")
    print("="*60 + "\n")
