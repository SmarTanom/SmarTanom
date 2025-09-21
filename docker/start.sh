#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE="smartanom.settings"

echo "[start] Running migrations"
python manage.py migrate --noinput

echo "[start] Collecting static files"
python manage.py collectstatic --noinput

# Launch supervisor (which starts django + nginx)
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
