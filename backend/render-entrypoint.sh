#!/usr/bin/env bash
set -euo pipefail

# Always run from this script's directory (backend/)
cd "$(dirname "$0")"

echo "[entrypoint] Starting SmarTanom backend on Render..."

echo "[entrypoint] Working dir: $(pwd)"

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Ensuring default superuser (no-op if unset)..."
python manage.py create_default_superuser || true

# Optional collectstatic (enabled only if COLLECTSTATIC=true)
COLLECT_FLAG="${COLLECTSTATIC:-false}"
if [ "$COLLECT_FLAG" = "true" ]; then
    echo "[entrypoint] Collecting static files..."
    python manage.py collectstatic --noinput --clear
else
    echo "[entrypoint] Skipping collectstatic (COLLECTSTATIC=$COLLECT_FLAG)"
fi

# Optional seed/repair for SMRT-R47-4TJ
SEED_FLAG=$(printf "%s" "${SEED_SMRT_R47_4TJ:-false}" | tr 'A-Z' 'a-z')
case "$SEED_FLAG" in
    true|1|yes|on|repair)
        echo "[entrypoint] Running seed_specific_device_oct2025 (mode=$SEED_FLAG)..."
        python manage.py seed_specific_device_oct2025 || true
        ;;
    *)
        echo "[entrypoint] Skipping seed (SEED_SMRT_R47_4TJ=$SEED_FLAG)"
        ;;
esac

PORT_VAR="${PORT:-8000}"
echo "[entrypoint] Starting Daphne on port $PORT_VAR..."
exec daphne -b 0.0.0.0 -p "$PORT_VAR" smartanom.asgi:application
