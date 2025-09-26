#!/bin/sh
set -eu

timestamp() { date +"%Y-%m-%d %H:%M:%S.%3N" 2>/dev/null || date +"%Y-%m-%d %H:%M:%S"; }
log() { echo "$(timestamp) | [entrypoint] $*"; }
err() { echo "$(timestamp) | [entrypoint][error] $*" >&2; }

log "Boot sequence start"

DB_ENGINE_EFFECTIVE="${DB_ENGINE:-}"
if [ -n "${DATABASE_URL:-}" ] && echo "$DATABASE_URL" | grep -qi 'postgres'; then
  DB_ENGINE_EFFECTIVE="django.db.backends.postgresql"
fi

wait_for_postgres() {
  host="$1"; port="$2"; user="$3"; password="$4"; dbname="${5:-$DB_NAME}"; max_tries="${6:-60}";
  log "Waiting for PostgreSQL ${host}:${port} (user=${user} db=${dbname}) ..."
  i=0
  while [ $i -lt "$max_tries" ]; do
    if PGPASSWORD="$password" pg_isready -h "$host" -p "$port" -U "$user" >/dev/null 2>&1; then
      # Deep check using psycopg2 to catch auth/db issues hidden by pg_isready
      if python - <<PY 2>/dev/null; then
import os, psycopg2
from psycopg2 import sql
try:
    conn = psycopg2.connect(host=os.environ.get('DB_HOST'), port=os.environ.get('DB_PORT'), user=os.environ.get('DB_USER'), password=os.environ.get('DB_PASSWORD'), dbname=os.environ.get('DB_NAME'))
    cur = conn.cursor(); cur.execute('SELECT 1'); cur.fetchone(); conn.close()
except Exception as e:
    raise SystemExit(1)
PY
        log "PostgreSQL is ready"
        return 0
      else
        err "pg_isready OK but Python connection failed (auth/db?). Retrying..."
      fi
    else
      log "DB not ready (attempt $((i+1))/$max_tries)"
    fi
    sleep 2
    i=$((i+1))
  done
  err "Failed to connect to PostgreSQL after ${max_tries} attempts"
  PGPASSWORD="$password" pg_isready -h "$host" -p "$port" -U "$user" || true
  # Socket diagnostic (may fail on busybox shells without /dev/tcp support)
  if (echo > /dev/tcp/$host/$port) 2>/dev/null; then
    err "TCP port open; likely authentication / db name issue"
  else
    err "TCP port closed; network / service issue"
  fi
  return 1
}

if [ "$DB_ENGINE_EFFECTIVE" = "django.db.backends.postgresql" ]; then
  if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_USER:-}" ]; then
    err "Postgres engine selected but DB_HOST/DB_PORT/DB_USER missing"
    exit 1
  fi
  wait_for_postgres "$DB_HOST" "$DB_PORT" "$DB_USER" "${DB_PASSWORD:-}" "${DB_NAME:-postgres}" "${DB_WAIT_TRIES:-60}"
else
  log "Non-Postgres engine or SQLite in use; skipping network DB wait"
fi

log "Applying migrations"
python manage.py migrate --noinput || { err "Migrations failed"; exit 1; }

if [ "${COLLECT_STATIC:-0}" = "1" ]; then
  log "Collecting static files"
  python manage.py collectstatic --noinput || { err "collectstatic failed"; exit 1; }
fi

log "Starting Django dev server (runserver)"
exec python manage.py runserver 0.0.0.0:8000
