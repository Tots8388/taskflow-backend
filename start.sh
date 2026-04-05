#!/bin/bash
set -euo pipefail

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

WORKERS=${GUNICORN_WORKERS:-3}
PORT=${PORT:-8000}

echo "==> Starting gunicorn on port ${PORT} with ${WORKERS} workers..."
exec gunicorn backend.wsgi \
    --bind "0.0.0.0:${PORT}" \
    --workers "${WORKERS}" \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
echo "==> Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('${DJANGO_SUPERUSER_USERNAME}', '${DJANGO_SUPERUSER_EMAIL}', '${DJANGO_SUPERUSER_PASSWORD}')
    print('Superuser created')
else:
    print('Superuser already exists')
"