# Multi-stage build for Django backend
FROM python:3.11-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        gcc \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Local development stage
FROM base as local
ARG CACHEBUST=1
COPY . .
EXPOSE 8004
CMD ["python", "manage.py", "runserver", "0.0.0.0:8004"]

# Dev stage (Production on EC2)
FROM base as dev
ARG CACHEBUST=1
COPY . .
EXPOSE 8004
CMD ["gunicorn", "--bind", "0.0.0.0:8004", "--workers", "3", "--timeout", "120", "config.wsgi:application"]
