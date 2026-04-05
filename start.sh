#!/bin/bash
set -euo pipefail

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

WORKERS=${GUNICORN_WORKERS:-3}
PORT=${PORT:-8000}

echo "==> Ensuring superuser..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
import os
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')
user, created = User.objects.get_or_create(username=username, defaults={'email': email, 'is_staff': True, 'is_superuser': True})
user.set_password(password)
user.is_staff = True
user.is_superuser = True
user.save()
print('Superuser created' if created else 'Superuser password reset')
"

echo "==> Starting gunicorn on port ${PORT} with ${WORKERS} workers..."
exec gunicorn backend.wsgi --bind "0.0.0.0:${PORT}" --workers "${WORKERS}" --timeout 120 --access-logfile - --error-logfile - --log-level info