#!/bin/sh
set -e

echo "[entrypoint] Waiting for database (if Postgres)..."
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  tries=30
  while ! nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; do
    tries=$((tries - 1))
    if [ $tries -le 0 ]; then
      echo "[entrypoint] Database $DB_HOST:$DB_PORT not reachable" >&2
      exit 1
    fi
    echo "[entrypoint] DB not ready, retrying... ($tries left)"
    sleep 1
  done
fi

echo "[entrypoint] Applying migrations"
python manage.py migrate --noinput

if [ "${COLLECT_STATIC:-0}" = "1" ]; then
  echo "[entrypoint] Collecting static files"
  python manage.py collectstatic --noinput
fi

echo "[entrypoint] Starting Django dev server"
exec python manage.py runserver 0.0.0.0:8000
