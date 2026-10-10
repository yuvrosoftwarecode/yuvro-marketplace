"""
Django settings for yuvro-marketplace backend.
All configuration is read from environment variables via python-decouple.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
SECRET_KEY = config("SECRET_KEY", default="django-insecure-dev-key-change-in-prod")
DEBUG = config("DEBUG", default=False, cast=bool)
DEPLOY_ENV = config("DEPLOY_ENV", default="local")
APP_NAME = config("APP_NAME", default="ymarketplace")

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS", default="localhost,127.0.0.1,backend", cast=Csv()
)

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    # REST Framework
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    # Auth
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    # Storage
    "storages",
]

LOCAL_APPS = [
    "core",
    "authentication",
    "marketplace",
    "recruiting",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

SITE_ID = 1

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "core.middleware.TracingMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASE_URL = config(
    "DATABASE_URL",
    default="postgres://postgres:postgres@localhost:5436/yuvro_marketplace_db",
)

DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ---------------------------------------------------------------------------
# Custom User Model & Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "authentication.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

AUTHENTICATION_BACKENDS = [
    "authentication.backends.YHubAuthBackend",
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# Django Allauth Configuration
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_VERIFICATION = "none"

# ---------------------------------------------------------------------------
# Django REST Framework & JWT
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "core.yuvro_middleware.ProductJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config("JWT_ACCESS_TOKEN_LIFETIME", default=15, cast=int)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config("JWT_REFRESH_TOKEN_LIFETIME", default=7, cast=int)
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": config("JWT_SECRET_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

YHUB_BACKEND_API_BASE_URL = config(
    "YHUB_BACKEND_API_BASE_URL",
    default="https://backend-hub-dev.yuvro.ai/api",
)

# ---------------------------------------------------------------------------
# drf-spectacular (OpenAPI 3 / Swagger)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Yuvro Marketplace API",
    "DESCRIPTION": "REST API documentation for Yuvro Marketplace",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# ---------------------------------------------------------------------------
# CORS & Security
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3004,http://127.0.0.1:3004",
    cast=Csv(),
)
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:3004,http://127.0.0.1:3004,https://marketplace.yuvro.ai,https://backend-marketplace.yuvro.ai",
    cast=Csv(),
)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
CORS_ALLOW_CREDENTIALS = True
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3004")

# ---------------------------------------------------------------------------
# Static & Media Storage
# ── Static & Media Storage ─────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "mediafiles"

# ── Object Storage (S3 / MinIO) ──────────────────────────────────
STORAGE_BACKEND = config("STORAGE_BACKEND", default="s3")

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="ymarketplace")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="ap-south-1")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="") or None
AWS_S3_ADDRESSING_STYLE = config(
    "AWS_S3_ADDRESSING_STYLE",
    default="path" if config("AWS_S3_ENDPOINT_URL", default="") else "virtual",
)
AWS_DEFAULT_ACL = config("AWS_DEFAULT_ACL", default=None)
AWS_QUERYSTRING_AUTH = config("AWS_QUERYSTRING_AUTH", default=True, cast=bool)
AWS_QUERYSTRING_EXPIRE = config("AWS_QUERYSTRING_EXPIRE", default=86400, cast=int)
AWS_S3_SIGNATURE_VERSION = config("AWS_S3_SIGNATURE_VERSION", default="s3v4")
AWS_S3_PUBLIC_ENDPOINT_URL = config("AWS_S3_PUBLIC_ENDPOINT_URL", default="") or None

AWS_AUTO_CREATE_BUCKET = False

if STORAGE_BACKEND == "s3":
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Email Configuration
# ---------------------------------------------------------------------------
EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = config("EMAIL_HOST", default="smtp.hostinger.com")
EMAIL_PORT = config("EMAIL_PORT", default=465, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=False, cast=bool)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="contact@yuvro.ai")
EMAIL_LOGO_URL = config("EMAIL_LOGO_URL", default="")


# ---------------------------------------------------------------------------
# Observability (OpenTelemetry & Prometheus)
# ---------------------------------------------------------------------------
OTEL_ENABLED = config("OTEL_ENABLED", default=False, cast=bool)
OTEL_EXPORTER_OTLP_ENDPOINT = config(
    "OTEL_EXPORTER_OTLP_ENDPOINT", default="http://localhost:4317"
)
OTEL_SERVICE_NAME = config("OTEL_SERVICE_NAME", default="yuvro-marketplace-backend")
OTEL_SERVICE_VERSION = config("OTEL_SERVICE_VERSION", default="1.0.0")

if OTEL_ENABLED:
    from core.observability import setup_otel

    setup_otel(
        service_name=OTEL_SERVICE_NAME,
        service_version=OTEL_SERVICE_VERSION,
        otlp_endpoint=OTEL_EXPORTER_OTLP_ENDPOINT,
    )
