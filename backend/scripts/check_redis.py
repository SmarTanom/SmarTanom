import asyncio
import os
from urllib.parse import urlparse, urlunparse

# Minimal async Redis PING to verify TLS/non-TLS connection derived from REDIS_URL
# Works with redis-py 5.x (asyncio) and channels-redis-compatible settings

async def main():
    from redis import asyncio as aioredis

    url = os.getenv("REDIS_URL")
    if not url:
        print("REDIS_URL not set")
        return 1

    # Auto-upgrade Upstash to TLS if a plain redis:// URL was provided
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        scheme = (parsed.scheme or "").lower()
        if host.endswith("upstash.io") and scheme == "redis":
            parsed = parsed._replace(scheme="rediss")
            # ensure a DB path exists
            if not parsed.path:
                parsed = parsed._replace(path="/0")
            url = urlunparse(parsed)
            print("Note: upgraded Upstash URL to TLS (rediss).")
    except Exception:
        pass

    # With TLS, use rediss://... Optionally add '?ssl_cert_reqs=none' for dev/self-signed.
    print(f"Connecting to: {url}")
    r = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
    try:
        pong = await r.ping()
        print(f"PING => {pong}")
        return 0
    except Exception as e:
        # Provide a friendlier hint for common Upstash auth errors
        from redis.exceptions import AuthenticationError
        if isinstance(e, AuthenticationError):
            print("Auth failed: invalid username/password. For Upstash, use username 'default' and the exact database token as the password. Ensure the URL is rediss:// and the token is not redacted.")
        raise
    finally:
        # redis-py 5.x prefers aclose() for asyncio clients
        try:
            await r.aclose()
        except AttributeError:
            # Fallback for older redis versions
            await r.close()

if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
