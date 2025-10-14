#!/bin/bash
set -e

echo "Starting SmarTanom backend on Render..."

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting Gunicorn server..."
exec gunicorn smartanom.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --worker-class gthread \
    --threads 2 \
    --timeout 30 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
