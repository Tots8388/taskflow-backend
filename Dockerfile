# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv
# ---- Stage 1: Build dependencies ----
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements.txt


# ---- Stage 2: Production image ----
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=backend.settings
ENV DEBUG=False

# Install only the runtime library (no gcc/dev headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client \
    libmariadb3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r django && useradd -r -g django -d /app -s /sbin/nologin django

WORKDIR /app

# Install pre-built wheels from builder stage
COPY --from=builder /build/wheels /tmp/wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/tmp/wheels -r requirements.txt \
    && rm -rf /tmp/wheels

# Copy application code (includes backend/ and frontend/ directories)
COPY . .

# Collect static files (uses a build-time-only secret key)
ARG SECRET_KEY_BUILD="build-only-placeholder"
RUN SECRET_KEY=${SECRET_KEY_BUILD} python manage.py collectstatic --noinput

# Prepare directories and permissions
RUN mkdir -p /app/staticfiles /app/media \
    && chown -R django:django /app

COPY start.sh .
RUN chmod +x start.sh

USER django

EXPOSE 8000

CMD ["./start.sh"]