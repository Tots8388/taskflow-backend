#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn..."
exec gunicorn backend.wsgi --bind 0.0.0.0:$PORT --log-file - --log-level info