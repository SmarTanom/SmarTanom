#!/bin/sh
set -e

echo "[entrypoint] Boot sequence start"

DB_ENGINE_EFFECTIVE="${DB_ENGINE:-}"
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qi 'postgres'; then
  DB_ENGINE_EFFECTIVE="django.db.backends.postgresql"
fi

if [ "$DB_ENGINE_EFFECTIVE" = "django.db.backends.postgresql" ]; then
  if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
    echo "[entrypoint] Postgres engine selected but DB_HOST/DB_PORT missing" >&2
    exit 1
  fi
  echo "[entrypoint] Waiting for PostgreSQL $DB_HOST:$DB_PORT ..."
  tries=60
  while ! PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" >/dev/null 2>&1; do
    tries=$((tries - 1))
    if [ $tries -le 0 ]; then
      echo "[entrypoint] PostgreSQL not reachable after timeout ($DB_HOST:$DB_PORT)" >&2
      PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" || true
      echo "[entrypoint] Network debug: attempting TCP connect..." >&2
      (echo > /dev/tcp/$DB_HOST/$DB_PORT) >/dev/null 2>&1 && echo "[entrypoint] TCP port open but pg_isready failing (auth/startup?)" || echo "[entrypoint] TCP port closed" >&2
      exit 1
    fi
    echo "[entrypoint] DB not ready, retrying... ($tries left)"
    sleep 2
  done
  echo "[entrypoint] PostgreSQL is ready"
else
  echo "[entrypoint] Non-Postgres engine or SQLite in use; skipping network DB wait"
fi

echo "[entrypoint] Applying migrations"
python manage.py migrate --noinput

if [ "${COLLECT_STATIC:-0}" = "1" ]; then
  echo "[entrypoint] Collecting static files"
  python manage.py collectstatic --noinput
fi

echo "[entrypoint] Starting Django dev server"
exec python manage.py runserver 0.0.0.0:8000
