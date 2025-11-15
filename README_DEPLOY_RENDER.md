# Deploying to Render (Dj## Environment variables

- `DJANGO_SETTINGS_MODULE=smartanom.settings` (already set in blueprint)
- `DEBUG="false"` in production
- `ALLOWED_HOSTS` (usually set via Render's host binding in blueprint)
- `DATABASE_URL` (from your Render Postgres resource)
- `REDIS_URL` (Upstash or Render Redis) if you want multi-process Channels fan-out
- `COLLECTSTATIC="true"` (to run `collectstatic` during deploy)
- `SEED_SMRT_R47_4TJ` values recognized by the entrypoint (Oct 15-21 data, 7 days):
  - `true`, `1`, `yes`, `on`, `repair` → will run `python manage.py seed_specific_device_oct2025` (no-op safe)
- `SEED_OCT22_28` values recognized by the entrypoint (Oct 22-28 data, 7 days):
  - `true`, `1`, `yes`, `on`, `repair` → will run `python manage.py seed_oct22_28` (no-op safe)
- `SEED_OCT29_NOV27` values recognized by the entrypoint (Oct 29 - Nov 27 data, 30 days):
  - `true`, `1`, `yes`, `on`, `repair` → will run `python manage.py seed_oct29_nov27` (no-op safe)nnels)

If your service builds but exits early with a shell syntax error in the Start Command, the Render dashboard is likely still using an old inline command that overrides the Procfile/blueprint.

This repository includes a robust entrypoint script that handles migrations, optional static collection, optional seeding/repair, and starts Daphne:

- Script: `backend/render-entrypoint.sh`
- Procfile (used by default when no custom Start Command is set): `backend/Procfile`

## Recommended setup

Option A — Use the Procfile (preferred)
1. Open your Render service → Settings.
2. Clear the custom Start Command (leave it empty).
3. Ensure the service has `rootDir` set to `backend` (Blueprint or manual setting).
4. Redeploy. Render will use `backend/Procfile` → `web: bash render-entrypoint.sh`.

Option B — Explicit Start Command
1. Open your Render service → Settings.
2. Set Start Command to:
   - `bash backend/render-entrypoint.sh` (works even if `rootDir` is the repo root)
3. Redeploy.

Avoid inline multi-line bash in the Start Command. Under `set -euo pipefail`, minor quoting/line-break issues will cause early exit.

## Environment variables

- `DJANGO_SETTINGS_MODULE=smartanom.settings` (already set in blueprint)
- `DEBUG="false"` in production
- `ALLOWED_HOSTS` (usually set via Render’s host binding in blueprint)
- `DATABASE_URL` (from your Render Postgres resource)
- `REDIS_URL` (Upstash or Render Redis) if you want multi-process Channels fan-out
- `COLLECTSTATIC="true"` (to run `collectstatic` during deploy)
- `SEED_SMRT_R47_4TJ` values recognized by the entrypoint:
  - `true`, `1`, `yes`, `on`, `repair` → will run `python manage.py seed_specific_device_oct2025` (no-op safe)

## Notes

- The entrypoint gracefully ignores missing `create_default_superuser` by appending `|| true`.
- Daphne binds to `$PORT` (default `8000`) and `0.0.0.0`.
- If you keep a custom Start Command, prefer calling the script instead of inlining logic.

## Quick local check (optional)

From project root:

```bash
bash backend/render-entrypoint.sh
```

This should migrate the local DB and start Daphne on port 8000.
