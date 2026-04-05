web: gunicorn backend.wsgi --bind 0.0.0.0:$PORT --workers 3 --timeout 120 --access-logfile - --log-level info
release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
