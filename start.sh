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