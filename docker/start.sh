#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE="smartanom.settings"

echo "[start] Running migrations"
python manage.py migrate --noinput

if [ ! -d "static" ] || [ -z "$(ls -A static 2>/dev/null)" ]; then
	echo "[start] Collecting static files (empty or missing)"
	python manage.py collectstatic --noinput
else
	echo "[start] Static directory already populated; skipping collectstatic"
fi

# Optional admin bootstrap if env vars supplied
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
	echo "[start] Ensuring admin user $ADMIN_EMAIL exists"
	python manage.py shell -c "from apps.accounts.models import User; import os; e=os.getenv('ADMIN_EMAIL'); p=os.getenv('ADMIN_PASSWORD'); u=User.objects.filter(email=e).first() or User(email=e, role='admin', is_staff=True, is_superuser=True); u.set_password(p); u.save(); print('Admin ensured:', e)" || echo "[start] Admin creation failed"
fi

# Launch supervisor (which starts django + nginx)
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
