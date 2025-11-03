import asyncio
import os

# Minimal Channels Redis layer roundtrip test using an ephemeral channel
# Verifies that CHANNEL_LAYERS config can send+receive without a running consumer.

async def main():
    # Ensure Django is configured
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartanom.settings")
    import django
    django.setup()

    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if layer is None:
        print("No channel layer configured")
        return 1

    # Create a new ephemeral channel (supported by RedisChannelLayer)
    # Prefix must not include disallowed characters like '!'
    channel_name = await layer.new_channel("test")
    msg = {"type": "test.message", "text": "hello"}

    # Send then receive
    await layer.send(channel_name, msg)
    received = await layer.receive(channel_name)

    ok = received == msg
    print(f"Roundtrip OK: {ok}")
    if not ok:
        print(f"Sent:     {msg}")
        print(f"Received: {received}")
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
