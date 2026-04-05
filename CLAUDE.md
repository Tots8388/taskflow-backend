# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Taskflow** — a full-stack task manager. The Django backend serves both the REST API and the vanilla-JS frontend as a single deployable unit. There is no separate frontend build step; static assets live in `frontend/static/` and are served via WhiteNoise.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server (requires MySQL or override DATABASE_URL)
python manage.py runserver

# Apply migrations
python manage.py migrate

# Create migrations after model changes
python manage.py makemigrations

# Collect static files (needed before first run if DEBUG=False)
python manage.py collectstatic --noinput

# Run tests
python manage.py test

# Run a single test
python manage.py test api.tests.TestClassName.test_method_name
```

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | insecure dev key | Must be set in production |
| `DEBUG` | `False` | Set to `True` for local dev |
| `ALLOWED_HOSTS` | `127.0.0.1,localhost` | Comma-separated |
| `MYSQLDATABASE` | `taskflow` | |
| `MYSQLUSER` | `root` | |
| `MYSQLPASSWORD` | _(empty)_ | |
| `MYSQLHOST` | `localhost` | |
| `MYSQLPORT` | `3306` | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Comma-separated |
| `CORS_ALLOW_ALL_ORIGINS` | `False` | |
| `DJANGO_SUPERUSER_USERNAME/EMAIL/PASSWORD` | `admin/admin` | Used by `start.sh` |

## Architecture

### Request Flow
1. All requests hit Django (`backend/urls.py`)
2. `/api/*` routes go to `api/urls.py` — a DRF router for `TaskViewSet` and `CategoryViewSet`, plus manual paths for auth and profile
3. `/api/token/` and `/api/token/refresh/` are SimpleJWT endpoints
4. `/` (catch-all) serves `frontend/index.html` as a Django template (for `{% static %}` tags)

### Auth
JWT via `djangorestframework-simplejwt`. Access token lifetime: 30 min, refresh: 7 days with rotation. The frontend stores tokens in `localStorage` (`tf_access`, `tf_refresh`) and queues in-flight requests during token refresh to avoid race conditions (`app.js` — `isRefreshing`/`refreshQueue` pattern).

### Data Model
- `User` (Django built-in) → `UserProfile` (1:1, auto-created via `post_save` signal)
- `Category` (user-scoped: name, color)
- `Task` (user-scoped: name, priority `high/medium/low`, due date, done flag, optional category FK)

All querysets are filtered by `request.user` — users only ever see their own data.

### Frontend
Single `index.html` template + `frontend/static/js/app.js` (vanilla JS, no framework). The JS talks to `/api` using `fetch`. Chart.js is loaded from CDN for the Dashboard view. No bundler — edit `app.js` directly.

### Deployment (Railway)
- `start.sh` runs migrations → collectstatic → creates/resets superuser → starts gunicorn
- `Dockerfile` uses a two-stage build (builder installs wheels, production image copies them)
- WhiteNoise serves static files with `CompressedManifestStaticFilesStorage` (hashed filenames + gzip/brotli)

## Key Constraints

- **MySQL only** — `mysqlclient` is the DB driver; `utf8mb4` charset is required. SQLite is in the repo (`db.sqlite3`) but is not used in production.
- **No frontend build** — CSS and JS are plain files in `frontend/static/`. There is no npm/webpack/vite.
- **Pagination** — Tasks are paginated (10/page, max 100). The frontend tracks `currentPage`/`totalPages` and passes `?page=` and `?page_size=` query params.
- **Throttling** — Anonymous: 30/min, authenticated: 120/min (DRF throttling, configured in `settings.py`).
