# syntax=docker/dockerfile:1.7
# Multi-stage build for YMarketplace Django backend
# BuildKit is required: DOCKER_BUILDKIT=1

# ── base: system deps + Python packages ──────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
        postgresql-client \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=tmpfs,target=/tmp/build-deps \
    apt-get update -qq && apt-get install -y --no-install-recommends gcc build-essential -qq 2>/dev/null; \
    pip install --no-cache-dir -r requirements.txt; \
    apt-get purge -y --auto-remove gcc build-essential 2>/dev/null || true; \
    rm -rf /var/lib/apt/lists/*

# ── development: bind-mount friendly, runserver ───────────────────────────────
FROM base AS development
ARG CACHEBUST=1
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ── production: collected static, gunicorn ────────────────────────────────────
FROM base AS production
ARG CACHEBUST=1
COPY . .
RUN mkdir -p /app/staticfiles \
    && SECRET_KEY=build-placeholder \
       DATABASE_URL=sqlite:///tmp/build.db \
       APP_NAME=ymarketplace \
       AWS_STORAGE_BUCKET_NAME=build-placeholder \
       AWS_S3_REGION_NAME=ap-south-1 \
       AWS_S3_ENDPOINT_URL= \
       AWS_S3_ADDRESSING_STYLE=virtual \
       AWS_S3_PUBLIC_ENDPOINT_URL= \
       AWS_ACCESS_KEY_ID=build-placeholder \
       AWS_SECRET_ACCESS_KEY=build-placeholder \
       python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "120", "config.wsgi:application"]
