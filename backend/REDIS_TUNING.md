# Redis command cost tuning (Upstash free tier)

If you're on Upstash free tier (500k commands/month), optimize Django Channels + Redis to avoid burning commands while idle.

## Key ideas
- Increase `brpop_timeout` for the channel layer to reduce idle polling.
- Disable high-fanout global broadcasts in production (optional) and prefer user-targeted updates.
- Prefer in-memory channel layer for single-process dev and preview deployments.

## Settings toggles (in `smartanom/settings.py`)

- `CHANNELS_REDIS_BRPOP_TIMEOUT` (env, seconds; default 120)
  - Used when supported by the installed `channels-redis` version (auto-detected at runtime).
  - Default Channels is often 5s, which costs ~500k commands/month per worker even when idle.
  - Set 60–300s on free tiers to cut idle usage by 12–60x.
  - If your environment logs "does not support brpop_timeout; skipping", upgrade `channels-redis` to a version that supports it or rely on other savings (see below).

- `WS_GLOBAL_BROADCAST` (env; default true in DEBUG, false in production)
  - When false, the app will not broadcast to the global `devices` group.
  - User-specific groups still receive updates (owner and collaborators).

- Use in-memory channel layer (single worker only)
  - Omit `REDIS_URL` to fall back to `InMemoryChannelLayer` (already implemented).
  - Not suitable for multi-process or multi-instance deployments.

## Budget math
With the default 5s BRPOP timeout:
- ~12 commands/minute
- ~720/hour
- ~17,280/day
- ~518,400/month per worker (exhausts free tier)

With 60s timeout:
- ~1 command/minute → ~43,200/month per worker

With 300s timeout:
- ~1 command/5 minutes → ~8,640/month per worker

## Recommended env vars (PowerShell)
```powershell
# Increase BRPOP timeout to 120s
$env:CHANNELS_REDIS_BRPOP_TIMEOUT = "120"

# Disable global fanout in production to reduce writes
$env:WS_GLOBAL_BROADCAST = "false"

# Upstash TLS URL (example)
$env:REDIS_URL = "rediss://default:YOUR_TOKEN@your-db.upstash.io:6379/0"
```

## Verifying
- Ping Redis:
  ```powershell
  python scripts/check_redis.py
  ```
- Channels roundtrip (requires REDIS_URL to be set to use Redis layer):
  ```powershell
  python scripts/test_channels_layer.py
  ```

## Notes
- The app auto-upgrades `redis://*.upstash.io:6379` to `rediss://`.
- For dev-only cert bypass you may append `?ssl_cert_reqs=none` (do not use in production).
